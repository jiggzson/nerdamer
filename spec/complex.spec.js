/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

/*global describe, it, require, expect */

const { Parser: parser } = require('../output/core/classes/parser/Parser');

describe('Complex number', () => {
	it('should simplify complex numbers', () => {
		expect(parser.parse('2*i*i').text()).toEqual('-2');
	});

	it('should get the imaginary part', () => {
		expect(parser.parse('x+5*i').imagPart().text()).toEqual('5');
		expect(parser.parse('9*(7+5*i)').imagPart().text()).toEqual('45');
		expect(parser.parse('x+5*i^3').imagPart().text()).toEqual('-5');
		expect(parser.parse('x+5*i').realPart().text()).toEqual('x');
		expect(parser.parse('i').realPart().text()).toEqual('0');
		expect(parser.parse('3+i').realPart().text()).toEqual('3');
	});

	it("should be able to handle Euler's identity", () => {
		expect(parser.parse('6*e^(3/2*i*pi)').text()).toEqual('-6*i');
		expect(parser.parse('6*e^(-3/2*i*pi)').text()).toEqual('6*i');
		expect(parser.parse('6*e^(2*i*pi)').text()).toEqual('6');
		expect(parser.parse('6*e^(i*pi)').text()).toEqual('-6');
		expect(parser.parse('e^(i*pi)+1').text()).toEqual('0');
		expect(parser.parse('e^(3/4*i*pi)').text()).toEqual('e^((3/4)*i*pi)');
		expect(parser.parse('e^(3/4*i*pi)+1').text()).toEqual('1+e^((3/4)*i*pi)');
		expect(parser.parse('e^(i*pi/2)+e^(-i*pi/2)').text()).toEqual('0');
		expect(parser.parse('e^(pi*i)+(i+1)').text()).toEqual('i');
		expect(parser.parse('e^(pi*i)/(i+1)').text()).toEqual('-1/2+(1/2)*i');
	});

	it('should simplify i correctly', () => {
		expect(parser.parse('i*i^2').text()).toEqual('-i');
		expect(parser.parse('2*i*i').text()).toEqual('-2');
		expect(parser.parse('5*i^2').text()).toEqual('-5');
		expect(parser.parse('5*i^3').text()).toEqual('-5*i');
		expect(parser.parse('(2*i)^7').text()).toEqual('-128*i');
		expect(parser.parse('(2*i)^7').text()).toEqual('-128*i');
		expect(parser.parse('3*i^5*i').text()).toEqual('-3');
		expect(parser.parse('3*i^4').text()).toEqual('3');
		expect(parser.parse('i/i').text()).toEqual('1');
		expect(parser.parse('i^x').text()).toEqual('i^x');
		expect(parser.parse('(1/i)*i').text()).toEqual('1');
		expect(parser.parse('(256*i)^(1/8)').text()).toEqual('2*i^(1/8)');
		expect(parser.parse('i^(-1)').text()).toEqual('-i');
		expect(parser.parse('i^(-2)').text()).toEqual('-1');
		expect(parser.parse('i^(-3)').text()).toEqual('i');
		expect(parser.parse('i^(-4)').text()).toEqual('1');
		expect(parser.parse('i^(-7)').text()).toEqual('i');
		expect(parser.parse('sqrt(-1)').text()).toEqual('i');
		expect(parser.parse('1^3+3*1^2*i+i^3+3*i^2').text()).toEqual('-2+2*i');
	});

	it('should allow a different symbol to be used for the complex variable', () => {
		const i = parser.getI();
		parser.setI('j');
		expect(parser.parse('j^2').text()).toEqual('-1');
		expect(parser.parse('(2*j)^7').text()).toEqual('-128*j');
		parser.setI(i);
	});

	it('should correctly evaluate numbers raised to imaginary numbers', () => {
		expect(parser.evaluate('2^(3/4+5i)').text()).toEqual('-1.594211697321635458-0.5356455813960013149*i');
		expect(parser.evaluate('7*e^(5i+2)').text()).toEqual('14.671970610731344836-49.598816820786193054*i');
		expect(parser.evaluate('e^((1/4)*i*pi)*sqrt(2)').text()).toEqual('0.99999999999999999998+i');
	});

	it('should compute complex logarithms', () => {
		expect(parser.evaluate('log(5*i)').text()).toEqual('1.6094379124341003746+1.5707963267948966193*i');
		expect(parser.evaluate('log(8+5*i)').text()).toEqual('2.2443181848660699192+0.55859931534356243597*i');
		expect(parser.evaluate('log(123-2*i)').text()).toEqual('4.8123165343435130951-0.016258729805129587692*i');
		expect(parser.evaluate('log(123-2*i+a)').text()).toEqual('log((4+(123+a)^2)^(1/2))+i*atan2(-2, 123+a)');
	});

	it('should handle complex powers', () => {
		expect(parser.evaluate('(-2/3)^(-3/5)').text({ decimal: true })).toEqual('-0.39412784573555013322-1.2130007823626505466*i');
		expect(parser.evaluate('(-2/3)^(3/5)').text({ decimal: true })).toEqual('-0.24228560312533381219+0.74567841203341699771*i');
		expect(parser.evaluate('(-0.177777777777777)^(2/3)').text({ decimal: true })).toEqual('-0.15808414686622455252+0.27380977424348123885*i');
		expect(parser.evaluate('(-5)^(7/2)').text({ decimal: true })).toEqual('-279.50849718747371205*i');
		expect(parser.evaluate('(-1)^0.5').text({ decimal: true })).toEqual('i');
		expect(parser.evaluate('(-1)^0.5*i').text({ decimal: true })).toEqual('-1.0');
	});

	it('should evaluate complex numbers with high precision', () => {
		// We want to run with a higher precision to make sure we're not getting junk numbers
		parser.setPrecision(60);
		expect(parser.evaluate('(i+1)^(3/2)').text({ sort: true })).toEqual(
			'0.643594252905582624735443437418209808924202742444007651156159+1.55377397403003730734415895306314694816458349941030783633267*i'
		);
		expect(parser.evaluate('(-1)^(-1/5)').text({ sort: true })).toEqual(
			'0.809016994374947424102293417182819058860154589902881431067725-0.587785252292473129168705954639072768597652437643145991072272*i'
		);
		expect(parser.evaluate('2/5*sqrt(-1)').text()).toEqual('(2/5)*i');
		expect(parser.evaluate('(-2/5)^(3/2)').text({ decimal: true })).toEqual('-0.2529822128134703465599114835546174826975644111460173461486*i');
		parser.setPrecision(20);
	});

	it('should calculate the absolute value of complex numbers correctly', () => {
		expect(parser.parse('abs(4i+3)').text()).toEqual('5');
		expect(parser.parse('abs(4i+b)').text()).toEqual('abs((16+b^2)^(1/2))');
	});

	it('should evaluate complex numbers raised to complex numbers', () => {
		// We want to run with a higher precision to make sure we're not getting junk numbers
		expect(parser.evaluate('i^(5i+3)').text({ sort: true })).toEqual('-0.00038820320392676624713*i');
		expect(parser.evaluate('(2+3i)^(5i+3)').text({ sort: true })).toEqual('-0.34349061841848876589+0.022021533303860477046*i');
	});

	it('should evaluate complex numbers', () => {
		expect(parser.evaluate('2^(1.5)*5^(-1.5)*(-1)^(1.5)').text({ decimal: true })).toEqual('-0.25298221281347034656*i');
		expect(parser.evaluate('(256*i)^(1/8)').text({ decimal: true })).toEqual('1.9615705608064608982+0.3901806440322565357*i');
		expect(parser.evaluate('(i+2)^(2/3)').text({ decimal: true })).toEqual('1.6289371459221758753+0.52017450230454583956*i');
	});

	it('sqrt should evaluate complex numbers', () => {
		expect(parser.evaluate('sqrt(2+5*i)').text()).toEqual('1.9216093264675970592+1.3009928530039094783*i');
	});

	// (-27)^(2/3)
	// (-25/27)^(1/3)
	// (-2)^(3/8)
	// (13591409142295226177/5000000000000000000)^(0.39269908169872415481*i); basically anything to i
});

