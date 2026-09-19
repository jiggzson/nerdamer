import { Expression } from '../../core/classes/expression/Expression';
import { five, four, six, three, two, zero } from '../../core/classes/expression/shortcuts';
import { LookupTable, type TableEntries } from '../../core/classes/lookupTable/LookupTable';
import { Si, Ci, Ei } from '../../math/math';

import { integrate } from './integrate';

const trigTable: TableEntries = {
	// cos(x)
	'a1*cos(a2*x1^n1)^n2': (p, depth) => {
		if (p.get('n1').isOne()) {
			const n2 = p.get('n2');
			if (n2.isOne()) {
				return p.fromPattern('(a1*sin(a2*x1))/a2');
			} else if (n2.isEven()) {
				// Rewrite using double angle identity and expand
				const f = p.fromPattern('a1*((1+cos(2*a2*x1^n1))/2)^(n2/2)').expand();
				// Ship it
				return integrate(f, p.get('x1'), depth);
			} else {
				//Rewrite using double angle but break off one cos
				const f = p
					.fromPattern('a1*cos(a2*x1^n1)*((1+cos(2*a2*x1^n1))/2)^((n2-1)/2)')
					.expand();
				// Ship
				return integrate(f, p.get('x1'), depth);
			}
		}
	},
	// sin(x)
	'a1*sin(a2*x1^n1)^n2': (p, depth) => {
		if (p.get('n1').isOne()) {
			const n2 = p.get('n2');
			if (n2.isOne()) {
				return p.fromPattern('-((a1*cos(a2*x1))/a2)');
			} else if (n2.isEven()) {
				// Rewrite using double angle identity and expand
				const f = p.fromPattern('a1*((1-cos(2*a2*x1^n1))/2)^(n2/2)').expand();
				// Ship it
				return integrate(f, p.get('x1'), depth);
			} else {
				//Rewrite using double angle but break off one cos
				const f = p
					.fromPattern('a1*sin(a2*x1^n1)*((1-cos(2*a2*x1^n1))/2)^((n2-1)/2)')
					.expand();
				// Ship
				return integrate(f, p.get('x1'), depth);
			}
		}
	},
	// tan(x)
	'a1*tan(a2*x1^n1)^n2': (p, depth) => {
		if (p.get('n1').isOne()) {
			const n2 = p.get('n2');

			if (n2.isOne()) {
				return p.fromPattern('(a1*log(sec(a2*x1)))/a2');
			} else if (n2.isEven()) {
				// tan^n = tan^(n-2)*(sec^2-1)
				const f = p.fromPattern('a1*tan(a2*x1)^(n2-2)*(sec(a2*x1)^2-1)').expand();
				return integrate(f, p.get('x1'), depth);
			} else {
				// ∫tan^n = tan^(n-1)/(a2*(n-1)) - ∫tan^(n-2)
				const head = p.fromPattern('(a1*tan(a2*x1)^(n2-1))/(a2*(n2-1))');
				const tail = integrate(p.fromPattern('-a1*tan(a2*x1)^(n2-2)'), p.get('x1'), depth);
				return head.plus(tail);
			}
		}
	},
	// sec(x)
	'a1*sec(a2*x1^n1)^n2': (p, depth) => {
		if (p.get('n1').isOne()) {
			const n2 = p.get('n2');

			if (n2.isOne()) {
				return p.fromPattern('(a1*log(tan(a2*x1)+sec(a2*x1)))/a2');
			}

			// ∫sec^n = sec^(n-2)tan/(a2*(n-1)) + ((n-2)/(n-1))∫sec^(n-2)
			const head = p.fromPattern('(a1*sec(a2*x1)^(n2-2)*tan(a2*x1))/(a2*(n2-1))');
			const tail = integrate(
				p.fromPattern('a1*((n2-2)/(n2-1))*sec(a2*x1)^(n2-2)'),
				p.get('x1'),
				depth
			);
			return head.plus(tail);
		}
	},
	// csc(x)
	'a1*csc(a2*x1^n1)^n2': (p, depth) => {
		if (p.get('n1').isOne()) {
			const n2 = p.get('n2');

			if (n2.isOne()) {
				return p.fromPattern('-(a1*log(csc(a2*x1)+cot(a2*x1)))/a2');
			}

			// ∫csc^n = -csc^(n-2)cot/(a2*(n-1)) - ((n-2)/(n-1))∫csc^(n-2)
			const head = p.fromPattern('-(a1*csc(a2*x1)^(n2-2)*cot(a2*x1))/(a2*(n2-1))');
			const tail = integrate(
				p.fromPattern('-a1*((n2-2)/(n2-1))*csc(a2*x1)^(n2-2)'),
				p.get('x1'),
				depth
			);
			return head.plus(tail);
		}
	},
	// cot(x)
	'a1*cot(a2*x1^n1)^n2': (p, depth) => {
		if (p.get('n1').isOne()) {
			const n2 = p.get('n2');

			if (n2.isOne()) {
				return p.fromPattern('(a1*log(sin(a2*x1)))/a2');
			} else if (n2.isEven()) {
				// cot^n = cot^(n-2)*(csc^2-1)
				const f = p.fromPattern('a1*cot(a2*x1)^(n2-2)*(csc(a2*x1)^2-1)').expand();
				return integrate(f, p.get('x1'), depth);
			} else {
				// ∫cot^n = -cot^(n-1)/(a2*(n-1)) - ∫cot^(n-2)
				const head = p.fromPattern('-(a1*cot(a2*x1)^(n2-1))/(a2*(n2-1))');
				const tail = integrate(p.fromPattern('-a1*cot(a2*x1)^(n2-2)'), p.get('x1'), depth);
				return head.plus(tail);
			}
		}
	},
	// cos(a*x)*cos(b*x)
	'a1*cos(a2*x1^n1)^n2*cos(a3*x1^n3)^n4': (p, depth) => {
		if (p.get('n1').isOne() && p.get('n3').isOne()) {
			const n2 = p.get('n2');
			const n4 = p.get('n4');

			if (!n2.isOne()) {
				let f: Expression;
				if (n2.isEven()) {
					f = p.fromPattern('a1*((1+cos(2*a2*x1))/2)^(n2/2)*cos(a3*x1)^n4').expand();
				} else {
					f = p
						.fromPattern('a1*cos(a2*x1)*((1+cos(2*a2*x1))/2)^((n2-1)/2)*cos(a3*x1)^n4')
						.expand();
				}
				return integrate(f, p.get('x1'), depth);
			}

			if (!n4.isOne()) {
				let f: Expression;
				if (n4.isEven()) {
					f = p.fromPattern('a1*cos(a2*x1)^n2*((1+cos(2*a3*x1))/2)^(n4/2)').expand();
				} else {
					f = p
						.fromPattern('a1*cos(a2*x1)^n2*cos(a3*x1)*((1+cos(2*a3*x1))/2)^((n4-1)/2)')
						.expand();
				}
				return integrate(f, p.get('x1'), depth);
			}

			if (p.get('a2').eq(p.get('a3'))) {
				return p.fromPattern('(a1*x1)/2+(a1*sin(2*a2*x1))/(4*a2)');
			}

			return p.fromPattern('a1*(sin((a2+a3)*x1)/(2*(a2+a3))+sin((a2-a3)*x1)/(2*(a2-a3)))');
		}
	},
	// sin(a*x)*sin(b*x), with powers allowed
	'a1*sin(a2*x1^n1)^n2*sin(a3*x1^n3)^n4': (p, depth) => {
		if (p.get('n1').isOne() && p.get('n3').isOne()) {
			const n2 = p.get('n2');
			const n4 = p.get('n4');

			// Reduce left power first
			if (!n2.isOne()) {
				let f: Expression;
				if (n2.isEven()) {
					f = p.fromPattern('a1*((1-cos(2*a2*x1))/2)^(n2/2)*sin(a3*x1)^n4').expand();
				} else {
					f = p
						.fromPattern('a1*sin(a2*x1)*((1-cos(2*a2*x1))/2)^((n2-1)/2)*sin(a3*x1)^n4')
						.expand();
				}
				return integrate(f, p.get('x1'), depth);
			}

			// Reduce right power
			if (!n4.isOne()) {
				let f: Expression;
				if (n4.isEven()) {
					f = p.fromPattern('a1*sin(a2*x1)^n2*((1-cos(2*a3*x1))/2)^(n4/2)').expand();
				} else {
					f = p
						.fromPattern('a1*sin(a2*x1)^n2*sin(a3*x1)*((1-cos(2*a3*x1))/2)^((n4-1)/2)')
						.expand();
				}
				return integrate(f, p.get('x1'), depth);
			}

			// Same frequency: sin(a*x)*sin(a*x) = sin(a*x)^2
			if (p.get('a2').eq(p.get('a3'))) {
				return p.fromPattern('(a1*x1)/2-(a1*sin(2*a2*x1))/(4*a2)');
			}

			// Base product-to-sum case
			return p.fromPattern('a1*(sin((a2-a3)*x1)/(2*(a2-a3))-sin((a2+a3)*x1)/(2*(a2+a3)))');
		}
	},
	// sin(x)*cos(x)
	'a1*cos(a2*x1^n1)^n2*sin(a3*x1^n3)^n4': (p, depth) => {
		if (p.get('n1').isOne() && p.get('n3').isOne()) {
			const n2 = p.get('n2');
			const n4 = p.get('n4');

			// Reduce left power first
			if (!n2.isOne()) {
				let f: Expression;
				if (n2.isEven()) {
					f = p.fromPattern('a1*((1+cos(2*a2*x1))/2)^(n2/2)*sin(a3*x1)^n4').expand();
				} else {
					f = p
						.fromPattern('a1*cos(a2*x1)*((1+cos(2*a2*x1))/2)^((n2-1)/2)*sin(a3*x1)^n4')
						.expand();
				}
				return integrate(f, p.get('x1'), depth);
			}

			// Reduce right power
			if (!n4.isOne()) {
				let f: Expression;
				if (n4.isEven()) {
					f = p.fromPattern('a1*cos(a2*x1)^n2*((1-cos(2*a3*x1))/2)^(n4/2)').expand();
				} else {
					f = p
						.fromPattern('a1*cos(a2*x1)^n2*sin(a3*x1)*((1-cos(2*a3*x1))/2)^((n4-1)/2)')
						.expand();
				}
				return integrate(f, p.get('x1'), depth);
			}

			// Same frequency: cos(a*x)*sin(a*x)
			if (p.get('a2').eq(p.get('a3'))) {
				return p.fromPattern('-(a1*cos(2*a2*x1))/(4*a2)');
			}

			// Base product-to-sum case
			return p.fromPattern('a1*(-cos((a2+a3)*x1)/(2*(a2+a3))+cos((a2-a3)*x1)/(2*(a2-a3)))');
		}
	},
	// sec(x)*tan(x)
	'a1*sec(a2*x1^n1)^n2*tan(a3*x1^n3)^n4': p => {
		if (
			p.get('n1').isOne() &&
			p.get('n3').isOne() &&
			p.get('n2').isOne() &&
			p.get('n4').isOne() &&
			p.get('a2').eq(p.get('a3'))
		) {
			return p.fromPattern('(a1*sec(a2*x1))/a2');
		}
	},
	// csc(x)*cot(x)
	'a1*cot(a2*x1^n1)^n2*csc(a3*x1^n3)^n4': p => {
		if (
			p.get('n1').isOne() &&
			p.get('n3').isOne() &&
			p.get('n2').isOne() &&
			p.get('n4').isOne() &&
			p.get('a2').eq(p.get('a3'))
		) {
			return p.fromPattern('-(a1*csc(a2*x1))/a2');
		}
	},
	// 1/cos = sec
	'a1/(cos(a2*x1^n1)^n2)': p => {
		if (p.get('n1').isOne() && p.get('n2').isOne()) {
			return p.fromPattern('(a1*log(tan(a2*x1)+sec(a2*x1)))/a2');
		}
	},

	// 1/sin = csc
	'a1/(sin(a2*x1^n1)^n2)': p => {
		if (p.get('n1').isOne() && p.get('n2').isOne()) {
			return p.fromPattern('-(a1*log(csc(a2*x1)+cot(a2*x1)))/a2');
		}
	},

	// 1/tan = cot
	'a1/(tan(a2*x1^n1)^n2)': p => {
		if (p.get('n1').isOne() && p.get('n2').isOne()) {
			return p.fromPattern('(a1*log(sin(a2*x1)))/a2');
		}
	},

	// 1/sec = cos
	'a1/(sec(a2*x1^n1)^n2)': p => {
		if (p.get('n1').isOne() && p.get('n2').isOne()) {
			return p.fromPattern('(a1*sin(a2*x1))/a2');
		}
	},

	// 1/csc = sin
	'a1/(csc(a2*x1^n1)^n2)': p => {
		if (p.get('n1').isOne() && p.get('n2').isOne()) {
			return p.fromPattern('-((a1*cos(a2*x1))/a2)');
		}
	},

	// 1/cot = tan
	'a1/(cot(a2*x1^n1)^n2)': p => {
		if (p.get('n1').isOne() && p.get('n2').isOne()) {
			return p.fromPattern('(a1*log(sec(a2*x1)))/a2');
		}
	},

	// ---- Composite trig: f(a*(b*x + c)) ----

	// sin(a*(bx+c))
	'a1*sin(a2*(a3*x1^n1+a4)^n2)^n3': p => {
		if (p.get('n1').isOne() && p.get('n2').isOne() && p.get('n3').isOne()) {
			return p.fromPattern('-((a1*cos(a2*(a3*x1+a4)))/(a2*a3))');
		}
	},

	// cos(a*(bx+c))
	'a1*cos(a2*(a3*x1^n1+a4)^n2)^n3': p => {
		if (p.get('n1').isOne() && p.get('n2').isOne() && p.get('n3').isOne()) {
			return p.fromPattern('(a1*sin(a2*(a3*x1+a4)))/(a2*a3)');
		}
	},

	// tan(a*(bx+c))
	'a1*tan(a2*(a3*x1^n1+a4)^n2)^n3': p => {
		if (p.get('n1').isOne() && p.get('n2').isOne() && p.get('n3').isOne()) {
			return p.fromPattern('(a1*log(sec(a2*(a3*x1+a4))))/(a2*a3)');
		}
	},

	// sec(a*(bx+c))
	'a1*sec(a2*(a3*x1^n1+a4)^n2)^n3': p => {
		if (p.get('n1').isOne() && p.get('n2').isOne() && p.get('n3').isOne()) {
			return p.fromPattern('(a1*log(tan(a2*(a3*x1+a4))+sec(a2*(a3*x1+a4))))/(a2*a3)');
		}
	},

	// csc(a*(bx+c))
	'a1*csc(a2*(a3*x1^n1+a4)^n2)^n3': p => {
		if (p.get('n1').isOne() && p.get('n2').isOne() && p.get('n3').isOne()) {
			return p.fromPattern('-(a1*log(csc(a2*(a3*x1+a4))+cot(a2*(a3*x1+a4))))/(a2*a3)');
		}
	},

	// cot(a*(bx+c))
	'a1*cot(a2*(a3*x1^n1+a4)^n2)^n3': p => {
		if (p.get('n1').isOne() && p.get('n2').isOne() && p.get('n3').isOne()) {
			return p.fromPattern('(a1*log(sin(a2*(a3*x1+a4))))/(a2*a3)');
		}
	},
};

