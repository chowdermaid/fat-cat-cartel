import { createContext, useContext } from "react";
import type { CollectionViewState } from "../types";

export const CollectionViewContext = createContext<CollectionViewState | null>(null);

export function useCollectionView(): CollectionViewState {
  const context = useContext(CollectionViewContext);
  if (!context) throw new Error("Collection views require FCCollectionLayout.");
  return context;
}