describe('The polarform function', () => {
	it('should be calculated correctly', () => {
		expect(parser.parse('polarform(i+5)').text()).toBe('26^(1/2)*e^(i*atan(1/5))');
		expect(parser.parse('polarform(x^2+i)').text()).toBe('e^(i*atan2(1, x^2))*((1+x^4)^(1/2))');
		expect(parser.parse('polarform(i)').text()).toBe('i');
		expect(parser.parse('polarform(3)').text()).toBe('3');
		expect(parser.parse('polarform(x)').text()).toBe('e^(i*atan2(0, x))*abs(x)');
		expect(parser.parse('polarform(3*i+5)').text()).toEqual('34^(1/2)*e^(i*atan(3/5))');
		expect(parser.parse('polarform(i-1)').text()).toEqual('2^(1/2)*e^((3/4)*i*pi)');
		expect(parser.parse('polarform(i+1)').text()).toEqual('2^(1/2)*e^((1/4)*i*pi)');
		expect(parser.parse('polarform(a*i+b*1)').text()).toEqual('e^(i*atan2(a, b))*((b^2+a^2)^(1/2))');
		expect(parser.parse('polarform(3*i*x+5*x)').text()).toEqual('34^(1/2)*abs(x)*e^(i*atan2(3*x, 5*x))');
	});
});

