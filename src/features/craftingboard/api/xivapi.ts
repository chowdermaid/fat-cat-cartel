export type XivapiIcon = {
  id: number;
  path: string;
  path_hr1?: string;
};

export type CraftingIngredient = {
  itemId: number;
  name: string;
  icon?: XivapiIcon;
  amount: number;
};

export type CraftingRecipe = {
  recipeId: number;
  itemId: number;
  itemName: string;
  itemIcon?: XivapiIcon;
  amountResult: number;
  crafter: string;
  level: number | null;
  ingredients: CraftingIngredient[];
};

export type CraftingSearchItem = {
  itemId: number;
  itemName: string;
  itemIcon?: XivapiIcon;
  recipes: CraftingRecipe[];
};

type XivapiRelation<TFields = Record<string, unknown>> = {
  row_id?: number;
  fields?: TFields;
};

type RecipeFields = {
  AmountIngredient?: number[];
  AmountResult?: number;
  CraftType?: XivapiRelation<{ Name?: string }>;
  Ingredient?: Array<XivapiRelation<{ Name?: string; Icon?: XivapiIcon }>>;
  ItemResult?: XivapiRelation<{ Name?: string; Icon?: XivapiIcon }>;
  RecipeLevelTable?: XivapiRelation<{ ClassJobLevel?: number }>;
};

type RecipeResult = {
  row_id: number;
  fields?: RecipeFields;
};

type SearchResponse = {
  results?: RecipeResult[];
};

const XIVAPI_BASE_URL = "https://v2.xivapi.com";
const RECIPE_FIELDS = [
  "ItemResult.Name",
  "ItemResult.Icon",
  "AmountResult",
  "CraftType.Name",
  "RecipeLevelTable.ClassJobLevel",
  "Ingredient[].Name",
  "Ingredient[].Icon",
  "AmountIngredient",
].join(",");
const MAX_PRECRAFT_DEPTH = 4;
const recipeCache = new Map<number, CraftingRecipe>();
const recipeByOutputCache = new Map<number, CraftingRecipe | null>();
const CRAFT_TYPE_TO_JOB: Record<string, string> = {
  Carpentry: "Carpenter",
  Smithing: "Blacksmith",
  Armorcraft: "Armorer",
  Goldsmithing: "Goldsmith",
  Leatherworking: "Leatherworker",
  Clothcraft: "Weaver",
  Alchemy: "Alchemist",
  Cooking: "Culinarian",
};

type CraftingPrecraftSnapshot = {
  itemId: number;
  itemName: string;
  itemIcon?: XivapiIcon;
  quantity: number;
  recipeId: number;
  crafter: string;
  recipeLevel: number | null;
  depth?: number;
};

export type ResolvedRecipeSnapshot = {
  recipeId: number;
  itemId: number;
  itemName: string;
  itemIcon?: XivapiIcon;
  amountResult: number;
  crafter: string;
  recipeLevel: number | null;
  ingredients: CraftingIngredient[];
  crystals: CraftingIngredient[];
  clusters: CraftingIngredient[];
  precrafts: CraftingPrecraftSnapshot[];
  eligibleCrafters: [];
  snapshottedAt: number;
  source: "xivapi";
};

export function getXivapiIconUrl(icon?: XivapiIcon) {
  const path = icon?.path_hr1 || icon?.path;
  if (!path) return "";

  const params = new URLSearchParams({
    path,
    format: "png",
  });

  return `${XIVAPI_BASE_URL}/api/asset?${params.toString()}`;
}

export async function searchCraftingRecipes(
  term: string,
  signal?: AbortSignal,
): Promise<CraftingSearchItem[]> {
  const trimmedTerm = term.trim();
  if (trimmedTerm.length < 2) return [];

  const params = new URLSearchParams({
    sheets: "Recipe",
    query: `ItemResult.Name~"${trimmedTerm.replaceAll('"', '\\"')}"`,
    limit: "10",
    fields: RECIPE_FIELDS,
  });

  const response = await fetch(`${XIVAPI_BASE_URL}/api/search?${params.toString()}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error(`XIVAPI request failed with ${response.status}`);
  }

  const data = (await response.json()) as SearchResponse;
  return groupRecipesByItem((data.results ?? []).map(normalizeRecipe).filter(Boolean));
}

export async function resolveRecipeSnapshot(
  recipeId: number,
  signal?: AbortSignal,
): Promise<ResolvedRecipeSnapshot> {
  const recipe = await fetchRecipeById(recipeId, signal);
  const precrafts = await collectPrecrafts(recipe, 1, 1, new Set(), signal);

  return {
    recipeId: recipe.recipeId,
    itemId: recipe.itemId,
    itemName: recipe.itemName,
    itemIcon: recipe.itemIcon,
    amountResult: recipe.amountResult,
    crafter: recipe.crafter,
    recipeLevel: recipe.level,
    ingredients: recipe.ingredients.filter((ingredient) => !isCrystalOrCluster(ingredient)),
    crystals: recipe.ingredients.filter(isCrystalOrShard),
    clusters: recipe.ingredients.filter(isCluster),
    precrafts,
    eligibleCrafters: [],
    snapshottedAt: Date.now(),
    source: "xivapi",
  };
}

function normalizeRecipe(result: RecipeResult): CraftingRecipe | null {
  const fields = result.fields;
  const item = fields?.ItemResult;
  const itemId = item?.row_id;
  const itemName = item?.fields?.Name?.trim();

  if (!itemId || !itemName) return null;

  const amounts = fields?.AmountIngredient ?? [];
  const ingredients =
    fields?.Ingredient?.map<CraftingIngredient | null>((ingredient, index) => {
      const amount = amounts[index] ?? 0;
      const ingredientId = ingredient.row_id ?? 0;
      const name = ingredient.fields?.Name?.trim() ?? "";

      if (ingredientId <= 0 || amount <= 0 || !name) return null;

      return {
        itemId: ingredientId,
        name,
        icon: ingredient.fields?.Icon,
        amount,
      };
    }).filter((ingredient): ingredient is CraftingIngredient => ingredient !== null) ?? [];

  return {
    recipeId: result.row_id,
    itemId,
    itemName,
    itemIcon: item.fields?.Icon,
    amountResult: fields?.AmountResult ?? 1,
    crafter: normalizeCrafter(fields?.CraftType?.fields?.Name),
    level: fields?.RecipeLevelTable?.fields?.ClassJobLevel ?? null,
    ingredients,
  };
}

async function fetchRecipeById(
  recipeId: number,
  signal?: AbortSignal,
): Promise<CraftingRecipe> {
  const cached = recipeCache.get(recipeId);
  if (cached) return cached;

  const params = new URLSearchParams({ fields: RECIPE_FIELDS });
  const response = await fetch(
    `${XIVAPI_BASE_URL}/api/sheet/Recipe/${recipeId}?${params.toString()}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error(`XIVAPI recipe request failed with ${response.status}`);
  }

  const recipe = normalizeRecipe({
    row_id: recipeId,
    fields: ((await response.json()) as { fields?: RecipeFields }).fields,
  });

  if (!recipe) throw new Error("XIVAPI recipe response was incomplete.");
  recipeCache.set(recipeId, recipe);
  return recipe;
}

