import { EngineClient } from './engine/client.js';
import { initRouter } from './router.js';
import './state.js'; // initialize state listeners

async function initApp() {
    const overlay = document.getElementById('global-overlay');
    const overlayMsg = document.getElementById('overlay-msg');
    const container = document.getElementById('app-container');
    
    overlay.style.display = 'flex';
    
    try {
        // Instantiate the worker-backed engine client
        const engine = new EngineClient();
        
        // Init Engine and load data
        window.APP_META = await engine.init((msg) => {
            overlayMsg.textContent = msg;
        });
        
        // Save engine to window for easy access by views, 
        // since we are using a lightweight vanilla architecture.
        window.DATA_ENGINE = engine;
        
        // Hide overlay
        overlay.style.display = 'none';
        
        // Initialize routing
        initRouter(container);
        
    } catch (error) {
        console.error(error);
        overlayMsg.innerHTML = `<span class="text-danger">Failed to load data engine. Please refresh.</span>`;
        overlay.querySelector('.spinner').style.display = 'none';
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
