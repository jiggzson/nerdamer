import { allEqual } from '../../utils/array';
import { Expression } from '../classes/expression/Expression';
import { one, zero } from '../classes/expression/shortcuts';
import { INFINITY, WRAP } from '../classes/parser/constants';
import { message, MissingReferenceError } from '../errors';

import { BaseConverter } from './BaseConverter';

import type { ExpressionInputType, OptionsObject } from '../classes/parser/types';
import type { FracArray } from '../classes/parser/types';
import type { Rational } from '../classes/rational/Rational';

export class Pattern extends BaseConverter {
	// Caching elements
	private allEqualArguments: boolean | undefined = undefined;
	args: string[] = [];
	c: string;
	constCount = 0;
	expression: Expression;

	multiplier = '';
	p: string;
	patternString = '';
	powerCount = 0;

	referenceMap: { [label: string]: string } = {};
	references: { [label: string]: Expression } = {};
	reuseReferences: boolean;
	stack: Expression[] = [];
	v: string;

	variables: { [variable: string]: string } = {};

	constructor(
		expression: ExpressionInputType,
		variables: string[] = [],
		options?: OptionsObject
	) {
		super();
		this.setMode('text');
		this.expression = Expression.create(expression);

		const defaults = {
			constantSymbol: 'a',
			powerSymbol: 'n',
			variableSymbol: 'x',
			reuseReferences: false,
		};
		options = { ...defaults, ...options };

		this.v = options.variableSymbol as string;
		this.p = options.powerSymbol as string;
		this.c = options.constantSymbol as string;
		this.reuseReferences = options.reuseReferences as boolean;

		this.initializeVariables(variables);
		this.patternString = this.convert(this.expression, options);
	}

	/**
	 * Shows the structure of a pattern with respect to x
	 * @param str
	 * @returns
	 */
	public static showStructure(str: string, variable = 'x') {
		let output = `Input: ${str}\n`;
		const pattern = new Pattern(str, [variable]);
		output += `patternString: ${pattern.patternString}\n`;
		output += 'references: {\n';
		for (const r in pattern.references) {
			output += `	${r}: ${pattern.references[r]}\n`;
		}
		output += '}';

		return output;
	}

	protected convertPower(input: Expression, power: Expression, options: OptionsObject): string {
		if (input.isEXP()) {
			// Explicitly include the multiplier
			return this.inBrackets(this.convert(power, { ...options, ignoreMultiplier: false }));
		}

		// If it doesn't have a variable then it's just a constants and does not require a power
		// Products don't carry powers at the upper level so it's always 1. No need to add it.
		if (!this.hasAsVariable(input) || input.isProduct()) {
			return '';
		}

		return this.createConstantReference(power, true);
	}

