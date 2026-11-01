// Parser Constants
export const E = 'e';
export const PI_NAME = 'pi';
export const PI_SYMBOL = 'π';
export const DEFAULT_IMAGINARY = 'i';
/** Reserved integer parameter used to describe indexed solution families. */
export const INTEGER_PARAM = '_n';
export const ALL_SYMBOL = 'all';
export const ALIASES: Readonly<Record<string, string>> = Object.freeze({
	[PI_SYMBOL]: PI_NAME,
	'∞': 'Inf',
});
export const PI: readonly string[] = Object.freeze([PI_NAME, PI_SYMBOL]);
export const INFINITY: readonly string[] = Object.freeze(['Inf', 'Infinity', '∞']);
