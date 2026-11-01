'use strict';

import Decimal from 'decimal.js';

import { Complex } from '../../src/core/classes/complex/Complex';
import { DivisionByZeroError } from '../../src/core/errors';
import { Parser as Parser } from '../../src/core/classes/parser/Parser';

import { Expression } from '../../src/core/classes/expression/Expression';
import nerdamer from '../../src/index';

describe('Numeric Complex arithmetic', () => {
	it('performs basic arithmetic on real and imaginary components', () => {
		const left = new Complex(3, 4);
		const right = new Complex(1, -2);

		const sum = left.add(right);
		expect(sum.re.eq(4)).toBe(true);
		expect(sum.im.eq(2)).toBe(true);

		const difference = left.sub(right);
		expect(difference.re.eq(2)).toBe(true);
		expect(difference.im.eq(6)).toBe(true);

		const product = left.times(right);
		expect(product.re.eq(11)).toBe(true);
		expect(product.im.eq(-2)).toBe(true);
		expect(left.times(right).re.eq(product.re)).toBe(true);
		expect(left.times(right).im.eq(product.im)).toBe(true);

		const quotient = left.div(right);
		expect(quotient.re.eq(-1)).toBe(true);
		expect(quotient.im.eq(2)).toBe(true);
	});

	it('computes magnitude and conjugation directly', () => {
		const value = new Complex(3, 4);
		const conjugate = value.conjugate();

		expect(value.abs().eq(5)).toBe(true);
		expect(conjugate.re.eq(3)).toBe(true);
		expect(conjugate.im.eq(-4)).toBe(true);
	});

	it('does not treat small nonzero divisors as zero', () => {
		const numerator = new Complex(1, 0);
		const denominator = new Complex(new Decimal('1e-60'), 0);
		const quotient = numerator.div(denominator);

		expect(quotient.re.eq('1e60')).toBe(true);
		expect(quotient.im.isZero()).toBe(true);
	});

	it('rejects exact division by zero', () => {
		const numerator = new Complex(1, 2);
		const denominator = new Complex(0, 0);

		expect(() => numerator.div(denominator)).toThrow(DivisionByZeroError);
	});

	it('uses the same numerical principal logarithm as Expression.log', () => {
		const cases = ['5*i', '8+5*i', '123-2*i', '-3+4*i'];
		for (const input of cases) {
			const expression = Expression.create(input);
			const numeric = new Complex(
				expression.realPart().getMultiplier().toDecimal(),
				expression.imagPart().getMultiplier().toDecimal()
			).log();
			const result = Parser.evaluate(`log(${input})`) as Expression;
			expect(Number(result.realPart().text({ decimal: true }))).toBeCloseTo(
				numeric.re.toNumber(), 14
			);
			expect(Number(result.imagPart().text({ decimal: true }))).toBeCloseTo(
				numeric.im.toNumber(), 14
			);
		}
	});

	it('computes the reciprocal without routing through general complex division', () => {
		const value = new Complex(3, 4);
		const reciprocal = value.reciprocal();
		const quotient = new Complex(1, 0).div(value);

		expect(reciprocal.re.eq(quotient.re)).toBe(true);
		expect(reciprocal.im.eq(quotient.im)).toBe(true);
		expect(() => new Complex(0, 0).reciprocal()).toThrow(DivisionByZeroError);
	});
});

