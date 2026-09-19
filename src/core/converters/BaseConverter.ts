import { Expression } from '../classes/expression/Expression';
import {
	COLLECTION,
	dataTypes,
	DICTIONARY,
	EQUATION,
	MATRIX,
	NTHROOT,
	SET,
	SOLUTIONS_SET,
	SQRT,
	VECTOR,
} from '../classes/parser/constants';
import { message } from '../errors';

import type { SolutionSet } from '../../solve/classes/SolutionSet';
import type { Collection } from '../classes/collection/Collection';
import type { Dictionary } from '../classes/dictionary/Dictionary';
import type { Equation } from '../classes/equation/Equation';
import type { Matrix } from '../classes/matrix/Matrix';
import type { FracArray } from '../classes/parser/types';
import type { OptionsObject } from '../classes/parser/types';
import type { Rational } from '../classes/rational/Rational';
import type { ValuesSet } from '../classes/valuesSet/ValuesSet';
import type { Vector } from '../classes/vector/Vector';
import type { ParserEntity } from '../types';

const modes = {
	TeX: 'TeX',
	TEXT: 'text',
};

type BracketType = 'parens' | 'square' | 'brace' | 'abs';

/**
 * Shared formatting pipeline for Nerdamer converters.
 *
 * @remarks
 * This is an implementation base class. Public callers should construct `Converter`
 * through `nerdamer.classes.Converter`; subclasses provide the
 * expression-specific formatting hooks used by {@link BaseConverter.convert}.
 *
 * Conversion separates every expression into multiplier, value, and power fragments,
 * each with numerator and denominator slots. Keeping those fragments separate lets the
 * final formatting step place negative powers and rational multipliers into one
 * denominator without algebraically rewriting the caller's symbolic value.
 */
export class BaseConverter {
	protected static readonly GREEK_LETTERS = [
		'alpha',
		'beta',
		'gamma',
		'delta',
		'epsilon',
		'zeta',
		'eta',
		'theta',
		'iota',
		'kappa',
		'lambda',
		'mu',
		'nu',
		'xi',
		'omnikron',
		'pi',
		'rho',
		'sigma',
		'tau',
		'upsilon',
		'phi',
		'chi',
		'psi',
		'omega',
		'Gamma',
		'Delta',
		'Epsilon',
		'Theta',
		'Lambda',
		'Xi',
		'Pi',
		'Sigma',
		'Phi',
		'Psi',
		'Omega',
	];
	static readonly modes = modes;

	protected greek = BaseConverter.GREEK_LETTERS;

	private readonly modes = [modes.TeX, modes.TEXT];
	protected mode: string = this.modes[0];

	public static convertNtRoot(input: Expression, root: Expression): Expression {
		return Expression.toFunction(NTHROOT, [BaseConverter.strip(input), root]);
	}

	public static convertSQRT(input: Expression): Expression {
		return Expression.toFunction(SQRT, [BaseConverter.strip(input)]);
	}

	private static join(n: string, d: string, glue: string): string {
		if (!n && !d) {
			return '';
		}
		if (n && !d) {
			return n;
		}
		if (d && !n) {
			return d;
		}
		return n + glue + d;
	}

	private static merge(a: FracArray, b: FracArray): FracArray {
		return [a[0] + b[0], a[1] + b[1]];
	}

	private static strip(input: Expression): Expression {
		const arg = new Expression(input);
		delete arg.power;
		delete arg.multiplier;
		return arg;
	}

	protected cleanup(): void {
		// Override in subclasses if needed
	}

	protected convertPower(input: Expression, power: Expression, options: OptionsObject): string {
		return power.isOne() || (input.isNUM() && power.isZero())
			? ''
			: this.convert(power, options);
	}

	protected finalizePowerAndInput(
		power: Expression,
		input: Expression,
		_options?: OptionsObject
	): [Expression, Expression] {
		return [power, input];
	}

