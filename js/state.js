// Data Migration: Ensure shortlist is array of objects
let initialShortlist = JSON.parse(localStorage.getItem('neet_shortlist')) || [];
if (initialShortlist.length > 0 && typeof initialShortlist[0] === 'number') {
    initialShortlist = initialShortlist.map(id => ({
        id: id,
        tag: 'None',
        notes: '',
        isFavorite: false
    }));
    localStorage.setItem('neet_shortlist', JSON.stringify(initialShortlist));
}

export const state = {
    shortlist: initialShortlist,
    compare: JSON.parse(localStorage.getItem('neet_compare')) || []
};

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

export function toggleShortlist(optionId) {
    const index = state.shortlist.findIndex(item => item.id === optionId);
    if (index === -1) {
        state.shortlist.push({ id: optionId, tag: 'None', notes: '', isFavorite: false });
    } else {
        state.shortlist.splice(index, 1);
    }
    saveState();
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
        const item = state.shortlist.find(i => i.id === id);
        if (item) newShortlist.push(item);
    });
    // Add any that were missed
    state.shortlist.forEach(item => {
        if (!newOrderIds.includes(item.id)) newShortlist.push(item);
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

function saveState() {
    localStorage.setItem('neet_shortlist', JSON.stringify(state.shortlist));
    localStorage.setItem('neet_compare', JSON.stringify(state.compare));
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
