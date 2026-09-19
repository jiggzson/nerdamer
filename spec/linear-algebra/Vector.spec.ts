import { Collection } from '../../src/core/classes/collection/Collection';
import { Expression } from '../../src/core/classes/expression/Expression';
import { Matrix } from '../../src/core/classes/matrix/Matrix';
import { Parser } from '../../src/core/classes/parser/Parser';
import { Vector } from '../../src/core/classes/vector/Vector';
import { DimensionError, MathError, UnexpectedDataType } from '../../src/core/errors';
import nerdamer from '../../src/index';

const pop = (v: Vector, i?: number) => {
	const e = v.pop(i);
	return (e as Expression).text();
};

describe('Vectors', () => {
	it('should pop', () => {
		expect(pop(new Vector(['3*a^2', 2, 3, 4, 5, 6]), 0)).toEqual('3*a^2');
		expect(pop(new Vector(['3*a^2', 2, 3, 4, 5, 6]))).toEqual('6');
		expect(pop(new Vector(['3*a^2', 2, 3, 4, 5, 6]), -1)).toEqual('6');
		expect(pop(new Vector(['3*a^2', 2, 3, 4, 5, 6]), -2)).toEqual('5');
		// The Vector should be mutated
		const v = new Vector(['a', 2, 3, 4, 5, 6]);
		v.pop(-3);
		expect(v.text()).toEqual('[a, 2, 3, 5, 6]');
	});

	it('should expose structural mutation helpers directly', () => {
		const vector = Vector.create([1, 2]);

		expect(vector.at(0)?.eq(Expression.create(1))).toBe(true);
		expect(vector.at(2)).toBeUndefined();
		expect(vector.arrayMap(e => e.text())).toEqual(['1', '2']);
		expect(vector.add(Expression.create(3))).toBe(vector);
		expect(vector.insert(1, Expression.create(4))).toBe(vector);
		expect(vector.text()).toEqual('[1, 4, 2, 3]');
		expect(vector.indexOf(Expression.create(2))).toBe(2);
		expect(vector.delete(Expression.create(4))).toBe(true);
		expect(vector.delete(Expression.create(9))).toBe(false);
		expect(vector.remove(Expression.create(2))).toBe(vector);
		expect(vector.reverse()).toBe(vector);
		expect(vector.text()).toEqual('[3, 1]');
		expect(vector.extend(new Vector([5, 6]))).toBe(vector);
		expect(vector.text()).toEqual('[3, 1, 5, 6]');
		expect(() => vector.extend(Expression.create(1))).toThrow(UnexpectedDataType);
		expect(vector.clear()).toBe(vector);
		expect(vector.count()).toBe(0);
	});

	describe('each/copy/expand/evaluate', () => {
		it('each should return Vector and keep length', () => {
			const v = new Vector([Expression.create('a'), Expression.create('b')]);
			const r = v.each(e => e);
			expect(r).toBeInstanceOf(Vector);
			expect(v.count()).toBe(2);
		});

		it('each should allow observation without replacing values', () => {
			const v = new Vector([Expression.create('a'), Expression.create('b')]);
			const seen: string[] = [];

			v.each(e => {
				seen.push(e.text());
			});

			expect(seen).toEqual(['a', 'b']);
			expect(v.text()).toEqual('[a, b]');
		});

		it('should copy Collection elements when constructing a Vector', () => {
			const collection = new Collection([Expression.create('x+1')]);
			const vector = new Vector(collection);

			expect(vector.text()).toEqual('[1+x]');
			expect(vector.elements[0]).not.toBe(collection.elements[0]);
		});

		it('copy should be independent', () => {
			const v = new Vector([Expression.create('a')]);
			const c = v.copy();
			c.append(Expression.create('b'));
			expect(v.count()).toBe(1);
			expect(c.count()).toBe(2);
		});

		it('expand/evaluate should not mutate original', () => {
			const v = new Vector([Expression.create('(x+1)^2')]);
			const expanded = v.expand();
			const evaluated = new Vector([Expression.create('sqrt(4)')]).evaluate();

			expect(expanded).toBeInstanceOf(Vector);
			expect(v.text()).toEqual(new Vector([Expression.create('(x+1)^2')]).text());
			expect(Vector.isVector(evaluated)).toBe(true);
			if (Vector.isVector(evaluated)) {
				expect(evaluated.elements[0].eq(Expression.create('sqrt(4)').evaluate())).toBe(true);
			}
		});
	});

	describe('getters & setters', () => {
		it('should get elements using bracket notation', () => {
			expect(Parser.parse('[a, b, -4, 5][2]').text()).toEqual('-4');
		});

		it('should reject direct out-of-range reads', () => {
			const vector = new Vector([1, 2]);

			expect(vector.__get__([0]).eq(Expression.create(1))).toBe(true);
			expect(() => vector.__get__([-1])).toThrow(UnexpectedDataType);
			expect(() => vector.__get__([2])).toThrow(UnexpectedDataType);
		});

		it('should set elements using bracket notation', () => {
			Parser.parse('V: [a, b, c]');
			expect(Parser.parse('V[0]: y').text()).toEqual('[y, b, c]');
		});
		it('should respect brackets in functions', () => {
			expect(Parser.parse('cos(8*[1,2][1]+5)').text()).toEqual('cos(21)');
		});
	});

	describe('arithmetic', () => {
		it('should apply scalar and corresponding Vector operations without mutating the source', () => {
			const vector = new Vector([2, 4]);

			expect(vector.plus(1).eq(new Vector([3, 5]))).toBe(true);
			expect(vector.minus(new Vector([1, 2])).eq(new Vector([1, 2]))).toBe(true);
			expect(vector.times(new Vector([3, 4])).eq(new Vector([6, 16]))).toBe(true);
			expect(vector.div(2).eq(new Vector([1, 2]))).toBe(true);
			expect(vector.pow(2).eq(new Vector([4, 16]))).toBe(true);
			expect(vector.eq(new Vector([2, 4]))).toBe(true);
		});

		it('should reject mismatched Vector dimensions for element-wise arithmetic', () => {
			const vector = new Vector([1, 2]);
			const mismatch = new Vector([1]);

			expect(() => vector.plus(mismatch)).toThrow(DimensionError);
			expect(() => vector.minus(mismatch)).toThrow(DimensionError);
			expect(() => vector.times(mismatch)).toThrow(DimensionError);
			expect(() => vector.div(mismatch)).toThrow(DimensionError);
			expect(() => vector.pow(mismatch)).toThrow(DimensionError);
		});
	});

	describe('multiplication', () => {
		expect(Parser.parse('5*[1,2]*[x,y]').text()).toEqual('[5*x, 10*y]');
		// expect(()=>{Parser.parse('[a,b]*[1,2,3]')}).toThrow();

		it('should multiply a Vector from the left of a Matrix', () => {
			const vector = new Vector([1, 2]);
			const matrix = new Matrix([3, 4, 5], [6, 7, 8]);
			const actual = vector.times(matrix);

			expect(vector.dimensions()).toEqual([2]);
			expect(matrix.dimensions()).toEqual([2, 3]);
			expect(actual.dimensions()).toEqual([3]);
			expect(actual.text()).toEqual('[15, 18, 21]');
			expect(vector.text()).toEqual('[1, 2]');
			expect(matrix.text()).toEqual('matrix([3, 4, 5], [6, 7, 8])');
			expect(Parser.parse('[1,2]*matrix([3,4,5],[6,7,8])').text()).toEqual(
				'[15, 18, 21]'
			);
		});

		it('should preserve exact symbolic Vector-Matrix products', () => {
			const vector = new Vector(['x', 'y']);
			const matrix = new Matrix(['a', 'b'], ['c', 'd']);
			const actual = vector.times(matrix);
			const expected = new Vector(['a*x+c*y', 'b*x+d*y']);

			expect(actual.eq(expected)).toBe(true);
			expect(actual.dimensions()).toEqual([2]);
		});

		it('should enforce Vector-Matrix dimensions and preserve the empty identity', () => {
			const matrix = new Matrix([1, 2, 3], [4, 5, 6]);

			expect(() => new Vector([1, 2, 3]).times(matrix)).toThrow(MathError);
			expect(new Vector([]).times(new Matrix([])).text()).toEqual('[]');
		});
	});

	describe('comparison', () => {
		it('should allow mixed equality and strict inequality in non-strict comparisons', () => {
			const lower = new Vector([1, 2, 3]);
			const upper = new Vector([2, 2, 4]);

			expect(lower.dimensions()).toEqual([3]);
			expect(upper.dimensions()).toEqual([3]);
			expect(upper.gte(lower)).toBe(true);
			expect(lower.lte(upper)).toBe(true);
			expect(lower.gte(upper)).toBe(false);
			expect(upper.lte(lower)).toBe(false);
			expect(lower.eq(new Vector([1, 2, 3]))).toBe(true);
			expect(lower.eq(Expression.create(1))).toBe(false);
			expect(upper.gt(lower)).toBe(false);
			expect(lower.lt(upper)).toBe(false);
		});
	});

	describe('aggregate helpers', () => {
		it('should sum, multiply, trim, and convert ordered coefficients', () => {
			const vector = new Vector([1, 2, 3]);
			const trimmed = new Vector([0, 'x', 0, 2]).trim();
			const polynomial = vector.toPolynomial(['t']);

			expect(vector.sum().eq(6)).toBe(true);
			expect(vector.prod().eq(6)).toBe(true);
			expect(trimmed.eq(new Vector(['x', 2]))).toBe(true);
			expect(polynomial.variables).toEqual(['t']);
			expect(polynomial.getExpression().eq(Expression.create('1+2*t+3*t^2'))).toBe(true);
		});
	});

	describe('linear algebra', () => {
		it('should compute the dot product of equal-length vectors', () => {
			const a = new Vector([1, 2, 3]);
			const b = new Vector([4, 5, 6]);

			expect(a.dimensions()).toEqual([3]);
			expect(b.dimensions()).toEqual([3]);
			expect(a.dot(b).text()).toEqual('32');
			expect(() => a.dot(new Vector([1, 2]))).toThrow(DimensionError);
		});

		it('should preserve bilinear complex dot and matrix products', () => {
			const vector = new Vector(['i']);
			const matrix = new Matrix(['i']);

			expect(vector.dot(vector).text()).toEqual('-1');
			expect(matrix.times(vector).text()).toEqual('[-1]');
			expect(vector.times(matrix).text()).toEqual('[-1]');
		});

		it('should compute the three-dimensional cross product', () => {
			const a = new Vector([1, 0, 0]);
			const b = new Vector([0, 1, 0]);
			const actual = a.cross(b);

			expect(a.dimensions()).toEqual([3]);
			expect(b.dimensions()).toEqual([3]);
			expect(actual.dimensions()).toEqual([3]);
			expect(actual.text()).toEqual('[0, 0, 1]');
			expect(() => new Vector([1, 2]).cross(new Vector([3, 4]))).toThrow(DimensionError);
		});

		it('should compute Euclidean norms using coordinate magnitudes', () => {
			const real = new Vector([3, 4]);
			const imaginary = new Vector(['i']);
			const mixed = new Vector(['3*i', 4]);

			expect(real.dimensions()).toEqual([2]);
			expect(real.norm().text()).toEqual('5');
			expect(imaginary.dimensions()).toEqual([1]);
			expect(imaginary.norm().text()).toEqual('1');
			expect(mixed.dimensions()).toEqual([2]);
			expect(mixed.norm().text()).toEqual('5');
			expect(new Vector([]).norm().text()).toEqual('0');
		});

		it('should reject non-Expression elements in linear-algebra norms', () => {
			const vector = new Vector([new Collection([Expression.create('x')])]);

			expect(vector.dimensions()).toEqual([1]);
			expect(() => vector.norm()).toThrow(UnexpectedDataType);
		});
	});
});

describe('Vector function regressions', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/665
	it('leaves dot and cross symbolic when the operands are not known vectors', () => {
		expect(nerdamer('dot(a,b)').text()).toEqual('dot(a, b)');
		expect(nerdamer('cross(a,b)').text()).toEqual('cross(a, b)');
	});
});