	protected createConstantReference(input: Expression, toPower: boolean = false): string {
		const isNumeric = input.isNUM();
		// Namespace the cache key so constant and power references don't collide.
		const key = `${toPower ? 'pow' : 'cnt'}_${input.text()}`;

		if (!isNumeric) {
			const existing = this.referenceMap[key];
			if (existing) {
				return existing;
			}
		}

		const ref = toPower ? this.nextPower(input) : this.nextConstant(input);
		this.addReference(ref, input);

		if (!isNumeric) {
			this.referenceMap[key] = ref;
		}

		return ref;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	protected createVariableReference(input: Expression, options: OptionsObject): string {
		const value = this.variables[input.value];
		this.addReference(value, input);
		return value;
	}

	protected finalizePowerAndInput(
		power: Expression,
		input: Expression,
		_options?: OptionsObject
	): [Expression, Expression] {
		// The power gets stripped from the input e.g. 2^x -> [2, x]
		// This check fails because the power and not the base now contains the variable.
		// Return an EXP with power one. This is a workable solution since this expression
		// is short-lived.
		let e = input.toLinearAndUnitMultiplier();
		if (input.isEXP() && !e.isEXP() && this.hasAsVariable(power)) {
			e = Expression.toEXP(e, one());
		}
		return [power, e];
	}

	protected hasAsVariable(input: Expression): boolean {
		if (input.isVAR()) {
			return !!this.variables[input.value];
		}

		return Object.keys(this.variables).some(variable => input.hasVariable(variable));
	}

	protected isBracketed(v: string): boolean {
		return /^\(.+\)$/.test(v);
	}

	protected multiplyToMultiplier(input: Expression): void {
		this.references[this.multiplier] = this.references[this.multiplier].times(input);
	}

	protected requiresMultiplicationSymbol(_input: Expression): boolean {
		return true;
		// return input.isSum() || input.isEXP();
	}

	protected setMultiplier(
		m: Rational,
		multiplierArray: FracArray,
		_input: Expression,
		_options?: OptionsObject
	): void {
		const ref = this.createConstantReference(new Expression(m));
		this.multiplier = ref;
		multiplierArray[0] = ref;
	}

	protected toFraction(n: string, d: string): string {
		const wrapIfNeeded = (s: string) => {
			if (/[*+]/.test(s) && !this.isBracketed(s)) {
				return this.inBrackets(s);
			}
			return s;
		};

		return `${wrapIfNeeded(n)}/${wrapIfNeeded(d)}`;
	}

	protected value(
		input: Expression,
		isInverted: boolean,
		isNegative: boolean,
		options: OptionsObject
	): FracArray {
		const v: FracArray = ['', ''];
		const index = isInverted ? 1 : 0;

		if (input.isNUM()) {
			return v;
		}

		if (!this.hasAsVariable(input) && !input.isEXP()) {
			this.multiplyToMultiplier(input);
			return v;
		}

		if (input.isEXP()) {
			const arg = input.getBase();
			v[index] = this.inBrackets(this.convert(arg, { ...options, ignoreMultiplier: false }));
		} else if (input.isInf()) {
			v[index] = INFINITY[0];
		} else if (!(input.elements || input.args)) {
			v[index] = this.createVariableReference(input, options);
		} else if (input.isFunction()) {
			v[index] = this.formatFunctionCall(input, options);
		} else if (input.isSum()) {
			v[index] = this.handlePatternSum(input, options);
		} else if (input.isProduct()) {
			return this.handlePatternProduct(input, isInverted, options);
		}

		return v;
	}

	private addReference(ref: string, input: Expression): void {
		if (!this.references[ref]) {
			this.references[ref] = input;
		}
	}

	private formatFunctionCall(input: Expression, options: OptionsObject): string {
		const args = input.getArguments();
		// Make a references to the arguments
		this.args.push(args.map(x => x.text()).join(','));
		// Ignoring the multiplier is explicitly false
		const argList = args
			.map(arg => this.convert(arg, { ...options, ignoreMultiplier: false }))
			.join(', ');
		return `${input.name}${this.inBrackets(argList)}`;
	}

	private getReferenceFromMap(input?: Expression, toPower: boolean = false): string | undefined {
		if (input && !input.isNUM()) {
			const key = `${toPower ? 'pow' : 'cnt'}_${input.text()}`;
			return this.referenceMap[key];
		}
	}

	private handlePatternProduct(
		input: Expression,
		isInverted: boolean,
		options: OptionsObject
	): FracArray {
		const mul = this.getMultiplicationSymbol();
		const numOutput: string[] = [];
		const denOutput: string[] = [];

		for (let element of input.elementsArray()) {
			if (!this.hasAsVariable(element)) {
				this.multiplyToMultiplier(element);
				continue;
			}

			if (element.isFunction(WRAP)) {
				element = element.getArguments()[0];
			}

			// FIX: Account for whether the entire product is inverted
			const elementPowerSign = element.getPower().sign();
			const isInDenominator = isInverted
				? elementPowerSign !== -1 // If product is inverted, positive powers go to denominator
				: elementPowerSign === -1; // Normal case: negative powers go to denominator

			const target = isInDenominator ? denOutput : numOutput;

			if (isInDenominator && !isInverted) {
				element = element.invert();
			} else if (!isInDenominator && isInverted) {
				// Element stays as-is when inverted product with positive power
			}

			let output = this.convert(element, { ...options, ignoreMultiplier: true });

			if (element.isSum() && element.isLinear() && this.mode === 'text') {
				output = this.inBrackets(output);
			}

			target.push(output);
		}

		return [numOutput.join(mul), denOutput.join(mul)];
	}

	private handlePatternSum(input: Expression, options: OptionsObject): string {
		let constants = zero();
		const elements = input.elementsArray();
		const converted: string[] = [];

		for (const element of elements) {
			if (this.hasAsVariable(element)) {
				converted.push(this.convert(element, { ...options, ignoreMultiplier: false }));
				// converted.push(this.convert(element, options));
			} else {
				constants = constants.plus(element);
			}
		}

		// Add the constants if they're not zero
		if (!constants.isZero()) {
			converted.push(this.createConstantReference(constants));
		}

		return this.inBrackets(converted.join('+'));
	}

	private initializeVariables(variables: string[]): void {
		let counter = 1;
		variables
			.slice()
			.sort()
			.forEach(x => {
				this.variables[x] = this.v + counter++;
			});
	}

	private nextConstant(constant?: Expression): string {
		const existing = this.getReferenceFromMap(constant, /*toPower*/ false);
		return this.reuseReferences && existing ? existing : `${this.c}${++this.constCount}`;
		// return existing || `${this.c}${++this.constCount}`;
	}

	private nextPower(power?: Expression): string {
		const existing = this.getReferenceFromMap(power, /*toPower*/ true);
		return this.reuseReferences && existing ? existing : `${this.p}${++this.powerCount}`;
		// return existing || `${this.p}${++this.powerCount}`;
	}

	/**
	 * Checks to make sure that all the arguments match
	 * @returns
	 */
	argumentsMatch() {
		if (this.allEqualArguments === undefined) {
			this.allEqualArguments = allEqual(this.args);
		}
		return this.allEqualArguments;
	}

	/**
	 * Checks if one or more values equals a given value
	 * @param references
	 * @param value
	 * @returns
	 */
	equal(references: string, value: string): boolean;
	equal(references: string[], value: string): boolean;
	equal(references: string | string[], value: string): boolean {
		if (typeof references === 'string') {
			return this.get(references).eq(value);
		} else {
			if (references.length == 0) {
				return false;
			}
			// The subsequent
			for (let i = 0; i < references.length; i++) {
				if (!this.get(references[i]).eq(value)) {
					return false;
				}
			}
		}

		return true;
	}

	fromPattern(p: string) {
		return Expression.create(p, this.references);
	}

	/**
	 * Gets the value of a reference
	 * @param reference
	 * @returns
	 */
	get(reference: string): Expression {
		const ref = this.references[reference];
		if (!ref) {
			throw new MissingReferenceError(message('missingReference', { ref: reference }));
		}
		return ref;
	}
}
