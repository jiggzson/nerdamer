import { Dictionary } from '../classes/dictionary/Dictionary';
import { Expression } from '../classes/expression/Expression';
import { one, two } from '../classes/expression/shortcuts';
import { DOUBLE_FACTORIAL, FACTORIAL, INFINITY, WRAP } from '../classes/parser/constants';
import { Parser } from '../classes/parser/Parser';
import { ValuesSet } from '../classes/valuesSet/ValuesSet';

import { BaseConverter } from './BaseConverter';

import type { OptionsObject } from '../classes/parser/types';
import type { FracArray } from '../classes/parser/types';
import type { ParserInputType } from '../classes/parser/types';

const { TeX, TEXT } = BaseConverter.modes;

export class Converter extends BaseConverter {
	private static readonly TEX_FUNCTION_MAP: { [key: string]: string } = {
		// Inverse trig
		acos: 'arccos',
		asin: 'arcsin',
		atan: 'arctan',
		asec: 'operatorname{arcsec}',
		acsc: 'operatorname{arccsc}',
		acot: 'operatorname{arccot}',
		// Inverse hyperbolic
		acosh: 'operatorname{arcosh}',
		asinh: 'operatorname{arsinh}',
		atanh: 'operatorname{artanh}',
		asech: 'operatorname{arsech}',
		acsch: 'operatorname{arcsch}',
		acoth: 'operatorname{arcoth}',
		// Hyperbolic (not built-in in LaTeX)
		sech: 'operatorname{sech}',
		csch: 'operatorname{csch}',
		coth: 'operatorname{coth}',
		// Special
		realpart: 'Re',
		imagpart: 'Im',
		sign: 'operatorname{sgn}',
		sinc: 'operatorname{sinc}',
		erf: 'operatorname{erf}',
		erfc: 'operatorname{erfc}',
	};

	/**
	 * Reverse map for fromTeX: maps TeX command names back to internal function names.
	 */
	private static readonly TEX_REVERSE_MAP: { [key: string]: string } = {
		arccos: 'acos',
		arcsin: 'asin',
		arctan: 'atan',
		arcsec: 'asec',
		arccsc: 'acsc',
		arccot: 'acot',
		arcosh: 'acosh',
		arsinh: 'asinh',
		artanh: 'atanh',
		arsech: 'asech',
		arcsch: 'acsch',
		arcoth: 'acoth',
		sgn: 'sign',
		operatorname: '',
		Gamma: 'gamma',
		delta: 'dirac',
		Re: 'realpart',
		Im: 'imagpart',
	};

	constructor(mode?: 'TeX' | 'text') {
		super();
		if (mode) {
			this.setMode(mode);
		}
	}

	static clearOnes(m: FracArray, v: FracArray): [FracArray, FracArray] {
		for (let i = 0; i < 2; i++) {
			if (v[i] && Number(m[i]) === 1) {
				m[i] = '';
			}
		}
		return [m, v];
	}

	static wrapRoot(value: string, root: string): string {
		return root === '2' ? `\\sqrt{${value}}` : `\\sqrt[${root}]{${value}}`;
	}

	protected finalizePowerAndInput(
		power: Expression,
		input: Expression,
		options?: OptionsObject
	): [Expression, Expression] {
		if (!options?.convertRoots) {
			return [power, input];
		}

		const num = power.getNumerator();
		const den = power.getDenominator();

		if (num.isOne() && !power.isOne()) {
			if (this.mode === BaseConverter.modes.TEXT && den.eq(two())) {
				return [one(), BaseConverter.convertSQRT(input)];
			}
			if (this.mode === BaseConverter.modes.TeX) {
				return [one(), BaseConverter.convertNtRoot(input, den)];
			}
		}

		return [power, input];
	}

	protected functionString(input: Expression, options?: OptionsObject): string {
		const name = this.getFunctionName(input.name || '');
		const args = input.getArguments();
		const output = args.map(arg => this.convert(arg, options));

		if (this.mode === TEXT) {
			return `${name}(${output.join(',')})`;
		}

		return this.formatTeXFunction(input.name || '', name, output, args);
	}

	protected value(
		input: Expression,
		isInverted: boolean,
		isNegative: boolean,
		options?: OptionsObject
	): FracArray {
		const v: FracArray = ['', ''];
		const index = isInverted ? 1 : 0;

		if (input.isNUM()) {
			return v;
		}

		if (input.isEXP()) {
			v[index] = this.handleExp(input, options);
		} else if (input.isInf()) {
			v[index] = this.mode === 'text' ? INFINITY[0] : '\\infty';
		} else if (!(input.elements || input.args)) {
			v[index] = this.formatVariable(input.value);
		} else if (input.isFunction()) {
			v[index] = this.functionString(input, options);
		} else if (input.isSum()) {
			v[index] = this.handleSum(input, isNegative, options);
		} else if (input.isProduct()) {
			return this.handleProduct(input, options);
		}

		return v;
	}

