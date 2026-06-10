import { Coffee, Fish, Gamepad2, Hammer, Heart, Home, Map as MapIcon, Mountain, Palette, Rabbit, Sparkles, Star, Swords, Trophy, Users } from "lucide-react";

export function favoriteContentIcon(content: string): React.ElementType {
  if (content.includes("Savage") || content.includes("Ultimate")) return Swords;
  if (content.includes("Extreme")) return Sparkles;
  if (content.includes("Alliance")) return Users;
  if (content.includes("Dungeon")) return Mountain;
  if (content.includes("Field")) return MapIcon;
  if (content.includes("Treasure")) return MapIcon;
  if (content.includes("Crafting")) return Hammer;
  if (content.includes("Fishing")) return Fish;
  if (content.includes("Housing")) return Home;
  if (content.includes("Gold Saucer")) return Gamepad2;
  if (content.includes("Glamour")) return Palette;
  if (content.includes("Mount")) return Mountain;
  if (content.includes("Minion")) return Rabbit;
  if (content.includes("Achievement")) return Trophy;
  if (content.includes("Blue Mage")) return Sparkles;
  if (content.includes("PvP")) return Swords;
  if (content.includes("Roleplay")) return Star;
  if (content.includes("AFK")) return Coffee;
  if (content.includes("Social")) return Heart;
  return Heart;
}