const invTrigTable: TableEntries = {
	// acos(x)
	'a1*acos(a2*x1^n1)^n2': p => {
		if (p.get('n1').isOne()) {
			if (p.get('n2').isOne()) {
				return p.fromPattern('(a1*(a2*x1*acos(a2*x1)-sqrt(1-a2^2*x1^2)))/a2');
			}
		}
	},
	// asin(x)
	'a1*asin(a2*x1^n1)^n2': p => {
		if (p.get('n1').isOne()) {
			if (p.get('n2').isOne()) {
				return p.fromPattern('(a1*(a2*x1*asin(a2*x1)+sqrt(1-a2^2*x1^2)))/a2');
			}
		}
	},
	// atan(x)
	'a1*atan(a2*x1^n1)^n2': p => {
		if (p.get('n1').isOne()) {
			if (p.get('n2').isOne()) {
				return p.fromPattern('(a1*(a2*x1*atan(a2*x1)-log(a2^2*x1^2+1)/2))/a2');
			}
		}
	},
	// asec(x)
	'a1*asec(a2*x1^n1)^n2': p => {
		if (p.get('n1').isOne()) {
			if (p.get('n2').isOne()) {
				return p.fromPattern(
					'(a1*(a2*x1*asec(a2*x1)-log(sqrt(1-1/(a2^2*x1^2))+1)/2+log(1-sqrt(1-1/(a2^2*x1^2)))/2))/a2'
				);
			}
		}
	},
	// acsc(x)
	'a1*acsc(a2*x1^n1)^n2': p => {
		if (p.get('n1').isOne()) {
			if (p.get('n2').isOne()) {
				return p.fromPattern(
					'(a1*(a2*x1*acsc(a2*x1)+log(sqrt(1-1/(a2^2*x1^2))+1)/2-log(1-sqrt(1-1/(a2^2*x1^2)))/2))/a2'
				);
			}
		}
	},
	// acot(x)
	'a1*acot(a2*x1^n1)^n2': p => {
		if (p.get('n1').isOne()) {
			if (p.get('n2').isOne()) {
				return p.fromPattern('(a1*(log(a2^2*x1^2+1)/2+a2*x1*acot(a2*x1)))/a2');
			}
		}
	},
};

