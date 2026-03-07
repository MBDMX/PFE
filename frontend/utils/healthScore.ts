export function calcHealthScore(lastMaintenanceDays: number, breakdownCount: number): number {
    const base = 100 - breakdownCount * 10;
    const decay = Math.min(lastMaintenanceDays * 0.5, 50);
    return Math.max(0, Math.round(base - decay));
}
