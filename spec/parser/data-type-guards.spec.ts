import { Assumption } from '../../src/core/classes/assumption/Assumption';
import { Collection } from '../../src/core/classes/collection/Collection';
import { Equation } from '../../src/core/classes/equation/Equation';
import { Expression } from '../../src/core/classes/expression/Expression';
import { one } from '../../src/core/classes/expression/shortcuts';
import { Matrix } from '../../src/core/classes/matrix/Matrix';
import {
	ASSUMPTION,
	EXPRESSION,
	INDEXED_REFERENCE,
	KEY_VALUE_PAIR,
	MATRIX,
	POLYNOMIAL,
	RATIONAL,
	SCOPE,
	SOLUTIONS_SET,
	TERM,
	TOKEN,
	VECTOR,
} from '../../src/core/classes/parser/constants';
import {
	BreakSignal,
	BREAK_SIGNAL,
	ContinueSignal,
	CONTINUE_SIGNAL,
	ReturnSignal,
	RETURN_SIGNAL,
} from '../../src/core/classes/parser/scripting/controlFlow';
import { Token } from '../../src/core/classes/parser/Token';
import { IndexedReference } from '../../src/core/classes/parser/wrappers/IndexedReference';
import { KeyValuePair } from '../../src/core/classes/parser/wrappers/KeyValuePair';
import { Polynomial } from '../../src/core/classes/polynomial/Polynomial';
import { Term } from '../../src/core/classes/polynomial/Term';
import { Rational } from '../../src/core/classes/rational/Rational';
import { ValuesSet } from '../../src/core/classes/valuesSet/ValuesSet';
import { Vector } from '../../src/core/classes/vector/Vector';
import { Scope } from '../../src/core/common/classes/Scope';
import { isNerdamerNativeType } from '../../src/core/common/common';
import { SolutionSet } from '../../src/solve/classes/SolutionSet';

describe('dataType guards', () => {
	it('should identify Nerdamer native types by their dataType discriminator', () => {
		const vector = new Vector();
		const matrix = new Matrix([one()]);

		expect(isNerdamerNativeType(vector, VECTOR)).toBe(true);
		expect(isNerdamerNativeType(matrix, MATRIX)).toBe(true);
		expect(isNerdamerNativeType({ dataType: MATRIX }, MATRIX)).toBe(true);
		expect(isNerdamerNativeType(vector, MATRIX)).toBe(false);
		expect(isNerdamerNativeType(undefined, VECTOR)).toBe(false);
		expect(isNerdamerNativeType(null, VECTOR)).toBe(false);
		expect(isNerdamerNativeType(1, VECTOR)).toBe(false);
		expect(isNerdamerNativeType({}, VECTOR)).toBe(false);
	});

	it('should identify Nerdamer-owned objects through their class guards', () => {
		const expression = Expression.create('x');

		expect(Expression.isExpression(expression)).toBe(true);
		expect(Rational.isRational(Rational.create('1'))).toBe(true);
		expect(Polynomial.isPolynomial(new Polynomial(expression))).toBe(true);
		expect(Term.isTerm(new Term(one(), {}, []))).toBe(true);
		expect(Token.isToken(Token.V('x'))).toBe(true);
		expect(Scope.isScope(new Scope('parenthesis', 0))).toBe(true);
		expect(IndexedReference.isIndexedReference(new IndexedReference(expression, [0]))).toBe(
			true
		);
		expect(KeyValuePair.isKeyValuePair(new KeyValuePair('x', one()))).toBe(true);
		expect(Assumption.isAssumption(Assumption.exactly(1))).toBe(true);
		expect(ReturnSignal.isReturnSignal(new ReturnSignal(one()))).toBe(true);
		expect(BreakSignal.isBreakSignal(new BreakSignal())).toBe(true);
		expect(ContinueSignal.isContinueSignal(new ContinueSignal())).toBe(true);
		expect(Expression.isExpression({ dataType: EXPRESSION })).toBe(true);
		expect(Rational.isRational({ dataType: RATIONAL })).toBe(true);
		expect(Polynomial.isPolynomial({ dataType: POLYNOMIAL })).toBe(true);
		expect(Term.isTerm({ dataType: TERM })).toBe(true);
		expect(Token.isToken({ dataType: TOKEN })).toBe(true);
		expect(Scope.isScope({ dataType: SCOPE })).toBe(true);
		expect(IndexedReference.isIndexedReference({ dataType: INDEXED_REFERENCE })).toBe(true);
		expect(KeyValuePair.isKeyValuePair({ dataType: KEY_VALUE_PAIR })).toBe(true);
		expect(Assumption.isAssumption({ dataType: ASSUMPTION })).toBe(true);
		expect(ReturnSignal.isReturnSignal({ dataType: RETURN_SIGNAL })).toBe(true);
		expect(BreakSignal.isBreakSignal({ dataType: BREAK_SIGNAL })).toBe(true);
		expect(ContinueSignal.isContinueSignal({ dataType: CONTINUE_SIGNAL })).toBe(true);
		expect(Vector.isVector(new Vector())).toBe(true);
		expect(Matrix.isMatrix(new Matrix([one()]))).toBe(true);
		expect(Collection.isCollection(new Collection())).toBe(true);
		expect(Equation.isEquation(new Equation(Expression.create('x'), one()))).toBe(true);
		expect(ValuesSet.isValuesSet(new ValuesSet())).toBe(true);
		expect(SolutionSet.isSolutionSet(new SolutionSet())).toBe(true);
	});

	it('should preserve ValuesSet subtype recognition', () => {
		const solutions = new SolutionSet();

		expect(isNerdamerNativeType(solutions, SOLUTIONS_SET)).toBe(true);
		expect(ValuesSet.isValuesSet(solutions)).toBe(true);
	});

	it('should reject plain objects through class guards', () => {
		expect(Expression.isExpression({})).toBe(false);
		expect(Rational.isRational({})).toBe(false);
		expect(Polynomial.isPolynomial({})).toBe(false);
		expect(Term.isTerm({})).toBe(false);
		expect(Token.isToken({})).toBe(false);
		expect(Scope.isScope({})).toBe(false);
		expect(IndexedReference.isIndexedReference({})).toBe(false);
		expect(KeyValuePair.isKeyValuePair({})).toBe(false);
		expect(Assumption.isAssumption({})).toBe(false);
		expect(ReturnSignal.isReturnSignal({})).toBe(false);
		expect(BreakSignal.isBreakSignal({})).toBe(false);
		expect(ContinueSignal.isContinueSignal({})).toBe(false);
		expect(Vector.isVector({})).toBe(false);
		expect(Matrix.isMatrix(null)).toBe(false);
		expect(ValuesSet.isValuesSet({})).toBe(false);
		expect(SolutionSet.isSolutionSet(undefined)).toBe(false);
	});
});
