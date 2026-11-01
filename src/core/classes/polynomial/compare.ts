import { compareSymbolRelation, getSymbolRelations } from '../assumption/assume';
import { Expression } from '../expression/Expression';
import { proveZeroRelation } from '../parser/operations/compare';
import { subtract } from '../parser/operations/subtract';

import { divide as dividePolynomial } from './utils';

import type { ComparisonOperator } from '../parser/operations/compare';

// Division uses Expression comparisons, which must not restart polynomial inference.
let polynomialComparisonActive = false;

/** Infers symbolic order through exact polynomial divided differences. */
export function inferPolynomialComparison(a: Expression, b: Expression, operator: ComparisonOperator): boolean | undefined {
	let result: boolean | undefined;
	if (!polynomialComparisonActive) {
		polynomialComparisonActive = true;
		try {
			const facts = getSymbolRelations();
			if (facts.length && a.isPolynomialLike() && b.isPolynomialLike()) {
				const candidates = a.variables().flatMap(left =>
					b.variables().filter(right => left !== right).map(right => ({ left, right }))
				).filter(pair =>
					compareSymbolRelation({ ...pair, operator: '>=' }) === true ||
					compareSymbolRelation({ left: pair.right, right: pair.left, operator: '>=' }) === true
				);
				if (candidates.length) {
					const difference = subtract(a, b).expand();
					if (difference.isPolynomialLike()) {
						for (const fact of candidates) {
							const divisor = subtract(Expression.Variable(fact.left), Expression.Variable(fact.right));
							const [quotient, remainder] = dividePolynomial(difference, divisor);
							if (!remainder.isZero()) {
								continue;
							}
							const positive = proveZeroRelation(quotient, 'gt');
							const negative = proveZeroRelation(quotient, 'lt');
							const nonzero = positive === true || negative === true;
							const equal = compareSymbolRelation({ left: fact.left, operator: '=', right: fact.right }) === true;
							const greater = compareSymbolRelation({ left: fact.left, operator: '>', right: fact.right }) === true;
							const lesser = compareSymbolRelation({ left: fact.right, operator: '>', right: fact.left }) === true;
							const nonnegative = compareSymbolRelation({ left: fact.left, operator: '>=', right: fact.right }) === true;
							const nonpositive = compareSymbolRelation({ left: fact.right, operator: '>=', right: fact.left }) === true;
							const strictlyPositive = nonzero && (positive === true ? greater : lesser);
							const strictlyNegative = nonzero && (positive === true ? lesser : greater);
							const weakPositive = positive === true ? nonnegative : negative === true && nonpositive;
							const weakNegative = positive === true ? nonpositive : negative === true && nonnegative;
							const zeroDifference = equal || proveZeroRelation(quotient, 'eq') === true;
							if (operator === 'eq') {
								result = zeroDifference ? true : strictlyPositive || strictlyNegative ? false : undefined;
							} else if (operator === 'gt' || operator === 'lt') {
								const yes = operator === 'gt' ? strictlyPositive : strictlyNegative;
								const no = operator === 'gt' ? weakNegative : weakPositive;
								result = yes ? true : no || zeroDifference ? false : undefined;
							} else {
								const yes = operator === 'gte' ? weakPositive : weakNegative;
								const no = operator === 'gte' ? strictlyNegative : strictlyPositive;
								result = yes || zeroDifference ? true : no ? false : undefined;
							}
							if (result !== undefined) {
								break;
							}
						}
					}
				}
			}
		} finally {
			polynomialComparisonActive = false;
		}
	}
	return result;
}
