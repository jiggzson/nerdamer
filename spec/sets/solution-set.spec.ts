import '../helpers/registerNerdamerFunctions';
import Decimal from 'decimal.js';

import { Expression } from '../../src/core/classes/expression/Expression';
import { Rational } from '../../src/core/classes/rational/Rational';
import { ALL_SYMBOL, INTEGER_PARAM } from '../../src/core/constants/symbolNames';
import { ValuesSet } from '../../src/core/classes/valuesSet/ValuesSet';
import { Vector } from '../../src/core/classes/vector/Vector';
import { UnexpectedDataType, UnsupportedOperationError, message } from '../../src/core/errors';
import { clearWarnings, getWarnings } from '../../src/core/warnings';
import { RESTRICTED } from '../../src/core/Settings';
import { SolutionSet } from '../../src/solve/classes/SolutionSet';
import { solve } from '../../src/solve/solve';

describe('SolutionSet', () => {
	it('should preserve finite-set uniqueness', () => {
		const set = new SolutionSet([
			Expression.create('x'),
			Expression.create('x'),
			Expression.create('y'),
		]);

		expect(set.text()).toEqual('{x, y}');
		expect(set.count()).toBe(2);
		expect(set.eq(new SolutionSet([Expression.create('y'), Expression.create('x')]))).toBe(
			true
		);
	});

	it('should admit prevalidated numerical batches without duplicating members', () => {
		const set = new SolutionSet([Expression.create('3')]);
		set.exclude(new SolutionSet([Expression.create('2')]));

		set.addValidatedNumericalSolutions([
			Expression.create('1.25'),
			Expression.create('1.25'),
			Expression.create('1.25+2.5*i'),
			Expression.create('1.25+2.5*i'),
			Expression.create('2'),
			Expression.create('3'),
		]);

		expect(set.text()).toEqual('{3, 1.25, 1.25+2.5*i}');
		expect(set.count()).toBe(3);
	});

	it('should reserve symbols used to describe non-finite solver results', () => {
		expect(RESTRICTED).toContain(INTEGER_PARAM);
		expect(RESTRICTED).toContain(ALL_SYMBOL);
	});

	it('should classify finite, parametric, and all-value solution descriptors', () => {
		const finite = new SolutionSet([Expression.create('a')]);
		const parametric = new SolutionSet([Expression.create('_n*pi')]);
		const allValues = new SolutionSet([Expression.create('all')]);

		// Ordinary symbolic parameters describe a finite formula-valued solution. The reserved
		// integer index _n is what marks a solver-generated family.
		expect(finite.solutionForm).toBe('finite');
		expect(parametric.solutionForm).toBe('parametric');
		expect(allValues.solutionForm).toBe('all');
		expect(parametric.count()).toBe(1);
	});

	it('should derive solution form from current descriptors rather than mutable metadata', () => {
		const set = new SolutionSet([Expression.create('1')]);
		expect(set.solutionForm).toBe('finite');

		set.add(Expression.create('_n*pi'));
		expect(set.solutionForm).toBe('parametric');
		expect(set.copy().solutionForm).toBe('parametric');

		set.add(Expression.create('all'));
		expect(set.solutionForm).toBe('all');

		set.delete(Expression.create('all'));
		expect(set.solutionForm).toBe('parametric');
	});

	it('keeps excluded values out of the solution set', () => {
		const set = new SolutionSet([Expression.create('1'), Expression.create('2')]);
		set.exclude(new SolutionSet([Expression.create('2'), Expression.create('3')]));

		expect(set.text()).toEqual('{1}');
		expect(set.getExcluded().text()).toEqual('{2, 3}');

		set.add(Expression.create('2'));
		set.add(Expression.create('3'));
		expect(set.text()).toEqual('{1}');
	});

	it('clear should reset accepted solutions and solver metadata', () => {
		const set = new SolutionSet([Expression.create('1')]);
		set.exclude(new SolutionSet([Expression.create('2')]));
		set.addRawRoot({
			root: new Decimal('1.25'),
			iterations: 7,
			converged: true,
			error: new Decimal('1e-20'),
		});
		set.partial = true;
		set.solutionsType = 'mixed';
		set.unsolved = Expression.create('x^5-x+1');

		expect(set.clear()).toBe(set);
		expect(set.text()).toEqual('{}');
		expect(set.getExcluded().count()).toBe(0);
		expect(set.getRawRoots()).toHaveLength(0);
		expect(set.partial).toBe(false);
		expect(set.solutionsType).toBeUndefined();
		expect(set.unsolved).toBeUndefined();
		expect(set.solutionForm).toBe('finite');

		set.add(Expression.create('2'));
		expect(set.text()).toEqual('{2}');
	});

	it('should keep excluded-state snapshots independent', () => {
		const set = new SolutionSet();
		set.exclude(new SolutionSet([Expression.create('2')]));

		const excluded = set.getExcluded();
		excluded.add(Expression.create('3'));

		expect(set.getExcluded().text()).toEqual('{2}');
	});

	it('copy should preserve all solver metadata independently', () => {
		const set = new SolutionSet([Expression.create('1')]);
		set.exclude(new SolutionSet([Expression.create('2')]));
		set.addRawRoot({
			root: new Decimal('1.25'),
			iterations: 7,
			converged: true,
			error: new Decimal('1e-20'),
		});
		set.partial = true;
		set.solutionsType = 'mixed';
		set.unsolved = Expression.create('x^5+x+1');

		const copy = set.copy();
		expect(copy.text()).toEqual('{1}');
		expect(copy.getExcluded().text()).toEqual('{2}');
		expect(copy.getRawRoots()[0].root.toString()).toEqual('1.25');
		expect(copy.getRawRoots()[0].error.toString()).toEqual('1e-20');
		expect(copy.partial).toBe(true);
		expect(copy.solutionsType).toBe('mixed');
		expect(copy.unsolved?.eq(Expression.create('x^5+x+1'))).toBe(true);

		copy.add(Expression.create('3'));
		copy.exclude(new SolutionSet([Expression.create('1')]));
		copy.unsolved = Expression.create('z');
		const raw = copy.getRawRoots();
		raw[0].root = new Decimal('99');

		expect(set.text()).toEqual('{1}');
		expect(set.getExcluded().text()).toEqual('{2}');
		expect(set.getRawRoots()[0].root.toString()).toEqual('1.25');
		expect(set.unsolved?.eq(Expression.create('x^5+x+1'))).toBe(true);
	});

	it('addRawRoot and getRawRoots should not expose mutable metadata records', () => {
		const root = {
			root: new Decimal('2'),
			iterations: 3,
			converged: true,
			error: new Decimal('1e-12'),
		};
		const set = new SolutionSet();
		set.addRawRoot(root);

		root.root = new Decimal('8');
		const exposed = set.getRawRoots();
		exposed[0].error = new Decimal('1');

		expect(set.getRawRoots()[0].root.toString()).toEqual('2');
		expect(set.getRawRoots()[0].error.toString()).toEqual('1e-12');
	});

	it('append should dedupe accepted values and merge supported metadata', () => {
		const left = new SolutionSet([Expression.create('1'), Expression.create('2')]);
		left.solutionsType = 'symbolic';

		const right = new SolutionSet([Expression.create('2'), Expression.create('3')]);
		right.exclude(new SolutionSet([Expression.create('1')]));
		right.addRawRoot({
			root: new Decimal('3'),
			iterations: 4,
			converged: true,
			error: new Decimal('1e-9'),
		});
		right.partial = true;
		right.solutionsType = 'numeric';
		right.unsolved = Expression.create('x^7+x+1');

		expect(left.append(right)).toBe(left);
		expect(left.text()).toEqual('{2, 3}');
		expect(left.getExcluded().text()).toEqual('{1}');
		expect(left.getRawRoots()).toHaveLength(1);
		expect(left.partial).toBe(true);
		expect(left.solutionsType).toBe('mixed');
		expect(left.unsolved?.eq(Expression.create('x^7+x+1'))).toBe(true);
	});


	it('append should transfer an already unique source into an empty set independently', () => {
		const source = new SolutionSet([
			Expression.create('cbrt(2)+cbrt(3)'),
			Expression.create('cbrt(5)+cbrt(7)'),
			Expression.create('1.25+2.5*i'),
		]);
		source.solutionsType = 'mixed';

		const target = new SolutionSet();
		target.append(source);

		expect(target.text()).toEqual(source.text());
		expect(target.solutionsType).toBe('mixed');

		target.add(Expression.create('9'));
		expect(source.count()).toBe(3);
		expect(target.count()).toBe(4);
	});


	it('appendValidatedNumerical should merge prevalidated numeric results without changing metadata handling', () => {
		const left = new SolutionSet([Expression.create('1')]);
		left.solutionsType = 'symbolic';

		const right = new SolutionSet();
		right.addValidatedNumericalSolutions([
			Expression.create('2.5'),
			Expression.create('2.5'),
			Expression.create('3.5+4.5*i'),
		]);
		right.solutionsType = 'numeric';
		right.partial = true;
		right.addRawRoot({
			root: new Decimal('2.5'),
			iterations: 2,
			converged: true,
			error: new Decimal('1e-20'),
		});

		left.appendValidatedNumerical(right);

		expect(left.text()).toEqual('{1, 2.5, 3.5+4.5*i}');
		expect(left.solutionsType).toBe('mixed');
		expect(left.partial).toBe(true);
		expect(left.getRawRoots()).toHaveLength(1);
	});

	it('addSolutions should preserve only verified source provenance', () => {
		const target = new SolutionSet([Expression.create('1')]);
		target.solutionsType = 'symbolic';

		const source = new SolutionSet([Expression.create('2')]);
		source.solutionsType = 'numeric';
		source.partial = true;
		source.unsolved = Expression.create('y^5+y+1');
		source.exclude(new SolutionSet([Expression.create('3')]));
		source.addRawRoot({
			root: new Decimal('2'),
			iterations: 4,
			converged: true,
			error: new Decimal('1e-9'),
		});

		target.addSolutions(source, Expression.create('(x-1)*(x-2)'), 'x');
		expect(target.text()).toEqual('{1, 2}');
		expect(target.solutionsType).toBe('mixed');

		// addSolutions verifies candidate descriptors in a new context. Metadata tied to the
		// source solve belongs to append(), not to this verified-transfer operation.
		expect(target.partial).toBe(false);
		expect(target.unsolved).toBeUndefined();
		expect(target.getExcluded().count()).toBe(0);
		expect(target.getRawRoots()).toHaveLength(0);

		const rejectedTarget = new SolutionSet([Expression.create('1')]);
		rejectedTarget.solutionsType = 'symbolic';
		const rejectedSource = new SolutionSet([Expression.create('3')]);
		rejectedSource.solutionsType = 'numeric';

		rejectedTarget.addSolutions(rejectedSource, Expression.create('x-1'), 'x');
		expect(rejectedTarget.text()).toEqual('{1}');
		expect(rejectedTarget.solutionsType).toBe('symbolic');

		const duplicateTarget = new SolutionSet([Expression.create('1')]);
		duplicateTarget.solutionsType = 'symbolic';
		const duplicateSource = new SolutionSet([Expression.create('1')]);
		duplicateSource.solutionsType = 'numeric';

		duplicateTarget.addSolutions(duplicateSource, Expression.create('x-2'), 'x');
		expect(duplicateTarget.solutionsType).toBe('symbolic');

		duplicateTarget.addSolutions(duplicateSource, Expression.create('x-1'), 'x');
		expect(duplicateTarget.solutionsType).toBe('mixed');
	});

	it('should reject non-Expression values introduced through mutable aggregate APIs', () => {
		const set = new SolutionSet([Expression.create('1')]);
		const vector = new Vector(['x']);

		expect(() => set.__set__([0], vector)).toThrow(UnexpectedDataType);
		expect(() => set.each(() => vector as unknown as Expression)).toThrow(UnexpectedDataType);
		expect(set.text()).toEqual('{1}');
	});

	it('should reject non-Expression exclusions without partially changing the set', () => {
		const set = new SolutionSet([Expression.create('1'), Expression.create('2')]);
		const invalid = new ValuesSet([Expression.create('2'), new Vector(['x'])]);

		expect(() => set.exclude(invalid)).toThrow(UnexpectedDataType);
		expect(set.text()).toEqual('{1, 2}');
		expect(set.getExcluded().count()).toBe(0);
	});

	it('should reject invalid addMany input without partially changing the set', () => {
		const set = new SolutionSet([Expression.create('1')]);
		const invalid = [Expression.create('2'), new Vector(['x'])] as unknown as Expression[];

		expect(() => set.addMany(invalid)).toThrow(UnexpectedDataType);
		expect(set.text()).toEqual('{1}');
	});

	it('should expose exclusions as ValuesSet copies rather than internal references', () => {
		const set = new SolutionSet();
		set.exclude(new SolutionSet([Expression.create('x')]));

		const excluded = set.getExcluded();
		expect(excluded).toBeInstanceOf(ValuesSet);
		expect(excluded).not.toBe(set.getExcluded());
	});

	describe('generate indexed solutions', () => {
		it('materializes an inclusive index range without changing the original family', () => {
			const source = solve('sin(x)', 'x');
			const finite = source.generate({ indices: [-2, 2] });

			expect(source.solutionForm).toBe('parametric');
			expect(source.text()).toBe('{_n*pi}');
			expect(finite).toBeInstanceOf(SolutionSet);
			expect(finite.solutionForm).toBe('finite');
			expect(finite.count()).toBe(5);
			for (const root of ['-2*pi', '-pi', '0', 'pi', '2*pi']) {
				expect(finite.has(Expression.create(root))).toBe(true);
			}
		});

		it('deduplicates overlapping indexed families', () => {
			const source = new SolutionSet([
				Expression.create('_n*pi'),
				Expression.create('(1+_n)*pi'),
			]);
			const finite = source.generate({ indices: [-1, 1] });

			expect(finite.count()).toBe(4);
			for (const value of ['-pi', '0', 'pi', '2*pi']) {
				expect(finite.has(Expression.create(value))).toBe(true);
			}
			expect(source.count()).toBe(2);
		});

		it('generates every inverse-trigonometric branch returned by the public solver', () => {
			const source = solve('sin(x)-1/2', 'x');
			expect(source.count()).toBe(2);
			const finite = source.generate({ indices: [-1, 1] });
			expect(finite.solutionForm).toBe('finite');
			expect(finite.count()).toBe(6);
			expect(finite.has(Expression.create('pi/6'))).toBe(true);
			expect(finite.has(Expression.create('5*pi/6'))).toBe(true);
		});

		it('expands nonperiodic integer families and retains existing finite values', () => {
			const source = new SolutionSet([
				Expression.create('1'),
				Expression.create('a+_n^2'),
			]);
			const finite = source.generate({ indices: [-2, 2] });

			expect(finite.count()).toBe(4);
			for (const value of ['1', 'a', 'a+1', 'a+4']) {
				expect(finite.has(Expression.create(value))).toBe(true);
			}
			expect(source.solutionForm).toBe('parametric');
		});

		it('returns an independent copy for finite and empty results', () => {
			const source = new SolutionSet([Expression.create('a+1')]);
			const result = source.generate({ indices: [-2, 2] });
			expect(result).not.toBe(source);
			expect(result.eq(source)).toBe(true);
			result.add(Expression.create('5'));
			expect(source.count()).toBe(1);

			const empty = new SolutionSet();
			const generated = empty.generate({ indices: [0, 0] });
			expect(generated).not.toBe(empty);
			expect(generated.count()).toBe(0);
		});

		it('preserves solver state and filters explicitly excluded finite roots', () => {
			const source = new SolutionSet([Expression.create('_n*pi')]);
			source.exclude(new ValuesSet([Expression.create('0')]));
			source.solutionsType = 'symbolic';
			source.partial = true;
			source.unsolved = Expression.create('x^5+x+1');
			source.addRawRoot({
				root: new Decimal('2.5'),
				iterations: 3,
				converged: true,
				error: new Decimal('1e-10'),
			});

			const finite = source.generate({ indices: [-1, 1] });
			expect(finite.count()).toBe(2);
			expect(finite.has(Expression.create('0'))).toBe(false);
			expect(finite.getExcluded().has(Expression.create('0'))).toBe(true);
			expect(finite.solutionsType).toBe('symbolic');
			expect(finite.partial).toBe(true);
			expect(finite.unsolved?.eq(Expression.create('x^5+x+1'))).toBe(true);
			expect(finite.getRawRoots()).toHaveLength(1);
			expect(source.count()).toBe(1);
		});

		it('skips a singular integer member without discarding other members', () => {
			const source = new SolutionSet([Expression.create('_n^-1')]);
			const finite = source.generate({ indices: [-1, 1] });

			expect(finite.count()).toBe(2);
			expect(finite.has(Expression.create('-1'))).toBe(true);
			expect(finite.has(Expression.create('1'))).toBe(true);
		});

		it('rejects indexed exclusion families that cannot be safely resolved', () => {
			const source = new SolutionSet([Expression.create('(1+_n)*pi')]);
			source.exclude(new ValuesSet([Expression.create('_n*pi')]));

			expect(() => source.generate({ indices: [-1, 1] }))
				.toThrow(UnsupportedOperationError);
			expect(source.solutionForm).toBe('parametric');
		});

		it('generates actual roots within an inclusive real interval', () => {
			const roots = solve('sin(x)', 'x');
			const finite = roots.generate({ interval: [-10, 10] });

			expect(finite.solutionForm).toBe('finite');
			expect(finite.count()).toBe(7);
			for (const value of ['-3*pi', '-2*pi', '-pi', '0', 'pi', '2*pi', '3*pi']) {
				expect(finite.has(Expression.create(value))).toBe(true);
			}
			expect(roots.solutionForm).toBe('parametric');
		});

		it('derives distant integer indices for a narrowly spaced family', () => {
			const source = new SolutionSet([Expression.create('1000+_n/100')]);
			const finite = source.generate({ interval: [-1, 1] });

			expect(finite.count()).toBe(201);
			for (const value of ['-1', '0', '1']) {
				expect(finite.has(Expression.create(value))).toBe(true);
			}
			expect(finite.elements.every(x => x.gte(-1) && x.lte(1))).toBe(true);
			expect(source.solutionForm).toBe('parametric');
		});

		it('handles descending affine families and exact inclusive endpoints', () => {
			const source = new SolutionSet([Expression.create('1-2*_n')]);
			const finite = source.generate({ interval: [-1, 1] });

			expect(finite.count()).toBe(2);
			expect(finite.has(Expression.create('1'))).toBe(true);
			expect(finite.has(Expression.create('-1'))).toBe(true);

			const pi = solve('sin(x)', 'x').generate({ interval: ['-pi', 'pi'] });
			expect(pi.count()).toBe(3);
			expect(pi.has(Expression.create('-pi'))).toBe(true);
			expect(pi.has(Expression.create('pi'))).toBe(true);
		});

		it('combines multiple families with finite values, filters to interval and excludes roots', () => {
			const source = new SolutionSet([
				Expression.create('_n*pi'),
				Expression.create('(1+_n)*pi'),
				Expression.create('10'),
				Expression.create('1/2'),
			]);
			source.exclude(new ValuesSet([Expression.create('0')]));

			const finite = source.generate({ interval: [-4, 4] });
			expect(finite.count()).toBe(3);
			for (const value of ['-pi', 'pi', '1/2']) {
				expect(finite.has(Expression.create(value))).toBe(true);
			}
			expect(finite.has(Expression.create('0'))).toBe(false);
			expect(finite.has(Expression.create('10'))).toBe(false);
		});

		it('filters already-finite solutions by value interval independently', () => {
			const source = new SolutionSet([
				Expression.create('-5'),
				Expression.create('0'),
				Expression.create('2'),
				Expression.create('5'),
			]);
			source.solutionsType = 'symbolic';
			const finite = source.generate({ interval: [-2, 2] });

			expect(finite.count()).toBe(2);
			expect(finite.has(Expression.create('0'))).toBe(true);
			expect(finite.has(Expression.create('2'))).toBe(true);
			expect(finite.solutionsType).toBe('symbolic');
			expect(source.count()).toBe(4);
		});

		it('selects only real roots from a polynomial with complex solutions', () => {
			const source = solve('x^6-1', 'x');
			const filtered = source.generate({ interval: [-10, 10] });

			expect(source.count()).toBe(6);
			expect(filtered.count()).toBe(2);
			expect(filtered.has(Expression.create('-1'))).toBe(true);
			expect(filtered.has(Expression.create('1'))).toBe(true);
			expect(filtered.elements.every(root => !root.isComplex())).toBe(true);
			// An interval filter must not modify the original complex solution set.
			expect(source.count()).toBe(6);
		});

		it('excludes explicit complex finite values but rejects unresolved symbolic ones', () => {
			const source = new SolutionSet([
				Expression.create('-i'),
				Expression.create('1'),
				Expression.create('2+i'),
			]);
			const finite = source.generate({ interval: [0, 2] });
			expect(finite.count()).toBe(1);
			expect(finite.has(Expression.create('1'))).toBe(true);
			expect(source.count()).toBe(3);
			expect(() => new SolutionSet([Expression.create('a')])
				.generate({ interval: [0, 2] })).toThrow(UnsupportedOperationError);
		});

		it('rejects non-affine families and unbounded or unresolved intervals', () => {
			for (const family of ['_n^2', 'a+_n', 'i*_n']) {
				const set = new SolutionSet([Expression.create(family)]);
				expect(() => set.generate({ interval: [-1, 1] }))
					.toThrow(UnsupportedOperationError);
			}
			const finite = new SolutionSet([Expression.create('a')]);
			expect(() => finite.generate({ interval: [-1, 1] }))
				.toThrow(UnsupportedOperationError);
			expect(() => new SolutionSet([Expression.create('_n*pi')])
				.generate({ interval: ['-k', 'k'] }))
				.toThrow(UnsupportedOperationError);
			expect(() => new SolutionSet([Expression.create('0')])
				.generate({ interval: [2, -2] })).toThrow(RangeError);
		});

		it('marks interval generation as partial and warns if the candidate budget is reached', () => {
			const source = new SolutionSet([Expression.create('_n/1000')]);
			clearWarnings();
			try {
				const finite = source.generate({ interval: [-1, 1] });

				expect(finite.count()).toBe(1000);
				expect(finite.partial).toBe(true);
				expect(finite.has(Expression.create('-1'))).toBe(true);
				expect(finite.has(Expression.create('0'))).toBe(false);
				expect(source.partial).toBe(false);
				expect(source.solutionForm).toBe('parametric');
				expect(getWarnings()).toEqual([{
					code: 'solve.generationLimit',
					message: message('solvePartialResultWarning'),
				}]);
			} finally {
				clearWarnings();
			}
		});

		it('supports Decimal, Rational, string and bigint index bounds', () => {
			const source = new SolutionSet([Expression.create('_n')]);
			const baseline = source.generate({ indices: [-2, 2] });
			for (const indices of [
				[new Decimal('-2'), new Decimal('2')],
				[Rational.create('-2'), Rational.create('2')],
				['-2', '2'],
				[-2n, 2n],
			] as const) {
				expect(source.generate({ indices }).eq(baseline)).toBe(true);
			}

			const large = 9007199254740993n;
			const distant = source.generate({ indices: [large, large + 2n] });
			expect(distant.count()).toBe(3);
			expect(distant.has(Expression.create(large))).toBe(true);
			expect(distant.has(Expression.create(large + 2n))).toBe(true);
			expect(distant.partial).toBe(false);
		});

		it('calculates huge rational affine offsets and Decimal interval endpoints exactly', () => {
			const large = 9007199254740993123456789n;
			const source = new SolutionSet([
				Expression.create(`${large}+_n/2`),
			]);
			const finite = source.generate({
				interval: [new Decimal('0'), new Decimal('1')],
			});
			expect(finite.count()).toBe(3);
			for (const root of ['0', '1/2', '1']) {
				expect(finite.has(Expression.create(root))).toBe(true);
			}
			expect(finite.partial).toBe(false);
		});

		it('limits index generation with a single warning instead of throwing', () => {
			const source = new SolutionSet([Expression.create('_n')]);
			clearWarnings();
			try {
				const result = source.generate({ indices: [-1000n, 1000n] });
				expect(result.count()).toBe(1000);
				expect(result.has(Expression.create('-1000'))).toBe(true);
				expect(result.has(Expression.create('-1'))).toBe(true);
				expect(result.has(Expression.create('0'))).toBe(false);
				expect(result.partial).toBe(true);
				expect(getWarnings()).toHaveLength(1);
				expect(getWarnings()[0].code).toBe('solve.generationLimit');
			} finally {
				clearWarnings();
			}
		});

		it('returns already-finite results without applying an index-generation budget', () => {
			const source = new SolutionSet([Expression.create('2')]);
			clearWarnings();
			const finite = source.generate({ indices: [0n, 10000n] });
			expect(finite.eq(source)).toBe(true);
			expect(finite).not.toBe(source);
			expect(finite.partial).toBe(false);
			expect(getWarnings()).toEqual([]);
		});

		it('rejects all-values solutions and invalid index bounds', () => {
			const all = new SolutionSet([Expression.create('all')]);
			expect(() => all.generate({ indices: [-1, 1] }))
				.toThrow(UnsupportedOperationError);

			const finite = new SolutionSet([Expression.create('2')]);
			for (const indices of [
				[2, 1],
				[0, 1.5],
				[0, Infinity],
				[0, Number.MAX_SAFE_INTEGER + 1],
			] as [number, number][]) {
				expect(() => finite.generate({ indices })).toThrow(RangeError);
			}
		});
	});

});