	private formatFactorial(arg: Expression, output: string, symbol: string): string {
		if (arg.isLinear() && (arg.isSum() || arg.isProduct())) {
			output = this.inBrackets(output);
		}
		return output + symbol;
	}

	private formatSumOrProduct(symbol: string, output: string[]): string {
		const [a, b, c, d] = output;
		return `${symbol}_{${this.inBraces(b)}=${this.inBraces(c)}}^${this.inBraces(d)} ${this.inBraces(a)}`;
	}

	private formatTeXFunction(
		originalName: string,
		name: string,
		output: string[],
		args: Expression[]
	): string {
		// Standard function: \name\left(arg\right)
		const std = () => name + this.inBrackets(output[0]);

		const handlers: { [key: string]: () => string } = {
			// Basic math
			sqrt: std,
			abs: () => this.inBrackets(output[0], 'abs'),
			cbrt: () => `\\sqrt[3]${this.inBraces(output[0])}`,
			max: () => `\\max${this.inBrackets(output.join(','), 'parens')}`,
			min: () => `\\min${this.inBrackets(output.join(','), 'parens')}`,
			round: () => `\\left\\lfloor ${output[0]} \\right\\rceil`,
			mod: () => `${output[0]} \\bmod ${output[1]}`,
			[FACTORIAL]: () => this.formatFactorial(args[0], output[0], '!'),
			[DOUBLE_FACTORIAL]: () => this.formatFactorial(args[0], output[0], '!!'),

			// Trig
			cos: std,
			sin: std,
			tan: std,
			sec: std,
			csc: std,
			cot: std,

			// Inverse trig
			acos: std,
			asin: std,
			atan: std,
			asec: std,
			acsc: std,
			acot: std,
			atan2: () => name + this.inBrackets(output.join(','), 'parens'),

			// Hyperbolic
			sinh: std,
			cosh: std,
			tanh: std,
			sech: std,
			csch: std,
			coth: std,

			// Inverse hyperbolic
			acosh: std,
			asinh: std,
			atanh: std,
			asech: std,
			acsch: std,
			acoth: std,

			// Floor / ceiling
			floor: () => `\\left\\lfloor ${output[0]} \\right\\rfloor`,
			ceil: () => `\\left\\lceil ${output[0]} \\right\\rceil`,

			// Logarithms
			[Expression.LOG]: () =>
				`\\mathrm${this.inBraces(Expression.LOG)}_${this.inBraces(output[1])}${this.inBrackets(output[0])}`,
			[Expression.LOG10]: () =>
				`\\mathrm${this.inBraces(Expression.LOG)}_${this.inBraces('10')}${this.inBrackets(output[0])}`,

			// Special functions
			gamma: () => `\\Gamma${this.inBrackets(output[0])}`,
			erf: std,
			erfc: std,
			sinc: std,
			Si: () => `\\operatorname{Si}${this.inBrackets(output[0])}`,
			Shi: () => `\\operatorname{Shi}${this.inBrackets(output[0])}`,
			Ci: () => `\\operatorname{Ci}${this.inBrackets(output[0])}`,
			Chi: () => `\\operatorname{Chi}${this.inBrackets(output[0])}`,
			Ei: () => `\\operatorname{Ei}${this.inBrackets(output[0])}`,
			Li: () => `\\operatorname{Li}${this.inBrackets(output[0])}`,

			// Step / impulse
			heaviside: () => `H${this.inBrackets(output[0])}`,
			dirac: () => `\\delta${this.inBrackets(output[0])}`,
			sign: std,

			// Complex
			realpart: () => `\\Re${this.inBrackets(output[0])}`,
			imagpart: () => `\\Im${this.inBrackets(output[0])}`,

			// Calculus
			limit: () => `\\lim_${this.inBraces(output[1] + ' \\to ' + output[2])} ${output[0]}`,
			integrate: () => `\\int ${output[0]}\\, d${output[1]}`,
			defint: () =>
				`\\int_${this.inBraces(output[1])}^${this.inBraces(output[2])} ${output[0]}\\, d${output[3]}`,
			diff: () =>
				output.length === 3
					? `\\frac${this.inBraces('d^' + output[2])}${this.inBraces('d' + output[1] + '^' + output[2])} ${output[0]}`
					: `\\frac${this.inBraces('d')}${this.inBraces('d' + output[1])} ${output[0]}`,
			laplace: () => `\\mathcal{L}\\left\\{${output[0]}\\right\\}`,
			ilaplace: () => `\\mathcal{L}^{-1}\\left\\{${output[0]}\\right\\}`,
			partfrac: () =>
				`\\operatorname{partfrac}${this.inBrackets(output.join(','), 'parens')}`,

			// Summation / product
			sum: () => this.formatSumOrProduct('\\sum', output),
			product: () => this.formatSumOrProduct('\\prod', output),

			// Roots
			nthroot: () =>
				output[1] === '2'
					? `\\sqrt${this.inBraces(output[0])}`
					: `\\sqrt[${output[1]}]${this.inBraces(output[0])}`,

			// Wrapper
			[WRAP]: () => output[0],
		};

		const handler = handlers[originalName];
		if (handler) {
			return handler();
		}

		// Default case
		const formattedName = '\\mathrm' + this.inBraces(name.replace(/_/g, '\\_'));
		return formattedName + this.inBrackets(output.join(','), 'parens');
	}

