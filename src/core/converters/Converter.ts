import { Dictionary } from '../classes/dictionary/Dictionary';
import { Expression } from '../classes/expression/Expression';
import { one, two } from '../classes/expression/shortcuts';
import { Matrix } from '../classes/matrix/Matrix';
import {
	CONJUGATE,
	DEG,
	DIRAC,
	DOUBLE_FACTORIAL,
	FACTORIAL,
	HEAVISIDE,
	INFINITY,
	LI,
	WRAP,
} from '../classes/parser/constants';
import { Parser } from '../classes/parser/Parser';
import { Token } from '../classes/parser/Token';
import { ValuesSet } from '../classes/valuesSet/ValuesSet';
import { Vector } from '../classes/vector/Vector';
import { Scope } from '../common/classes/Scope';
import { mathFunctionRegistry } from '../dispatch';

import { BaseConverter } from './BaseConverter';

import type { OptionsObject } from '../classes/parser/types';
import type { FracArray } from '../classes/parser/types';
import type { ParserEntity } from '../types';

const { TeX, TEXT } = BaseConverter.modes;

type SourceTeXPart = {
	text: string;
	source: string;
	args?: SourceTeXPart[];
};

/**
 * Formats Nerdamer values as TeX or normalized text and imports supported TeX input.
 *
 * @remarks
 * A converter retains its output mode between calls. The default mode is `"TeX"`;
 * construct a separate `"text"` converter when both representations are needed.
 * Formatting a string parses it with the process-wide parser, so registered functions,
 * constants, settings, and known values can affect the result.
 *
 * {@link Converter.fromTeX} recognizes the TeX forms emitted by this converter and a
 * practical subset of common mathematical notation. It is not a general TeX parser:
 * unsupported macros, ambiguous implicit notation, or nesting outside the recognized
 * forms can produce parser errors or a different symbolic interpretation.
 *
 * @example
 * ```ts
 * import nerdamer from 'nerdamer';
 *
 * const text = new nerdamer.classes.Converter('text');
 * const tex = new nerdamer.classes.Converter();
 *
 * text.convert('x^2 + 2*x + 1'); // "1+2*x+x^2"
 * tex.convert('sqrt(x)');        // "\\sqrt{x}"
 * ```
 */
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
		determinant: 'det',
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
		det: 'determinant',
		deg: DEG,
		sgn: 'sign',
		operatorname: '',
		Gamma: 'gamma',
		delta: DIRAC,
		Re: 'realpart',
		Im: 'imagpart',
	};

	/**
	 * Creates a converter with persistent output mode.
	 *
	 * @param mode - `"TeX"` (the default) or `"text"`.
	 */
	constructor(mode?: 'TeX' | 'text') {
		super();
		if (mode) {
			this.setMode(mode);
		}
	}

	private static clearOnes(m: FracArray, v: FracArray): [FracArray, FracArray] {
		for (let i = 0; i < 2; i++) {
			if (v[i] && Number(m[i]) === 1) {
				m[i] = '';
			}
		}
		return [m, v];
	}

	private static wrapRoot(value: string, root: string): string {
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
			return this.handleProduct(input, isInverted, options);
		}

		return v;
	}

	private convertSourceRPN(rpn: Scope, options?: OptionsObject): SourceTeXPart {
		const stack: SourceTeXPart[] = [];

		for (let i = 0; i < rpn.length; i++) {
			const item = rpn[i];

			if (Scope.isScope(item)) {
				const converted = this.convertSourceRPN(item, options);
				const innerText = converted.args
					? converted.args.map(arg => arg.text).join(',')
					: converted.text;
				const innerSource = converted.args
					? converted.args.map(arg => arg.source).join(',')
					: converted.source;
				let text = innerText;
				let source = innerSource;

				switch (item.type) {
					case 'parenthesis':
						text = this.inBrackets(innerText);
						source = `(${innerSource})`;
						break;
					case 'square':
						text = this.inBrackets(innerText, 'square');
						source = `[${innerSource}]`;
						break;
					case 'curly':
						text = this.inBrackets(innerText, 'brace');
						source = `{${innerSource}}`;
						break;
					case 'pipe':
						text = this.inBrackets(innerText, 'abs');
						source = `|${innerSource}|`;
						break;
				}

				stack.push({ text, source });
			} else if (item.type === Token.FUNCTION) {
				const argsScope = rpn[++i];
				if (!Scope.isScope(argsScope)) {
					throw new Error(`Missing argument scope for function ${item.value}`);
				}

				let args: SourceTeXPart[] = [];
				if (argsScope.length > 0) {
					const argumentRPN = mathFunctionRegistry[item.value]?.deferArguments
						? Parser.toRPN(argsScope)
						: argsScope;
					const converted = this.convertSourceRPN(argumentRPN, options);
					args = converted.args ?? [converted];
				}
				const output = args.map(arg => arg.text);
				const placeholders = args.map((_, index) => Expression.create(`zzsourcearg${index}`));
				const name = this.getFunctionName(item.value);
				let text: string;

				if (item.value === Expression.LOG && args.length === 2) {
					const numerator = this.formatTeXFunction(
						Expression.LOG,
						name,
						[output[0]],
						[placeholders[0]]
					);
					const denominator = this.formatTeXFunction(
						Expression.LOG,
						name,
						[output[1]],
						[placeholders[1]]
					);
					text = this.toFraction(numerator, denominator);
				} else if (item.value === 'sqrt' && args.length === 1) {
					text = Converter.wrapRoot(output[0], '2');
				} else if (
					args.length === 1 &&
					(item.value === FACTORIAL ||
						item.value === 'factorial' ||
						item.value === DOUBLE_FACTORIAL)
				) {
					text = this.formatTeXFunction(item.value, name, output, [
						Expression.create(args[0].source),
					]);
				} else {
					text = this.formatTeXFunction(item.value, name, output, placeholders);
				}

				stack.push({
					text,
					source: `${item.value}(${args.map(arg => arg.source).join(',')})`,
				});
			} else if (item.type === Token.PREFIX) {
				const operand = stack.pop();
				if (!operand) {
					throw new Error(`Missing operand for prefix operator ${item.value}`);
				}

				stack.push({
					text: item.value + operand.text,
					source: item.value + operand.source,
				});
			} else if (item.type === Token.OPERATOR) {
				const operator = item.resolvedOperator ?? Parser.getOperator(item.value);
				const right = stack.pop();

				if (!operator || !right) {
					throw new Error(`Missing operand or metadata for operator ${item.value}`);
				}

				if (operator.isPostfix) {
					const symbol = item.value === '%' ? '\\%' : item.value;
					stack.push({
						text: right.text + symbol,
						source: right.source + item.value,
					});
					continue;
				}

				const left = stack.pop();
				if (!left) {
					throw new Error(`Missing left operand for operator ${item.value}`);
				}

				if (operator.action === 'comma') {
					const args = [...(left.args ?? [left]), ...(right.args ?? [right])];
					stack.push({
						text: args.map(arg => arg.text).join(','),
						source: args.map(arg => arg.source).join(','),
						args,
					});
					continue;
				}

				let text: string;
				if (operator.action === 'times') {
					text =
						left.text +
						(item.position === -1 ? '' : this.getMultiplicationSymbol()) +
						right.text;
				} else if (operator.action === 'div') {
					text = this.toFraction(left.text, right.text);
				} else if (operator.action === 'pow') {
					const power = Expression.create(right.source);
					if (power.sign() === -1) {
						const positivePower = power.signFree();
						const denominator = positivePower.isOne()
							? left.text
							: left.text + '^' + this.inBraces(super.convert(positivePower, options));
						text = this.toFraction('1', denominator);
					} else {
						text = left.text + '^' + this.inBraces(right.text);
					}
				} else if (operator.action === 'mod') {
					text = this.formatTeXFunction(
						'mod',
						this.getFunctionName('mod'),
						[left.text, right.text],
						[Expression.create('zzsourcearg0'), Expression.create('zzsourcearg1')]
					);
				} else if (operator.action === 'mapTo') {
					text = `${left.text} \\mapsto ${right.text}`;
				} else {
					text = left.text + item.value + right.text;
				}

				stack.push({
					text,
					source: `(${left.source})${item.value}(${right.source})`,
				});
			} else {
				let text = item.value;

				if (item.type === Token.VARIABLE) {
					text = INFINITY.includes(item.value) ? '\\infty' : this.formatVariable(item.value);
				}

				stack.push({ text, source: item.value });
			}
		}

		if (stack.length !== 1) {
			throw new Error('Unable to convert source expression to TeX');
		}

		const retval = stack[0];
		return retval;
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
		const generic = () => {
			const formattedName =
				'\\operatorname' + this.inBraces(originalName.replace(/_/g, '\\_'));
			return formattedName + this.inBrackets(output.join(','), 'parens');
		};

		const handlers: { [key: string]: () => string } = {
			// Basic math
			sqrt: std,
			abs: () => this.inBrackets(output[0], 'abs'),
			cbrt: () => `\\sqrt[3]${this.inBraces(output[0])}`,
			max: () => `\\max${this.inBrackets(output.join(','), 'parens')}`,
			min: () => `\\min${this.inBrackets(output.join(','), 'parens')}`,
			round: () =>
				output.length === 1
					? `\\left\\lfloor ${output[0]} \\right\\rceil`
					: generic(),
			mod: () => `${output[0]} \\bmod ${output[1]}`,
			[FACTORIAL]: () => this.formatFactorial(args[0], output[0], '!'),
			factorial: () => this.formatFactorial(args[0], output[0], '!'),
			[DOUBLE_FACTORIAL]: () => this.formatFactorial(args[0], output[0], '!!'),
			parens: () => this.inBrackets(output[0], 'parens'),

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
			ceiling: () => `\\left\\lceil ${output[0]} \\right\\rceil`,

			// Logarithms
			[Expression.LOG]: () => {
				const base = output[1];
				const subscript = base === undefined ? '' : `_${this.inBraces(base)}`;
				return `\\mathrm${this.inBraces(Expression.LOG)}${subscript}${this.inBrackets(output[0])}`;
			},
			[Expression.LOG10]: () =>
				`\\mathrm${this.inBraces(Expression.LOG)}_${this.inBraces('10')}${this.inBrackets(output[0])}`,

			// Special functions
			exp: std,
			gamma: () => `\\Gamma${this.inBrackets(output[0])}`,
			erf: std,
			erfc: std,
			sinc: std,
			Si: () => `\\operatorname{Si}${this.inBrackets(output[0])}`,
			Shi: () => `\\operatorname{Shi}${this.inBrackets(output[0])}`,
			Ci: () => `\\operatorname{Ci}${this.inBrackets(output[0])}`,
			Chi: () => `\\operatorname{Chi}${this.inBrackets(output[0])}`,
			Ei: () => `\\operatorname{Ei}${this.inBrackets(output[0])}`,
			[LI]: () => `\\operatorname{Li}${this.inBrackets(output[0])}`,

			// Step / impulse
			[HEAVISIDE]: () => `H${this.inBrackets(output[0])}`,
			[DIRAC]: () => `\\delta${this.inBrackets(output[0])}`,
			dirac: () => `\\delta${this.inBrackets(output[0])}`,
			sign: std,

			// Complex
			realpart: () => `\\Re${this.inBrackets(output[0])}`,
			imagpart: () => `\\Im${this.inBrackets(output[0])}`,
			arg: std,
			[CONJUGATE]: () => `\\overline${this.inBraces(output[0])}`,

			// Linear algebra
			determinant: std,

			// Polynomials
			[DEG]: std,

			// Calculus
			limit: () => `\\lim_${this.inBraces(output[1] + ' \\to ' + output[2])} ${output[0]}`,
			integrate: () =>
				output.length === 2 ? `\\int ${output[0]}\\, d${output[1]}` : generic(),
			defint: () =>
				`\\int_${this.inBraces(output[1])}^${this.inBraces(output[2])} ${output[0]}\\, d${output[3]}`,
			diff: () => {
				let retval: string;
				if (output.length === 1) {
					retval = generic();
				} else if (output.length === 3) {
					retval = `\\frac${this.inBraces('d^' + output[2])}${this.inBraces('d' + output[1] + '^' + output[2])} ${output[0]}`;
				} else {
					retval = `\\frac${this.inBraces('d')}${this.inBraces('d' + output[1])} ${output[0]}`;
				}
				return retval;
			},
			laplace: () =>
				`\\mathcal{L}_${this.inBraces(output[1] + ' \\to ' + output[2])}\\left\\{${output[0]}\\right\\}`,
			ilaplace: () =>
				`\\mathcal{L}^{-1}_${this.inBraces(output[1] + ' \\to ' + output[2])}\\left\\{${output[0]}\\right\\}`,
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

			// Number theory
			gcd: () => name + this.inBrackets(output.join(','), 'parens'),
			lcm: () => `\\operatorname{lcm}${this.inBrackets(output.join(','), 'parens')}`,

			// Wrapper
			[WRAP]: () => output[0],
		};

		const handler = handlers[originalName];
		if (handler) {
			return handler();
		}

		return generic();
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

	private handleProduct(
		input: Expression,
		isInverted: boolean,
		options?: OptionsObject
	): FracArray {
		const mul = this.getMultiplicationSymbol();
		const numOutput: string[] = [];
		const denOutput: string[] = [];

		for (let element of input.elementsArray()) {
			if (element.isFunction(WRAP)) {
				element = element.getArguments()[0];
			}

			const elementIsInverted = element.getPower().sign() === -1;
			const isInDenominator = isInverted ? !elementIsInverted : elementIsInverted;
			const target = isInDenominator ? denOutput : numOutput;

			if (elementIsInverted) {
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

	/** Parses a top-level TeX matrix environment into a scalar-valued Matrix. */
	private parseTeXMatrix(input: string): Matrix | undefined {
		const match = input.match(
			/^\\begin\{([pbBvV]?matrix)\}\s*([\s\S]*?)\s*\\end\{\1\}$/
		);
		let retval: Matrix | undefined;

		if (match) {
			const rows = match[2]
				.split(/\\\\/)
				.map(row => row.trim())
				.filter(row => row.length > 0)
				.map(row =>
					row.split('&').map(cell => Expression.create(this.fromTeX(cell.trim())))
				);
			retval = new Matrix(...rows);
		}

		return retval;
	}

	private parseTeXSetOrDictionary(inner: string): ValuesSet | Dictionary {
		const items = this.splitTeXTopLevel(inner, ',');
		const entries = items.map(item => this.splitTeXTopLevel(item, '\\mapsto'));
		const isDictionary = entries.some(parts => parts.length === 2);

		if (isDictionary) {
			const dictionaryEntries = new Map<string, ParserEntity>();
			for (const parts of entries) {
				if (parts.length === 2) {
					const key = parts[0].trim();
					const value = this.fromTeX(parts[1].trim());
					dictionaryEntries.set(key, value);
				}
			}
			return new Dictionary(dictionaryEntries);
		}

		const set = new ValuesSet();
		for (const item of items) {
			if (item.trim()) {
				set.add(this.fromTeX(item.trim()));
			}
		}
		return set;
	}

	private parseTeXVector(input: string): Vector | undefined {
		const match =
			input.match(/^\\left\s*\[([\s\S]*)\\right\s*\]$/) || input.match(/^\[([\s\S]*)\]$/);
		let retval: Vector | undefined;

		if (match) {
			const elements = this.splitTeXTopLevel(match[1], ',')
				.map(item => item.trim())
				.filter(item => item.length > 0)
				.map(item => this.fromTeX(item));
			retval = new Vector(elements);
		}

		return retval;
	}

	/**
	 * Rewrites the supported TeX subset into parser syntax in an ordered pass.
	 *
	 * Structure-dependent forms such as transforms, derivatives, integrals, limits, and
	 * indexed sums must be recognized before generic braces and commands are removed.
	 * This is a compatibility preprocessor rather than a TeX grammar, so each rewrite is
	 * limited to the forms that can be mapped unambiguously to parser calls.
	 */
	private preprocessTeXClean(input: string): string {
		let s = input;

		// Normalize valid short-form fractions before the existing brace-based TeX path runs.
		s = s.replace(/\\frac\s*\{([^{}]+)\}\s*([a-zA-Z0-9.])/g, '\\frac{$1}{$2}');
		s = s.replace(/\\frac\s*([a-zA-Z0-9.])\s*\{([^{}]+)\}/g, '\\frac{$1}{$2}');
		s = s.replace(/\\frac\s*([a-zA-Z0-9.])\s*([a-zA-Z0-9.])/g, '\\frac{$1}{$2}');

		// A whole number immediately followed by a numeric fraction is conventional mixed-number notation.
		s = s.replace(
			/(\d+)\s*\\frac\s*\{(\d+)\}\s*\{(\d+)\}/g,
			'($1+\\frac{$2}{$3})'
		);

		// --- Laplace transforms (before brace stripping) ---
		s = s.replace(
			/\\mathcal\s*\{L\}\s*\^\s*\{-1\}\s*_\s*\{([^{}]+?)\s*\\to\s*([^{}]+?)\}\s*(?:\\left\s*)?\\{(.+?)\\}\s*(?:\\right\s*)?/g,
			(_m, source, target, expr) =>
				`ilaplace(${expr},${String(source).trim()},${String(target).trim()})`
		);
		s = s.replace(
			/\\mathcal\s*\{L\}\s*_\s*\{([^{}]+?)\s*\\to\s*([^{}]+?)\}\s*(?:\\left\s*)?\\{(.+?)\\}\s*(?:\\right\s*)?/g,
			(_m, source, target, expr) =>
				`laplace(${expr},${String(source).trim()},${String(target).trim()})`
		);
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
		s = s.replace(
			/(?:\\left\s*)?\\lfloor\s*(.+?)\s*(?:\\right\s*)?\\rceil/g,
			'round($1)'
		);
		s = s.replace(/(?:\\left\s*)?\\lfloor\s*/g, 'floor(');
		s = s.replace(/\\rfloor\s*(?:\\right\s*)?/g, ')');
		s = s.replace(/(?:\\left\s*)?\\lceil\s*/g, 'ceil(');
		s = s.replace(/\\rceil\s*(?:\\right\s*)?/g, ')');

		// --- Arbitrary-base logarithms ---
		s = s.replace(/\\log\s*_\s*\{([^}]+)\}\s*\{([^}]+)\}/g, 'log($2,$1)');
		s = s.replace(/\\log\s*_\s*\{([^}]+)\}\s*([a-zA-Z0-9_.]+)/g, 'log($2,$1)');

		// --- Special functions ---
		s = this.replaceBracedTeXCommand(s, 'overline', CONJUGATE);
		s = s.replace(/\\Gamma\s*/g, 'gamma');
		s = s.replace(/\\delta\s*/g, DIRAC);
		s = s.replace(/(?<![a-zA-Z])H\s*(?=(?:\\left\s*)?\()/g, HEAVISIDE);
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
		s = s.replace(/\\,/g, '');
		s = s.replace(/\s*\\cdot\s*/g, '*');
		s = s.replace(/\s*(?:\\left|\\right)\s*/g, '');
		s = s.replace(/\\infty/g, 'Infinity');
		s = s.replace(/\s*[{(]/g, '(');
		s = s.replace(/}/g, ')');
		s = s.replace(/\s+|\\/g, ' ');

		return s;
	}

	/**
	 * Rewrites one TeX command whose argument is carried in balanced braces.
	 *
	 * The converter emits some commands around expressions that can themselves contain
	 * nested TeX groups. A flat regular expression cannot safely recover those arguments,
	 * so this keeps the brace matching local to the TeX conversion pipeline.
	 */
	private replaceBracedTeXCommand(
		input: string,
		command: string,
		functionName: string
	): string {
		const marker = `\\${command}`;
		let retval = '';
		let cursor = 0;

		while (cursor < input.length) {
			const commandIndex = input.indexOf(marker, cursor);
			if (commandIndex === -1) {
				retval += input.slice(cursor);
				cursor = input.length;
			} else {
				retval += input.slice(cursor, commandIndex);
				let openIndex = commandIndex + marker.length;
				while (openIndex < input.length && /\s/.test(input[openIndex])) {
					openIndex++;
				}

				if (input[openIndex] !== '{') {
					retval += marker;
					cursor = commandIndex + marker.length;
				} else {
					let depth = 1;
					let closeIndex = openIndex + 1;
					while (closeIndex < input.length && depth > 0) {
						if (input[closeIndex] === '{') {
							depth++;
						} else if (input[closeIndex] === '}') {
							depth--;
						}
						closeIndex++;
					}

					if (depth !== 0) {
						retval += input.slice(commandIndex);
						cursor = input.length;
					} else {
						const inner = input.slice(openIndex + 1, closeIndex - 1);
						const convertedInner = this.replaceBracedTeXCommand(
							inner,
							command,
							functionName
						);
						retval += `${functionName}(${convertedInner})`;
						cursor = closeIndex;
					}
				}
			}
		}

		return retval;
	}

	private splitTeXTopLevel(input: string, delimiter: ',' | '\\mapsto'): string[] {
		const items: string[] = [];
		let depth = 0;
		let current = '';

		for (let i = 0; i < input.length; i++) {
			const ch = input[i];

			if (delimiter === ',' && ch === '\\' && input[i + 1] === ',') {
				i++;
				continue;
			}

			if (ch === '{' || ch === '[' || ch === '(') {
				depth++;
			} else if (ch === '}' || ch === ']' || ch === ')') {
				depth--;
			}

			if (depth === 0 && input.startsWith(delimiter, i)) {
				items.push(current);
				current = '';
				i += delimiter.length - 1;
			} else {
				current += ch;
			}
		}

		if (current.trim()) {
			items.push(current);
		}

		return items;
	}

	/**
	 * Formats supported values while retaining ordinary Converter semantics by default.
	 * Source preservation is an internal compatibility option used by convertToLaTeX.
	 */
	public override convert(
		input: ParserEntity | string | number,
		options?: OptionsObject
	): string {
		let retval: string;

		if (
			typeof input === 'string' &&
			this.mode === TeX &&
			options?.preserveSource === true &&
			options.decimal !== true
		) {
			const rpn = Parser.toRPN(Parser.tokenize(input));
			const converted = this.convertSourceRPN(rpn, options);
			retval = converted.args
				? converted.args.map(arg => arg.text).join(',')
				: converted.text;
		} else {
			retval = super.convert(input, options);
		}

		return retval;
	}

	/**
	 * Parses a supported TeX subset into a Nerdamer parser entity.
	 *
	 * @remarks
	 * Set notation is recognized before ordinary expression preprocessing and produces a
	 * value set or dictionary when appropriate. Other input is rewritten to Nerdamer
	 * parser syntax, tokenized in pure mode, and evaluated through the process-wide parser.
	 * Consequently, parser settings or registered functions can affect the result.
	 *
	 * The importer supports the converter's common function forms, roots, arbitrary-base
	 * logarithms, transforms, derivatives, integrals, limits, sums, products, floor and
	 * ceiling notation, equations, vectors, matrices, finite sets, and dictionaries. It does
	 * not promise round-tripping arbitrary third-party TeX.
	 *
	 * @param input - TeX text in the supported conversion subset.
	 * @returns The parser entity represented by the supported TeX input.
	 * @throws Error When preprocessing leaves syntax that the parser cannot interpret.
	 *
	 * @example
	 * ```ts
	 * import nerdamer from 'nerdamer';
	 *
	 * const converter = new nerdamer.classes.Converter();
	 * nerdamer.pretty(converter.fromTeX('\\log_{2}{256}'), 'text'); // "8"
	 * ```
	 */
	fromTeX(input: string): ParserEntity {
		const trimmed = input.trim();
		const matrix = this.parseTeXMatrix(trimmed);
		if (matrix) {
			return matrix;
		}

		const vector = this.parseTeXVector(trimmed);
		if (vector) {
			return vector;
		}

		// Detect set/dictionary notation: \{...\} or \left\{...\right\}
		const setMatch =
			trimmed.match(/^\\left\s*\\{(.*)\\right\s*\\}$/) || trimmed.match(/^\\{(.*)\\}$/);

		if (setMatch) {
			return this.parseTeXSetOrDictionary(setMatch[1]);
		}

		const str = this.preprocessTeXClean(input);

		const TeXRPN = Parser.tokenize(str, { pure: true });
		return Parser.parse(Parser.parseTeXRPN(TeXRPN));
	}
}
