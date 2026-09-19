import { message, UnexpectedInputError } from '../../errors';
import { Expression } from '../expression/Expression';

import { assume } from './assume';
import { Assumption } from './Assumption';

import type { ParserEntity } from '../../types';
import type { AssumptionValue } from './Assumption';

type AssertionOperator = '=' | '>' | '>=' | '<' | '<=';

function assertRelation(a: ParserEntity, b: ParserEntity, operator: AssertionOperator) {
	let bound: AssumptionValue;

	// Assertive parser calls receive evaluated operands. Keep exact numeric values typed
	// all the way into Assumption instead of converting Rational values through Decimal.
	if (Expression.isExpression(b) && b.isNUM()) {
		bound = b.getMultiplier();
	} else if (Expression.isExpression(b) && b.isPosInf()) {
		bound = Infinity;
	} else if (Expression.isExpression(b) && b.isNegInf()) {
		bound = -Infinity;
	} else {
		throw new UnexpectedInputError(
			message('wrongInput', {
				expected: 'a real numeric value',
				received: String(b),
			})
		);
	}

	let assumption: Assumption;
	if (operator === '=') {
		assumption = Assumption.exactly(bound);
	} else if (operator === '>') {
		assumption = Assumption.atLeast(bound, false);
	} else if (operator === '>=') {
		assumption = Assumption.atLeast(bound, true);
	} else if (operator === '<') {
		assumption = Assumption.atMost(bound, false);
	} else {
		assumption = Assumption.atMost(bound, true);
	}

	assume(String(a), assumption);
	return a;
}

export function assertEQ(a: ParserEntity, b: ParserEntity) {
	return assertRelation(a, b, '=');
}
export function assertGT(a: ParserEntity, b: ParserEntity) {
	return assertRelation(a, b, '>');
}
export function assertGTE(a: ParserEntity, b: ParserEntity) {
	return assertRelation(a, b, '>=');
}
export function assertLT(a: ParserEntity, b: ParserEntity) {
	return assertRelation(a, b, '<');
}
export function assertLTE(a: ParserEntity, b: ParserEntity) {
	return assertRelation(a, b, '<=');
}
