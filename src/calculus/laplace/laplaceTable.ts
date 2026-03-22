import { LookupTable, type TableEntries } from '../../core/classes/lookupTable/LookupTable';

const laplaceTable: TableEntries = {
	// L{a1}
	a1: (p, _depth) => {
		return p.fromPattern('a1/s');
	},

	// L{a1*t^n1}
	'a1*x1^n1': p => {
		const { n1 } = p.references;

		// Reject Gamma poles: n1 = -1, -2, -3, ...
		if (n1.isNegative() && n1.plus(1).isInteger()) {
			return undefined;
		}

		return p.fromPattern('a1*gamma(n1+1)/s^(n1+1)');
	},

	// L{a1*(a2)^(a3*x1)}
	'a1*(a2)^(a3*x1^n1)': p => {
		if (!p.get('n1').isOne()) {
			return undefined;
		}

		// a^(b t) = e^(log(a) b t)
		return p.fromPattern('a1/(s-log(a2)*a3)');
	},

	// L{a1*sin(a2*x1)}
	'a1*sin(a2*x1^n1)^n2': p => {
		if (!p.get('n1').isOne() || !p.get('n2').isOne()) {
			return undefined;
		}

		return p.fromPattern('(a1*a2)/(s^2+a2^2)');
	},

	// L{a1*cos(a2*x1)}
	'a1*cos(a2*x1^n1)^n2': p => {
		if (!p.get('n1').isOne() || !p.get('n2').isOne()) {
			return undefined;
		}

		return p.fromPattern('(a1*s)/(s^2+a2^2)');
	},
	'a1*(a2)^(a3*x1^n1)*x1^n2': p => {
		const { n1, n2 } = p.references;

		if (!n1.isOne()) {
			return undefined;
		}

		// Reject the pole at Gamma(0), Gamma(-1), ...
		if (n2.isNegative() && n2.plus(1).isInteger()) {
			return undefined;
		}

		return p.fromPattern('a1*gamma(n2+1)/(s-log(a2)*a3)^(n2+1)');
	},
	'a1*x1^n1*sin(a2*x1^n2)^n3': p => {
		const { _a1, n1, n2, n3, _a2 } = p.references;

		if (!n2.isOne() || !n3.isOne()) {
			return undefined;
		}
		if (!n1.isInteger() || n1.isNegative()) {
			return undefined;
		}

		const n = Number(n1.getMultiplier().numerator);
		let result = p.fromPattern('(a1*a2)/(s^2+a2^2)');

		for (let i = 0; i < n; i++) {
			result = result.diff('s').neg();
		}

		return result;
	},
	'a1*x1^n1*cos(a2*x1^n2)^n3': p => {
		const { _a1, n1, n2, n3, _a2 } = p.references;

		if (!n2.isOne() || !n3.isOne()) {
			return undefined;
		}
		if (!n1.isInteger() || n1.isNegative()) {
			return undefined;
		}

		const n = Number(n1.getMultiplier().numerator);
		let result = p.fromPattern('(a1*s)/(s^2+a2^2)');

		for (let i = 0; i < n; i++) {
			result = result.diff('s').neg();
		}

		return result;
	},
	'a1*(a2)^(a3*x1^n1)*sin(a4*x1^n2)^n3': p => {
		const { n1, n2, n3 } = p.references;

		if (!n1.isOne() || !n2.isOne() || !n3.isOne()) {
			return undefined;
		}

		return p.fromPattern('(a1*a4)/((s-log(a2)*a3)^2+a4^2)');
	},
	'a1*(a2)^(a3*x1^n1)*cos(a4*x1^n2)^n3': p => {
		const { n1, n2, n3 } = p.references;

		if (!n1.isOne() || !n2.isOne() || !n3.isOne()) {
			return undefined;
		}

		return p.fromPattern('a1*(s-log(a2)*a3)/((s-log(a2)*a3)^2+a4^2)');
	},
	'a1*cos(a2*x1^n1)^n2*sin(a3*x1^n3)^n4': p => {
		const { _a1, a2, a3, n1, n2, n3, n4 } = p.references;

		if (!n1.isOne() || !n2.isOne() || !n3.isOne() || !n4.isOne()) {
			return undefined;
		}
		if (!a2.eq(a3)) {
			return undefined;
		}

		return p.fromPattern('(a1*a2)/(s^2+4*a2^2)');
	},
	'a1*(a2)^(a3*x1^n1)*x1^n2*sin(a4*x1^n3)^n4': p => {
		const { n1, n2, n3, n4 } = p.references;

		if (!n1.isOne() || !n2.isOne() || !n3.isOne() || !n4.isOne()) {
			return undefined;
		}

		return p.fromPattern('(2*a1*a4*(s-a3*log(a2)))/((a4^2+(s-a3*log(a2))^2)^2)');
	},

	'a1*(a2)^(a3*x1^n1)*x1^n2*cos(a4*x1^n3)^n4': p => {
		const { n1, n2, n3, n4 } = p.references;

		if (!n1.isOne() || !n2.isOne() || !n3.isOne() || !n4.isOne()) {
			return undefined;
		}

		return p.fromPattern('(a1*((s-a3*log(a2))^2-a4^2))/((a4^2+(s-a3*log(a2))^2)^2)');
	},
	'a1*(a2)^(a3*x1^n1)*(a4*sin(a5*x1^n2)^n3-a6*x1^n4*cos(a7*x1^n5)^n6)^n7': p => {
		const { n1, n2, n3, n4, n5, n6, n7, a5, a7 } = p.references;

		if (
			!n1.isOne() ||
			!n2.isOne() ||
			!n3.isOne() ||
			!n4.isOne() ||
			!n5.isOne() ||
			!n6.isOne() ||
			!n7.isOne()
		) {
			return undefined;
		}

		if (!a5.eq(a7)) {
			return undefined;
		}

		return p.fromPattern(
			'(a1*(a4*a5^2-a6*((s-a3*log(a2))^2-a5^2)))/(((s-a3*log(a2))^2+a5^2)^2)'
		);
	},
	'a1*(a2)^(a3*x1^n1)*(a4*sin(a5*x1^n2)^n3+a6*x1^n4*cos(a7*x1^n5)^n6)^n7': p => {
		const { n1, n2, n3, n4, n5, n6, n7, a5, a7 } = p.references;

		if (
			!n1.isOne() ||
			!n2.isOne() ||
			!n3.isOne() ||
			!n4.isOne() ||
			!n5.isOne() ||
			!n6.isOne() ||
			!n7.isOne()
		) {
			return undefined;
		}

		if (!a5.eq(a7)) {
			return undefined;
		}

		return p.fromPattern(
			'(a1*(a4*a5^2+a6*((s-a3*log(a2))^2-a5^2)))/(((s-a3*log(a2))^2+a5^2)^2)'
		);
	},
	// e^(a t) sinh(b t)
	'a1*(a2)^(a3*x1^n1)*sinh(a4*x1^n2)^n3': p => {
		const { n1, n2, n3 } = p.references;

		if (!n1.isOne() || !n2.isOne() || !n3.isOne()) {
			return undefined;
		}

		return p.fromPattern('(a1*a4)/((s-a3*log(a2))^2-a4^2)');
	},

	// e^(a t) cosh(b t)
	'a1*(a2)^(a3*x1^n1)*cosh(a4*x1^n2)^n3': p => {
		const { n1, n2, n3 } = p.references;

		if (!n1.isOne() || !n2.isOne() || !n3.isOne()) {
			return undefined;
		}

		return p.fromPattern('(a1*(s-a3*log(a2)))/((s-a3*log(a2))^2-a4^2)');
	},

	// t*e^(a t) sinh(b t)
	'a1*(a2)^(a3*x1^n1)*x1^n2*sinh(a4*x1^n3)^n4': p => {
		const { n1, n2, n3, n4 } = p.references;

		if (!n1.isOne() || !n2.isOne() || !n3.isOne() || !n4.isOne()) {
			return undefined;
		}

		return p.fromPattern('(2*a1*a4*(s-a3*log(a2)))/(((s-a3*log(a2))^2-a4^2)^2)');
	},

	// t*e^(a t) cosh(b t)
	'a1*(a2)^(a3*x1^n1)*x1^n2*cosh(a4*x1^n3)^n4': p => {
		const { n1, n2, n3, n4 } = p.references;

		if (!n1.isOne() || !n2.isOne() || !n3.isOne() || !n4.isOne()) {
			return undefined;
		}

		return p.fromPattern('(a1*((s-a3*log(a2))^2+a4^2))/(((s-a3*log(a2))^2-a4^2)^2)');
	},
};

export const tableOfTransforms = new LookupTable();
tableOfTransforms.addEntries(laplaceTable);
