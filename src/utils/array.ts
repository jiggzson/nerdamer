/* --------------------- ABOUT THIS LIB --------------------- */
// This library ideally does not utilize any of the classes in nerdamer and sticks to pure TypeScript
// Use core.math.utils instead if it's a library specific utility function.

/**
 * Removes an element from an array
 * @param arr
 * @param value
 * @returns
 */
export function remove<T>(arr: T[], value: T): T[] {
	const index = arr.indexOf(value);
	if (index > -1) {
		arr.splice(index, 1);
	}
	return arr;
}

/**
 * Checks if two array are equal/having the same elements
 *
 * @param arr1
 * @param arr2
 * @returns
 */
export function isEqualArray<T>(arr1: T[], arr2: T[]) {
	// If they're not the same length then we're done
	if (arr1.length !== arr2.length) {
		return false;
	}
	// Check each element
	for (const a of arr1) {
		if (!arr2.includes(a)) {
			return false;
		}
	}

	return true;
}

/**
 * Combines an array and sorts it
 *
 * @param a
 * @param b
 * @returns
 */
export function combinedArray<T>(a: T[], b: T[]): T[] {
	return [...new Set(a.concat(b))].sort();
}

/**
 * IMPROVE: Look into using Set.intersection
 * Gets the intersection of two arrays. This can probably be replaced with Set.intersection in the future
 *
 * @param arr1
 * @param arr2
 * @returns
 */
export function intersection<T>(arr1: T[], arr2: T[]) {
	// Ensure that we're looping over the shorter array
	if (arr1.length > arr2.length) {
		return intersection(arr2, arr1);
	}

	const retval: T[] = [];
	for (const e of arr1) {
		if (arr2.includes(e)) {
			retval.push(e);
		}
	}

	return retval;
}

/**
 * Sorts two arrays in the same other maintaining the indices of the values
 *
 * @param arr1
 * @param arr2
 * @param compareFn
 * @returns
 */
export function syncSort(arr1, arr2, compareFn) {
	const indices = arr1.map((_, index) => index);

	indices.sort((a, b) => compareFn(arr1[a], arr1[b]));

	const sortedArr1 = indices.map(index => arr1[index]);
	const sortedArr2 = indices.map(index => arr2[index]);

	return [sortedArr1, sortedArr2];
}

export function allEqual<T>(arr: T[]) {
	// An empty array is considered to have all elements "the same"
	if (arr.length === 0) {
		return true;
	}

	const firstElement = arr[0];
	return arr.every(element => element === firstElement);
}
