export async function renderShortlist(container) {
    container.innerHTML = `
        <div class="container" style="margin-top:2rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                <h1 style="font-size:1.75rem; font-weight:700;">Your Shortlist</h1>
                <div style="display:flex; gap:0.5rem;">
                    <button id="btn-clear-shortlist" class="btn btn-outline" style="padding:0.5rem 1rem; border-radius:4px; border:1px solid var(--danger); color:var(--danger); background:transparent; cursor:pointer;">Clear List</button>
                    <a href="#/results" class="btn btn-outline" style="padding:0.5rem 1rem; border-radius:4px; border:1px solid var(--border-color); text-decoration:none;">Search More Options</a>
                </div>
            </div>
            <div id="shortlist-content">
                <div style="text-align:center; padding:3rem; background:var(--bg-surface); border-radius:8px;">
                    Loading...
                </div>
            </div>
        </div>
    `;

    const content = document.getElementById('shortlist-content');
    
    try {
        const stateModule = await import('../../state.js');
        const listState = stateModule.state.shortlist;
        
        if (listState.length === 0) {
            const clearBtn = document.getElementById('btn-clear-shortlist');
            if (clearBtn) clearBtn.style.display = 'none';
            content.innerHTML = `
                <div class="card" style="background:var(--bg-surface); padding:3rem; text-align:center; border-radius:8px;">
                    <h3 class="text-muted" style="margin-bottom:1rem;">Your shortlist is empty.</h3>
                    <p class="text-muted mb-4">Search for options and add them to your shortlist.</p>
                    <a href="#/results" class="btn btn-primary" style="display:inline-block; padding:0.5rem 1rem; border-radius:4px; text-decoration:none;">Go to Search</a>
                </div>
            `;
            return;
        }

        const engine = window.DATA_ENGINE;
        const options = [];
        const BATCH_SIZE = 50; // Use batch API to save requests
        for (let i = 0; i < listState.length; i += BATCH_SIZE) {
            const batchIds = listState.slice(i, i + BATCH_SIZE).map(item => item.id);
            try {
                const batchResults = await engine.getOptionsBatch(batchIds);
                options.push(...batchResults);
            } catch (err) {
                console.error("Batch fetch failed", err);
            }
        }
        
        // Map engine data back to the specific ordered state
        const mergedData = listState.map(item => {
            return {
                state: item,
                data: options.find(o => o.id === item.id)
            };
        });

        const html = `
            <div id="sortable-list" style="display:flex; flex-direction:column; gap:1rem; padding-bottom:4rem;">
                ${mergedData.map((obj, index) => {
                    const opt = obj.data;
                    const s = obj.state;
                    
                    const isFav = s.isFavorite;
                    const analyzed = opt._analyzedCutoffs;
                    const latestCutoffText = analyzed && analyzed.latestYear && analyzed.latestRound && analyzed.latestClosingRank != null ? 
                        `${analyzed.latestYear} R${analyzed.latestRound}: ${analyzed.latestClosingRank.toLocaleString()}` : 
                        'Not available';

                    return `
                        <div class="shortlist-item card" data-id="${opt.id}" draggable="true" style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:8px; display:flex; align-items:stretch; cursor:grab; box-shadow:var(--shadow-sm); overflow:hidden;">
                            
                            <!-- Drag Handle -->
                            <div class="drag-handle" style="width:40px; background:var(--bg-main); display:flex; align-items:center; justify-content:center; color:var(--text-muted); border-right:1px solid var(--border-color); cursor:grab;">
                                ☰
                            </div>
                            
                            <!-- Content -->
                            <div style="flex:1; padding:1.5rem; display:flex; flex-wrap:wrap; gap:1.5rem;">
                                
                                <!-- Core Info -->
                                <div style="flex:2; min-width:250px;">
                                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                                        <h3 style="margin:0 0 0.25rem 0; font-size:1.25rem;">
                                            <a href="#/college/${opt.id}" style="color:inherit; text-decoration:none;">${opt.institute.name}</a>
                                        </h3>
                                        <button class="fav-toggle" data-id="${opt.id}" style="background:none; border:none; cursor:pointer; font-size:1.5rem; line-height:1; color:${isFav ? '#FFD700' : 'var(--border-color)'};">
                                            ★
                                        </button>
                                    </div>
                                    <div style="font-weight:500; color:var(--primary-color); margin-bottom:0.5rem;">${opt.course.name}</div>
                                    <div style="font-size:0.875rem; color:var(--text-muted); margin-bottom:1rem;">
                                        ${opt.institute.state}${opt.institute.type ? ` &middot; ${opt.institute.type}` : ''}
                                    </div>
                                    
                                    <div style="display:flex; gap:1rem; font-size:0.875rem;">
                                        <div>
                                            <span class="text-muted">Latest Cutoff:</span> <strong>${latestCutoffText}</strong>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Interactive Elements -->
                                <div style="flex:1; min-width:250px; display:flex; flex-direction:column; gap:0.75rem;">
                                    <div>
                                        <label style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:0.25rem;">Priority Tag</label>
                                        <select class="form-control tag-select" data-id="${opt.id}" style="width:100%; padding:0.5rem; border-radius:4px; border:1px solid var(--border-color); font-size:0.875rem;">
                                            <option value="None" ${s.tag === 'None' ? 'selected' : ''}>None</option>
                                            <option value="Dream" ${s.tag === 'Dream' ? 'selected' : ''}>Dream</option>
                                            <option value="Target" ${s.tag === 'Target' ? 'selected' : ''}>Target</option>
                                            <option value="Safe" ${s.tag === 'Safe' ? 'selected' : ''}>Safe</option>
                                        </select>
                                    </div>
                                    <div style="flex:1; display:flex; flex-direction:column;">
                                        <label style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:0.25rem;">Personal Notes</label>
                                        <textarea class="form-control notes-input" data-id="${opt.id}" placeholder="e.g. Near home, good stipend..." style="flex:1; width:100%; min-height:60px; padding:0.5rem; border-radius:4px; border:1px solid var(--border-color); font-size:0.875rem; resize:vertical; font-family:inherit;">${s.notes}</textarea>
                                    </div>
                                </div>
                                
                                <!-- Actions -->
                                <div style="display:flex; align-items:center;">
                                    <button class="remove-btn" data-id="${opt.id}" style="background:transparent; border:none; color:var(--danger); cursor:pointer; font-size:1.5rem;" title="Remove">&times;</button>
                                </div>
                                
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        content.innerHTML = html;
        
        // HTML5 Drag and Drop Logic
        const listEl = document.getElementById('sortable-list');
        let draggedItem = null;

        listEl.addEventListener('dragstart', (e) => {
            const item = e.target.closest('.shortlist-item');
            if (!item) return;
            draggedItem = item;
            setTimeout(() => item.style.opacity = '0.5', 0);
        });

        listEl.addEventListener('dragend', (e) => {
            if (draggedItem) {
                draggedItem.style.opacity = '1';
                draggedItem = null;
                
                // Save new order
                const newOrder = Array.from(listEl.querySelectorAll('.shortlist-item')).map(el => parseInt(el.dataset.id, 10));
                stateModule.reorderShortlist(newOrder);
            }
        });

        listEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = getDragAfterElement(listEl, e.clientY);
            const draggable = draggedItem;
            if (draggable == null) return;
            
            if (afterElement == null) {
                listEl.appendChild(draggable);
            } else {
                listEl.insertBefore(draggable, afterElement);
            }
        });

        function getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll('.shortlist-item:not([style*="opacity: 0.5"])')];
            
            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }
        
        // Event Listeners for Inline edits
        let debounceTimer;
        content.addEventListener('input', (e) => {
            if (e.target.classList.contains('notes-input')) {
                const id = parseInt(e.target.dataset.id, 10);
                const notes = e.target.value;
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    stateModule.updateShortlistItem(id, { notes });
                }, 500);
            }
        });
        
        content.addEventListener('change', (e) => {
            if (e.target.classList.contains('tag-select')) {
                const id = parseInt(e.target.dataset.id, 10);
                const tag = e.target.value;
                stateModule.updateShortlistItem(id, { tag });
            }
        });
        
        content.addEventListener('click', (e) => {
            if (e.target.classList.contains('fav-toggle')) {
                const id = parseInt(e.target.dataset.id, 10);
                const item = stateModule.state.shortlist.find(i => i.id === id);
                if (item) {
                    const newFav = !item.isFavorite;
                    stateModule.updateShortlistItem(id, { isFavorite: newFav });
                    e.target.style.color = newFav ? '#FFD700' : 'var(--border-color)';
                }
            }
            if (e.target.classList.contains('remove-btn')) {
                const id = parseInt(e.target.dataset.id, 10);
                stateModule.toggleShortlist(id);
                renderShortlist(container); // re-render
            }
        });

        const clearBtn = document.getElementById('btn-clear-shortlist');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear your entire shortlist?')) {
                    stateModule.clearShortlist();
                    renderShortlist(container);
                }
            });
        }

    } catch (e) {
        content.innerHTML = `<div class="card p-4 text-danger">Failed to load shortlist: ${e.message}</div>`;
    }
}
