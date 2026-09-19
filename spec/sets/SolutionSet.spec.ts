import Decimal from 'decimal.js';

import { Expression } from '../../src/core/classes/expression/Expression';
import { ALL_SYMBOL, INDEX_VARIABLE } from '../../src/core/classes/parser/constants';
import { ValuesSet } from '../../src/core/classes/valuesSet/ValuesSet';
import { Vector } from '../../src/core/classes/vector/Vector';
import { UnexpectedDataType } from '../../src/core/errors';
import { RESTRICTED } from '../../src/core/Settings';
import { SolutionSet } from '../../src/solve/classes/SolutionSet';

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

	it('should reserve symbols used to describe non-finite solver results', () => {
		expect(RESTRICTED).toContain(INDEX_VARIABLE);
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

	it('should treat exclusions as a membership invariant', () => {
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
});
