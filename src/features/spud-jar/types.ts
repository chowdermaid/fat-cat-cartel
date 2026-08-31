export type SpudJarAction = "add" | "undo" | "reset";

export type SpudJarRecord = {
  total: number;
  cycle: number;
  updatedAt: number;
  updatedBy: string;
};

export type SpudJarMutationResult = {
  ok: true;
  total: number;
  cycle: number;
};

export type ComplaintCoinMark = "plus" | "spud" | "potato" | "grumpy";

export type ComplaintCoinView = {
  id: number;
  mark: ComplaintCoinMark;
  radius: number;
};
