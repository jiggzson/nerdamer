import { SolutionSet } from '../../solve/classes/SolutionSet';
import { Dictionary } from '../classes/dictionary/Dictionary';
import { Expression } from '../classes/expression/Expression';
import { Matrix } from '../classes/matrix/Matrix';
import { dataTypes } from '../classes/parser/constants';
import { SQRT } from '../classes/parser/constants';
import { ValuesSet } from '../classes/valuesSet/ValuesSet';
import { Vector } from '../classes/vector/Vector';
import { message } from '../errors';

import type { FracArray } from '../classes/parser/types';
import type { ParserInputType } from '../classes/parser/types';
import type { OptionsObject } from '../classes/parser/types';
import type { Rational } from '../classes/rational/Rational';

const modes = {
	TeX: 'TeX',
	TEXT: 'text',
};

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

	readonly modes = [modes.TeX, modes.TEXT];
	protected mode: string = this.modes[0];

	static convertNtRoot(input: Expression, root: Expression): Expression {
		return Expression.toFunction('nthroot', [BaseConverter.strip(input), root]);
	}

	static convertSQRT(input: Expression): Expression {
		return Expression.toFunction(SQRT, [BaseConverter.strip(input)]);
	}

	static join(n: string, d: string, glue: string): string {
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

	static merge(a: FracArray, b: FracArray): FracArray {
		return [a[0] + b[0], a[1] + b[1]];
	}

	static strip(input: Expression): Expression {
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
		return pArray.map(p => {
			if (!p) {
				return '';
			}

			const formatted =
				this.mode === BaseConverter.modes.TEXT && requiresBrackets
					? this.inBrackets(p)
					: this.inBraces(p);

			return '^' + formatted;
		}) as FracArray;
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

	protected inBrackets(value: string, type: string = 'parens'): string {
		const bracketTypes = {
			parens: ['(', ')'],
			square: ['[', ']'],
			brace: ['{', '}'],
			abs: ['|', '|'],
		};

		const [L, R] = bracketTypes[type];

		if (this.mode === BaseConverter.modes.TEXT) {
			return `${L}${value}${R}`;
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
			multiplierArray[0] = m.toDecimalString();
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

	/**
	 * Removes a single outer \left(...\right) wrapper when the contents
	 * will already be visually grouped (e.g. inside \frac{}{}).
	 */
	private stripOuterBrackets(s: string): string {
		const m = s.match(/^\\left\((.+)\\right\)$/);
		return m ? m[1] : s;
	}

	protected value(
		_input: Expression,
		_isInverted: boolean,
		_isNegative: boolean,
		_options?: OptionsObject
	): FracArray {
		return ['', ''];
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

	private convertExpression(input: Expression, options: OptionsObject): string {
		input = this.initInput(input);

		const pExpr = input.getPower();
		const power = pExpr.signFree();
		// Numeric exponents support lt(0), but symbolic negatives (e.g. -n) typically don't.
		// Treat an exponent as inverted if its sign is negative, even when symbolic.
		const isInverted = pExpr.lt(0) || pExpr.sign() === -1;
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
		const style = options.matrixStyle || '';
		const matrixOptions = { ...options, insideMatrix: true };
		const rows = input.elements.map(row =>
			row.map(e => this.convert(e, matrixOptions)).join(' & ')
		);
		return `\\begin{${style}matrix} ${rows.join(' \\\\ ')} \\end{${style}matrix}`;
	}

	private convertValuesSet(input: ValuesSet, options: OptionsObject): string {
		const elements = input.elements.map(e => this.convert(e, options));
		const inner = elements.join(this.mode === BaseConverter.modes.TeX ? ', \\, ' : ', ');

		if (this.mode === BaseConverter.modes.TeX) {
			return `\\left\\{${inner}\\right\\}`;
		}
		return `{${inner}}`;
	}

	convert(input: ParserInputType | string | number, options?: OptionsObject): string {
		options = { convertRoots: true, ...options };

		if (typeof input === 'number') {
			return String(input);
		}

		if (typeof input === 'string' || Expression.isExpression(input)) {
			return this.convertExpression(Expression.create(input), options);
		}

		if (Vector.isVector(input)) {
			const separator = options.insideMatrix
				? ' & '
				: this.mode === BaseConverter.modes.TeX
					? ', \\, '
					: ', ';
			return input.arrayMap(e => this.convert(e as Vector, options)).join(separator);
		}

		if (Matrix.isMatrix(input)) {
			return this.convertMatrix(input, options);
		}

		if (SolutionSet.isSolutionSet(input)) {
			return this.convertValuesSet(input, options);
		}

		if (ValuesSet.isValuesSet(input)) {
			return this.convertValuesSet(input, options);
		}

		if (Dictionary.isDictionary(input)) {
			return this.convertDictionary(input, options);
		}

		throw new Error(
			message('unsupportedType', { type: dataTypes[input.dataType] || typeof input })
		);
	}

	setMode(mode: string): void {
		if (!this.modes.includes(mode)) {
			throw new Error(message('unrecognizedMode', { mode }));
		}
		this.mode = mode;
	}
}
