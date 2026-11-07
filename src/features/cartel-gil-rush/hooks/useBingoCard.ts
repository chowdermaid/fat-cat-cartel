import { useEffect, useState } from "react";
import { BINGO_STORAGE_KEY } from "../constants";
import { generateBingoCard, readBingoCard, toggleBingoMission } from "../utils/bingo";
import type { BingoController } from "../types";

function loadCard() {
  try {
    return { card: readBingoCard(localStorage.getItem(BINGO_STORAGE_KEY)) ?? generateBingoCard(), storageUnavailable: false };
  } catch {
    return { card: generateBingoCard(), storageUnavailable: true };
  }
}

export function useBingoCard(): BingoController {
  const [state, setState] = useState(loadCard);
  useEffect(() => {
    let active = true;
    try { localStorage.setItem(BINGO_STORAGE_KEY, JSON.stringify(state.card)); }
    catch {
      queueMicrotask(() => { if (active) setState(current => current.storageUnavailable ? current : { ...current, storageUnavailable: true }); });
    }
    return () => { active = false; };
  }, [state.card]);

  function toggle(id: number) {
    setState(current => ({ ...current, card: toggleBingoMission(current.card, id) }));
  }
  return { ...state, toggle };
}