describe('Complex number', () => {
	it('should simplify complex numbers', () => {
		expect(Parser.parse('2*i*i').text()).toEqual('-2');
	});

	it('should get the real and imaginary part', () => {
		expect((Parser.parse('x+5*i') as Expression).imagPart().text()).toEqual('5');
		expect((Parser.parse('9*(7+5*i)') as Expression).imagPart().text()).toEqual('45');
		expect((Parser.parse('x+5*i^3') as Expression).imagPart().text()).toEqual('-5');
		expect((Parser.parse('(-i)^(1/2)') as Expression).imagPart().text()).toEqual(
			'(-1/2)*2^(1/2)'
		);
		expect((Parser.parse('(i)^(1/2)') as Expression).imagPart().text()).toEqual(
			'(1/2)*2^(1/2)'
		);
		expect((Parser.parse('(-i)^(2/3)') as Expression).imagPart().text()).toEqual(
			'(-1/2)*3^(1/2)'
		);
		expect((Parser.parse('x+5*i') as Expression).realPart().text()).toEqual('x');
		expect((Parser.parse('i') as Expression).realPart().text()).toEqual('0');
		expect((Parser.parse('3+i') as Expression).realPart().text()).toEqual('3');
	});

	it("should be able to handle Euler's identity", () => {
		expect(Parser.parse('6*e^(3/2*i*pi)').text()).toEqual('-6*i');
		expect(Parser.parse('6*e^(-3/2*i*pi)').text()).toEqual('6*i');
		expect(Parser.parse('6*e^(2*i*pi)').text()).toEqual('6');
		expect(Parser.parse('6*e^(i*pi)').text()).toEqual('-6');
		expect(Parser.parse('e^(i*pi)+1').text()).toEqual('0');
		expect(Parser.parse('e^(3/4*i*pi)').text()).toEqual('e^((3/4)*i*pi)');
		expect(Parser.parse('e^(3/4*i*pi)+1').text()).toEqual('1+e^((3/4)*i*pi)');
		expect(Parser.parse('e^(i*pi/2)+e^(-i*pi/2)').text()).toEqual('0');
		expect(Parser.parse('e^(pi*i)+(i+1)').text()).toEqual('i');
		expect(Parser.parse('e^(pi*i)/(i+1)').text()).toEqual('-1/2+(1/2)*i');
	});

	it('should simplify i correctly', () => {
		expect(Parser.parse('i*i^2').text()).toEqual('-i');
		expect(Parser.parse('2*i*i').text()).toEqual('-2');
		expect(Parser.parse('5*i^2').text()).toEqual('-5');
		expect(Parser.parse('5*i^3').text()).toEqual('-5*i');
		expect(Parser.parse('(2*i)^7').text()).toEqual('-128*i');
		expect(Parser.parse('(2*i)^7').text()).toEqual('-128*i');
		expect(Parser.parse('3*i^5*i').text()).toEqual('-3');
		expect(Parser.parse('3*i^4').text()).toEqual('3');
		expect(Parser.parse('i/i').text()).toEqual('1');
		expect(Parser.parse('i^x').text()).toEqual('i^x');
		expect(Parser.parse('(1/i)*i').text()).toEqual('1');
		expect(Parser.parse('(256*i)^(1/8)').text()).toEqual('2*i^(1/8)');
		expect(Parser.parse('i^(-1)').text()).toEqual('-i');
		expect(Parser.parse('i^(-2)').text()).toEqual('-1');
		expect(Parser.parse('i^(-3)').text()).toEqual('i');
		expect(Parser.parse('i^(-4)').text()).toEqual('1');
		expect(Parser.parse('i^(-7)').text()).toEqual('i');
		expect(Parser.parse('sqrt(-1)').text()).toEqual('i');
		expect(Parser.parse('1^3+3*1^2*i+i^3+3*i^2').text()).toEqual('-2+2*i');
		expect(Parser.parse('(17/2)*(-10+8*i)^(-1)-5*(-10+8*i)^(-1)*i').text()).toEqual(
			'-125/164+(-9/82)*i'
		);
	});

	it('should allow a different symbol to be used for the complex variable', () => {
		const i = Parser.getI();
		Parser.setI('j');
		expect(Parser.parse('j^2').text()).toEqual('-1');
		expect(Parser.parse('(2*j)^7').text()).toEqual('-128*j');
		Parser.setI(i);
	});

	it('should correctly evaluate numbers raised to imaginary numbers', () => {
		expect(Parser.evaluate('2^(3/4+5i)').text()).toEqual(
			'-1.594211697321635458-0.5356455813960013149*i'
		);
		expect(Parser.evaluate('7*e^(5i+2)').text()).toEqual(
			'14.671970610731344836-49.598816820786193054*i'
		);
		expect(Parser.evaluate('e^((1/4)*i*pi)*sqrt(2)').text()).toEqual(
			'0.99999999999999999998+i'
		);
	});

	it('should compute complex logarithms', () => {
		expect(Expression.create(Parser.evaluate('log(5*i)').text())
			.minus('1.6094379124341003746+1.5707963267948966193*i').isNearlyZero(2)).toBe(true);
		expect(Parser.evaluate('log(8+5*i)').text()).toEqual(
			'2.2443181848660699192+0.55859931534356243597*i'
		);
		expect(Expression.create(Parser.evaluate('log(123-2*i)').text())
			.minus('4.8123165343435130951-0.016258729805129587692*i').isNearlyZero(2)).toBe(true);
		expect(Parser.evaluate('log(123-2*i+a)').text()).toEqual(
			'log((4+(123+a)^2)^(1/2))+i*atan2(-2, 123+a)'
		);
		expect(Expression.create(Parser.evaluate('log(1/i)').text())
			.minus('-1.5707963267948966193*i').isNearlyZero(2)).toBe(true);
	});

	it('should handle complex powers', () => {
		expect(Parser.evaluate('(-2/3)^(-3/5)').text({ decimal: true })).toEqual(
			'-0.39412784573555013322-1.2130007823626505466*i'
		);
		expect(Parser.evaluate('(-2/3)^(3/5)').text({ decimal: true })).toEqual(
			'-0.24228560312533381219+0.74567841203341699771*i'
		);
		expect(Parser.evaluate('(-0.177777777777777)^(2/3)').text({ decimal: true })).toEqual(
			'-0.15808414686622455252+0.27380977424348123885*i'
		);
		expect(Parser.evaluate('(-5)^(7/2)').text({ decimal: true })).toEqual(
			'-279.50849718747371205*i'
		);
		expect(Parser.evaluate('(-1)^0.5').text({ decimal: true })).toEqual('i');
		expect(Parser.evaluate('(-1)^0.5*i').text({ decimal: true })).toEqual('-1.0');
	});

	it('should evaluate complex numbers with high precision', () => {
		// We want to run with a higher precision to make sure we're not getting junk numbers
		Parser.setPrecision(60);
		expect(Parser.evaluate('(i+1)^(3/2)').text({ sort: true })).toEqual(
			'0.643594252905582624735443437418209808924202742444007651156159+1.55377397403003730734415895306314694816458349941030783633267*i'
		);
		expect(Parser.evaluate('(-1)^(-1/5)').text({ sort: true })).toEqual(
			'0.809016994374947424102293417182819058860154589902881431067725-0.587785252292473129168705954639072768597652437643145991072272*i'
		);
		expect(Parser.evaluate('2/5*sqrt(-1)').text()).toEqual('(2/5)*i');
		expect(Parser.evaluate('(-2/5)^(3/2)').text({ decimal: true })).toEqual(
			'-0.2529822128134703465599114835546174826975644111460173461486*i'
		);
		Parser.setPrecision(20);
	});

	it('should calculate the absolute value of complex numbers correctly', () => {
		expect(Parser.parse('abs(4i+3)').text()).toEqual('5');
		expect(Parser.parse('abs(4i+b)').text()).toEqual('abs((16+b^2)^(1/2))');
	});

	it('should evaluate complex numbers raised to complex numbers', () => {
		// We want to run with a higher precision to make sure we're not getting junk numbers
		expect(Parser.evaluate('i^(5i+3)').text({ sort: true })).toEqual(
			'-0.00038820320392676624713*i'
		);
		expect(Parser.evaluate('(2+3i)^(5i+3)').text({ sort: true })).toEqual(
			'-0.34349061841848876589+0.022021533303860477046*i'
		);
	});

	it('should evaluate complex numbers', () => {
		expect(Parser.evaluate('2^(1.5)*5^(-1.5)*(-1)^(1.5)').text({ decimal: true })).toEqual(
			'-0.25298221281347034656*i'
		);
		expect(Parser.evaluate('(256*i)^(1/8)').text({ decimal: true })).toEqual(
			'1.9615705608064608982+0.3901806440322565357*i'
		);
		expect(Parser.evaluate('(i+2)^(2/3)').text({ decimal: true })).toEqual(
			'1.6289371459221758753+0.52017450230454583956*i'
		);
	});

	it('sqrt should evaluate complex numbers', () => {
		expect(Parser.evaluate('sqrt(2+5*i)').text()).toEqual(
			'1.9216093264675970592+1.3009928530039094783*i'
		);
	});

	// (-27)^(2/3)
	// (-25/27)^(1/3)
	// (-2)^(3/8)
	// (13591409142295226177/5000000000000000000)^(0.39269908169872415481*i); basically anything to i
});

