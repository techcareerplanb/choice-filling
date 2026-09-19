const DB_NAME = 'neet-pg-decision-cache-v1';
const DB_VERSION = 1;

let dbInstance = null;

function initDB() {
    return new Promise((resolve, reject) => {
        if (dbInstance) return resolve(dbInstance);
        
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            if (!db.objectStoreNames.contains('filterMetadata')) {
                db.createObjectStore('filterMetadata');
            }
            if (!db.objectStoreNames.contains('resultPages')) {
                db.createObjectStore('resultPages');
            }
            if (!db.objectStoreNames.contains('optionDetails')) {
                db.createObjectStore('optionDetails');
            }
            if (!db.objectStoreNames.contains('uiState')) {
                db.createObjectStore('uiState');
            }
            if (!db.objectStoreNames.contains('shortlist')) {
                db.createObjectStore('shortlist');
            }
            if (!db.objectStoreNames.contains('choiceList')) {
                db.createObjectStore('choiceList');
            }
        };
        
        request.onsuccess = (event) => {
            dbInstance = event.target.result;
            resolve(dbInstance);
        };
        
        request.onerror = (event) => {
            console.warn("IndexedDB not available. Falling back to memory-only.", event.target.error);
            resolve(null); // Fallback handling
        };
    });
}

function getStore(storeName, mode = 'readonly') {
    return new Promise(async (resolve, reject) => {
        const db = await initDB();
        if (!db) return reject(new Error('IndexedDB not available'));
        
        try {
            const transaction = db.transaction(storeName, mode);
            const store = transaction.objectStore(storeName);
            resolve(store);
        } catch (err) {
            reject(err);
        }
    });
}

export async function getCacheItem(storeName, key) {
    try {
        const store = await getStore(storeName, 'readonly');
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        return null;
    }
}

export async function setCacheItem(storeName, key, value) {
    try {
        const store = await getStore(storeName, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.put(value, key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        // Silently fail on cache write errors (e.g., quota exceeded)
    }
}

export async function getAllCacheItems(storeName) {
    try {
        const store = await getStore(storeName, 'readonly');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        return [];
    }
}

export async function clearCacheStore(storeName) {
    try {
        const store = await getStore(storeName, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        // Do nothing
    }
}

export async function clearSearchCache() {
    await clearCacheStore('filterMetadata');
    await clearCacheStore('resultPages');
    await clearCacheStore('optionDetails');
    // We optionally keep uiState so they don't lose their cursor/filters, 
    // or we can wipe it if we want a full reset. Let's wipe it for safety.
    await clearCacheStore('uiState');
}

export async function clearUserLists() {
    await clearCacheStore('shortlist');
    await clearCacheStore('choiceList');
}

// Simple LRU enforcement
export async function enforceLRU(storeName, maxEntries = 50) {
    try {
        const store = await getStore(storeName, 'readwrite');
        const request = store.getAllKeys();
        
        request.onsuccess = () => {
            const keys = request.result;
            if (keys.length > maxEntries) {
                // Delete oldest (assuming keys are somewhat chronological or just arbitrary overflow)
                const keysToDelete = keys.slice(0, keys.length - maxEntries);
                keysToDelete.forEach(k => {
                    try { store.delete(k); } catch (e) {}
                });
            }
        };
    } catch (err) {
        // Do nothing
    }
}
