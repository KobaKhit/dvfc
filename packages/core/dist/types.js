/**
 * Core types for coordboard dashboard specifications
 * Defines the structure of YAML/JSON board configurations
 */
/**
 * Type guard to check if an object is a valid DashboardSpec
 */
export function isDashboardSpec(obj) {
    if (typeof obj !== 'object' || obj === null)
        return false;
    const spec = obj;
    return (typeof spec.meta === 'object' &&
        spec.meta !== null &&
        Array.isArray(spec.data) &&
        Array.isArray(spec.charts));
}
/**
 * Create a minimal valid dashboard spec
 */
export function createEmptySpec() {
    return {
        meta: {
            title: 'Untitled Dashboard',
            version: '0.1.0'
        },
        data: [],
        charts: []
    };
}
