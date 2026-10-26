import { ArrowDown, ArrowLeft, ArrowRight, Coins, Dice6, Dices, type LucideIcon } from "lucide-react";

const references = /(?:\broll\s+)?\/random\s+(?:6|10)\b|\/deathroll\b|\b(?:roll\s+(?:a\s+)?)?natural\s+6\b|\b(?:first|second)\s+roll\b|\broll(?:s|ing)?\b|\bmove(?:ment|s)?(?:\s+(?:forward|backwards?))?(?:\s+\d+)?\b|\bmoving\b|\bfall\b|\b(?:\d[\d,]*\s+)?gil\b/gi;

export function RuleText({ text, moveIcon = ArrowRight }: { text: string; moveIcon?: LucideIcon }) {
  const parts = [];
  let offset = 0;
  for (const match of text.matchAll(references)) {
    parts.push(text.slice(offset, match.index));
    const value = match[0], lower = value.toLowerCase();
    const Icon = lower.includes("gil") ? Coins
      : lower === "fall" ? ArrowDown
      : /^(move|moving)/.test(lower) ? lower.includes("back") ? ArrowLeft : moveIcon
      : /\/random\s+6|natural\s+6/.test(lower) ? Dice6 : Dices;
    parts.push(<span key={match.index} className="whitespace-nowrap"><Icon aria-hidden="true" className="mr-1 inline size-3.5 align-[-0.15em]" />{value}</span>);
    offset = match.index + value.length;
  }
  parts.push(text.slice(offset));
  return <>{parts}</>;
}