	protected formatPowerOutput(pArray: FracArray, requiresBrackets: boolean): FracArray {
		const retval: FracArray = ['', ''];
		for (let i = 0; i < pArray.length; i++) {
			const p = pArray[i];
			if (p === '') {
				retval[i] = '';
				continue;
			}

			const formatted =
				this.mode === BaseConverter.modes.TEXT && requiresBrackets
					? this.inBrackets(p)
					: this.inBraces(p);

			retval[i] = '^' + formatted;
		}
		return retval;
	}

	protected formatSubscripts(value: string): string {
		const parts = value.split('_');
		let formatted = '';

		while (parts.length > 1) {
			formatted = '_' + this.inBraces(parts.pop()! + formatted);
		}

		return parts[0] + formatted;
	}

	protected getMultiplicationSymbol(): string {
		return this.mode === 'TeX' ? ' \\cdot ' : '*';
	}

	protected inBraces(value: string): string {
		return this.mode === BaseConverter.modes.TEXT ? value : `{${value}}`;
	}

	protected inBrackets(value: string, type: BracketType = 'parens'): string {
		const bracketTypes: Record<BracketType, [string, string]> = {
			parens: ['(', ')'],
			square: ['[', ']'],
			brace: ['{', '}'],
			abs: ['|', '|'],
		};

		const [L, R] = bracketTypes[type];

		if (this.mode === BaseConverter.modes.TEXT) {
			return `${L}${value}${R}`;
		}
		if (type === 'brace') {
			return `\\left\\{${value}\\right\\}`;
		}
		return `\\left${L}${value}\\right${R}`;
	}

	protected initInput(input: Expression): Expression {
		return input;
	}

	protected isBracketed(v: string): boolean {
		return /^\\left\(.+\\right\)$/.test(v);
	}

	protected requiresMultiplicationSymbol(input: Expression): boolean {
		return input.isSum();
	}

	protected set(m: FracArray, v: FracArray, p: FracArray, input: Expression): string {
		const mul = this.getMultiplicationSymbol();
		const combinePower = input.isProduct();

		// Format power
		let tp: string | undefined;
		if (p) {
			const power = input.getPower();
			const requiresBrackets =
				((power.isSum() || power.isProduct()) && power.isLinear()) ||
				(power.isNUM() && !power.isInteger()) ||
				power.getPower().sign() === -1;

			p = this.formatPowerOutput(p, requiresBrackets);
		}

		if (combinePower) {
			tp = p[0];
			p[0] = '';
		}

		// Merge v and p
		v = BaseConverter.merge(v, p);
		let [mn, md] = m;
		const [vn, vd] = v;

		// Filter out unnecessary ones
		if (vn && Number(mn) === 1) {
			mn = '';
		}
		if (Number(md) === 1) {
			md = '';
		}

		const addMultiplication = this.requiresMultiplicationSymbol(input);
		const alwaysMul = this.mode === BaseConverter.modes.TeX;
		const top = BaseConverter.join(
			mn,
			vn,
			alwaysMul || !this.isBracketed(vn) || addMultiplication ? mul : ''
		);
		let bottom = BaseConverter.join(
			md,
			vd,
			alwaysMul || !this.isBracketed(vd) || addMultiplication ? mul : ''
		);

		if (md && vd && this.mode === BaseConverter.modes.TEXT) {
			bottom = this.inBrackets(bottom);
		}

		if (top && bottom) {
			let frac = this.toFraction(top, bottom);
			if (combinePower && tp) {
				frac = this.inBrackets(frac) + tp;
			}
			return frac;
		}

		return top;
	}

	protected setMultiplier(
		m: Rational,
		multiplierArray: FracArray,
		_input: Expression,
		options?: OptionsObject
	): void {
		if (options?.decimal) {
			multiplierArray[0] = m.isInteger() ? String(m.numerator) : m.text(options);
		} else {
			multiplierArray[0] = String(m.numerator);
			multiplierArray[1] = String(m.denominator);
		}
	}

	protected toFraction(n: string, d: string): string {
		if (this.mode === 'TeX') {
			return (
				'\\frac' +
				this.inBraces(this.stripOuterBrackets(n)) +
				this.inBraces(this.stripOuterBrackets(d))
			);
		}
		return `${n}/${d}`;
	}