const hyperbolicTrigTable: TableEntries = {
	// cosh(x)
	'a1*cosh(a2*x1^n1)^n2': p => {
		if (p.get('n1').isOne()) {
			if (p.get('n2').isOne()) {
				return p.fromPattern('(a1*sinh(a2*x1))/a2');
			}
		}
	},
	// sinh(x)
	'a1*sinh(a2*x1^n1)^n2': p => {
		if (p.get('n1').isOne()) {
			if (p.get('n2').isOne()) {
				return p.fromPattern('(a1*cosh(a2*x1))/a2');
			}
		}
	},
	// tanh(x)
	'a1*tanh(a2*x1^n1)^n2': p => {
		if (p.get('n1').isOne()) {
			if (p.get('n2').isOne()) {
				return p.fromPattern('(a1*log(cosh(a2*x1)))/a2');
			}
		}
	},
	// sech(x) and sech(x)^2
	'a1*sech(a2*x1^n1)^n2': p => {
		if (p.get('n1').isOne()) {
			if (p.get('n2').isOne()) {
				return p.fromPattern('(a1*atan(sinh(a2*x1)))/a2');
			} else if (p.get('n2').eq(2)) {
				return p.fromPattern('(a1*tanh(a2*x1))/a2');
			}
		}
	},
	// csch(x) and csch(x)^2
	'a1*csch(a2*x1^n1)^n2': p => {
		if (p.get('n1').isOne()) {
			if (p.get('n2').isOne()) {
				return p.fromPattern('(a1*log(tanh((a2*x1)/2)))/a2');
			} else if (p.get('n2').eq(2)) {
				return p.fromPattern('-(a1*coth(a2*x1))/a2');
			}
		}
	},
	// coth(x)
	'a1*coth(a2*x1^n1)^n2': p => {
		if (p.get('n1').isOne()) {
			if (p.get('n2').isOne()) {
				return p.fromPattern('(a1*log(sinh(a2*x1)))/a2');
			}
		}
	},

	// sinh(u)
	'a1*sinh(a2*(a3*x1^n1+a4)^n2)^n3': p => {
		if (p.get('n1').isOne() && p.get('n2').isOne() && p.get('n3').isOne()) {
			return p.fromPattern('(a1*cosh(a2*(a3*x1+a4)))/(a2*a3)');
		}
	},

	// cosh(u)
	'a1*cosh(a2*(a3*x1^n1+a4)^n2)^n3': p => {
		if (p.get('n1').isOne() && p.get('n2').isOne() && p.get('n3').isOne()) {
			return p.fromPattern('(a1*sinh(a2*(a3*x1+a4)))/(a2*a3)');
		}
	},

	// tanh(u)
	'a1*tanh(a2*(a3*x1^n1+a4)^n2)^n3': p => {
		if (p.get('n1').isOne() && p.get('n2').isOne() && p.get('n3').isOne()) {
			return p.fromPattern('(a1*log(cosh(a2*(a3*x1+a4))))/(a2*a3)');
		}
	},

	// coth(u)
	'a1*coth(a2*(a3*x1^n1+a4)^n2)^n3': p => {
		if (p.get('n1').isOne() && p.get('n2').isOne() && p.get('n3').isOne()) {
			return p.fromPattern('(a1*log(sinh(a2*(a3*x1+a4))))/(a2*a3)');
		}
	},

	// sech(u) and sech(u)^2
	'a1*sech(a2*(a3*x1^n1+a4)^n2)^n3': p => {
		if (p.get('n1').isOne() && p.get('n2').isOne()) {
			if (p.get('n3').isOne()) {
				return p.fromPattern('(a1*atan(sinh(a2*(a3*x1+a4))))/(a2*a3)');
			} else if (p.get('n3').eq(2)) {
				return p.fromPattern('(a1*tanh(a2*(a3*x1+a4)))/(a2*a3)');
			}
		}
	},

	// csch(u) and csch(u)^2
	'a1*csch(a2*(a3*x1^n1+a4)^n2)^n3': p => {
		if (p.get('n1').isOne() && p.get('n2').isOne()) {
			if (p.get('n3').isOne()) {
				return p.fromPattern('(a1*log(tanh((a2*(a3*x1+a4))/2)))/(a2*a3)');
			} else if (p.get('n3').eq(2)) {
				return p.fromPattern('-(a1*coth(a2*(a3*x1+a4)))/(a2*a3)');
			}
		}
	},

	// sech(u)*tanh(u)
	'a1*sech(a2*(a3*x1^n1+a4)^n2)^n3*tanh(a5*(a6*x1^n4+a7)^n5)^n6': p => {
		if (
			p.get('n1').isOne() &&
			p.get('n2').isOne() &&
			p.get('n3').isOne() &&
			p.get('n4').isOne() &&
			p.get('n5').isOne() &&
			p.get('n6').isOne() &&
			p.get('a2').eq(p.get('a5')) &&
			p.get('a3').eq(p.get('a6')) &&
			p.get('a4').eq(p.get('a7'))
		) {
			return p.fromPattern('-(a1*sech(a2*(a3*x1+a4)))/(a2*a3)');
		}
	},

	// csch(u)*coth(u)
	'a1*coth(a2*(a3*x1^n1+a4)^n2)^n3*csch(a5*(a6*x1^n4+a7)^n5)^n6': p => {
		if (
			p.get('n1').isOne() &&
			p.get('n2').isOne() &&
			p.get('n3').isOne() &&
			p.get('n4').isOne() &&
			p.get('n5').isOne() &&
			p.get('n6').isOne() &&
			p.get('a2').eq(p.get('a5')) &&
			p.get('a3').eq(p.get('a6')) &&
			p.get('a4').eq(p.get('a7'))
		) {
			return p.fromPattern('-(a1*csch(a2*(a3*x1+a4)))/(a2*a3)');
		}
	},

	// cosh(u)^n * sinh(u)^m
	'a1*cosh(a2*x1^n1)^n2*sinh(a3*x1^n3)^n4': (p, depth) => {
		if (p.get('n1').isOne() && p.get('n3').isOne() && p.get('a2').eq(p.get('a3'))) {
			const n2 = p.get('n2');
			const n4 = p.get('n4');

			if (n4.isOne()) {
				return p.fromPattern('(a1*cosh(a2*x1)^(n2+1))/(a2*(n2+1))');
			}

			if (n2.isOne()) {
				return p.fromPattern('(a1*sinh(a2*x1)^(n4+1))/(a2*(n4+1))');
			}

			if (n4.isOdd()) {
				const f = p
					.fromPattern('a1*cosh(a2*x1)^n2*(cosh(a2*x1)^2-1)^((n4-1)/2)*sinh(a2*x1)')
					.expand();
				return integrate(f, p.get('x1'), depth);
			}

			if (n2.isOdd()) {
				const f = p
					.fromPattern('a1*(1+sinh(a2*x1)^2)^((n2-1)/2)*sinh(a2*x1)^n4*cosh(a2*x1)')
					.expand();
				return integrate(f, p.get('x1'), depth);
			}
		}
	},

	// sech(u)^n * tanh(u)^m
	'a1*sech(a2*x1^n1)^n2*tanh(a3*x1^n3)^n4': (p, depth) => {
		if (p.get('n1').isOne() && p.get('n3').isOne() && p.get('a2').eq(p.get('a3'))) {
			const n2 = p.get('n2');
			const n4 = p.get('n4');

			if (n4.isOne()) {
				return p.fromPattern('-(a1*sech(a2*x1)^n2)/(a2*n2)');
			}

			if (n2.eq(2)) {
				return p.fromPattern('(a1*tanh(a2*x1)^(n4+1))/(a2*(n4+1))');
			}

			if (n4.isOdd()) {
				const f = p
					.fromPattern('a1*sech(a2*x1)^n2*(1-sech(a2*x1)^2)^((n4-1)/2)*tanh(a2*x1)')
					.expand();
				return integrate(f, p.get('x1'), depth);
			}

			if (n2.isEven()) {
				const f = p
					.fromPattern('a1*(1-tanh(a2*x1)^2)^((n2-2)/2)*sech(a2*x1)^2*tanh(a2*x1)^n4')
					.expand();
				return integrate(f, p.get('x1'), depth);
			}
		}
	},

	// coth(u)^n * csch(u)^m
	'a1*coth(a2*x1^n1)^n2*csch(a3*x1^n3)^n4': (p, depth) => {
		if (p.get('n1').isOne() && p.get('n3').isOne() && p.get('a2').eq(p.get('a3'))) {
			const n2 = p.get('n2');
			const n4 = p.get('n4');

			if (n2.isOne()) {
				return p.fromPattern('-(a1*csch(a2*x1)^n4)/(a2*n4)');
			}

			if (n4.eq(2)) {
				return p.fromPattern('-(a1*coth(a2*x1)^(n2+1))/(a2*(n2+1))');
			}

			if (n2.isOdd()) {
				const f = p
					.fromPattern('a1*(1+csch(a2*x1)^2)^((n2-1)/2)*csch(a2*x1)^n4*coth(a2*x1)')
					.expand();
				return integrate(f, p.get('x1'), depth);
			}

			if (n4.isEven()) {
				const f = p
					.fromPattern('a1*coth(a2*x1)^n2*(coth(a2*x1)^2-1)^((n4-2)/2)*csch(a2*x1)^2')
					.expand();
				return integrate(f, p.get('x1'), depth);
			}
		}
	},
};

