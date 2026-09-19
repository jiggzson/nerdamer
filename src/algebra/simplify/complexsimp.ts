import { Expression } from '../../core/classes/expression/Expression';
import { two } from '../../core/classes/expression/shortcuts';
import { expand } from '../../core/functions/expand/expand';
/**
 * Simplifies a complex number. Assumes expression is in the form a*i+b
 *
 * @param x
 */
export function complexSimplify(x: Expression) {
	const p = x.getPower();

	// Only handle (a*i+b)^(-1) -> a/(a^2+b^2) - b/(a^2+b^2)*i
	if (!p.isInteger() || !p.isMinusOne() /* or p.text() !== '-1' */) {
		return x;
	}

	// base = (a*i+b)
	const base = expand(x.invert());

	const re = base.realPart();
	const im = base.imagPart();
	const d = re.pow(two()).plus(im.pow(two()));

	return re.div(d).minus(im.div(d).times(Expression.Img()));
}
