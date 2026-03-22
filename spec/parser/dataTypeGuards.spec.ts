import { Collection } from '../../src/core/classes/collection/Collection';
import { Equation } from '../../src/core/classes/equation/Equation';
import { Expression } from '../../src/core/classes/expression/Expression';
import { one } from '../../src/core/classes/expression/shortcuts';
import { Matrix } from '../../src/core/classes/matrix/Matrix';
import { ValuesSet } from '../../src/core/classes/valuesSet/ValuesSet';
import { Vector } from '../../src/core/classes/vector/Vector';

describe('dataType guards', () => {
	it('should identify structured entities by dataType', () => {
		expect(Vector.isVector(new Vector())).toBe(true);
		expect(Matrix.isMatrix(new Matrix([one()]))).toBe(true);
		expect(Collection.isCollection(new Collection())).toBe(true);
		expect(Equation.isEquation(new Equation(Expression.create('x'), one()))).toBe(true);
		expect(ValuesSet.isValuesSet(new ValuesSet())).toBe(true);
	});

	it('should reject plain objects', () => {
		expect(Vector.isVector({})).toBe(false);
		expect(ValuesSet.isValuesSet({})).toBe(false);
	});
});