const invHyperbolicTrigTable: TableEntries = {
	// acosh(x)
	'a1*acosh(a2*x1^n1)^n2': p => {
		if (p.get('n1').isOne()) {
			if (p.get('n2').isOne()) {
				return p.fromPattern('(a1*(a2*x1*acosh(a2*x1)-sqrt(a2^2*x1^2-1)))/a2');
			}
		}
	},
	// asinh(x)
	'a1*asinh(a2*x1^n1)^n2': p => {
		if (p.get('n1').isOne()) {
			if (p.get('n2').isOne()) {
				return p.fromPattern('(a1*(a2*x1*asinh(a2*x1)-sqrt(a2^2*x1^2+1)))/a2');
			}
		}
	},
	// atanh(x)
	'a1*atanh(a2*x1^n1)^n2': p => {
		if (p.get('n1').isOne()) {
			if (p.get('n2').isOne()) {
				return p.fromPattern('(a1*(log(1-a2^2*x1^2)/2+a2*x1*atanh(a2*x1)))/a2');
			}
		}
	},
	// asech(x)
	'a1*asech(a2*x1^n1)^n2': p => {
		if (p.get('n1').isOne()) {
			if (p.get('n2').isOne()) {
				return p.fromPattern('(a1*(a2*x1*asech(a2*x1)-atan(sqrt(1/(a2^2*x1^2)-1))))/a2');
			}
		}
	},
	// acsch(x)
	'a1*acsch(a2*x1^n1)^n2': p => {
		if (p.get('n1').isOne()) {
			if (p.get('n2').isOne()) {
				return p.fromPattern(
					'(a1*(a2*x1*acsch(a2*x1)+log(sqrt(1/(a2^2*x1^2)+1)+1)/2-log(sqrt(1/(a2^2*x1^2)+1)-1)/2))/a2'
				);
			}
		}
	},
	// acoth(x)
	'a1*acoth(a2*x1^n1)^n2': p => {
		if (p.get('n1').isOne()) {
			if (p.get('n2').isOne()) {
				return p.fromPattern('(a1*(log(1-a2^2*x1^2)/2+a2*x1*acoth(a2*x1)))/a2');
			}
		}
	},
};

