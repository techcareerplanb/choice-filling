export async function renderHome(container) {
    container.innerHTML = `
        <div class="container text-center mt-8">
            <h1 class="mb-4">Select a Counselling</h1>
            <div id="counselling-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div class="spinner mx-auto"></div>
            </div>
        </div>
    `;

    try {
        const res = await fetch('/api/counsellings');
        const data = await res.json();
        
        const listDiv = document.getElementById('counselling-list');
        listDiv.innerHTML = '';
        
        if (data.success && data.counsellings) {
            data.counsellings.forEach(c => {
                const btn = document.createElement('button');
                btn.className = 'btn btn-outline p-4 text-lg font-medium';
                btn.textContent = c.replace(/_/g, ' ');
                btn.onclick = () => {
                    localStorage.setItem('activeCounselling', c);
                    // clear old cache so it fetches new metadata
                    sessionStorage.clear();
                    window.location.hash = '#/results';
                    window.location.reload();
                };
                listDiv.appendChild(btn);
            });
        }
    } catch (e) {
        document.getElementById('counselling-list').innerHTML = '<p class="text-error">Failed to load counsellings.</p>';
    }
}
