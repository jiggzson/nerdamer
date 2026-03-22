import { LookupTable, type TableEntries } from '../../core/classes/lookupTable/LookupTable';

const ilaplaceTable: TableEntries = {
	// L^-1{a1/s^n1} = a1*t^(n1-1)/gamma(n1)
	'a1/x1^n1': p => {
		const { n1 } = p.references;

		if (n1.isZero()) {
			return undefined;
		}
		if (n1.isNegative()) {
			return undefined;
		}

		return p.fromPattern('(a1*t^(n1-1))/gamma(n1)');
	},

	// Linear pole family:
	// L^-1{ a1 / (a2*s + a3)^n2 } =
	// a1 * t^(n2-1) * e^((-a3/a2)*t) / (a2^n2 * gamma(n2))
	//
	// Quadratic unshifted sine family:
	// L^-1{ a1 / (a2*s^2 + a3) } =
	// (a1/(a2^(1/2)*a3^(1/2))) * sin((a3^(1/2)*t)/(a2^(1/2)))
	'a1/((a2*x1^n1+a3)^n2)': p => {
		const { n1, n2 } = p.references;

		if (n1.isOne()) {
			return p.fromPattern('(a1*t^(n2-1)*e^((-a3/a2)*t))/(a2^n2*gamma(n2))');
		}

		if (n1.eq(2) && n2.isOne()) {
			return p.fromPattern('(a1*sin((a3^(1/2)*t)/(a2^(1/2))))/(a2^(1/2)*a3^(1/2))');
		}

		if (n1.eq(2) && n2.eq(2)) {
			return p
				.fromPattern('(a1*sin((a3^(1/2)*t)/(a2^(1/2))))/(2*a2^(1/2)*a3^(3/2))')
				.minus(p.fromPattern('(a1*t*cos((a3^(1/2)*t)/(a2^(1/2))))/(2*a2*a3)'));
		}
	},

	// Cosine family:
	// L^-1{ a1*s / (a2*s^2 + a3) } =
	// (a1/a2) * cos((a3^(1/2)*t)/(a2^(1/2)))
	//
	// t*sin family:
	// L^-1{ a1*s / (a2*s^2 + a3)^2 } =
	// (a1*t*sin((a3^(1/2)*t)/(a2^(1/2)))) / (2*a2^(3/2)*a3^(1/2))
	'(a1*x1^n1)/((a2*x1^n2+a3)^n3)': p => {
		const { n1, n2, n3 } = p.references;

		if (!n2.eq(2)) {
			return undefined;
		}

		if (n1.isOne()) {
			if (n3.isOne()) {
				return p.fromPattern('(a1*cos((a3^(1/2)*t)/(a2^(1/2))))/a2');
			}

			if (n3.eq(2)) {
				return p.fromPattern('(a1*t*sin((a3^(1/2)*t)/(a2^(1/2))))/(2*a2^(3/2)*a3^(1/2))');
			}
		}

		if (n1.eq(2) && n3.eq(2)) {
			return p
				.fromPattern('(a1*sin((a3^(1/2)*t)/(a2^(1/2))))/(2*a2^(1/2)*a3^(1/2))')
				.plus(p.fromPattern('(a1*t*cos((a3^(1/2)*t)/(a2^(1/2))))/(2*a2)'));
		}
	},
	// Shifted sine family:
	// L^-1{ a1 / (a2*(a3*s + a4)^2 + a5) } =
	// a1*e^((-a4/a3)*t)*sin((a5^(1/2)*t)/(a2^(1/2)*a3)) / (a2^(1/2)*a3*a5^(1/2))
	// 1 / (((s-b)^2 + c^2)^n) and 1 / (((s-b)^2 - c^2)^n)
	'a1/((a2*(a3*x1^n1+a4)^n2+a5)^n3)': p => {
		const { n1, n2, n3, a5 } = p.references;

		if (!n1.isOne() || !n2.eq(2)) {
			return undefined;
		}

		// Hyperbolic branch: a5 < 0
		if (a5.sign() < 0) {
			if (n3.isOne()) {
				return p.fromPattern(
					'(a1*e^((-a4/a3)*t)*sinh((((-a5)^(1/2))*t)/(a2^(1/2)*a3)))/(a2^(1/2)*a3*((-a5)^(1/2)))'
				);
			}

			if (n3.eq(2)) {
				return p.fromPattern(
					'(a1*e^((-a4/a3)*t)*((((-a5)^(1/2))*t*cosh((((-a5)^(1/2))*t)/(a2^(1/2)*a3)))/(a2^(1/2)*a3)-sinh((((-a5)^(1/2))*t)/(a2^(1/2)*a3))))/(2*a2^(1/2)*a3*((-a5)^(3/2)))'
				);
			}

			return undefined;
		}

		// Trig branch: a5 > 0
		if (n3.isOne()) {
			return p.fromPattern(
				'(a1*e^((-a4/a3)*t)*sin((a5^(1/2)*t)/(a2^(1/2)*a3)))/(a2^(1/2)*a3*a5^(1/2))'
			);
		}

		if (n3.eq(2)) {
			return p.fromPattern(
				'(a1*e^((-a4/a3)*t)*(sin((a5^(1/2)*t)/(a2^(1/2)*a3))-(a5^(1/2)*t*cos((a5^(1/2)*t)/(a2^(1/2)*a3)))/(a2^(1/2)*a3)))/(2*a2^(1/2)*a3*a5^(3/2))'
			);
		}

		return undefined;
	},

	// Shifted cosine family:
	// L^-1{ a1*(a3*s+a4) / (a2*(a3*s+a4)^2 + a5) } =
	// a1*e^((-a4/a3)*t)*cos((a5^(1/2)*t)/(a2^(1/2)*a3)) / (a2*a3)
	// (s-b) / (((s-b)^2 + c^2)^n) and (s-b) / (((s-b)^2 - c^2)^n)

	// (c*(s-a)) / ((b*(d*(s-a))^2 + e)^n)
	// (c*(s-a)) / ((b*(d*(s-a))^2 + e)^n)
	'(a1*((a6*x1^n4+a7)^n5))/((a2*(a3*x1^n1+a4)^n2+a5)^n3)': p => {
		const { n1, n2, n3, n4, n5, a3, a4, a5, a6, a7 } = p.references;

		if (!n1.isOne() || !n2.eq(2) || !n4.isOne() || !n5.isOne()) {
			return undefined;
		}

		// numerator affine term must be a scalar multiple of denominator affine term
		if (!a7.times(a3).eq(a4.times(a6))) {
			return undefined;
		}

		// Hyperbolic branch
		if (a5.sign() < 0) {
			if (n3.isOne()) {
				return p.fromPattern(
					'(a1*a6*e^((-a4/a3)*t)*cosh((((-a5)^(1/2))*t)/(a2^(1/2)*a3)))/(a2*a3^2)'
				);
			}

			if (n3.eq(2)) {
				return p.fromPattern(
					'(a1*a6*t*e^((-a4/a3)*t)*sinh((((-a5)^(1/2))*t)/(a2^(1/2)*a3)))/(2*a2^(3/2)*a3^3*((-a5)^(1/2)))'
				);
			}

			return undefined;
		}

		// Trigonometric branch
		if (n3.isOne()) {
			return p.fromPattern(
				'(a1*a6*e^((-a4/a3)*t)*cos((a5^(1/2)*t)/(a2^(1/2)*a3)))/(a2*a3^2)'
			);
		}

		if (n3.eq(2)) {
			return p.fromPattern(
				'(a1*a6*t*e^((-a4/a3)*t)*sin((a5^(1/2)*t)/(a2^(1/2)*a3)))/(2*a2^(3/2)*a3^3*a5^(1/2))'
			);
		}

		return undefined;
	},
	// ((c*(s-a))^2) / ((b*(d*(s-a))^2 + e)^2)
	'(a1*(a6*x1^n4+a7)^n5)/((a2*(a3*x1^n1+a4)^n2+a5)^n3)': p => {
		const { n1, n2, n3, n4, n5, a3, a4, a5, a6, a7 } = p.references;

		if (!n1.isOne() || !n2.eq(2) || !n3.eq(2) || !n4.isOne() || !n5.eq(2)) {
			return undefined;
		}

		// numerator affine term must be a scalar multiple of denominator affine term
		if (!a7.times(a3).eq(a4.times(a6))) {
			return undefined;
		}

		// Hyperbolic branch
		if (a5.sign() < 0) {
			return p.fromPattern(
				'(a1*a6^2*e^((-a4/a3)*t)*(sinh((((-a5)^(1/2))*t)/(a2^(1/2)*a3))+(((-a5)^(1/2))*t*cosh((((-a5)^(1/2))*t)/(a2^(1/2)*a3)))/(a2^(1/2)*a3)))/(2*a2^(3/2)*a3^3*((-a5)^(1/2)))'
			);
		}

		// Trigonometric branch
		return p.fromPattern(
			'(a1*a6^2*e^((-a4/a3)*t)*(sin((a5^(1/2)*t)/(a2^(1/2)*a3))+(a5^(1/2)*t*cos((a5^(1/2)*t)/(a2^(1/2)*a3)))/(a2^(1/2)*a3)))/(2*a2^(3/2)*a3^3*a5^(1/2))'
		);
	},
	// a / ((s-b)^2 - c^2)
	'a1/(a2*(a3*x1^n1+a4)^n2-a5)': p => {
		const { n1, n2 } = p.references;

		if (!n1.isOne() || !n2.eq(2)) {
			return undefined;
		}

		return p.fromPattern(
			'(a1*e^((-a4/a3)*t)*sinh((a5^(1/2)*t)/(a2^(1/2)*a3)))/(a2^(1/2)*a3*a5^(1/2))'
		);
	},

	// (s-b) / ((s-b)^2 - c^2)
	'(a1*(a6*x1^n3+a7)^n4)/(a2*(a3*x1^n1+a4)^n2-a5)': p => {
		const { n1, n2, n3, n4 } = p.references;

		if (!n1.isOne() || !n2.eq(2) || !n3.isOne() || !n4.isOne()) {
			return undefined;
		}

		return p.fromPattern('(a1*e^((-a4/a3)*t)*cosh((a5^(1/2)*t)/(a2^(1/2)*a3)))/(a2*a3^2)');
	},

	// a / (((s-b)^2 - c^2)^2)
	'a1/((a2*(a3*x1^n1+a4)^n2-a5)^n3)': p => {
		const { n1, n2, n3 } = p.references;

		if (!n1.isOne() || !n2.eq(2) || !n3.eq(2)) {
			return undefined;
		}

		return p.fromPattern(
			'(a1*e^((-a4/a3)*t)*(a5^(1/2)*t*cosh((a5^(1/2)*t)/(a2^(1/2)*a3))-a2^(1/2)*a3*sinh((a5^(1/2)*t)/(a2^(1/2)*a3))))/(2*a2*a3^2*a5^(3/2))'
		);
	},

	// (s-b) / (((s-b)^2 - c^2)^2)
	'(a1*(a6*x1^n3+a7)^n4)/((a2*(a3*x1^n1+a4)^n2-a5)^n5)': p => {
		const { n1, n2, n3, n4, n5 } = p.references;

		if (!n1.isOne() || !n2.eq(2) || !n3.isOne() || !n4.isOne() || !n5.eq(2)) {
			return undefined;
		}

		return p.fromPattern(
			'(a1*t*e^((-a4/a3)*t)*sinh((a5^(1/2)*t)/(a2^(1/2)*a3)))/(2*a2^(1/2)*a3*a5^(1/2))'
		);
	},
	// (A*(B*(s-a)^2+C)) / ((D*(s-a)^2+E)^2)
	'(a1*((a2*(a3*x1^n1+a4)^n2+a5)^n3))/((a6*(a7*x1^n4+a8)^n5+a9)^n6)': p => {
		const { n1, n2, n3, n4, n5, n6, _a2, a3, a4, _a6, a7, a8, _a9 } = p.references;

		if (!n1.isOne() || !n2.eq(2) || !n3.isOne() || !n4.isOne() || !n5.eq(2) || !n6.eq(2)) {
			return undefined;
		}

		if (!a3.eq(a7) || !a4.eq(a8)) {
			return undefined;
		}

		const v = p.get('x1').text();

		const expr1 = p.fromPattern('1/(a6*(a7*x1^n4+a8)^n5+a9)');
		const expr2 = p.fromPattern('1/((a6*(a7*x1^n4+a8)^n5+a9)^2)');

		const T1 = tableOfInverseTransforms.lookup(expr1, v, 0);
		const T2 = tableOfInverseTransforms.lookup(expr2, v, 0);

		if (!T1 || !T2) {
			return undefined;
		}

		return p
			.fromPattern('(a1*a2)/a6')
			.times(T1)
			.plus(p.fromPattern('a1*(a5-(a2*a9)/a6)').times(T2));
	},
};

export const tableOfInverseTransforms = new LookupTable();
tableOfInverseTransforms.addEntries(ilaplaceTable);
