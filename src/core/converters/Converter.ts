import { Expression } from '../classes/expression/Expression';
import { one, two } from '../classes/expression/shortcuts';
import { DOUBLE_FACTORIAL, FACTORIAL, INFINITY, WRAP } from '../classes/parser/constants';
import { Parser } from '../classes/parser/Parser';

import { BaseConverter } from './BaseConverter';

import type { OptionsObject } from '../classes/parser/types';
import type { FracArray } from '../classes/parser/types';

const { TeX, TEXT } = BaseConverter.modes;

export class Converter extends BaseConverter {
	private static readonly TEX_FUNCTION_MAP = {
		acos: 'arccos',
		asin: 'arcsin',
		atan: 'arctan',
		realpart: 'Re',
		imagpart: 'Im',
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
		const handlers: { [key: string]: () => string } = {
			sqrt: () => name + this.inBrackets(output[0]),
			cos: () => name + this.inBrackets(output[0]),
			sin: () => name + this.inBrackets(output[0]),
			tan: () => name + this.inBrackets(output[0]),
			acos: () => name + this.inBrackets(output[0]),
			asin: () => name + this.inBrackets(output[0]),
			sinh: () => name + this.inBrackets(output[0]),
			cosh: () => name + this.inBrackets(output[0]),
			tanh: () => name + this.inBrackets(output[0]),
			sec: () => name + this.inBrackets(output[0]),
			csc: () => name + this.inBrackets(output[0]),
			cot: () => name + this.inBrackets(output[0]),
			abs: () => this.inBrackets(output[0], 'abs'),
			[FACTORIAL]: () => this.formatFactorial(args[0], output[0], '!'),
			[DOUBLE_FACTORIAL]: () => this.formatFactorial(args[0], output[0], '!!'),
			limit: () => `\\lim_${this.inBraces(output[1] + ' \\to ' + output[2])} ${output[0]}`,
			integrate: () =>
				`\\int${this.inBraces(output[0])}${this.inBraces('\\, d' + output[1])}`,
			defint: () =>
				`\\int_${this.inBraces(output[1])}^${this.inBraces(output[2])} ${output[0]}\\, d${output[3]}`,
			floor: () => `\\left \\lfloor${this.inBraces(output[0])}\\right \\rfloor`,
			ceil: () => `\\left \\lceil${this.inBraces(output[0])}\\right \\rceil`,
			[Expression.LOG]: () =>
				`\\mathrm${this.inBraces(Expression.LOG)}_${this.inBraces(output[1])}${this.inBrackets(output[0])}`,
			[Expression.LOG10]: () =>
				`\\mathrm${this.inBraces(Expression.LOG)}_${this.inBraces('10')}${this.inBrackets(output[0])}`,
			sum: () => this.formatSumOrProduct('\\sum', output),
			product: () => this.formatSumOrProduct('\\prod', output),
			nthroot: () =>
				output[1] === '2'
					? `\\sqrt${this.inBraces(output[0])}`
					: `\\sqrt[${output[1]}]${this.inBraces(output[0])}`,
			mod: () => `${output[0]} \\bmod ${output[1]}`,
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

			if (element.isSum() && element.isLinear() && this.mode === TEXT) {
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

	fromTeX(input: string): Expression {
		const str = input
			.replace(/\s*\\cdot\s*/g, '*')
			.replace(/\s*(?:\\left|\\right)\s*/g, '')
			.replace(/\s*[{(]/g, '(')
			.replace(/}/g, ')')
			.replace(/\s+|\\/g, ' ');

		const TeXRPN = Parser.tokenize(str, { pure: true });
		return Expression.create(Parser.parseTeXRPN(TeXRPN));
	}
}