describe('The polarform function', () => {
	it('should be calculated correctly', () => {
		expect(Parser.parse('polarform(i+5)').text()).toBe('26^(1/2)*e^(i*atan(1/5))');
		expect(Parser.parse('polarform(x^2+i)').text()).toBe('e^(i*atan2(1, x^2))*((1+x^4)^(1/2))');
		expect(Parser.parse('polarform(i)').text()).toBe('i');
		expect(Parser.parse('polarform(3)').text()).toBe('3');
		expect(Parser.parse('polarform(x)').text()).toBe('e^(i*atan2(0, x))*abs(x)');
		expect(Parser.parse('polarform(3*i+5)').text()).toEqual('34^(1/2)*e^(i*atan(3/5))');
		expect(Parser.parse('polarform(i-1)').text()).toEqual('2^(1/2)*e^((3/4)*i*pi)');
		expect(Parser.parse('polarform(i+1)').text()).toEqual('2^(1/2)*e^((1/4)*i*pi)');
		expect(Parser.parse('polarform(a*i+b*1)').text()).toEqual(
			'e^(i*atan2(a, b))*((b^2+a^2)^(1/2))'
		);
		expect(Parser.parse('polarform(3*i*x+5*x)').text()).toEqual(
			'34^(1/2)*abs(x)*e^(i*atan2(3*x, 5*x))'
		);
	});
});

describe('The rectform function', () => {
	it('should be calculated correctly', () => {
		expect(Parser.parse('rectform(2*e^(i*atan(3/5)))').text()).toEqual(
			'(5/17)*34^(1/2)+(3/17)*34^(1/2)*i'
		);
		expect(Parser.parse('rectform(2*e^(i*atan(3/5))*x)').text()).toEqual(
			'(5/17)*34^(1/2)*x+(3/17)*34^(1/2)*i*x'
		);
		expect(Parser.parse('rectform(5*e^(i/2))').text()).toEqual('5*cos(1/2)+5*i*sin(1/2)');
		expect(Parser.parse('rectform(5*e^(i/2)*x)').text()).toEqual('5*x*cos(1/2)+5*i*sin(1/2)*x');
		expect(Parser.parse('rectform(sqrt(34)*e^(i*atan(3/5)))').text()).toEqual('5+3*i');
		expect(Parser.parse('rectform(e^atan(3/5))').text()).toEqual('e^(atan(3/5))');
		expect(Parser.parse('rectform(4-i)').text()).toEqual('4-i');
		expect(Parser.parse('rectform(x)').text()).toEqual('x');
		expect(Parser.parse('rectform(e^(5*atan(i*3/5)))').text()).toEqual(
			'cos(5*atanh(3/5))+i*sin(5*atanh(3/5))'
		);
		expect(Parser.parse('rectform(sqrt(34)*e^(i*atan(3/5))+10)').text()).toEqual('15+3*i');
		const rect = Parser.parse('rectform(e^(5*atan(i+7)))') as Expression;
		expect(new Decimal(rect.realPart().text({ decimal: true }))
			.minus('1278.4631547435725921').abs().div('1278.4631547435725921').lt('1e-18')).toBe(true);
		expect(new Decimal(rect.imagPart().text({ decimal: true }))
			.minus('125.80758348772224229').abs().div('125.80758348772224229').lt('1e-18')).toBe(true);
	});
});

