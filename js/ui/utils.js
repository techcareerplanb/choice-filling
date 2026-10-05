
export function getRankLabel() {
    const c = localStorage.getItem('activeCounselling') || 'All-India';
    return c === 'All-India' ? 'All India Rank (AIR)' : 'State Rank';
}

export function getRankShortLabel() {
    const c = localStorage.getItem('activeCounselling') || 'All-India';
    return c === 'All-India' ? 'AIR' : 'Rank';
}