	private formatVariable(value: string): string {
		return this.formatSubscripts(value)
			.split('_')
			.map((v: string, i: number) => {
				if (this.mode === BaseConverter.modes.TeX && this.greek.includes(v)) {
					v = `\\${v}`;
				}
				return i > 0 ? this.inBraces(v) : v;
			})
			.join('_');
	}

	private getFunctionName(name: string): string {
		if (this.mode !== TeX) {
			return name;
		}

		const mappedName = Converter.TEX_FUNCTION_MAP[name] || name;
		return `\\${mappedName}`;
	}

	private handleExp(input: Expression, options?: OptionsObject): string {
		const arg = input.getBase();
		let value = this.convert(arg, options);

		if (!(arg.isInteger() || arg.isVAR())) {
			value = this.inBrackets(value);
		}

		return value;
	}

	private handleProduct(input: Expression, options?: OptionsObject): FracArray {
		const mul = this.getMultiplicationSymbol();
		const numOutput: string[] = [];
		const denOutput: string[] = [];

		for (let element of input.elementsArray()) {
			if (element.isFunction(WRAP)) {
				element = element.getArguments()[0];
			}

			const isInDenominator = element.getPower().sign() === -1;
			const target = isInDenominator ? denOutput : numOutput;

			if (isInDenominator) {
				element = element.invert();
			}

			let output = this.convert(element, options);

			if (element.isSum() && element.isLinear()) {
				output = this.inBrackets(output);
			}

			target.push(output);
		}

		return [numOutput.join(mul), denOutput.join(mul)];
	}

	private handleSum(input: Expression, isNegative: boolean, options?: OptionsObject): string {
		const elements = input.elementsArray().map(e => this.convert(e, options));
		const value = elements.join('+');
		const needsBrackets = !(input.isLinear() && input.getMultiplier().isOne()) || isNegative;

		return needsBrackets ? this.inBrackets(value, 'parens') : value;
	}

	private parseTeXSetOrDictionary(inner: string): ValuesSet | Dictionary {
		// Split on commas that are not nested inside braces
		const items = this.splitTeXCommas(inner);

		// Check if this is a dictionary (entries contain \mapsto)
		const isDictionary = items.some(item => /\\mapsto/.test(item));

		if (isDictionary) {
			const entries = new Map<string, ParserInputType>();
			for (const item of items) {
				const parts = item.split(/\s*\\mapsto\s*/);
				if (parts.length === 2) {
					const key = parts[0].trim();
					const value = this.fromTeX(parts[1].trim());
					entries.set(key, value);
				}
			}
			return new Dictionary(entries);
		}

		const set = new ValuesSet();
		for (const item of items) {
			set.add(this.fromTeX(item.trim()) as Expression);
		}
		return set;
	}

