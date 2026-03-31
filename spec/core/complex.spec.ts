'use strict';

import { Parser as Parser } from '../../src/core/classes/parser/Parser';

import type { Expression } from '../../src/core/classes/expression/Expression';

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
		expect(Parser.evaluate('log(5*i)').text()).toEqual(
			'1.6094379124341003746+1.5707963267948966193*i'
		);
		expect(Parser.evaluate('log(8+5*i)').text()).toEqual(
			'2.2443181848660699192+0.55859931534356243597*i'
		);
		expect(Parser.evaluate('log(123-2*i)').text()).toEqual(
			'4.8123165343435130951-0.016258729805129587692*i'
		);
		expect(Parser.evaluate('log(123-2*i+a)').text()).toEqual(
			'log((4+(123+a)^2)^(1/2))+i*atan2(-2, 123+a)'
		);
		expect(Parser.evaluate('log(1/i)').text()).toEqual('-1.5707963267948966193*i');
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
		expect(Parser.parse('rectform(e^(5*atan(i+7)))').text()).toEqual(
			'1278.4631547435725921+125.80758348772224229*i'
		);
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
		expect(Parser.evaluate('atan(i+1)').text()).toEqual(
			'1.0172219678978513678+0.40235947810852509365*i'
		);
		expect(Parser.evaluate('atan(5i+3)').text()).toEqual(
			'1.480869576898657484+0.14694666622552975205*i'
		);
		expect(Parser.evaluate('atan(2i)').text()).toEqual(
			'1.5707963267948966193+0.5493061443340548457*i'
		);
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
		expect(Parser.evaluate('asinh(5i+3)').text()).toEqual(
			'2.4529137425028117695+1.0238217465117829101*i'
		);
		expect(Parser.evaluate('asinh(i)').text()).toEqual('1.5707963267948966193*i');
	});

	it('should calculate atanh of complex numbers', () => {
		expect(Parser.evaluate('atanh(i+1)').text()).toEqual(
			'0.40235947810852509365+1.0172219678978513678*i'
		);
		expect(Parser.evaluate('atanh(5i+3)').text()).toEqual(
			'0.086569059179458444155+1.4236790442393027309*i'
		);
		expect(Parser.evaluate('atanh(i)').text()).toEqual('0.78539816339744830963*i');
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
		expect(Parser.evaluate('acsch(5i+3)').text()).toEqual(
			'0.089079517088094739588-0.1470061943705430493*i'
		);
		expect(Parser.evaluate('acsch(i)').text()).toEqual('-1.5707963267948966193*i');
	});

	it('should calculate acoth of complex numbers', () => {
		expect(Parser.evaluate('acoth(i+1)').text()).toEqual(
			'0.40235947810852509365-0.5535743588970452515*i'
		);
		expect(Parser.evaluate('acoth(5i+3)').text()).toEqual(
			'0.086569059179458444155-0.14711728255559388838*i'
		);
		expect(Parser.evaluate('acoth(i)').text()).toEqual('-0.78539816339744830963*i');
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
