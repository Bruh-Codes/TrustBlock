type StorageValue = string | null;

function getStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

async function getItem(key: string): Promise<StorageValue> {
  return getStorage()?.getItem(key) ?? null;
}

async function setItem(key: string, value: string): Promise<void> {
  getStorage()?.setItem(key, value);
}

async function removeItem(key: string): Promise<void> {
  getStorage()?.removeItem(key);
}

async function clear(): Promise<void> {
  getStorage()?.clear();
}

async function getAllKeys(): Promise<string[]> {
  const storage = getStorage();
  if (!storage) {
    return [];
  }

  return Array.from({length: storage.length}, (_, index) => storage.key(index)).filter(
    (key): key is string => key !== null,
  );
}

async function multiGet(keys: readonly string[]): Promise<Array<[string, StorageValue]>> {
  return Promise.all(
    keys.map(async (key) => [key, await getItem(key)] as [string, StorageValue]),
  );
}

async function multiSet(entries: ReadonlyArray<readonly [string, string]>): Promise<void> {
  await Promise.all(entries.map(async ([key, value]) => setItem(key, value)));
}

async function multiRemove(keys: readonly string[]): Promise<void> {
  await Promise.all(keys.map(async (key) => removeItem(key)));
}

async function mergeItem(key: string, value: string): Promise<void> {
  const currentValue = await getItem(key);

  if (currentValue === null) {
    await setItem(key, value);
    return;
  }

  try {
    const currentObject = JSON.parse(currentValue) as Record<string, unknown>;
    const nextObject = JSON.parse(value) as Record<string, unknown>;
    await setItem(key, JSON.stringify({...currentObject, ...nextObject}));
  } catch {
    await setItem(key, value);
  }
}

const AsyncStorage = {
  getItem,
  setItem,
  removeItem,
  clear,
  getAllKeys,
  multiGet,
  multiSet,
  multiRemove,
  mergeItem,
};

export {
  clear,
  getAllKeys,
  getItem,
  mergeItem,
  multiGet,
  multiRemove,
  multiSet,
  removeItem,
  setItem,
};

export default AsyncStorage;
