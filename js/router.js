import { renderHome } from './ui/views/home.js';
import { renderResults } from './ui/views/results.js';
import { renderCollege } from './ui/views/college.js';
import { renderCompare } from './ui/views/compare.js';
import { renderShortlist } from './ui/views/shortlist.js';
import { renderChoiceList } from './ui/views/choicelist.js';
import { renderStatic } from './ui/views/static.js';
import { renderUpdateData } from './ui/views/update-data.js';

let appContainer = null;

export function initRouter(container) {
    appContainer = container;
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleRoute);
    
    // Initial route
    handleRoute();
}

export function navigate(path, params = {}) {
    let url = `#${path}`;
    const searchParams = new URLSearchParams(params);
    const queryString = searchParams.toString();
    if (queryString) {
        url += `?${queryString}`;
    }
    window.location.hash = url;
}

function handleRoute() {
    const rawHash = window.location.hash.slice(1) || '/';
    const [path, queryString] = rawHash.split('?');
    
    const params = Object.fromEntries(new URLSearchParams(queryString));
    
    // Update active nav links and preserve query parameters across views
    document.querySelectorAll('.nav-link').forEach(link => {
        const currentHref = link.getAttribute('href');
        if (!currentHref) return;
        
        const [basePath] = currentHref.split('?');
        link.setAttribute('href', queryString ? `${basePath}?${queryString}` : basePath);
        
        link.classList.remove('active');
        if (basePath === `#${path}`) {
            link.classList.add('active');
        }
    });
    
    appContainer.innerHTML = ''; // Clear current view
    
    if (path === '/') {
        renderHome(appContainer);
    } 
    else if (path === '/results') {
        renderResults(appContainer, params);
    } 
    else if (path.startsWith('/college/')) {
        const id = parseInt(path.split('/')[2], 10);
        renderCollege(appContainer, id, params);
    }
    else if (path === '/compare') {
        renderCompare(appContainer, params);
    }
    else if (path === '/shortlist') {
        renderShortlist(appContainer);
    }
    else if (path === '/choice-list') {
        renderChoiceList(appContainer);
    }
    else if (path === '/methodology' || path === '/help') {
        renderStatic(appContainer, path);
    }
    else if (path === '/update-data') {
        renderUpdateData(appContainer, params);
    }
    else {
        appContainer.innerHTML = `<div class="container text-center mt-4"><h2>404 - Page Not Found</h2></div>`;
    }
    
    window.scrollTo(0, 0);
}