describe('The rectform function', () => {
	it('should be calculated correctly', () => {
		expect(parser.parse('rectform(2*e^(i*atan(3/5)))').text()).toEqual('10*34^(-1/2)+6*34^(-1/2)*i');
		expect(parser.parse('rectform(2*e^(i*atan(3/5))*x)').text()).toEqual('10*34^(-1/2)*x+6*34^(-1/2)*i*x');
		expect(parser.parse('rectform(5*e^(i/2))').text()).toEqual('5*cos(1/2)+5*i*sin(1/2)');
		expect(parser.parse('rectform(5*e^(i/2)*x)').text()).toEqual('5*x*cos(1/2)+5*i*sin(1/2)*x');
		expect(parser.parse('rectform(sqrt(34)*e^(i*atan(3/5)))').text()).toEqual('5+3*i');
		expect(parser.parse('rectform(e^atan(3/5))').text()).toEqual('e^(atan(3/5))');
		expect(parser.parse('rectform(4-i)').text()).toEqual('4-i');
		expect(parser.parse('rectform(x)').text()).toEqual('x');
		expect(parser.parse('rectform(e^(5*atan(i*3/5)))').text()).toEqual('cos(5*atanh(3/5))+i*sin(5*atanh(3/5))');
		expect(parser.parse('rectform(sqrt(34)*e^(i*atan(3/5))+10)').text()).toEqual('15+3*i');
		expect(parser.parse('rectform(e^(5*atan(i+7)))').text()).toEqual('1278.4631547435725921+125.80758348772224229*i');
	});
});

describe('The arg function', () => {
	it('should be calculated correctly', () => {
		expect(parser.parse('arg(10i+10)').text()).toEqual('(1/4)*pi');
		expect(parser.parse('arg(10i+10-a)').text()).toEqual('atan2(10, 10-a)');
		expect(parser.parse('arg(10)').text()).toEqual('0');
		expect(parser.parse('arg(x)').text()).toEqual('atan2(0, x)');
		expect(parser.parse('arg(i)').text()).toEqual('(1/2)*pi');
	});
});