	protected value(
		_input: Expression,
		_isInverted: boolean,
		_isNegative: boolean,
		_options?: OptionsObject
	): FracArray {
		return ['', ''];
	}

	private convertCollection(input: Collection, options: OptionsObject): string {
		const elements = input.elements.map(e => this.convert(e, options));
		const inner = elements.join(this.mode === BaseConverter.modes.TeX ? ', \\, ' : ', ');
		return this.inBrackets(inner);
	}

	private convertDictionary(input: Dictionary, options: OptionsObject): string {
		const pairs = input.entries().map(([key, value]) => {
			const convertedValue = this.convert(value, options);
			if (this.mode === BaseConverter.modes.TeX) {
				return `${key} \\mapsto ${convertedValue}`;
			}
			return `${key} => ${convertedValue}`;
		});

		const inner = pairs.join(this.mode === BaseConverter.modes.TeX ? ', \\, ' : ', ');

		if (this.mode === BaseConverter.modes.TeX) {
			return `\\left\\{${inner}\\right\\}`;
		}
		return `{${inner}}`;
	}

	private convertEquation(input: Equation, options: OptionsObject): string {
		return `${this.convert(input.LHS, options)}=${this.convert(input.RHS, options)}`;
	}

	private convertExpression(input: Expression, options: OptionsObject): string {
		input = this.initInput(input);

		const pExpr = input.getPower();
		// Complex exponents are not ordered, and signFree() would replace them with their modulus.
		// Preserve them verbatim instead of trying to move them into the denominator.
		const isComplexPower = pExpr.isComplex();
		const power = isComplexPower ? pExpr : pExpr.signFree();
		const isInverted =
			!isComplexPower && (pExpr.lt(0) || pExpr.sign() === -1);
		const isNegative = input.getMultiplier().isNegative();
		const m = input.getMultiplier().abs();

		const multiplierArray: FracArray = ['', ''];
		if (!options.ignoreMultiplier) {
			this.setMultiplier(m, multiplierArray, input, options);
		}

		const [finalPower, finalInput] = this.finalizePowerAndInput(power, input, options);
		const valueArray = this.value(finalInput, isInverted, isNegative, options);
		const p = this.convertPower(finalInput, finalPower, options);

		const powerArray: FracArray = ['', ''];
		powerArray[isInverted ? 1 : 0] = p;

		const result =
			(isNegative ? '-' : '') + this.set(multiplierArray, valueArray, powerArray, finalInput);

		this.cleanup();

		return result.replace(/\+-/g, '-');
	}

	private convertMatrix(input: Matrix, options: OptionsObject): string {
		let retval: string;
		if (this.mode === BaseConverter.modes.TEXT) {
			const rows = input.elements.map(row => {
				return `[${row.map(e => this.convert(e, options)).join(', ')}]`;
			});
			retval = `matrix(${rows.join(', ')})`;
		} else {
			const style = options.matrixStyle || '';
			const matrixOptions = { ...options, insideMatrix: true };
			const rows = input.elements.map(row =>
				row.map(e => this.convert(e, matrixOptions)).join(' & ')
			);
			retval = `\\begin{${style}matrix} ${rows.join(' \\\\ ')} \\end{${style}matrix}`;
		}
		return retval;
	}

	private convertValuesSet(input: ValuesSet, options: OptionsObject): string {
		const elements = input.elements.map(e => this.convert(e, options));
		const inner = elements.join(this.mode === BaseConverter.modes.TeX ? ', \\, ' : ', ');

		if (this.mode === BaseConverter.modes.TeX) {
			return `\\left\\{${inner}\\right\\}`;
		}
		return `{${inner}}`;
	}