describe('The arg function', () => {
	it('should be calculated correctly', () => {
		expect(Parser.parse('arg(10i+10)').text()).toEqual('(1/4)*pi');
		expect(Parser.parse('arg(10i+10-a)').text()).toEqual('atan2(10, 10-a)');
		expect(Parser.parse('arg(10)').text()).toEqual('0');
		expect(Parser.parse('arg(x)').text()).toEqual('atan2(0, x)');
		expect(Parser.parse('arg(i)').text()).toEqual('(1/2)*pi');
	});
});

describe('Complex Trig', () => {
	it('should calculate cos of complex numbers', () => {
		expect(Parser.evaluate('cos(i+1)').text()).toEqual(
			'0.83373002513114904889-0.98889770576286509639*i'
		);
		expect(Parser.evaluate('cos(5i+3)').text()).toEqual(
			'-73.467292212645262468-10.471557674805574377*i'
		);
		expect(Parser.evaluate('cos(i)').text()).toEqual('1.5430806348152437785');
	});

	it('should calculate sin of complex numbers', () => {
		expect(Parser.evaluate('sin(i+1)').text()).toEqual(
			'1.2984575814159772948+0.63496391478473610826*i'
		);
		expect(Parser.evaluate('sin(5i+3)').text()).toEqual(
			'10.472508533940392277-73.460621695673676367*i'
		);
		expect(Parser.evaluate('sin(i)').text()).toEqual('1.1752011936438014569*i');
	});

	it('should calculate tan of complex numbers', () => {
		expect(Parser.evaluate('tan(i+1)').text()).toEqual(
			'0.27175258531951171653+1.0839233273386945435*i'
		);
		expect(Parser.evaluate('tan(5i+3)').text()).toEqual(
			'-0.000025368676207676032417+0.99991282015135380824*i'
		);
		expect(Parser.evaluate('tan(i)').text()).toEqual('0.76159415595576488812*i');
	});

	it('should calculate sec of complex numbers', () => {
		expect(Parser.evaluate('sec(i+1)').text()).toEqual(
			'0.49833703055518678521+0.59108384172104504804*i'
		);
		expect(Parser.evaluate('sec(5i+3)').text()).toEqual(
			'-0.013340476530549737487+0.001901466151695151309*i'
		);
		expect(Parser.evaluate('sec(i)').text()).toEqual('0.64805427366388539957');
	});

	it('should calculate csc of complex numbers', () => {
		expect(Parser.evaluate('csc(i+1)').text()).toEqual(
			'0.62151801717042842123-0.30393100162842645033*i'
		);
		expect(Parser.evaluate('csc(5i+3)').text()).toEqual(
			'0.0019019704237010899967+0.013341591397996678722*i'
		);
		expect(Parser.evaluate('csc(i)').text()).toEqual('-0.85091812823932154512*i');
	});

	it('should calculate cot of complex numbers', () => {
		expect(Parser.evaluate('cot(i+1)').text()).toEqual(
			'0.21762156185440268136-0.86801414289592494864*i'
		);
		expect(Parser.evaluate('cot(5i+3)').text()).toEqual(
			'-0.000025373100044545977383-1.0000871868058967743*i'
		);
		expect(Parser.evaluate('cot(i)').text()).toEqual('-1.3130352854993313036*i');
	});

	it('should calculate asin of complex numbers', () => {
		expect(Parser.evaluate('asin(2)').text()).toEqual(
			'1.5707963267948966193-1.3169578969248167086*i'
		);
		expect(Parser.evaluate('asin(-2)').text()).toEqual(
			'-1.5707963267948966193+1.3169578969248167086*i'
		);
		expect(Parser.evaluate('asin(i+1)').text()).toEqual(
			'0.6662394324925152551+1.061275061905035652*i'
		);
		expect(Parser.evaluate('asin(5i+3)').text()).toEqual(
			'0.53399906959416861164+2.4598315216234345129*i'
		);
		expect(Parser.evaluate('asin(i)').text()).toEqual('0.88137358701954302523*i');
	});

	it('should calculate atan of complex numbers', () => {
		expect(() => {
			Parser.evaluate('atan(i)');
		}).toThrow();
		expect(Expression.create(Parser.evaluate('atan(i+1)').text())
			.minus('1.0172219678978513678+0.40235947810852509365*i').isNearlyZero(2)).toBe(true);
		expect(Parser.evaluate('atan(5i+3)').text()).toEqual(
			'1.480869576898657484+0.14694666622552975205*i'
		);
		expect(Parser.evaluate('atan(2i)').text()).toEqual(
			'1.5707963267948966193+0.5493061443340548457*i'
		);
	});

	it('should calculate inverse reciprocal trig functions of complex numbers', () => {
		for (const value of ['1+i', '3+5*i']) {
			const asecValue = Parser.evaluate(`asec(${value})`);
			const acscValue = Parser.evaluate(`acsc(${value})`);
			const acotValue = Parser.evaluate(`acot(${value})`);

			expect(asecValue.text()).toEqual(Parser.evaluate(`acos(1/(${value}))`).text());
			expect(acscValue.text()).toEqual(Parser.evaluate(`asin(1/(${value}))`).text());
			expect(acotValue.text()).toEqual(Parser.evaluate(`atan(1/(${value}))`).text());
		}
	});

	it('should calculate cosh of complex numbers', () => {
		expect(Parser.evaluate('cosh(i+1)').text()).toEqual(
			'0.83373002513114904889+0.98889770576286509639*i'
		);
		expect(Parser.evaluate('cosh(5i+3)').text()).toEqual(
			'2.8558150042273872914-9.6063834484325811198*i'
		);
		expect(Parser.evaluate('cosh(i)').text()).toEqual('0.5403023058681397174');
	});

	it('should calculate sinh of complex numbers', () => {
		expect(Parser.evaluate('sinh(i+1)').text()).toEqual(
			'0.63496391478473610826+1.2984575814159772948*i'
		);
		expect(Parser.evaluate('sinh(5i+3)').text()).toEqual(
			'2.8416922956063519439-9.6541254768548391366*i'
		);
		expect(Parser.evaluate('sinh(i)').text()).toEqual('0.84147098480789650665*i');
	});

	it('should calculate tanh of complex numbers', () => {
		expect(Parser.evaluate('tanh(i+1)').text()).toEqual(
			'1.0839233273386945435+0.27175258531951171651*i'
		);
		expect(Parser.evaluate('tanh(5i+3)').text()).toEqual(
			'1.0041647106948152119-0.0027082358362240721295*i'
		);
		expect(Parser.evaluate('tanh(i)').text()).toEqual('1.5574077246549022305*i');
	});

	it('should calculate sech of complex numbers', () => {
		expect(Parser.evaluate('sech(i+1)').text()).toEqual(
			'0.49833703055518678521-0.59108384172104504805*i'
		);
		expect(Parser.evaluate('sech(5i+3)').text()).toEqual(
			'0.028433530909971667359+0.095644640955286344684*i'
		);
		expect(Parser.evaluate('sech(i)').text()).toEqual('1.8508157176809256179');
	});

	it('should calculate csch of complex numbers', () => {
		expect(Parser.evaluate('csch(i+1)').text()).toEqual(
			'0.30393100162842645035-0.62151801717042842124*i'
		);
		expect(Parser.evaluate('csch(5i+3)').text()).toEqual(
			'0.028058516423080075997+0.095323634674178402851*i'
		);
		expect(Parser.evaluate('csch(i)').text()).toEqual('-1.1883951057781212163*i');
	});

	it('should calculate coth of complex numbers', () => {
		expect(Parser.evaluate('coth(i+1)').text()).toEqual(
			'0.86801414289592494863-0.21762156185440268134*i'
		);
		expect(Parser.evaluate('coth(5i+3)').text()).toEqual(
			'0.99584531857585412978+0.002685798405758525642*i'
		);
		expect(Parser.evaluate('coth(i)').text()).toEqual('-0.64209261593433070301*i');
	});

	it('should calculate acosh of complex numbers', () => {
		expect(Parser.evaluate('acosh(i+1)').text()).toEqual(
			'1.061275061905035652+0.90455689430238136411*i'
		);
		expect(Parser.evaluate('acosh(5i+3)').text()).toEqual(
			'2.4598315216234345129+1.0367972572007280076*i'
		);
		expect(Parser.evaluate('acosh(i)').text()).toEqual(
			'0.88137358701954302519+1.5707963267948966192*i'
		);
	});

	it('should calculate asinh of complex numbers', () => {
		expect(Parser.evaluate('asinh(i+1)').text()).toEqual(
			'1.061275061905035652+0.6662394324925152551*i'
		);
		expect(Expression.create(Parser.evaluate('asinh(5i+3)').text())
			.minus('2.4529137425028117695+1.0238217465117829101*i').isNearlyZero(2)).toBe(true);
		expect(Expression.create(Parser.evaluate('asinh(i)').text())
			.minus('1.5707963267948966193*i').isNearlyZero(2)).toBe(true);
	});

	it('should calculate atanh of complex numbers', () => {
		expect(Expression.create(Parser.evaluate('atanh(i+1)').text())
			.minus('0.40235947810852509365+1.0172219678978513678*i').isNearlyZero(2)).toBe(true);
		expect(Parser.evaluate('atanh(5i+3)').text()).toEqual(
			'0.086569059179458444155+1.4236790442393027309*i'
		);
		expect(Expression.create(Parser.evaluate('atanh(i)').text())
			.minus('0.78539816339744830963*i').isNearlyZero(2)).toBe(true);
	});

	it('should calculate asech of complex numbers', () => {
		expect(Parser.evaluate('asech(i+1)').text()).toEqual(
			'0.53063753095251782596-1.1185178796437059371*i'
		);
		expect(Parser.evaluate('asech(5i+3)').text()).toEqual(
			'0.14709131539545412323-1.4833957949709502506*i'
		);
		expect(Parser.evaluate('asech(i)').text()).toEqual(
			'0.88137358701954302519-1.5707963267948966192*i'
		);
	});

	it('should calculate acsch of complex numbers', () => {
		expect(Parser.evaluate('acsch(i+1)').text()).toEqual(
			'0.53063753095251782596-0.45227844715119068208*i'
		);
		expect(Expression.create(Parser.evaluate('acsch(5i+3)').text())
			.minus('0.089079517088094739588-0.1470061943705430493*i').isNearlyZero(2)).toBe(true);
		expect(Expression.create(Parser.evaluate('acsch(i)').text())
			.minus('-1.5707963267948966193*i').isNearlyZero(2)).toBe(true);
	});

	it('should calculate acoth of complex numbers', () => {
		expect(Parser.evaluate('acoth(i+1)').text()).toEqual(
			'0.40235947810852509365-0.5535743588970452515*i'
		);
		expect(Parser.evaluate('acoth(5i+3)').text()).toEqual(
			'0.086569059179458444155-0.14711728255559388838*i'
		);
		expect(Expression.create(Parser.evaluate('acoth(i)').text())
			.minus('-0.78539816339744830963*i').isNearlyZero(2)).toBe(true);
	});

	it('should not falsely equate two complex values', () => {
		expect(Parser.parse('(i^(1/2))-((-i)^(1/2))').text()).toEqual('2^(1/2)*i');
	});
});

