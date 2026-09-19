'use strict';

import { Expression } from '../../src/core/classes/expression/Expression';
import { Rational } from '../../src/core/classes/rational/Rational';

describe('Decimal formatting invariants', () => {
	it('preserves decimal presentation when precision rounds a rational to an integer', () => {
		const nearOne = '926510094425919/926510094425920';
		const nearThree = '2779530283277761/926510094425920';

		expect(Rational.create(nearOne).text({ decimal: true, precision: 10 })).toEqual('1.0');
		expect(Rational.create('2').text({ decimal: true, precision: 10 })).toEqual('2.0');
		expect(Rational.create(nearThree).text({ decimal: true, precision: 10 })).toEqual('3.0');

		expect(Expression.create(nearOne).toDecimal(10)).toEqual('1.0');
		expect(Expression.create('2').toDecimal(10)).toEqual('2.0');
		expect(Expression.create(nearThree).toDecimal(10)).toEqual('3.0');
	});

	it('does not append a decimal suffix to scientific notation', () => {
		const tiny = Rational.create('1').div('1000000000000000000000000000000');

		expect(tiny.text({ decimal: true })).toEqual('1e-30');
	});
});