	/**
	 * Clean single-pass TeX preprocessor.
	 */
	private preprocessTeXClean(input: string): string {
		let s = input;

		// --- Laplace transforms (before brace stripping) ---
		s = s.replace(
			/\\mathcal\s*\{L\}\s*\^\s*\{-1\}\s*(?:\\left\s*)?\\{(.+?)\\}\s*(?:\\right\s*)?/g,
			'ilaplace($1)'
		);
		s = s.replace(
			/\\mathcal\s*\{L\}\s*(?:\\left\s*)?\\{(.+?)\\}\s*(?:\\right\s*)?/g,
			'laplace($1)'
		);

		// --- Derivatives: \frac{d^n}{dx^n} f → diff(f, x, n) ---
		// Higher order
		s = s.replace(
			/\\frac\s*\{d\^(\w+)\}\s*\{d(\w+)\^\1\}\s*(.+)/g,
			(_m, n, v, f) => `diff(${f},${v},${n})`
		);
		// First order
		s = s.replace(/\\frac\s*\{d\}\s*\{d(\w+)\}\s*(.+)/g, (_m, v, f) => `diff(${f},${v})`);

		// --- Definite integrals ---
		s = s.replace(
			/\\int\s*_\s*\{([^}]+)\}\s*\^\s*\{([^}]+)\}\s*(.+?)\\?,?\s*d(\w+)/g,
			(_m, a, b, f, v) => `defint(${f},${a},${b},${v})`
		);

		// --- Indefinite integrals ---
		s = s.replace(/\\int\s+(.+?)\\?,?\s*d(\w+)/g, (_m, f, v) => `integrate(${f},${v})`);

		// --- Limits: \lim_{x \to a} f → limit(f, x, a) ---
		s = s.replace(
			/\\lim\s*_\s*\{(\w+)\s*\\to\s*([^}]+)\}\s*(.+)/g,
			(_m, v, a, f) => `limit(${f},${v},${a})`
		);

		// --- Sum / Product: \sum_{i=a}^{b} f → sum(f, i, a, b) ---
		s = s.replace(
			/\\sum\s*_\s*\{(\w+)=([^}]+)\}\s*\^\s*\{([^}]+)\}\s*(.+)/g,
			(_m, i, a, b, f) => `sum(${f},${i},${a},${b})`
		);
		s = s.replace(
			/\\prod\s*_\s*\{(\w+)=([^}]+)\}\s*\^\s*\{([^}]+)\}\s*(.+)/g,
			(_m, i, a, b, f) => `product(${f},${i},${a},${b})`
		);

		// --- Floor / Ceiling ---
		s = s.replace(/(?:\\left\s*)?\\lfloor\s*/g, 'floor(');
		s = s.replace(/\\rfloor\s*(?:\\right\s*)?/g, ')');
		s = s.replace(/(?:\\left\s*)?\\lceil\s*/g, 'ceil(');
		s = s.replace(/\\rceil\s*(?:\\right\s*)?/g, ')');

		// --- Special functions ---
		s = s.replace(/\\Gamma\s*/g, 'gamma');
		s = s.replace(/\\delta\s*/g, 'dirac');
		s = s.replace(/(?<![a-zA-Z])H\s*(?=\()/g, 'heaviside');
		s = s.replace(/\\Re\s*/g, 'realpart');
		s = s.replace(/\\Im\s*/g, 'imagpart');

		// --- \operatorname{name} → name ---
		s = s.replace(/\\operatorname\s*\{([^}]+)\}/g, '$1');

		// --- Inverse trig/hyperbolic TeX names → internal names ---
		for (const [texName, internalName] of Object.entries(Converter.TEX_REVERSE_MAP)) {
			if (
				texName === 'operatorname' ||
				texName === 'Gamma' ||
				texName === 'delta' ||
				texName === 'Re' ||
				texName === 'Im'
			) {
				continue; // already handled above
			}
			s = s.replace(new RegExp(`\\\\${texName}\\b`, 'g'), internalName);
		}

		// --- \bmod ---
		s = s.replace(/(.+?)\s*\\bmod\s*(.+)/g, 'mod($1,$2)');

		// --- nth root: \sqrt[n]{x} → nthroot(x,n), \sqrt{x} → sqrt(x) ---
		s = s.replace(/\\sqrt\s*\[([^\]]+)\]\s*\{([^}]+)\}/g, 'nthroot($2,$1)');
		s = s.replace(/\\sqrt\s*\{([^}]+)\}/g, 'sqrt($1)');

		// --- Standard cleanup (same as original fromTeX) ---
		s = s.replace(/\s*\\cdot\s*/g, '*');
		s = s.replace(/\s*(?:\\left|\\right)\s*/g, '');
		s = s.replace(/\\infty/g, 'Infinity');
		s = s.replace(/\s*[{(]/g, '(');
		s = s.replace(/}/g, ')');
		s = s.replace(/\s+|\\/g, ' ');

		return s;
	}

	private splitTeXCommas(input: string): string[] {
		const items: string[] = [];
		let depth = 0;
		let current = '';

		for (let i = 0; i < input.length; i++) {
			const ch = input[i];
			if (ch === '{') {
				depth++;
				current += ch;
			} else if (ch === '}') {
				depth--;
				current += ch;
			} else if (ch === ',' && depth === 0) {
				items.push(current);
				current = '';
			} else {
				current += ch;
			}
		}

		if (current.trim()) {
			items.push(current);
		}

		return items;
	}

	fromTeX(input: string): ParserInputType {
		// Detect set/dictionary notation: \{...\} or \left\{...\right\}
		const trimmed = input.trim();
		const setMatch =
			trimmed.match(/^\\left\s*\\{(.+)\\right\s*\\}$/) || trimmed.match(/^\\{(.+)\\}$/);

		if (setMatch) {
			return this.parseTeXSetOrDictionary(setMatch[1]);
		}

		const str = this.preprocessTeXClean(input);

		const TeXRPN = Parser.tokenize(str, { pure: true });
		return Expression.create(Parser.parseTeXRPN(TeXRPN));
	}
}
