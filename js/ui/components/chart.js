/**
 * Native Vanilla JS SVG Chart Generator for Cutoff Trends
 * Returns an HTML string representing the SVG.
 */

export function renderSVGChart(cutoffs, userAIR) {
    if (!cutoffs || cutoffs.length === 0) {
        return `<div class="text-muted text-center p-4">No data available for chart</div>`;
    }

    // Sort chronologically: by year, then by round
    const sorted = [...cutoffs].sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.round - b.round;
    });

    // Extract valid points
    const points = sorted.filter(c => c.closingRank !== null).map(c => ({
        label: `${c.year} R${c.round}`,
        rank: c.closingRank
    }));

    if (points.length === 0) {
        return `<div class="text-muted text-center p-4">No valid data points for chart</div>`;
    }

    // Dimensions
    const svgWidth = 800;
    const svgHeight = 300;
    const padding = { top: 40, right: 40, bottom: 40, left: 80 };
    const chartWidth = svgWidth - padding.left - padding.right;
    const chartHeight = svgHeight - padding.top - padding.bottom;

    // Y-Axis limits (Inverted: Top is Rank 1, Bottom is maxRank)
    // Find min and max ranks to scale appropriately, padding the top and bottom
    let minRank = Math.min(...points.map(p => p.rank), userAIR || Infinity);
    let maxRank = Math.max(...points.map(p => p.rank), userAIR || -Infinity);
    
    // Add 10% buffer
    const range = Math.max(maxRank - minRank, 1000);
    const yTop = Math.max(1, minRank - range * 0.1); 
    const yBottom = maxRank + range * 0.1;

    // Helper functions
    const scaleX = (index) => padding.left + (points.length > 1 ? (index / (points.length - 1)) * chartWidth : chartWidth / 2);
    // Y scale is inverted: smaller rank = higher Y (closer to 0 in SVG coords = top)
    const scaleY = (rank) => {
        const ratio = (rank - yTop) / (yBottom - yTop);
        return padding.top + (ratio * chartHeight);
    };

    // Build Line Path
    let d = '';
    points.forEach((p, i) => {
        const x = scaleX(i);
        const y = scaleY(p.rank);
        if (i === 0) d += `M ${x} ${y} `;
        else d += `L ${x} ${y} `;
    });

    // Build SVG Elements
    let svg = `<svg viewBox="0 0 ${svgWidth} ${svgHeight}" style="width:100%; height:auto; background:var(--bg-main); border-radius:8px; font-family:sans-serif;">`;
    
    // Grid Lines
    for(let i = 1; i <= 4; i++) {
        const rankLevel = Math.round(yTop + (yBottom - yTop) * (i/5));
        const yLine = scaleY(rankLevel);
        svg += `<line x1="${padding.left}" y1="${yLine}" x2="${svgWidth - padding.right}" y2="${yLine}" stroke="var(--border-color)" stroke-dasharray="4" />`;
        svg += `<text x="${padding.left - 10}" y="${yLine + 4}" fill="var(--text-muted)" font-size="12" text-anchor="end">${rankLevel.toLocaleString()}</text>`;
    }

    // Line Path
    svg += `<path d="${d}" fill="none" stroke="var(--primary-color)" stroke-width="3" />`;

    // Data Points
    points.forEach((p, i) => {
        const x = scaleX(i);
        const y = scaleY(p.rank);
        svg += `<circle cx="${x}" cy="${y}" r="5" fill="var(--primary-color)" />`;
        svg += `<text x="${x}" y="${y - 12}" fill="currentColor" font-size="12" font-weight="bold" text-anchor="middle">${p.rank.toLocaleString()}</text>`;
        svg += `<text x="${x}" y="${svgHeight - 15}" fill="var(--text-muted)" font-size="12" text-anchor="middle">${p.label}</text>`;
    });

    // User AIR Line
    if (userAIR && userAIR >= yTop && userAIR <= yBottom) {
        const yUser = scaleY(userAIR);
        svg += `<line x1="${padding.left}" y1="${yUser}" x2="${svgWidth - padding.right}" y2="${yUser}" stroke="var(--warning)" stroke-width="2" stroke-dasharray="6" />`;
        svg += `<rect x="${svgWidth - padding.right - 80}" y="${yUser - 10}" width="80" height="20" fill="var(--warning)" rx="4"/>`;
        svg += `<text x="${svgWidth - padding.right - 40}" y="${yUser + 4}" fill="white" font-size="12" font-weight="bold" text-anchor="middle">Your AIR</text>`;
    }

    svg += `</svg>`;
    return svg;
}