async function fetchRecipeByOutputItemId(
  itemId: number,
  signal?: AbortSignal,
): Promise<CraftingRecipe | null> {
  if (recipeByOutputCache.has(itemId)) {
    return recipeByOutputCache.get(itemId) ?? null;
  }

  const params = new URLSearchParams({
    sheets: "Recipe",
    query: `+ItemResult=${itemId}`,
    limit: "1",
    fields: RECIPE_FIELDS,
  });

  const response = await fetch(`${XIVAPI_BASE_URL}/api/search?${params.toString()}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error(`XIVAPI precraft search failed with ${response.status}`);
  }

  const data = (await response.json()) as SearchResponse;
  const firstResult = data.results?.[0];
  const recipe = firstResult ? normalizeRecipe(firstResult) : null;
  if (recipe) recipeCache.set(recipe.recipeId, recipe);
  recipeByOutputCache.set(itemId, recipe);
  return recipe;
}

async function collectPrecrafts(
  recipe: CraftingRecipe,
  parentCraftsNeeded: number,
  depth: number,
  seenRecipeIds: Set<number>,
  signal?: AbortSignal,
): Promise<CraftingPrecraftSnapshot[]> {
  if (depth > MAX_PRECRAFT_DEPTH) return [];

  const precrafts: CraftingPrecraftSnapshot[] = [];
  seenRecipeIds.add(recipe.recipeId);

  for (const ingredient of recipe.ingredients) {
    if (isCrystalOrCluster(ingredient)) continue;

    const childRecipe = await fetchRecipeByOutputItemId(ingredient.itemId, signal);
    if (!childRecipe || seenRecipeIds.has(childRecipe.recipeId)) continue;

    const quantity = ingredient.amount * parentCraftsNeeded;
    const childCraftsNeeded = Math.ceil(quantity / childRecipe.amountResult);
    precrafts.push({
      itemId: childRecipe.itemId,
      itemName: childRecipe.itemName,
      itemIcon: childRecipe.itemIcon,
      quantity,
      recipeId: childRecipe.recipeId,
      crafter: childRecipe.crafter,
      recipeLevel: childRecipe.level,
      depth,
    });
    precrafts.push(
      ...(await collectPrecrafts(
        childRecipe,
        childCraftsNeeded,
        depth + 1,
        new Set(seenRecipeIds),
        signal,
      )),
    );
  }

  return mergePrecrafts(precrafts);
}

function mergePrecrafts(precrafts: CraftingPrecraftSnapshot[]) {
  const merged = new Map<string, CraftingPrecraftSnapshot>();

  for (const precraft of precrafts) {
    const key = `${precraft.recipeId}-${precraft.depth ?? 0}`;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += precraft.quantity;
    } else {
      merged.set(key, { ...precraft });
    }
  }

  return Array.from(merged.values());
}

function normalizeCrafter(value: string | undefined) {
  const craftType = value?.trim() || "";
  return CRAFT_TYPE_TO_JOB[craftType] ?? (craftType || "Crafter");
}

function isCrystalOrShard(ingredient: CraftingIngredient) {
  return /\b(Crystal|Shard)\b/i.test(ingredient.name);
}

function isCluster(ingredient: CraftingIngredient) {
  return /\bCluster\b/i.test(ingredient.name);
}

function isCrystalOrCluster(ingredient: CraftingIngredient) {
  return isCrystalOrShard(ingredient) || isCluster(ingredient);
}

function groupRecipesByItem(recipes: Array<CraftingRecipe | null>) {
  const items = new Map<number, CraftingSearchItem>();

  for (const recipe of recipes) {
    if (!recipe) continue;

    const existing = items.get(recipe.itemId);
    if (existing) {
      existing.recipes.push(recipe);
      continue;
    }

    items.set(recipe.itemId, {
      itemId: recipe.itemId,
      itemName: recipe.itemName,
      itemIcon: recipe.itemIcon,
      recipes: [recipe],
    });
  }

  return Array.from(items.values());
}
