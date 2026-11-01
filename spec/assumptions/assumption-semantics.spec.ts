import nerdamer from '../../src/index';
import {
	assume,
	clearAssumptions,
	getAssumptionFor,
} from '../../src/core/classes/assumption/assume';
import { Expression } from '../../src/core/classes/expression/Expression';
import { Parser } from '../../src/core/classes/parser/Parser';
import { proveZeroRelation } from '../../src/core/classes/parser/operations/compare';

describe('Assumption semantics', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/174
	it('retains singleton assumptions when aggregating equal inputs', () => {
		try {
			assume('x=9');

			expect(nerdamer('min(x,x)').text()).toEqual('9');
			expect(nerdamer('max(x,x)').text()).toEqual('9');
		} finally {
			clearAssumptions();
		}
	});

	it('accepts arithmetic that resolves to numeric parser assumption bounds', () => {
		try {
			Parser.parse('assume(x>1/2)');
			Parser.parse('assume(y<=1+1/2)');

			expect(getAssumptionFor('x')?.toString()).toBe('(0.5, Infinity)');
			expect(getAssumptionFor('y')?.toString()).toBe('(-Infinity, 1.5]');
			expect(() => Parser.parse('assume(z>x)')).not.toThrow();
			expect(Expression.create('z').gt('x')).toBe(true);
		} finally {
			clearAssumptions();
		}
	});

	it('accepts exact fractional string bounds while retaining parser arithmetic support', () => {
		try {
			assume('x>1/2');
			expect(getAssumptionFor('x')?.getFiniteLowerBound()?.getMultiplier().eq('1/2')).toBe(true);
			Parser.parse('assume(x>1/2)');

			expect(getAssumptionFor('x')?.toString()).toBe('(0.5, Infinity)');
			expect(() => assume('y>1+1/2')).not.toThrow();
			Parser.parse('assume(y>1+1/2)');
			expect(getAssumptionFor('y')?.getFiniteLowerBound()?.getMultiplier().eq('3/2')).toBe(true);
		} finally {
			clearAssumptions();
		}
	});

	it('preserves non-terminating rational parser bounds exactly', () => {
		try {
			Parser.parse('assume(x==1/3)');

			expect(Expression.create('x').eq('1/3')).toBe(true);
			expect(nerdamer('min(x,1/3)').text()).toBe('1/3');
			expect(nerdamer('max(x,1/3)').text()).toBe('1/3');
		} finally {
			clearAssumptions();
		}
	});

	it('retains exact rational endpoints when repeated assumptions intersect', () => {
		try {
			Parser.parse('assume(x>1/3)');
			Parser.parse('assume(x<2/3)');

			const x = getAssumptionFor('x');
			expect(x?.gt(Expression.create('1/3'))).toBe(true);
			expect(x?.lt(Expression.create('2/3'))).toBe(true);
			expect(x?.contains(Expression.create('1/2').getMultiplier())).toBe(true);
		} finally {
			clearAssumptions();
		}
	});

	it('infers signs of sums when every summand has a consistent known sign', () => {
		try {
			assume('a>0');
			assume('b>0');
			assume('c<0');
			assume('d<0');

			expect(Expression.create('a+b').gt('0')).toBe(true);
			expect(Expression.create('c+d').lt('0')).toBe(true);
			expect(Expression.create('a-c').gt('0')).toBe(true);
			expect(Expression.create('c-a').lt('0')).toBe(true);
			expect(Expression.create('a-b').gt('0')).toBe(false);
			expect(Expression.create('a+b').lt('0')).toBe(false);
		} finally {
			clearAssumptions();
		}
	});
	it('derives strict signs from bounds on independent variables', () => {
		try {
			assume('a>5');
			assume('b<3');
			expect(Expression.create('a-b-2').gt('0')).toBe(true);
			expect(Expression.create('b-a+2').lt('0')).toBe(true);
			expect(Expression.create('2*a-2*b-4').gt('0')).toBe(true);
		} finally {
			clearAssumptions();
		}
	});

	it('does not infer strict signs from overlapping inclusive intervals', () => {
		try {
			assume('a>=3');
			assume('b<=3');
			expect(Expression.create('a-b').gt('0')).toBe(false);
		} finally {
			clearAssumptions();
		}
	});

	it('preserves exact rational endpoints in compound comparisons', () => {
		try {
			Parser.parse('assume(a>1/3)');
			Parser.parse('assume(b<1/3)');
			expect(Expression.create('a-b').gt('0')).toBe(true);
			expect(Expression.create('b-a').lt('0')).toBe(true);
		} finally {
			clearAssumptions();
		}
	});

	it('proves nonlinear bounds from independent strict real intervals', () => {
		try {
			assume('a>1');
			assume('x>2');
			assume('b<3');
			expect(Expression.create('a*x^2-b').gt('0')).toBe(true);
			expect(Expression.create('b-a*x^2').lt('0')).toBe(true);
		} finally {
			clearAssumptions();
		}
	});

	it('uses the upper negative endpoint for even powers', () => {
		try {
			assume('x< -2');
			assume('b<3');
			expect(Expression.create('x^2-b').gt('0')).toBe(true);
		} finally {
			clearAssumptions();
		}
	});

	it('keeps inclusive and undecided nonlinear boundaries conservative', () => {
		try {
			assume('a>=1');
			assume('x>=2');
			assume('b<=4');
			expect(Expression.create('a*x^2-b').gt('0')).toBe(false);
		} finally {
			clearAssumptions();
		}
		try {
			assume('a>1');
			assume('b<3');
			expect(Expression.create('a*x^2-b').gt('0')).toBe(false);
		} finally {
			clearAssumptions();
		}
	});

	it('uses nonnegative even powers when an assumed real interval crosses zero', () => {
		try {
			assume('x>=-2');
			assume('x<=2');
			expect(Expression.create('x^2+1').gt('0')).toBe(true);
			expect(Expression.create('1-x^2').gt('0')).toBe(false);
			expect(Expression.create('x^2-1').gt('0')).toBe(false);
		} finally {
			clearAssumptions();
		}
	});

	it('does not claim strict positivity from an even power that may vanish', () => {
		try {
			assume('x>=-1');
			assume('x<=1');
			expect(Expression.create('x^2').gt('0')).toBe(false);
			expect(Expression.create('x^2').lt('0')).toBe(false);
		} finally {
			clearAssumptions();
		}
	});

	it('bounds reciprocals on intervals separated from zero', () => {
		try {
			assume('x>2');
			expect(Expression.create('1/2-1/x').gt('0')).toBe(true);
			expect(Expression.create('1/4-x^(-2)').gt('0')).toBe(true);
		} finally {
			clearAssumptions();
		}
		try {
			assume('x< -2');
			expect(Expression.create('1/x+1/2').gt('0')).toBe(true);
			expect(Expression.create('1/4-x^(-2)').gt('0')).toBe(true);
		} finally {
			clearAssumptions();
		}
	});

	it('does not derive reciprocal bounds from intervals including zero', () => {
		try {
			assume('x>=0');
			assume('x<=2');
			expect(Expression.create('1/x-1/2').gt('0')).toBe(false);
		} finally {
			clearAssumptions();
		}
		try {
			assume('x>=-2');
			assume('x<=2');
			expect(Expression.create('x^(-2)-1/4').gt('0')).toBe(false);
		} finally {
			clearAssumptions();
		}
	});

	it('bounds square roots over established nonnegative intervals', () => {
		try {
			assume('x>4');
			expect(Expression.create('sqrt(x)-2').gt('0')).toBe(true);
			expect(Expression.create('3-sqrt(x)').gt('0')).toBe(false);
		} finally {
			clearAssumptions();
		}
		try {
			assume('x>=0');
			assume('x<9');
			expect(Expression.create('3-sqrt(x)').gt('0')).toBe(true);
			expect(Expression.create('sqrt(x)+1').gt('0')).toBe(true);
			expect(Expression.create('sqrt(x)').gt('0')).toBe(false);
		} finally {
			clearAssumptions();
		}
	});

	it('does not derive real square-root bounds without a valid domain', () => {
		try {
			assume('x>=-1');
			assume('x<=9');
			expect(Expression.create('3-sqrt(x)').gt('0')).toBe(false);
			expect(Expression.create('sqrt(x)-2').gt('0')).toBe(false);
		} finally {
			clearAssumptions();
		}
	});

	it('distinguishes proved, refuted, and unknown relations to zero', () => {
		try {
			assume('a>1');
			assume('b<0');
			expect(proveZeroRelation('a', 'gt')).toBe(true);
			expect(proveZeroRelation('a', 'lt')).toBe(false);
			expect(proveZeroRelation('a', 'eq')).toBe(false);
			expect(proveZeroRelation('a-b', 'gt')).toBe(true);
			expect(proveZeroRelation('a-b', 'lte')).toBe(false);
			expect(proveZeroRelation('a+b', 'gt')).toBeUndefined();
			expect(proveZeroRelation('a+b', 'lt')).toBeUndefined();
			expect(proveZeroRelation('a+b', 'eq')).toBeUndefined();
		} finally {
			clearAssumptions();
		}
	});

	it('preserves undecided zero-boundary comparisons', () => {
		try {
			assume('x>=0');
			assume('x<=2');
			expect(proveZeroRelation('x', 'gt')).toBeUndefined();
			expect(proveZeroRelation('x', 'gte')).toBe(true);
			expect(proveZeroRelation('x', 'lt')).toBe(false);
			expect(proveZeroRelation('x', 'lte')).toBeUndefined();
			expect(proveZeroRelation('x', 'eq')).toBeUndefined();
			expect(proveZeroRelation('x^2+1', 'gt')).toBe(true);
		} finally {
			clearAssumptions();
		}
	});

	it('does not change boolean comparison behavior for unknown relations', () => {
		try {
			assume('a>1');
			assume('b<0');
			expect(Expression.create('a+b').gt('0')).toBe(false);
			expect(proveZeroRelation('a+b', 'gt')).toBeUndefined();
		} finally {
			clearAssumptions();
		}
	});

	it('retains possible zero in products and even powers', () => {
		try {
			assume('x>=0');
			assume('x<=2');
			assume('y>0');
			expect(proveZeroRelation('x*y', 'gte')).toBe(true);
			expect(proveZeroRelation('x*y', 'gt')).toBeUndefined();
			expect(proveZeroRelation('x^2', 'gte')).toBe(true);
			expect(proveZeroRelation('x^2', 'gt')).toBeUndefined();
			expect(proveZeroRelation('x^2', 'lt')).toBe(false);
			expect(proveZeroRelation('x^2+1', 'gt')).toBe(true);
		} finally {
			clearAssumptions();
		}
	});

	it('retains nonpositive intervals without proving strict negativity', () => {
		try {
			assume('x>=-2');
			assume('x<=0');
			expect(proveZeroRelation('x', 'lte')).toBe(true);
			expect(proveZeroRelation('x', 'gt')).toBe(false);
			expect(proveZeroRelation('x', 'lt')).toBeUndefined();
			expect(proveZeroRelation('-x', 'gte')).toBe(true);
			expect(proveZeroRelation('x-1', 'lt')).toBe(true);
		} finally {
			clearAssumptions();
		}
	});

	it('uses possible signs for non-strict public comparisons against zero', () => {
		try {
			assume('x>=0');
			assume('x<=2');
			assume('y>0');
			const product = Expression.create('x*y');
			const square = Expression.create('x^2');
			expect(product.gte('0')).toBe(true);
			expect(product.gt('0')).toBe(false);
			expect(product.lte('0')).toBe(false);
			expect(Expression.create('0').lte(product)).toBe(true);
			expect(square.gte('0')).toBe(true);
			expect(square.gt('0')).toBe(false);
			expect(Expression.create('0').lte(square)).toBe(true);
		} finally {
			clearAssumptions();
		}
	});

	it('uses possible signs for nonpositive expressions and leaves undecided signs unresolved', () => {
		try {
			assume('x>=0');
			assume('x<=2');
			assume('y>0');
			const negative = Expression.create('-x*y');
			expect(negative.lte('0')).toBe(true);
			expect(negative.lt('0')).toBe(false);
			expect(negative.gte('0')).toBe(false);
			expect(Expression.create('0').gte(negative)).toBe(true);
			expect(Expression.create('x-y').gte('0')).toBe(false);
			expect(Expression.create('x-y').lte('0')).toBe(false);
		} finally {
			clearAssumptions();
		}
	});

});
