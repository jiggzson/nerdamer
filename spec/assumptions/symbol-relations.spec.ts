import { UnexpectedInputError } from '../../src/core/errors';
import { SymbolRelations } from '../../src/core/classes/assumption/SymbolRelations';
import { SymbolRelation } from '../../src/core/classes/assumption/symbolRelation';

/** Checks direct fact storage before registration and inference are connected. */
describe('symbol relationship storage', () => {
	let facts: SymbolRelations;

	beforeEach(() => {
		facts = new SymbolRelations();
	});

	it('keeps distinct facts and ignores duplicate assertions', () => {
		const greater: SymbolRelation = { left: 'x', operator: '>', right: 'y' };
		facts.add(greater);
		facts.add(greater);
		facts.add({ left: 'y', operator: '>=', right: 'z' });
		expect(facts.getAll()).toEqual([greater, { left: 'y', operator: '>=', right: 'z' }]);
	});

	it('does not expose mutable storage and supports clearing', () => {
		facts.add({ left: 'x', operator: '>=', right: 'y' });
		const snapshot = facts.getAll();
		facts.clear();
		expect(snapshot).toHaveLength(1);
		expect(facts.getAll()).toEqual([]);
	});

	it.each([
		[{ left: 'x', operator: '>', right: 'y' }, { left: 'y', operator: '>=', right: 'x' }],
		[{ left: 'x', operator: '=', right: 'y' }, { left: 'x', operator: '>', right: 'y' }],
		[{ left: 'x', operator: '>', right: 'y' }, { left: 'y', operator: '=', right: 'x' }],
	] as const)('rejects conflicting direct facts', (first, second) => {
		facts.add(first);
		expect(() => facts.add(second)).toThrow(UnexpectedInputError);
		expect(facts.getAll()).toEqual([first]);
	});

	it('rejects a transitive strict cycle without changing stored facts', () => {
		facts.add({ left: 'x', operator: '>', right: 'y' });
		facts.add({ left: 'y', operator: '>=', right: 'z' });
		const before = facts.getAll();
		expect(() => facts.add({ left: 'z', operator: '>=', right: 'x' }))
			.toThrow(UnexpectedInputError);
		expect(facts.getAll()).toEqual(before);
	});

	it('allows non-strict cycles and equality between symbols', () => {
		facts.add({ left: 'x', operator: '>=', right: 'y' });
		facts.add({ left: 'y', operator: '>=', right: 'z' });
		facts.add({ left: 'z', operator: '>=', right: 'x' });
		facts.add({ left: 'x', operator: '=', right: 'z' });
		expect(facts.getAll()).toHaveLength(4);
	});

	it('rejects a strict comparison within a non-strict cycle', () => {
		facts.add({ left: 'a', operator: '>=', right: 'b' });
		facts.add({ left: 'b', operator: '=', right: 'c' });
		expect(() => facts.add({ left: 'c', operator: '>', right: 'a' }))
			.toThrow(UnexpectedInputError);
		expect(facts.getAll()).toHaveLength(2);
	});

	it('answers transitive comparisons without assuming unknown facts', () => {
		facts.add({ left: 'x', operator: '>', right: 'y' });
		facts.add({ left: 'y', operator: '>=', right: 'z' });
		expect(facts.compare({ left: 'x', operator: '>', right: 'z' })).toBe(true);
		expect(facts.compare({ left: 'z', operator: '>=', right: 'x' })).toBe(false);
		expect(facts.compare({ left: 'x', operator: '=', right: 'z' })).toBe(false);
		expect(facts.compare({ left: 'x', operator: '>', right: 'w' })).toBeUndefined();
		expect(facts.compare({ left: 'w', operator: '>=', right: 'z' })).toBeUndefined();
	});

	it('recognizes equality implied by non-strict cycles', () => {
		facts.add({ left: 'a', operator: '>=', right: 'b' });
		facts.add({ left: 'b', operator: '>=', right: 'a' });
		expect(facts.compare({ left: 'a', operator: '=', right: 'b' })).toBe(true);
		expect(facts.compare({ left: 'a', operator: '>', right: 'b' })).toBe(false);
		expect(facts.compare({ left: 'a', operator: '>=', right: 'b' })).toBe(true);
	});

	it('handles self-comparisons and unrelated symbols', () => {
		expect(facts.compare({ left: 'x', operator: '=', right: 'x' })).toBe(true);
		expect(facts.compare({ left: 'x', operator: '>', right: 'x' })).toBe(false);
		expect(facts.compare({ left: 'x', operator: '>=', right: 'x' })).toBe(true);
		expect(facts.compare({ left: 'x', operator: '=', right: 'y' })).toBeUndefined();
	});

	it('rejects strict self-comparisons without mutating storage', () => {
		expect(() => facts.add({ left: 'x', operator: '>', right: 'x' })).toThrow(UnexpectedInputError);
		expect(facts.getAll()).toEqual([]);
	});
});
