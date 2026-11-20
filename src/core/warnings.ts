import { message } from './errors';

/** Non-fatal diagnostic information; never a substitute for a mathematical error. */
export type NerdamerWarning = Readonly<{
	code: string;
	message: string;
}>;

export type WarningHandler = (warning: NerdamerWarning) => void;

// Compatibility warnings are process-wide until evaluation contexts are available.
const warnings: NerdamerWarning[] = [];
let handler: WarningHandler | undefined;
let consoleWarnings = false;

/** Records a warning and forwards it to configured reporters. */
export function warn(code: string, message: string): void {
	const warning: NerdamerWarning = Object.freeze({ code, message });
	warnings.push(warning);

	if (handler) {
		handler(warning);
	}

	if (consoleWarnings && typeof console !== 'undefined' && typeof console.warn === 'function') {
		console.warn(message);
	}
}

/**
 * Wraps a function under a deprecated name. The wrapper runs `fn` unchanged and records an
 * `api.deprecatedFunction` warning naming `name` and the `replacement` to use instead.
 *
 * @example
 * ```ts
 * nerdamer.solveEquations = alias(solveSystem, 'solveEquations', 'solveeqs');
 * ```
 */
export function alias<A extends unknown[], R>(fn: (...args: A) => R, name: string, replacement: string): (...args: A) => R {
	return (...args: A) => {
		warn('api.deprecatedFunction', message('deprecatedFunctionWarning', { function: name, replacement }));
		return fn(...args);
	};
}

/** Returns an independent snapshot of the recorded warnings. */
export function getWarnings(): NerdamerWarning[] {
	return [...warnings];
}

/** Clears accumulated warnings without changing reporting settings. */
export function clearWarnings(): void {
	warnings.length = 0;
}

/** Installs or removes the application callback for new warnings. */
export function setWarningHandler(callback?: WarningHandler): void {
	handler = callback;
}

/** Enables or disables optional console output (disabled by default). */
export function setConsoleWarnings(enabled: boolean): void {
	consoleWarnings = enabled;
}
