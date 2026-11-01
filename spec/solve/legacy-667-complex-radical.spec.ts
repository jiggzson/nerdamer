import { Expression } from '../../src/core/classes/expression/Expression';
import nerdamer from '../../src/index';

describe('legacy #667 complex radical solving', () => {
	// Preserve the original substituted equation without exercising the slower solver scan.
	it('keeps the reported real roots of the original equation', () => {
		const sum = '(-abs(-y^2+1/2)-y^2+1/2)^(1/3)+(-y^2+1/2+abs(-y^2+1/2))^(1/3)';
		const rotation = '((1/2)*i*sqrt(3)+1/2)^2';
		const substituted = `(${sum})*(${rotation})`;
		const source = `(${substituted})^3-1+2*(${sum})^2*((1/2)*i*sqrt(3)+1/2)^4`;
		const expression = nerdamer(source);
		const roots = [
			'-1.6180339887498948481',
			'-1',
			'1',
			'1.6180339887498947607',
		];
		for (const root of roots) {
			const residual = expression.evaluate({ y: root });
			expect(Expression.isExpression(residual) && residual.isNearlyZero()).toBe(true);
		}
	});
});
