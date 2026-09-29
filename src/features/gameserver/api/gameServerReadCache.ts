const pendingReads = new Map<string, Promise<unknown>>();

export function invalidateGameServerReads(): void {
  pendingReads.clear();
}

export function sharedGameServerRead<T>(key: string, load: () => Promise<T>): Promise<T> {
  const existing = pendingReads.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const promise = load();
  pendingReads.set(key, promise);
  const clear = () => {
    if (pendingReads.get(key) === promise) pendingReads.delete(key);
  };
  void promise.then(clear, clear);
  return promise;
}
