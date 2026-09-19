import { getCacheItem, setCacheItem, clearCacheStore } from './engine/cache.js';

export const state = {
    shortlist: [],
    compare: []
};

export async function initState() {
    let idbShortlist = await getCacheItem('shortlist', 'list');
    let idbCompare = await getCacheItem('choiceList', 'list');
    
    if (!idbShortlist) {
        let initialShortlist = JSON.parse(localStorage.getItem('neet_shortlist'));
        if (initialShortlist) {
            if (initialShortlist.length > 0 && typeof initialShortlist[0] === 'number') {
                initialShortlist = initialShortlist.map(id => ({
                    id: id,
                    tag: 'None',
                    notes: '',
                    isFavorite: false
                }));
            }
            idbShortlist = initialShortlist;
            localStorage.removeItem('neet_shortlist');
            await setCacheItem('shortlist', 'list', idbShortlist);
        } else {
            idbShortlist = [];
        }
    }
    
    if (!idbCompare) {
        let initialCompare = JSON.parse(localStorage.getItem('neet_compare'));
        if (initialCompare) {
            idbCompare = initialCompare;
            localStorage.removeItem('neet_compare');
            await setCacheItem('choiceList', 'list', idbCompare);
        } else {
            idbCompare = [];
        }
    }
    
    state.shortlist = idbShortlist || [];
    state.compare = idbCompare || [];
    
    notify();
}

export function getChoiceIdentity(instituteId, courseId) {
    return `${instituteId}_${courseId}`;
}

const observers = [];

export function subscribe(callback) {
    observers.push(callback);
    // Return unsubscribe function
    return () => {
        const index = observers.indexOf(callback);
        if (index > -1) observers.splice(index, 1);
    };
}

function notify() {
    observers.forEach(cb => cb(state));
    updateBadges();
}

export function toggleShortlist(optionId, identity) {
    const index = state.shortlist.findIndex(item => item.identity === identity || item.id === optionId);
    if (index === -1) {
        state.shortlist.push({ id: optionId, identity: identity, tag: 'None', notes: '', isFavorite: false });
    } else {
        state.shortlist.splice(index, 1);
    }
    saveState();
}

export function addMultipleToShortlist(optionsArray) {
    let changed = false;
    optionsArray.forEach(opt => {
        if (!state.shortlist.some(item => item.identity === opt.identity)) {
            state.shortlist.push({ id: opt.id, identity: opt.identity, tag: 'None', notes: '', isFavorite: false });
            changed = true;
        }
    });
    if (changed) {
        saveState();
    }
}

export function updateShortlistItem(optionId, updates) {
    const item = state.shortlist.find(i => i.id === optionId);
    if (item) {
        Object.assign(item, updates);
        saveState();
    }
}

export function reorderShortlist(newOrderIds) {
    const newShortlist = [];
    newOrderIds.forEach(id => {
        const item = state.shortlist.find(i => i.id === id || i.identity === id); // Handle ID or identity
        if (item) newShortlist.push(item);
    });
    // Add any that were missed
    state.shortlist.forEach(item => {
        if (!newShortlist.includes(item)) newShortlist.push(item);
    });
    state.shortlist = newShortlist;
    saveState();
}

export function toggleCompare(optionId) {
    const index = state.compare.indexOf(optionId);
    if (index === -1) {
        if (state.compare.length < 4) {
            state.compare.push(optionId);
        } else {
            return { success: false, error: 'Maximum 4 colleges can be compared. Remove one college to add another.' };
        }
    } else {
        state.compare.splice(index, 1);
    }
    saveState();
    return { success: true };
}

export function clearCompare() {
    state.compare = [];
    saveState();
}

export function clearShortlist() {
    state.shortlist = [];
    saveState();
}

function saveState() {
    setCacheItem('shortlist', 'list', state.shortlist).catch(console.error);
    setCacheItem('choiceList', 'list', state.compare).catch(console.error);
    notify();
}

export function updateBadges() {
    const sBadge = document.getElementById('shortlist-count');
    const cBadge = document.getElementById('compare-count');
    
    if (sBadge) {
        sBadge.textContent = state.shortlist.length;
        if (state.shortlist.length > 0) {
            sBadge.classList.add('badge-primary');
            sBadge.classList.remove('badge-outline');
        } else {
            sBadge.classList.add('badge-outline');
            sBadge.classList.remove('badge-primary');
        }
    }
    
    if (cBadge) {
        cBadge.textContent = state.compare.length;
        cBadge.style.display = state.compare.length > 0 ? 'inline-block' : 'none';
    }
}

// Initial update
document.addEventListener('DOMContentLoaded', updateBadges);

export async function migrateShortlistData(engine) {
    let changed = false;
    const migrated = [];
    const seen = new Map(); // identity -> index in migrated
    let duplicatesRemoved = 0;
    
    for (let i = 0; i < state.shortlist.length; i++) {
        const item = state.shortlist[i];
        if (!item.identity) {
            try {
                const opt = await engine.getOption(item.id);
                if (opt) {
                    item.identity = getChoiceIdentity(opt.institute.id, opt.course.id);
                } else {
                    continue; // Skip if option not found
                }
            } catch(e) {
                console.warn(`Failed to resolve identity for legacy option ${item.id}`);
                continue;
            }
        }
        
        if (!seen.has(item.identity)) {
            seen.set(item.identity, migrated.length);
            migrated.push(item);
        } else {
            // Merge duplicate metadata
            const existingIdx = seen.get(item.identity);
            const existing = migrated[existingIdx];
            
            // Merge tags conservatively (Safe > Target > Dream > None)
            const tags = { 'Safe': 3, 'Target': 2, 'Dream': 1, 'None': 0 };
            if ((tags[item.tag] || 0) > (tags[existing.tag] || 0)) {
                existing.tag = item.tag;
            }
            
            // Merge notes
            if (item.notes && existing.notes !== item.notes) {
                if (!existing.notes) existing.notes = item.notes;
                else existing.notes += ' | ' + item.notes;
            }
            
            // Merge favorite
            existing.isFavorite = existing.isFavorite || item.isFavorite;
            
            duplicatesRemoved++;
            changed = true;
        }
    }
    
    if (changed || migrated.length !== state.shortlist.length) {
        state.shortlist = migrated;
        saveState();
        if (duplicatesRemoved > 0) {
            console.log(`Choice List deduplicated: safely removed ${duplicatesRemoved} legacy duplicate variants.`);
        }
    }
}
