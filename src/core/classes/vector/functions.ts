import type { Vector } from './Vector';

/**
 * Computes the dot product of two vectors
 * @param a The first vector
 * @param b The second vector
 * @returns
 */
export function dot(a: Vector, b: Vector) {
	return a.dot(b);
}

/**
 * Computes the cross product of two vectors
 * @param a
 * @param b
 * @returns
 */
export function cross(a: Vector, b: Vector) {
	return a.cross(b);
}