	/**
	 * Removes a single outer \left(...\right) wrapper when the contents
	 * will already be visually grouped (e.g. inside \frac{}{}).
	 */
	private stripOuterBrackets(s: string): string {
		const left = '\\left(';
		const right = '\\right)';
		let retval = s;

		if (s.startsWith(left) && s.endsWith(right)) {
			let depth = 0;
			let isOuterWrapper = true;

			for (let i = 0; i < s.length && isOuterWrapper; ) {
				if (s.startsWith(left, i)) {
					depth++;
					i += left.length;
				} else if (s.startsWith(right, i)) {
					depth--;
					i += right.length;
					if (depth === 0 && i < s.length) {
						isOuterWrapper = false;
					} else if (depth < 0) {
						isOuterWrapper = false;
					}
				} else {
					i++;
				}
			}

			if (isOuterWrapper && depth === 0) {
				retval = s.slice(left.length, -right.length);
			}
		}

		return retval;
	}

	/**
	 * Formats a supported Nerdamer value in the converter's current mode.
	 *
	 * @remarks
	 * String input is parsed before formatting, so current parser settings, constants,
	 * and known values apply. Numbers are converted with JavaScript's string conversion.
	 * Expressions, equations, collections, vectors, matrices, solution sets, value sets,
	 * and dictionaries use their structured representations rather than being reparsed
	 * from display text.
	 * Reading an expression can initialize its lazily stored multiplier or power fields,
	 * but conversion does not change the expression's mathematical value.
	 *
	 * `convertRoots` defaults to `true`, rendering reciprocal integer powers as roots
	 * where the active mode supports that form. `decimal` requests decimal rational
	 * multipliers, `precision` is forwarded to rational formatting, `matrixStyle`
	 * selects the TeX matrix environment prefix, and `ignoreMultiplier` omits an
	 * expression's top-level multiplier. `insideMatrix` is used while formatting matrix
	 * elements and is normally managed by the converter itself.
	 *
	 * @param input - The parser entity, expression string, or number to format.
	 * @param options - Formatting options for this conversion and recursive child conversions.
	 * @returns The formatted text or TeX string for `input`.
	 * @throws Error When `input` is not one of the supported parser entity types.
	 */
	public convert(input: ParserEntity | string | number, options?: OptionsObject): string {
		options = { convertRoots: true, ...options };

		if (typeof input === 'number') {
			return String(input);
		}

		if (typeof input === 'string' || Expression.isExpression(input)) {
			return this.convertExpression(Expression.create(input), options);
		}

		if (input.dataType === COLLECTION) {
			return this.convertCollection(input as Collection, options);
		}

		if (input.dataType === EQUATION) {
			return this.convertEquation(input as Equation, options);
		}

		if (input.dataType === VECTOR) {
			const vector = input as Vector;
			const separator = options.insideMatrix
				? ' & '
				: this.mode === BaseConverter.modes.TeX
					? ', \\, '
					: ', ';
			const inner = vector.arrayMap(e => this.convert(e, options)).join(separator);
			return options.insideMatrix ? inner : this.inBrackets(inner, 'square');
		}

		if (input.dataType === MATRIX) {
			return this.convertMatrix(input as Matrix, options);
		}

		if (input.dataType === SOLUTIONS_SET) {
			return this.convertValuesSet(input as SolutionSet, options);
		}

		if (input.dataType === SET) {
			return this.convertValuesSet(input as ValuesSet, options);
		}

		if (input.dataType === DICTIONARY) {
			return this.convertDictionary(input as Dictionary, options);
		}

		throw new Error(
			message('unsupportedType', { type: dataTypes[input.dataType] || typeof input })
		);
	}

	/**
	 * Selects the output syntax used by subsequent conversions.
	 *
	 * @remarks
	 * The mode is mutable converter state. Supported values are `"TeX"` and `"text"`;
	 * changing the mode does not alter parser settings or previously returned strings.
	 *
	 * @param mode - The output mode to activate.
	 * @throws Error When `mode` is not `"TeX"` or `"text"`.
	 */
	public setMode(mode: string): void {
		if (!this.modes.includes(mode)) {
			throw new Error(message('unrecognizedMode', { mode }));
		}
		this.mode = mode;
	}
}
