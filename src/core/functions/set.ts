

/**
 * Gets the intersection of two sets
 * 
 * @param a 
 * @param b
 */
export function intersection(a, b) {
    return new Set([...a].filter(x => b.has(x)));
}

/**
 * Gets the difference of two sets
 * 
 * @param a 
 * @param b 
 * @returns 
 */
export function difference(a, b) {
    return new Set([...a].filter(x => !b.has(x)));
}

/**
 * Return the union of two sets
 * 
 * @param a 
 * @param b 
 * @returns 
 */
export function union(a, b) {
    return new Set([...a, ...b]);
}