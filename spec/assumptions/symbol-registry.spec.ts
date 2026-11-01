import {
	clearAssumptions,
	compareSymbolRelation,
	forgetAssumptionFor,
	getAssumptionFor,
	registerSymbolRelation,
	assume,
} from '../../src/core/classes/assumption/assume';
import { UnexpectedInputError } from '../../src/core/errors';

/** Symbolic facts share assumption lifetime without changing numeric intervals. */
describe('symbol relationships in assumption state', () => {
	afterEach(() => {
		clearAssumptions();
	});

	it('preserves numeric assumptions while registering symbolic facts', () => {
		assume('x>0');
		registerSymbolRelation({ left: 'x', operator: '>', right: 'y' });
		expect(getAssumptionFor('x')?.toString()).toBe('(0, Infinity)');
		expect(getAssumptionFor('y')).toBeUndefined();
		expect(compareSymbolRelation({ left: 'x', operator: '>', right: 'y' })).toBe(true);
	});

	it('clears numeric and symbolic facts together', () => {
		assume('x>0');
		registerSymbolRelation({ left: 'x', operator: '>', right: 'y' });
		clearAssumptions();
		expect(getAssumptionFor('x')).toBeUndefined();
		expect(compareSymbolRelation({ left: 'x', operator: '>', right: 'y' })).toBeUndefined();
	});

	it('forgets relationships involving a variable, retaining other facts', () => {
		registerSymbolRelation({ left: 'x', operator: '>', right: 'y' });
		registerSymbolRelation({ left: 'a', operator: '>', right: 'b' });
		forgetAssumptionFor('x');
		expect(compareSymbolRelation({ left: 'x', operator: '>', right: 'y' })).toBeUndefined();
		expect(compareSymbolRelation({ left: 'a', operator: '>', right: 'b' })).toBe(true);
	});

	it('rejects a symbolic inequality contradicted by numeric intervals', () => {
		assume('x<=2');
		assume('y>=3');
		expect(() => registerSymbolRelation({ left: 'x', operator: '>', right: 'y' }))
			.toThrow(UnexpectedInputError);
		expect(compareSymbolRelation({ left: 'x', operator: '>', right: 'y' })).toBeUndefined();
		expect(getAssumptionFor('x')?.toString()).toBe('(-Infinity, 2]');
	});

	it('rejects numeric bounds that contradict a registered symbolic fact', () => {
		registerSymbolRelation({ left: 'x', operator: '>', right: 'y' });
		assume('x<=2');
		expect(() => assume('y>=3')).toThrow(UnexpectedInputError);
		expect(getAssumptionFor('y')).toBeUndefined();
		expect(compareSymbolRelation({ left: 'x', operator: '>', right: 'y' })).toBe(true);
	});

	it('accepts consistent or inconclusive numeric bounds', () => {
		registerSymbolRelation({ left: 'x', operator: '>', right: 'y' });
		assume('y>=3');
		assume('x>=4');
		expect(compareSymbolRelation({ left: 'x', operator: '>', right: 'y' })).toBe(true);
	});

	it('rejects equality of disjoint intervals', () => {
		assume('x<=2');
		assume('y>=3');
		expect(() => registerSymbolRelation({ left: 'x', operator: '=', right: 'y' }))
			.toThrow(UnexpectedInputError);
	});

	it('rejects numeric bounds contradicting a transitive symbolic comparison', () => {
		registerSymbolRelation({ left: 'x', operator: '>', right: 'y' });
		registerSymbolRelation({ left: 'y', operator: '>=', right: 'z' });
		assume('x<=2');
		expect(() => assume('z>=3')).toThrow(UnexpectedInputError);
		expect(getAssumptionFor('z')).toBeUndefined();
		expect(compareSymbolRelation({ left: 'x', operator: '>', right: 'z' })).toBe(true);
	});

	it('rejects a new symbolic link contradicted through existing numeric bounds', () => {
		assume('x<=2');
		assume('z>=3');
		registerSymbolRelation({ left: 'x', operator: '>', right: 'y' });
		expect(() => registerSymbolRelation({ left: 'y', operator: '>=', right: 'z' }))
			.toThrow(UnexpectedInputError);
		expect(compareSymbolRelation({ left: 'y', operator: '>=', right: 'z' })).toBeUndefined();
		expect(compareSymbolRelation({ left: 'x', operator: '>', right: 'y' })).toBe(true);
	});

	it('retains consistent transitive relationships with numeric bounds', () => {
		assume('z>=3');
		registerSymbolRelation({ left: 'x', operator: '>', right: 'y' });
		registerSymbolRelation({ left: 'y', operator: '>=', right: 'z' });
		assume('x>=4');
		expect(compareSymbolRelation({ left: 'x', operator: '>', right: 'z' })).toBe(true);
	});

	it('does not register forbidden symbols', () => {
		expect(() => registerSymbolRelation({ left: 'pi', operator: '>', right: 'y' }))
			.toThrow(UnexpectedInputError);
		expect(compareSymbolRelation({ left: 'pi', operator: '>', right: 'y' })).toBeUndefined();
	});
});
