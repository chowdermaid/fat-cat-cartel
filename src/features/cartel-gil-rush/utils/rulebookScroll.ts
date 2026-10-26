import type { RulebookChapter } from "../types";

export interface ChapterPosition {
  id: RulebookChapter;
  top: number;
}

export function getActiveChapter(positions: readonly ChapterPosition[], scrollTop: number, viewportHeight: number, scrollHeight: number): RulebookChapter {
  if (scrollTop > 0 && scrollTop + viewportHeight >= scrollHeight - 1) return positions.at(-1)?.id ?? "board-overview";
  let active: RulebookChapter = positions[0]?.id ?? "board-overview";
  for (const position of positions) {
    if (position.top > scrollTop + 24) break;
    active = position.id;
  }
  return active;
}

export function getChapterScrollTop(headingTop: number, viewportHeight: number, scrollHeight: number): number {
  return Math.max(0, Math.min(headingTop - 16, scrollHeight - viewportHeight));
}