const powerLogTable: TableEntries = {
	// log(x)
	'a1*log(a2*x1^n1)^n2': p => {
		if (p.get('n1').isOne()) {
			if (p.get('n2').isOne()) {
				return p.fromPattern('(a1*(a2*x1*log(a2*x1)-a2*x1))/a2');
			}
		}
	},
	// log(x)/x
	'(a1*log(a2*x1^n2)^n3)/x1^n1': p => {
		if (p.get('n2').isOne()) {
			if (p.get('n3').isOne()) {
				if (p.get('n1').isOne()) {
					return p.fromPattern('a1*log(x1)*log(a2*x1)-(a1*log(x1)^2)/2');
				} else {
					return p.fromPattern(
						'(a1*x1^(1-n1)*log(a2*x1))/(1-n1)-(a1*x1^(1-n1))/(1-n1)^2'
					);
				}
			}
		}
	},
	// log(x)*x
	'a1*x1^n1*log(a2*x1^n2)^n3': p => {
		if (p.get('n2').isOne()) {
			if (p.get('n3').isOne()) {
				return p.fromPattern('(a1*x1^(n1+1)*log(a2*x1))/(n1+1)-(a1*x1^(n1+1))/(n1+1)^2');
			}
		}
	},
	// x^2
	'a1*x1^n1': p => {
		return p.fromPattern('(a1*x1^(n1+1))/(n1+1)');
	},
	// 1/x
	'a1/x1^n1': p => {
		if (p.get('n1').isOne()) {
			return p.fromPattern(`a1*log(x1)`);
		} else {
			return p.fromPattern('(a1*x1^(-n1+1))/(-n1+1)');
		}
	},
	// (a*x+b)^n
	'a1*(a2*x1^n1+a3)^n2': p => {
		if (p.get('n1').isOne()) {
			return p.fromPattern(`(a1*(a2*x1+a3)^(n2+1))/(a2*(n2+1))`);
		}
	},
	// 1/(a*x+b)^n
	// 1/(a*x+b)^n
	'a1/((a2*x1^n1+a3)^n2)': p => {
		if (p.get('n1').isOne()) {
			if (p.get('n2').isOne()) {
				return p.fromPattern('(a1*log(a2*x1+a3))/a2');
			} else {
				return p.fromPattern('(a1*(a2*x1+a3)^(-n2+1))/(a2*(-n2+1))');
			}
		}
	},
	// 1/(a*x^n+b)^m
	'a1*log(a2*(a3*x1^n1+a4)^n2)^n3': p => {
		// We can eliminate certain options from the beginning as they'll never be handled by lookup
		// All cases assume a linear sum with m=1. For m>1 we'll use IBP.
		if (p.get('n3').isOne()) {
			// Assume a linear sum
			if (p.get('n2').isOne()) {
				const n1 = p.get('n1');
				// Deal with 1/(a*x+b)
				if (n1.isOne()) {
					return p.fromPattern(
						`(a1*(a2*(a3*x1+a4)*log(a2*(a3*x1+a4))-a2*(a3*x1+a4)))/(a2*a3)`
					);
				} else {
					const s = p.get('a3').times(p.get('a4'));
					if (s.lt(zero())) {
						if (n1.eq(two())) {
							return p.fromPattern(
								'a1*(x1*log(a2*(a3*x1^2+a4))-2*a3*(x1/a3-(a4*log((2*a3*x1-2*sqrt(-(a3*a4)))/(2*a3*x1+2*sqrt(-(a3*a4)))))/(2*a3*sqrt(-(a3*a4)))))'
							);
						} else if (n1.eq(three())) {
							return p.fromPattern(
								`a1*(x1*log(a2*(a3*x1^3+a4))-3*a3*((${Expression.Img()}*a4^(1/3)*log((2*a3^(2/3)*x1-sqrt(3)*${Expression.Img()}*` +
									`a3^(1/3)*a4^(1/3)-a3^(1/3)*a4^(1/3))/(2*a3^(2/3)*x1+sqrt(3)*${Expression.Img()}*a3^(1/3)*a4^(1/3)-a3^(1/3)*a4^(1/3))))/(2*sqrt(3)*a3^(4/3))` +
									`+(a4^(1/3)*log(a3^(2/3)*x1^2-a3^(1/3)*a4^(1/3)*x1+a4^(2/3)))/(6*a3^(4/3))-(a4^(1/3)*log((a3^(1/3)*x1+a4^(1/3))/a3^(1/3)))/(3*a3^(4/3))+x1/a3))`
							);
						}
					} else {
						if (n1.eq(two())) {
							return p.fromPattern(
								'a1*(x1*log(a2*(a3*x1^2+a4))-2*a3*(x1/a3-(a4*atan((a3*x1)/sqrt(a3*a4)))/(a3*sqrt(a3*a4))))'
							);
						} else if (n1.eq(three())) {
							return p.fromPattern(
								`a1*(x1*log(a2*(a3*x1^3+a4))-3*a3*((${Expression.Img()}*a4^(1/3)*log((2*a3^(2/3)*x1-sqrt(3)*${Expression.Img()}*` +
									`a3^(1/3)*a4^(1/3)-a3^(1/3)*a4^(1/3))/(2*a3^(2/3)*x1+sqrt(3)*${Expression.Img()}*a3^(1/3)*a4^(1/3)-a3^(1/3)*a4^(1/3))))/(2*sqrt(3)*a3^(4/3))` +
									`+(a4^(1/3)*log(a3^(2/3)*x1^2-a3^(1/3)*a4^(1/3)*x1+a4^(2/3)))/(6*a3^(4/3))-(a4^(1/3)*log((a3^(1/3)*x1+a4^(1/3))/a3^(1/3)))/(3*a3^(4/3))+x1/a3))`
							);
						}
					}
				}
			}
		}
	},
};

