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
        
        overlayMsg.textContent = "Updating saved lists...";
        const { initState, migrateShortlistData } = await import('./state.js');
        
        await initState();
        
        // This migrateShortlistData was likely the function mapping old objects to new
        if (typeof migrateShortlistData === 'function') {
            await migrateShortlistData(engine);
        }
        
        // Hide overlay
        overlay.style.display = 'none';
        
        // Initialize routing
        initRouter(container);
        
    } catch (error) {
        console.error(error);
        overlayMsg.innerHTML = `
            <div style="text-align:center; padding: 2rem;">
                <div class="text-danger mb-2" style="font-weight:600; font-size:1.125rem;">Could not load search data (API failed).</div>
                <div class="text-muted mb-4">Please check the server terminal and try again.</div>
                <button class="btn btn-outline" onclick="window.location.reload()" style="padding:0.5rem 1.5rem; border-radius:4px;">Retry</button>
            </div>
        `;
        const spinner = overlay.querySelector('.spinner');
        if (spinner) spinner.style.display = 'none';
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