describe('Complex Trig', () => {
	it('should calculate cos of complex numbers', () => {
		expect(parser.evaluate('cos(i+1)').text()).toEqual('0.83373002513114904889+0.98889770576286509639*i');
		expect(parser.evaluate('cos(5i+3)').text()).toEqual('-73.467292212645262468+10.471557674805574377*i');
		expect(parser.evaluate('cos(i)').text()).toEqual('1.5430806348152437785');
	});

	it('should calculate sin of complex numbers', () => {
		expect(parser.evaluate('sin(i+1)').text()).toEqual('1.2984575814159772948+0.63496391478473610826*i');
		expect(parser.evaluate('sin(5i+3)').text()).toEqual('10.472508533940392277-73.460621695673676367*i');
		expect(parser.evaluate('sin(i)').text()).toEqual('1.1752011936438014569*i');
	});

	it('should calculate tan of complex numbers', () => {
		expect(parser.evaluate('tan(i+1)').text()).toEqual('0.27175258531951171653+1.0839233273386945435*i');
		expect(parser.evaluate('tan(5i+3)').text()).toEqual('-0.000025368676207676032417+0.99991282015135380824*i');
		expect(parser.evaluate('tan(i)').text()).toEqual('0.76159415595576488812*i');
	});

	it('should calculate sec of complex numbers', () => {
		expect(parser.evaluate('sec(i+1)').text()).toEqual('0.49833703055518678521+0.59108384172104504804*i');
		expect(parser.evaluate('sec(5i+3)').text()).toEqual('-0.013340476530549737487+0.001901466151695151309*i');
		expect(parser.evaluate('sec(i)').text()).toEqual('0.64805427366388539957');
	});

	it('should calculate csc of complex numbers', () => {
		expect(parser.evaluate('csc(i+1)').text()).toEqual('0.62151801717042842123-0.30393100162842645033*i');
		expect(parser.evaluate('csc(5i+3)').text()).toEqual('0.0019019704237010899967+0.013341591397996678722*i');
		expect(parser.evaluate('csc(i)').text()).toEqual('-0.85091812823932154512*i');
	});

	it('should calculate cot of complex numbers', () => {
		expect(parser.evaluate('cot(i+1)').text()).toEqual('0.21762156185440268136-0.86801414289592494864*i');
		expect(parser.evaluate('cot(5i+3)').text()).toEqual('-0.000025373100044545977383-1.0000871868058967743*i');
		expect(parser.evaluate('cot(i)').text()).toEqual('-1.3130352854993313036*i');
	});

	it('should calculate asin of complex numbers', () => {
		expect(parser.evaluate('asin(2)').text()).toEqual('1.5707963267948966193-1.3169578969248167086*i');
		expect(parser.evaluate('asin(-2)').text()).toEqual('-1.5707963267948966193+1.3169578969248167086*i');
		expect(parser.evaluate('asin(i+1)').text()).toEqual('0.6662394324925152551+1.061275061905035652*i');
		expect(parser.evaluate('asin(5i+3)').text()).toEqual('0.53399906959416861164+2.4598315216234345129*i');
		expect(parser.evaluate('asin(i)').text()).toEqual('0.88137358701954302523*i');
	});

	it('should calculate atan of complex numbers', () => {
		expect(() => {
			parser.evaluate('atan(i)');
		}).toThrow();
		expect(parser.evaluate('atan(i+1)').text()).toEqual('1.0172219678978513678+0.40235947810852509365*i');
		expect(parser.evaluate('atan(5i+3)').text()).toEqual('1.480869576898657484+0.14694666622552975205*i');
		expect(parser.evaluate('atan(2i)').text()).toEqual('1.5707963267948966193+0.5493061443340548457*i');
	});

	it('should calculate cosh of complex numbers', () => {
		expect(parser.evaluate('cosh(i+1)').text()).toEqual('0.83373002513114904889+0.98889770576286509639*i');
		expect(parser.evaluate('cosh(5i+3)').text()).toEqual('2.8558150042273872914-9.6063834484325811198*i');
		expect(parser.evaluate('cosh(i)').text()).toEqual('0.5403023058681397174');
	});

	it('should calculate sinh of complex numbers', () => {
		expect(parser.evaluate('sinh(i+1)').text()).toEqual('0.63496391478473610826+1.2984575814159772948*i');
		expect(parser.evaluate('sinh(5i+3)').text()).toEqual('2.8416922956063519439-9.6541254768548391366*i');
		expect(parser.evaluate('sinh(i)').text()).toEqual('0.84147098480789650665*i');
	});

	it('should calculate tanh of complex numbers', () => {
		expect(parser.evaluate('tanh(i+1)').text()).toEqual('1.0839233273386945435+0.27175258531951171651*i');
		expect(parser.evaluate('tanh(5i+3)').text()).toEqual('1.0041647106948152119-0.0027082358362240721295*i');
		expect(parser.evaluate('tanh(i)').text()).toEqual('1.5574077246549022305*i');
	});

	it('should calculate sech of complex numbers', () => {
		expect(parser.evaluate('sech(i+1)').text()).toEqual('0.49833703055518678521-0.59108384172104504805*i');
		expect(parser.evaluate('sech(5i+3)').text()).toEqual('0.028433530909971667359+0.095644640955286344684*i');
		expect(parser.evaluate('sech(i)').text()).toEqual('1.8508157176809256179');
	});

	it('should calculate csch of complex numbers', () => {
		expect(parser.evaluate('csch(i+1)').text()).toEqual('0.30393100162842645035-0.62151801717042842124*i');
		expect(parser.evaluate('csch(5i+3)').text()).toEqual('0.028058516423080075997+0.095323634674178402851*i');
		expect(parser.evaluate('csch(i)').text()).toEqual('-1.1883951057781212163*i');
	});

	it('should calculate coth of complex numbers', () => {
		expect(parser.evaluate('coth(i+1)').text()).toEqual('0.86801414289592494863-0.21762156185440268134*i');
		expect(parser.evaluate('coth(5i+3)').text()).toEqual('0.99584531857585412978+0.002685798405758525642*i');
		expect(parser.evaluate('coth(i)').text()).toEqual('-0.64209261593433070301*i');
	});

	it('should calculate acosh of complex numbers', () => {
		expect(parser.evaluate('acosh(i+1)').text()).toEqual('1.061275061905035652+0.90455689430238136411*i');
		expect(parser.evaluate('acosh(5i+3)').text()).toEqual('2.4598315216234345129+1.0367972572007280076*i');
		expect(parser.evaluate('acosh(i)').text()).toEqual('0.88137358701954302519+1.5707963267948966192*i');
	});

	it('should calculate asinh of complex numbers', () => {
		expect(parser.evaluate('asinh(i+1)').text()).toEqual('1.061275061905035652+0.6662394324925152551*i');
		expect(parser.evaluate('asinh(5i+3)').text()).toEqual('2.4529137425028117695+1.0238217465117829101*i');
		expect(parser.evaluate('asinh(i)').text()).toEqual('1.5707963267948966193*i');
	});

	it('should calculate atanh of complex numbers', () => {
		expect(parser.evaluate('atanh(i+1)').text()).toEqual('0.40235947810852509365+1.0172219678978513678*i');
		expect(parser.evaluate('atanh(5i+3)').text()).toEqual('0.086569059179458444155+1.4236790442393027309*i');
		expect(parser.evaluate('atanh(i)').text()).toEqual('0.78539816339744830963*i');
	});

	it('should calculate asech of complex numbers', () => {
		expect(parser.evaluate('asech(i+1)').text()).toEqual('0.53063753095251782596-1.1185178796437059371*i');
		expect(parser.evaluate('asech(5i+3)').text()).toEqual('0.14709131539545412323-1.4833957949709502506*i');
		expect(parser.evaluate('asech(i)').text()).toEqual('0.88137358701954302519-1.5707963267948966192*i');
	});

	it('should calculate acsch of complex numbers', () => {
		expect(parser.evaluate('acsch(i+1)').text()).toEqual('0.53063753095251782596-0.45227844715119068208*i');
		expect(parser.evaluate('acsch(5i+3)').text()).toEqual('0.089079517088094739588-0.1470061943705430493*i');
		expect(parser.evaluate('acsch(i)').text()).toEqual('-1.5707963267948966193*i');
	});

	it('should calculate acoth of complex numbers', () => {
		expect(parser.evaluate('acoth(i+1)').text()).toEqual('0.40235947810852509365-0.5535743588970452515*i');
		expect(parser.evaluate('acoth(5i+3)').text()).toEqual('0.086569059179458444155-0.14711728255559388838*i');
		expect(parser.evaluate('acoth(i)').text()).toEqual('-0.78539816339744830963*i');
	});
});