const exponentialTable: TableEntries = {
	// e^x, 2^x, ...
	'a1*(a2)^(a3*x1^n1)': p => {
		if (p.get('n1').isOne()) {
			return p.fromPattern('(a1*a2^(a3*x1))/(log(a2)*a3)');
		}
	},

	// e^(a*(bx+c)), 2^(a*(bx+c)), ...
	'a1*(a2)^(a3*(a4*x1^n1+a5)^n2)': p => {
		if (p.get('n1').isOne() && p.get('n2').isOne()) {
			return p.fromPattern('(a1*a2^(a3*(a4*x1+a5)))/(log(a2)*a3*a4)');
		}
	},
};

const knownProductsTable: TableEntries = {
	// e^x*cos(x)
	'a1*(a2)^(a3*x1^n1)*cos(a4*x1^n2)^n3': p => {
		if (p.get('n1').isOne()) {
			if (p.get('n2').isOne()) {
				if (p.get('n3').isOne()) {
					return p.fromPattern(
						'(a1*(e^(log(a2)*a3*x1)*a4*sin(a4*x1)+e^(log(a2)*a3*x1)*log(a2)*a3*cos(a4*x1)))/(a4^2+log(a2)^2*a3^2)'
					);
				}
			}
		}
	},
	// e^x*sin(x)
	'a1*(a2)^(a3*x1^n1)*sin(a4*x1^n2)^n3': p => {
		if (p.get('n1').isOne()) {
			if (p.get('n2').isOne()) {
				if (p.get('n3').isOne()) {
					return p.fromPattern(
						'(a1*(e^(log(a2)*a3*x1)*log(a2)*a3*sin(a4*x1)-e^(log(a2)*a3*x1)*a4*cos(a4*x1)))/(a4^2+log(a2)^2*a3^2)'
					);
				}
			}
		}
	},
	// e^x*cosh(x)
	'a1*(a2)^(a3*x1^n1)*cosh(a4*x1^n2)^n3': p => {
		if (p.get('n1').isOne()) {
			if (p.get('n2').isOne()) {
				if (p.get('n3').isOne()) {
					return p.fromPattern(
						'(a1*(x1-e^(-((-((log(a2)*a3)/a4)-1)*a4*x1))/((-((log(a2)*a3)/a4)-1)*a4)))/2'
					);
				}
			}
		}
	},
	// e^x*sinh(x)
	'a1*(a2)^(a3*x1^n1)*sinh(a4*x1^n2)^n3': p => {
		if (p.get('n1').isOne()) {
			if (p.get('n2').isOne()) {
				if (p.get('n3').isOne()) {
					return p.fromPattern(
						'(a1*(-x1-e^(-((-((log(a2)*a3)/a4)-1)*a4*x1))/((-((log(a2)*a3)/a4)-1)*a4)))/2'
					);
				}
			}
		}
	},
	// e^x*x
	'a1*(a2)^(a3*x1^n1)*x1^n2': p => {
		if (p.get('n1').isOne()) {
			const n2 = p.get('n2');
			if (n2.isOne()) {
				return p.fromPattern('(e^(log(a2)*a3*x1)*a1*(log(a2)*a3*x1-1))/(log(a2)^2*a3^2)');
			} else if (n2.eq(two())) {
				return p.fromPattern(
					'(e^(log(a2)*a3*x1)*a1*(log(a2)^2*a3^2*x1^2-2*log(a2)*a3*x1+2))/(log(a2)^3*a3^3)'
				);
			} else if (n2.eq(three())) {
				return p.fromPattern(
					'(e^(log(a2)*a3*x1)*a1*(log(a2)^3*a3^3*x1^3-3*log(a2)^2*a3^2*x1^2+6*log(a2)*a3*x1-6))/(log(a2)^4*a3^4)'
				);
			} else if (n2.eq(four())) {
				return p.fromPattern(
					'(e^(log(a2)*a3*x1)*a1*(log(a2)^4*a3^4*x1^4-4*log(a2)^3*a3^3*x1^3+12*log(a2)^2*a3^2*x1^2-24*log(a2)*a3*x1+24))/(log(a2)^5*a3^5)'
				);
			} else if (n2.eq(five())) {
				return p.fromPattern(
					'(e^(log(a2)*a3*x1)*a1*(log(a2)^5*a3^5*x1^5-5*log(a2)^4*a3^4*x1^4+20*log(a2)^3*a3^3*x1^3-' +
						'60*log(a2)^2*a3^2*x1^2+120*log(a2)*a3*x1-120))/(log(a2)^6*a3^6)'
				);
			} else if (n2.eq(six())) {
				return p.fromPattern(
					'(e^(log(a2)*a3*x1)*a1*(log(a2)^6*a3^6*x1^6-6*log(a2)^5*a3^5*x1^5+30*log(a2)^4*a3^4*x1^4-' +
						'120*log(a2)^3*a3^3*x1^3+360*log(a2)^2*a3^2*x1^2-720*log(a2)*a3*x1+720))/(log(a2)^7*a3^7)'
				);
			}
			// Switch to IBP after this
		}
	},
};

