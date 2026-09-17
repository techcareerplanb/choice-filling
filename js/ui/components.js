export function renderLoading(container, message = 'Loading...') {
    container.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>${message}</p>
        </div>
    `;
}

export function renderError(container, message) {
    container.innerHTML = `
        <div class="card" style="border-color: var(--danger); text-align: center; padding: var(--spacing-xl);">
            <h2 class="text-danger">An Error Occurred</h2>
            <p>${message}</p>
            <button class="btn btn-primary mt-4" onclick="window.location.reload()">Refresh Page</button>
        </div>
    `;
}
