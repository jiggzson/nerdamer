import { PolynomialError, UnsupportedOperationError } from '../../../core/errors';

/**
 * Polynomial representation and unsupported-operation failures allow a rational
 * strategy to decline. Unexpected exceptions, including resource/stack failures,
 * must propagate instead of becoming an unverified result or unsupported input.
 */
export function isExpectedError(error: unknown): boolean {
	const retval = error instanceof PolynomialError || error instanceof UnsupportedOperationError;
	return retval;
}

/** Rethrows unexpected failures while allowing typed unsupported-domain fallbacks. */
export function rethrowUnexpected(error: unknown): void {
	if (!isExpectedError(error)) {
		throw error;
	}
}