/**
 * Special function integrals.
 *
 * These handle integrands of the form f(x)/x that arise as IBP remainders
 * when integrating log(x)·g(x). They map directly to the standard special
 * functions: sine integral Si, cosine integral Ci, and exponential integral Ei.
 *
 * Patterns are matched after constant stripping, so the multiplier a1
 * captures any leading coefficient.
 */
const specialFunctionTable: TableEntries = {
	// ∫ sin(a*x)/x dx = Si(a*x)
	'(a1*sin(a2*x1^n2)^n3)/x1^n1': p => {
		if (p.get('n1').isOne() && p.get('n2').isOne() && p.get('n3').isOne()) {
			return Si(p.fromPattern('a2*x1')).times(p.get('a1'));
		}
	},

	// ∫ cos(a*x)/x dx = Ci(a*x)
	'(a1*cos(a2*x1^n2)^n3)/x1^n1': p => {
		if (p.get('n1').isOne() && p.get('n2').isOne() && p.get('n3').isOne()) {
			return Ci(p.fromPattern('a2*x1')).times(p.get('a1'));
		}
	},

	// ∫ e^(a*x)/x dx = Ei(a*x)  (generalized: a2^(a3*x)/x = Ei(log(a2)*a3*x))
	'(a1*(a2)^(a3*x1^n1))/x1^n2': p => {
		if (p.get('n1').isOne() && p.get('n2').isOne()) {
			return Ei(p.fromPattern('log(a2)*a3*x1')).times(p.get('a1'));
		}
	},
};