describe('The conjugate function', () => {
	it('should conjugate pure imaginary expressions', () => {
		expect(Parser.parse('conjugate(i)').text()).toEqual('-i');
		expect(Parser.parse('conjugate(3*i)').text()).toEqual('-3*i');
		expect(Parser.parse('conjugate(-i)').text()).toEqual('i');
	});

	it('should conjugate complex sums', () => {
		expect(Parser.parse('conjugate(3+2*i)').text()).toEqual('3-2*i');
		expect(Parser.parse('conjugate(a+b*i)').text()).toEqual('a-b*i');
		expect(Parser.parse('conjugate(x+5*i)').text()).toEqual('x-5*i');
	});

	it('should return real expressions unchanged', () => {
		expect(Parser.parse('conjugate(5)').text()).toEqual('5');
		expect(Parser.parse('conjugate(x)').text()).toEqual('x');
		expect(Parser.parse('conjugate(x^2+1)').text()).toEqual('1+x^2');
	});

	it('should conjugate products', () => {
		expect(Parser.parse('conjugate(2*i*x)').text()).toEqual('-2*i*x');
	});

	it('should handle complex exponents', () => {
		expect(Parser.parse('conjugate((1+i)^i)').text()).toEqual('(1-i)^(-i)');
	});
});

describe('The csgn function', () => {
	it('should return 1 for positive real part', () => {
		expect(Parser.parse('csgn(3+2*i)').text()).toEqual('1');
		expect(Parser.parse('csgn(1)').text()).toEqual('1');
	});

	it('should return -1 for negative real part', () => {
		expect(Parser.parse('csgn(-1+3*i)').text()).toEqual('-1');
		expect(Parser.parse('csgn(-5)').text()).toEqual('-1');
	});

	it('should use imaginary part when real part is zero', () => {
		expect(Parser.parse('csgn(2*i)').text()).toEqual('1');
		expect(Parser.parse('csgn(-5*i)').text()).toEqual('-1');
	});

	it('should return 0 for zero', () => {
		expect(Parser.parse('csgn(0)').text()).toEqual('0');
	});

	it('should return unevaluated csgn for free variables', () => {
		expect(Parser.parse('csgn(x+2*i)').text()).toEqual('csgn(x+2*i)');
	});
	it('should return 1 for positive real part', () => {
		expect(Parser.parse('csgn(3+2*i)').text()).toEqual('1');
		expect(Parser.parse('csgn(2-i)').text()).toEqual('1');
		expect(Parser.parse('csgn(1)').text()).toEqual('1');
	});
});

