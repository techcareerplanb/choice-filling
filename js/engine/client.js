export class EngineClient {
    constructor() {
        // Instantiate the worker as a module with cache buster
        this.worker = new Worker(`/js/workers/data.worker.js?v=${Date.now()}`, { type: 'module' });
        this.msgId = 0;
        this.resolvers = {};
        this.onProgress = null;
        
        this.worker.onmessage = (e) => {
            const { type, msgId, payload } = e.data;
            
            if (type === 'PROGRESS') {
                if (this.onProgress) this.onProgress(payload);
                return;
            }
            
            const resolve = this.resolvers[msgId];
            if (resolve) {
                if (type === 'ERROR') {
                    resolve({ error: payload });
                } else {
                    resolve({ data: payload });
                }
                delete this.resolvers[msgId];
            }
        };
    }
    
    async _send(type, payload = {}) {
        return new Promise((resolve) => {
            const id = ++this.msgId;
            this.resolvers[id] = resolve;
            this.worker.postMessage({ type, msgId: id, payload });
        });
    }

    async init(progressCallback) {
        this.onProgress = progressCallback;
        const result = await this._send('INIT');
        this.onProgress = null;
        if (result.error) throw new Error(result.error);
        return result.data; // Metadata
    }
    
    async search(rank, criteria) {
        const result = await this._send('SEARCH', { rank, criteria });
        if (result.error) throw new Error(result.error);
        return result.data;
    }
    
    async getOption(id, rank = null, year = 'all', round = 'all') {
        const result = await this._send('GET_OPTION', { id, rank, year, round });
        if (result.error) throw new Error(result.error);
        return result.data;
    }
}
