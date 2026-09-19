import { Equation } from '../../src/core/classes/equation/Equation';
import { Expression } from '../../src/core/classes/expression/Expression';
import { Parser } from '../../src/core/classes/parser/Parser';
import { ValuesSet } from '../../src/core/classes/valuesSet/ValuesSet';
import { Vector } from '../../src/core/classes/vector/Vector';
import { UnsupportedOperationError } from '../../src/core/errors';
import { contains } from '../../src/math/math';
import { SolutionSet } from '../../src/solve/classes/SolutionSet';

describe('ValuesSet', () => {
	it('should expose required parser flags', () => {
		const s = new ValuesSet();
		expect(s.isEnumerable).toBe(true);
		expect(Boolean(s.dataType)).toBe(true);
	});

	it('should dedupe by semantic equality (.eq)', () => {
		const x1 = Expression.create('x');
		const x2 = Expression.create('x');
		const s = new ValuesSet([x1, x2]);
		expect(s.elements.length).toBe(1);
		expect(s.has(Expression.create('x'))).toBe(true);
	});

	it('should keep incomparable parser entities as distinct set members', () => {
		const expression = Expression.create('1');
		const vector = new Vector(['x']);
		const s = new ValuesSet([expression, vector]);

		expect(s.count()).toBe(2);
		expect(s.has(expression)).toBe(true);
		expect(s.has(vector)).toBe(true);
	});

	it('should require symmetric equality for heterogeneous membership', () => {
		const residual = Expression.create('x-1');
		const equation = new Equation(Expression.create('x'), Expression.create('1'));
		const expressionFirst = new ValuesSet([residual, equation]);
		const equationFirst = new ValuesSet([equation, residual]);

		// Expression.create(Equation) intentionally converts an equation to its residual,
		// while Equation.eq(Expression) rejects the cross-type comparison. Set membership
		// must therefore require agreement in both directions so insertion order is irrelevant.
		expect(residual.eq(equation)).toBe(true);
		expect(equation.eq(residual)).toBe(false);
		expect(expressionFirst.count()).toBe(2);
		expect(equationFirst.count()).toBe(2);
		expect(expressionFirst.eq(equationFirst)).toBe(true);
	});

	it('add/delete/clear should behave as a set', () => {
		const s = new ValuesSet();
		expect(s.add(Expression.create('a'))).toBe(s);
		expect(s.elements.length).toBe(1);

		// delete by semantic equality (not the same reference)
		expect(s.delete(Expression.create('a'))).toBe(true);
		expect(s.elements.length).toBe(0);
		expect(s.delete(Expression.create('a'))).toBe(false);

		s.add(Expression.create('b'));
		s.add(Expression.create('c'));
		expect(s.elements.length).toBe(2);
		s.clear();
		expect(s.elements.length).toBe(0);
		expect(s.has(Expression.create('b'))).toBe(false);
	});

	it('copy should be independent', () => {
		const a = new ValuesSet([Expression.create('a')]);
		const b = a.copy();

		b.add(Expression.create('b'));
		expect(a.has(Expression.create('b'))).toBe(false);
		expect(b.has(Expression.create('b'))).toBe(true);

		b.delete(Expression.create('a'));
		expect(a.has(Expression.create('a'))).toBe(true);
		expect(b.has(Expression.create('a'))).toBe(false);
	});

	it('each should preserve uniqueness and keep first occurrence', () => {
		const s = new ValuesSet([
			Expression.create('a'),
			Expression.create('b'),
			Expression.create('c'),
		]);

		// map everything to "a" -> should collapse to one element
		s.each(() => Expression.create('a'));
		expect(s.elements.length).toBe(1);
		expect(s.has(Expression.create('a'))).toBe(true);

		const t = new ValuesSet([
			Expression.create('a'),
			Expression.create('b'),
			Expression.create('c'),
		]);
		// map b -> a -> should collapse b away but keep a and c
		t.each(e => (e.eq(Expression.create('b')) ? Expression.create('a') : e));
		expect(t.has(Expression.create('a'))).toBe(true);
		expect(t.has(Expression.create('c'))).toBe(true);
		expect(t.elements.length).toBe(2);
	});

	it('eq should be order independent', () => {
		const a = new ValuesSet([Expression.create('a'), Expression.create('b')]);
		const b = new ValuesSet([Expression.create('b'), Expression.create('a')]);
		expect(a.eq(b)).toBe(true);
	});

	it('sort should change iteration order but not equality', () => {
		const a = new ValuesSet([Expression.create('b'), Expression.create('a')]);
		const b = a.copy();
		b.sort();
		expect(a.eq(b)).toBe(true);
		// Representation likely changes
		expect(a.text()).not.toEqual(b.text());
	});

	it('subset/superset comparisons should work and return false for non-ValuesSet', () => {
		const a = new ValuesSet([Expression.create('a')]);
		const b = new ValuesSet([Expression.create('a'), Expression.create('b')]);

		expect(a.lte(b)).toBe(true);
		expect(a.lt(b)).toBe(true);
		expect(b.gte(a)).toBe(true);
		expect(b.gt(a)).toBe(true);

		// blanket false when other is not a ValuesSet
		expect(a.lt(Expression.create('a'))).toBe(false);
		expect(a.lte(Expression.create('a'))).toBe(false);
		expect(a.gt(Expression.create('a'))).toBe(false);
		expect(a.gte(Expression.create('a'))).toBe(false);
		expect(a.eq(Expression.create('a'))).toBe(false);
	});
	it('should recognize SolutionSet as a ValuesSet subtype', () => {
		const solutions = new SolutionSet([Expression.create('1')]);
		expect(ValuesSet.isValuesSet(solutions)).toBe(true);
		expect(solutions.eq(new SolutionSet([Expression.create('1')]))).toBe(true);
	});

	it('should own inserted values and return independent element snapshots', () => {
		const vector = new Vector(['x']);
		const set = new ValuesSet([vector]);

		vector.append(Expression.create('y'));
		expect(set.text()).toEqual('{[x]}');

		const exposed = set.elements[0] as Vector;
		exposed.append(Expression.create('z'));
		set.elements.push(Expression.create('outside'));
		expect(set.text()).toEqual('{[x]}');

		const indexed = set.at(0) as Vector;
		indexed.append(Expression.create('q'));
		expect(set.text()).toEqual('{[x]}');
	});


	it('sort callbacks should not receive mutable references to stored members', () => {
		const set = new ValuesSet([new Vector(['x']), new Vector(['y'])]);

		set.sort((a, b) => {
			(a as Vector).append(Expression.create('mutated'));
			return a.text().localeCompare(b.text());
		});

		expect(set.text()).toEqual('{[x], [y]}');
	});

	it('indexed replacement should preserve uniqueness', () => {
		const set = new ValuesSet([
			Expression.create('a'),
			Expression.create('b'),
			Expression.create('c'),
		]);

		set.__set__([1], Expression.create('a'));
		expect(set.text()).toEqual('{a, c}');

		set.__set__([1], Expression.create('d'));
		expect(set.text()).toEqual('{a, d}');
	});

	it('parser indexed replacement should preserve set uniqueness', () => {
		Parser.parse('setValue: {a, b, c}');
		expect(Parser.parse('setValue[1]: a').text()).toEqual('{a, c}');
	});

	it('should provide standard finite-set operations without mutating either operand', () => {
		const a = new ValuesSet([
			Expression.create('a'),
			Expression.create('b'),
			Expression.create('c'),
		]);
		const b = new ValuesSet([
			Expression.create('c'),
			Expression.create('d'),
		]);

		expect(a.union(b).text()).toEqual('{a, b, c, d}');
		expect(a.intersection(b).text()).toEqual('{c}');
		expect(a.difference(b).text()).toEqual('{a, b}');
		expect(a.symmetricDifference(b).text()).toEqual('{a, b, d}');
		expect(a.text()).toEqual('{a, b, c}');
		expect(b.text()).toEqual('{c, d}');
	});

	it('should expose explicit subset, superset, and disjointness predicates', () => {
		const a = new ValuesSet([Expression.create('a')]);
		const ab = new ValuesSet([Expression.create('a'), Expression.create('b')]);
		const c = new ValuesSet([Expression.create('c')]);

		expect(a.isSubsetOf(ab)).toBe(true);
		expect(a.isProperSubsetOf(ab)).toBe(true);
		expect(ab.isSupersetOf(a)).toBe(true);
		expect(ab.isProperSupersetOf(a)).toBe(true);
		expect(a.isDisjointFrom(c)).toBe(true);
		expect(ab.isDisjointFrom(a)).toBe(false);
	});

	it('contains and in should test the requested container member', () => {
		const set = new ValuesSet([Expression.create('a'), Expression.create('b')]);

		expect(contains(set, 'a').text()).toEqual('1');
		expect(contains(set, 'c').text()).toEqual('0');
		expect(Parser.parse('contains({a,b},b)').text()).toEqual('1');
		expect(Parser.parse('contains({a,b},c)').text()).toEqual('0');
		expect(Parser.parse('b in {a,b}').text()).toEqual('1');
		expect(Parser.parse('c in {a,b}').text()).toEqual('0');
		expect(Parser.parse('a in [a,b]').text()).toEqual('1');
		expect(Parser.parse('c in [a,b]').text()).toEqual('0');
		expect(Parser.parse('x in {x=>1,y=>2}').text()).toEqual('1');
		expect(Parser.parse('z in {x=>1,y=>2}').text()).toEqual('0');
	});

	it('should reject inherited binary arithmetic that would depend on set order', () => {
		const set = new ValuesSet([Expression.create('1'), Expression.create('2')]);
		const value = Expression.create('3');

		expect(() => set.plus(value)).toThrow(UnsupportedOperationError);
		expect(() => set.minus(value)).toThrow(UnsupportedOperationError);
		expect(() => set.times(value)).toThrow(UnsupportedOperationError);
		expect(() => set.div(value)).toThrow(UnsupportedOperationError);
		expect(() => set.pow(value)).toThrow(UnsupportedOperationError);
		expect(() => Parser.parse('{1,2}+3')).toThrow(UnsupportedOperationError);
		expect(() => Parser.parse('{1,2}+{3,4}')).toThrow(UnsupportedOperationError);
	});

});