describe('Complex phase and magnitude aliases', () => {
	it('evaluates phase through the argument implementation', () => {
		expect(Expression.create('phase(i)').minus('pi/2').isNearlyZero()).toBe(true);
		expect(Expression.create('phase(-i)').plus('pi/2').isNearlyZero()).toBe(true);
	});

	it('evaluates magnitude through absolute value', () => {
		expect(nerdamer('magnitude(3+4*i)').text()).toEqual('5');
		expect(nerdamer('magnitude(i)').text()).toEqual('1');
	});
});

describe('Complex numeric helpers', () => {
	it('computes squared magnitude without changing the ordinary magnitude', () => {
		const value = new Complex(new Decimal(3), new Decimal(4));

		expect(value.absSquared().eq(25)).toBe(true);
		expect(value.abs().eq(5)).toBe(true);
	});
});

describe('Complex evaluation regressions', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/13
	it('applies Euler identities to exact complex exponential turns', () => {
		expect(Expression.create('e^(2*i*pi)+e^(i*pi)').isZero()).toBe(true);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/120
	it('evaluates the principal square root of i', () => {
		const actual = nerdamer('sqrt(i)').evaluate();

		expect(Expression.isExpression(actual)).toBe(true);
		if (Expression.isExpression(actual)) {
			const expected = 1 / Math.sqrt(2);
			expect(Number(actual.realPart().text({ decimal: true }))).toBeCloseTo(expected, 15);
			expect(Number(actual.imagPart().text({ decimal: true }))).toBeCloseTo(expected, 15);
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/161
	it('evaluates acosh below one without throwing', () => {
		const result = nerdamer('acosh(1/23.12)').evaluate();

		expect(Expression.isExpression(result)).toBe(true);
		if (Expression.isExpression(result)) {
			const real = Number(result.realPart().text({ decimal: true }));
			const imaginary = Number(result.imagPart().text({ decimal: true }));
			expect(real).toBeCloseTo(0, 15);
			expect(imaginary).toBeCloseTo(1.5275302342078616, 15);
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/173
	it('evaluates logarithms with complex arguments and bases', () => {
		const natural = Expression.create('log(i)').evaluate();
		const baseTen = Expression.create('log(i,10)').evaluate();
		const sameBase = Expression.create('log(i,i)');
		const negativeRealToImaginaryBase = Expression.create('log(-1,i)');
		const imaginaryToNegativeRealBase = Expression.create('log(i,-1)');
		const symbolicArgument = Expression.create('log(x,i)');
		const symbolicBase = Expression.create('log(i,x)');

		expect(natural.minus('pi*i/2').isNearlyZero()).toBe(true);
		expect(baseTen.minus('pi*i/(2*log(10))').isNearlyZero()).toBe(true);
		expect(sameBase.eq(1)).toBe(true);
		expect(negativeRealToImaginaryBase.eq(2)).toBe(true);
		expect(imaginaryToNegativeRealBase.eq('1/2')).toBe(true);
		expect(symbolicArgument.eq('log(x)/log(i)')).toBe(true);
		expect(symbolicBase.eq('log(i)/log(x)')).toBe(true);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/178
	it('evaluates sinc at the imaginary unit', () => {
		const actual = Number(nerdamer('sinc(i)').evaluate().text({ decimal: true }));

		expect(actual).toBeCloseTo(Math.sinh(1), 15);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/560
	it('does not treat the full exponent of exp(i+pi) as imaginary', () => {
		const actual = Expression.create('exp(i+pi)').evaluate();
		const expected = Expression.create('e^pi*(cos(1)+i*sin(1))').evaluate();

		expect(actual.eq(-1)).toBe(false);
		expect(actual.minus(expected).evaluate().isNearlyZero()).toBe(true);
	});
});

describe('Complex gamma regression (#343)', () => {
	it('evaluates gamma(1+i) with its known principal value', () => {
		const actual = Expression.create('gamma(1+i)').evaluate();
		const real = Number(actual.realPart().text({ decimal: true }));
		const imaginary = Number(actual.imagPart().text({ decimal: true }));

		expect(real).toBeCloseTo(0.498015668118356, 12);
		expect(imaginary).toBeCloseTo(-0.154949828301811, 12);
	});

	it('obeys the gamma recurrence and conjugation identities', () => {
		const z = Expression.create('1+i');
		const gammaZ = Expression.create('gamma(1+i)').evaluate();
		const gammaNext = Expression.create('gamma(2+i)').evaluate();
		const gammaConjugate = Expression.create('gamma(1-i)').evaluate();

		expect(gammaNext.minus(z.times(gammaZ)).evaluate().isNearlyZero()).toBe(true);
		expect(gammaConjugate.realPart().minus(gammaZ.realPart()).evaluate().isNearlyZero()).toBe(true);
		expect(gammaConjugate.imagPart().plus(gammaZ.imagPart()).evaluate().isNearlyZero()).toBe(true);
	});

	it('keeps symbolic gamma unevaluated', () => {
		expect(Expression.create('gamma(x+i)').text()).toEqual('gamma(x+i)');
	});
});

describe('Complex error function (#343)', () => {
	it('evaluates erf(i) numerically without changing symbolic parsing', () => {
		expect(Expression.create('erf(i)').text()).toEqual('erf(i)');
		const value = Expression.create('erf(i)').evaluate();
		expect(Number(value.realPart().text({ decimal: true }))).toBeCloseTo(0, 14);
		expect(Number(value.imagPart().text({ decimal: true }))).toBeCloseTo(1.6504257587975429, 13);
	});

	it('evaluates a general complex argument', () => {
		const value = Expression.create('erf(1+i)').evaluate();
		expect(Number(value.realPart().text({ decimal: true }))).toBeCloseTo(1.3161512816979476, 12);
		expect(Number(value.imagPart().text({ decimal: true }))).toBeCloseTo(0.1904534692378347, 12);
	});

	it('preserves oddness and conjugation for complex arguments', () => {
		const positive = Expression.create('erf(1+2*i)').evaluate();
		const negative = Expression.create('erf(-1-2*i)').evaluate();
		const conjugate = Expression.create('erf(1-2*i)').evaluate();
		expect(positive.plus(negative).evaluate().isNearlyZero()).toBe(true);
		expect(positive.realPart().minus(conjugate.realPart()).evaluate().isNearlyZero()).toBe(true);
		expect(positive.imagPart().plus(conjugate.imagPart()).evaluate().isNearlyZero()).toBe(true);
	});

	it('leaves symbolic arguments unevaluated', () => {
		expect(Expression.create('erf(x+i)').evaluate().text()).toEqual('erf(x+i)');
	});
});

describe('Complex integral functions (#343)', () => {
	it('evaluates Si, Ci, and Ei with nonzero real and imaginary parts', () => {
		const cases: [string, number, number][] = [
			['Si(1+i)', 1.1042226582355817, 0.8824538050079177],
			['Ci(1+i)', 0.8821721805559363, 0.28724913351995594],
			['Ei(1+i)', 1.764625985563854, 2.3877698515105224],
			['Si(2-i)', 1.8332099215048436, -0.457691711286688],
			['Ci(2-i)', 0.5844759968782477, 0.297495177638134],
			['Ei(2-i)', 4.069980947893928, -3.4009439698001216],
		];
		for (const [input, real, imaginary] of cases) {
			const value = Expression.create(input).evaluate();
			expect(Number(value.realPart().text({ decimal: true }))).toBeCloseTo(real, 12);
			expect(Number(value.imagPart().text({ decimal: true }))).toBeCloseTo(imaginary, 12);
		}
	});

	it('agrees with the imaginary-axis identities when evaluated', () => {
		const cases: [string, number, number][] = [
			['Si(i)', 0, 1.0572508753757285],
			['Ci(i)', 0.8378669409802082, Math.PI / 2],
			['Ei(i)', 0.33740392290096813, 2.5168793971620796],
		];
		for (const [input, real, imaginary] of cases) {
			const value = Expression.create(input).evaluate();
			expect(Number(value.realPart().text({ decimal: true }))).toBeCloseTo(real, 12);
			expect(Number(value.imagPart().text({ decimal: true }))).toBeCloseTo(imaginary, 12);
		}
	});

	it('retains the principal logarithm branch for negative real Ci inputs', () => {
		const value = Expression.create('Ci(-1)');
		const expected = Expression.create('Ci(1)+i*pi');
		expect(value.eq(expected)).toBe(true);
		const numeric = value.evaluate();
		expect(Number(numeric.imagPart().text({ decimal: true }))).toBeCloseTo(Math.PI, 12);
	});

	it('preserves symbolic arguments and the sine integral oddness identity', () => {
		expect(Expression.create('Si(x+i)').text()).toEqual('Si(x+i)');
		expect(Expression.create('Ci(x+i)').text()).toEqual('Ci(x+i)');
		expect(Expression.create('Ei(x+i)').text()).toEqual('Ei(x+i)');
		const a = Expression.create('Si(1+i)').evaluate();
		const b = Expression.create('Si(-1-i)').evaluate();
		expect(a.plus(b).evaluate().isNearlyZero()).toBe(true);
	});
});

describe('Complex special-function series limits (#343)', () => {
	it('keeps complex arguments outside the supported series ranges symbolic', () => {
		const cases = ['erf(13+i)', 'Si(9+i)', 'Ci(9+i)', 'Ei(9+i)'];
		for (const input of cases) {
			expect(Expression.create(input).evaluate().text()).toEqual(input);
		}
	});
});

describe('Complex double factorial (#343)', () => {
	it('evaluates complex dfact through its gamma continuation', () => {
		const actual = Expression.create('dfact(i)').evaluate();
		const real = Number(actual.realPart().text({ decimal: true }));
		const imaginary = Number(actual.imagPart().text({ decimal: true }));
		expect(Number.isFinite(real)).toBe(true);
		expect(Number.isFinite(imaginary)).toBe(true);
		expect(Math.abs(imaginary)).toBeGreaterThan(0);
	});

	it('obeys the two-step recurrence for complex arguments', () => {
		for (const input of ['i', '1+i', '-1+i']) {
			const z = Expression.create(input);
			const next = Expression.create(`dfact(2+(${input}))`).evaluate();
			const current = Expression.create(`dfact(${input})`).evaluate();
			expect(next.minus(z.plus(2).times(current)).evaluate().isNearlyZero()).toBe(true);
		}
	});

	it('preserves conjugation for complex inputs', () => {
		const positive = Expression.create('dfact(1+i)').evaluate();
		const negative = Expression.create('dfact(1-i)').evaluate();
		expect(positive.realPart().minus(negative.realPart()).evaluate().isNearlyZero()).toBe(true);
		expect(positive.imagPart().plus(negative.imagPart()).evaluate().isNearlyZero()).toBe(true);
	});

	it('keeps dfactorial as an alias and symbolic dfact unevaluated', () => {
		expect(nerdamer.dfact).toBe(nerdamer.dfactorial);
		expect(Expression.create('dfactorial(i)').evaluate()
			.minus(Expression.create('dfact(i)').evaluate()).isNearlyZero()).toBe(true);
		expect(Expression.create('dfactorial(x)').text()).toEqual('dfact(x)');
		expect(Expression.create('dfact(9)').evaluate().text()).toEqual('945');
	});
});
