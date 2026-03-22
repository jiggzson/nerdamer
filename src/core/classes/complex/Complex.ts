import Decimal from 'decimal.js';

export class Complex {
	im: Decimal;
	re: Decimal;

	constructor(re: Decimal | number, im: Decimal | number = 0) {
		this.re = typeof re === 'number' ? new Decimal(re) : re;
		this.im = typeof im === 'number' ? new Decimal(im) : im;
	}

	static create(re: Decimal | number, im: Decimal | number = 0): Complex {
		return new Complex(
			re instanceof Decimal ? re : new Decimal(re),
			im instanceof Decimal ? im : new Decimal(im)
		);
	}

	abs(): Decimal {
		return this.re.mul(this.re).plus(this.im.mul(this.im)).sqrt();
	}

	add(other: Complex): Complex {
		return new Complex(this.re.plus(other.re), this.im.plus(other.im));
	}

	div(other: Complex): Complex {
		const denom = other.re.mul(other.re).plus(other.im.mul(other.im));
		if (denom.lessThan(new Decimal(1e-100))) {
			return new Complex(0, 0);
		}
		return new Complex(
			this.re.mul(other.re).plus(this.im.mul(other.im)).div(denom),
			this.im.mul(other.re).minus(this.re.mul(other.im)).div(denom)
		);
	}

	mul(other: Complex): Complex {
		return new Complex(
			this.re.mul(other.re).minus(this.im.mul(other.im)),
			this.re.mul(other.im).plus(this.im.mul(other.re))
		);
	}

	neg(): Complex {
		return new Complex(this.re.neg(), this.im.neg());
	}

	scale(s: Decimal | number): Complex {
		const scalar = s instanceof Decimal ? s : new Decimal(s);
		return new Complex(this.re.mul(scalar), this.im.mul(scalar));
	}

	sub(other: Complex): Complex {
		return new Complex(this.re.minus(other.re), this.im.minus(other.im));
	}
}
