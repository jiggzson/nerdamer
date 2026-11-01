import { Token } from '../parser/Token';
import { Rational } from '../rational/Rational';

import { parseRelation } from './parseRelation';

import type { Expression } from '../expression/Expression';

export type SymbolRelationOperator = '>' | '>=' | '=';

/** Exact relation `left >= right + offset` (strict for `>`), or equality. */
export type SymbolRelation = Readonly<{
	left: string;
	operator: SymbolRelationOperator;
	right: string;
	offset?: Rational;
}>;

/** Normalizes a plain-symbol comparison without registering or inferring facts. */
export function parseSymbolRelation(source: string): SymbolRelation | undefined {
	const relation = parseRelation(source);
	let result: SymbolRelation | undefined;

	if (relation && relation.left.length === 1 && relation.right.length === 1) {
		const left = relation.left[0];
		const right = relation.right[0];
		if (left.type === Token.VARIABLE && right.type === Token.VARIABLE &&
			/^[A-Za-z_][A-Za-z0-9_]*$/.test(left.value) &&
			/^[A-Za-z_][A-Za-z0-9_]*$/.test(right.value)) {
			switch (relation.operator) {
				case '>':
				case '>=':
					result = { left: left.value, operator: relation.operator, right: right.value };
					break;
				case '<':
				case '<=':
					result = { left: right.value, operator: relation.operator === '<' ? '>' : '>=', right: left.value };
					break;
				case '=':
					result = { left: left.value, operator: '=', right: right.value };
					break;
			}
		}
	}

	return result;
}

/**
 * Reduces a two-variable comparison to an exact difference constraint.
 * Unsupported terms are left for the existing numeric-interval path.
 */
export function normalizeRelation(
	left: Expression, right: Expression, operator: '=' | '>' | '>=' | '<' | '<='
): SymbolRelation | undefined {
	const difference = left.minus(right).expand();
	const coefficients = new Map<string, Rational>();
	let constant = Rational.create(0n);
	let supported = !difference.isComplex();
	const terms = difference.isSum() ? difference.elementsArray() : [difference];

	for (const term of terms) {
		if (term.isNUM()) {
			constant = constant.plus(term.getMultiplier());
		} else if (term.isVAR() && term.getPower().isOne()) {
			const next = (coefficients.get(term.value) ?? Rational.create(0n)).plus(term.getMultiplier());
			if (next.isZero()) {
				coefficients.delete(term.value);
			} else {
				coefficients.set(term.value, next);
			}
		} else {
			supported = false;
			break;
		}
	}

	let result: SymbolRelation | undefined;
	if (supported && coefficients.size === 2) {
		const [[first, a], [second, b]] = [...coefficients];
		if (a.plus(b).isZero()) {
			const positiveFirst = a.sign() > 0;
			const coefficient = positiveFirst ? a : b;
			const higher = positiveFirst ? first : second;
			const lower = positiveFirst ? second : first;
			const offset = constant.neg().div(coefficient);
			const reversed = operator === '<' || operator === '<=';
			const relationOffset = reversed ? offset.neg() : offset;
			result = {
				left: reversed ? lower : higher,
				right: reversed ? higher : lower,
				operator: operator === '<' ? '>' : operator === '<=' ? '>=' : operator,
				...(relationOffset.isZero() ? {} : { offset: relationOffset }),
			};
		}
	}
	return result;
}