const knownIntegralsTable: TableEntries = {
	// sqrt(a-b*x^2)
	'a1*(-a2*x1^n1+a3)^n2': p => {
		if (p.get('n1').eq(2) && p.get('n2').isHalf()) {
			return p.fromPattern(
				'(a1*x1*(-a2*x1^2+a3)^(1/2))/2+(a1*a3*asin((a2^(1/2)*x1)/(a3^(1/2))))/(2*a2^(1/2))'
			);
		}
	},

	// diff(atanh(x)) and diff(asin(x))
	'a1/((-a2*x1^n1+a3)^n2)': p => {
		if (p.get('n1').eq(2) && p.get('n2').isOne()) {
			return p.fromPattern('(a1/(a2^(1/2)*a3^(1/2)))*atanh((a2^(1/2)*x1)/(a3^(1/2)))');
		} else if (p.get('n1').eq(2) && p.get('n2').isHalf()) {
			return p.fromPattern('(a1/a2^(1/2))*asin((a2^(1/2)*x1)/(a3^(1/2)))');
		}
	},

	// diff(acos(x))
	'-a1/((-a2*x1^n1+a3)^n2)': p => {
		if (p.get('n1').eq(2) && p.get('n2').isHalf()) {
			return p.fromPattern('(a1/a2^(1/2))*acos((a2^(1/2)*x1)/(a3^(1/2)))');
		}
	},

	// diff(atan(x)) and diff(asinh(x))
	'a1/((a2*x1^n1+a3)^n2)': p => {
		if (p.get('n1').eq(2) && p.get('n2').isOne()) {
			return p.fromPattern('(a1/(a2^(1/2)*a3^(1/2)))*atan((a2^(1/2)*x1)/(a3^(1/2)))');
		} else if (p.get('n1').eq(2) && p.get('n2').isHalf()) {
			return p.fromPattern('(a1/a2^(1/2))*asinh((a2^(1/2)*x1)/(a3^(1/2)))');
		}
	},

	// diff(acot(x))
	'-a1/((a2*x1^n1+a3)^n2)': p => {
		if (p.get('n1').eq(2) && p.get('n2').isOne()) {
			return p.fromPattern('(a1/(a2^(1/2)*a3^(1/2)))*acot((a2^(1/2)*x1)/(a3^(1/2)))');
		}
	},

	// diff(asec(x))
	'a1/(x1^n1*(-a2/x1^n2+a3)^n3)': p => {
		if (p.get('n1').isOne() && p.get('n2').eq(2) && p.get('n3').isHalf()) {
			return p.fromPattern('(a1/a3^(1/2))*asec((a3^(1/2)*x1)/(a2^(1/2)))');
		}
	},

	// diff(acsc(x))
	'-a1/(x1^n1*(-a2/x1^n2+a3)^n3)': p => {
		if (p.get('n1').isOne() && p.get('n2').eq(2) && p.get('n3').isHalf()) {
			return p.fromPattern('(a1/a3^(1/2))*acsc((a3^(1/2)*x1)/(a2^(1/2)))');
		}
	},

	// diff(acsch(x))
	// -1/(x*sqrt(1+1/x^2)) -> -acsch(x^-1)
	// after constant stripping: 1/(x*sqrt(1+1/x^2))
	'a1/(x1^n1*(a2/x1^n2+a3)^n3)': p => {
		if (p.get('n1').isOne() && p.get('n2').eq(2) && p.get('n3').eq(1 / 2)) {
			return p.fromPattern('a1*acsch((sqrt(a2/a3))/x1)/sqrt(a2*a3)');
		}
	},
};

export const tableOfIntegrals: LookupTable = new LookupTable();

tableOfIntegrals.addEntries(trigTable);
tableOfIntegrals.addEntries(invTrigTable);
tableOfIntegrals.addEntries(powerLogTable);
tableOfIntegrals.addEntries(exponentialTable);
tableOfIntegrals.addEntries(hyperbolicTrigTable);
tableOfIntegrals.addEntries(invHyperbolicTrigTable);
tableOfIntegrals.addEntries(knownProductsTable);
tableOfIntegrals.addEntries(knownIntegralsTable);
tableOfIntegrals.addEntries(specialFunctionTable);
