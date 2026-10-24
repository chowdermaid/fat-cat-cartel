import { FC_COLLECTION_CACHE_EVENT, FC_COLLECTION_CACHE_KEY } from "../constants";

export function invalidateCollectionCache() {
  try {
    localStorage.removeItem(FC_COLLECTION_CACHE_KEY);
    localStorage.removeItem("fcc_collectibles_v1");
  } catch {
    // Mounted collection views can reload even if storage is blocked.
  }
  window.dispatchEvent(new Event(FC_COLLECTION_CACHE_EVENT));
}
