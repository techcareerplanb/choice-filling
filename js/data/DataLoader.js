const DB_NAME = 'neet_pg_relational_db';
const DB_VERSION = 1;
const STORE_NAME = 'datasets';

export class DataLoader {
    constructor() {
        this.db = null;
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async getFromStore(key) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject('DB not initialized');
            const transaction = this.db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async putInStore(key, data) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject('DB not initialized');
            const transaction = this.db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(data, key);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async loadDataset(filename, progressCallback) {
        // Try DB first
        let data = null;
        try {
            data = await this.getFromStore(filename);
        } catch (e) {
            console.warn(`Could not read ${filename} from IDB`);
        }

        if (!data) {
            if (progressCallback) progressCallback(`Fetching ${filename} from network...`);
            const res = await fetch(`/data/processed/${filename}`);
            if (!res.ok) throw new Error(`Failed to fetch ${filename}`);
            data = await res.json();
            
            try {
                await this.putInStore(filename, data);
            } catch (e) {
                console.warn(`Failed to save ${filename} to IDB`, e);
            }
        } else {
            if (progressCallback) progressCallback(`Loaded ${filename} from cache`);
        }
        
        return data;
    }

    async loadAll(progressCallback) {
        await this.initDB();
        
        const files = [
            'institutes.json',
            'courses.json',
            'quotas.json',
            'categories.json',
            'counsellings.json',
            'options.json',
            'cutoffs.json',
            'financials.json',
            'seat-matrix-2026.json',
            'seat-matrix-2025.json',
            'seat-matrix-additional-2025.json',
            'indexes.json'
        ];
        
        const datasets = {};
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const key = file.replace('.json', '');
            if (progressCallback) progressCallback(`Loading ${key}... (${i + 1}/${files.length})`);
            datasets[key] = await this.loadDataset(file);
        }
        
        return datasets;
    }
}
