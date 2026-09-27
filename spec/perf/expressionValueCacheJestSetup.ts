import { Expression } from '../../src/core/classes/expression/Expression';

const originalKeyValue = Expression.prototype.keyValue;
let mismatchCount = 0;
const examples: string[] = [];

beforeAll(() => {
	mismatchCount = 0;
	examples.length = 0;

	Expression.prototype.keyValue = function (
		...args: Parameters<Expression['keyValue']>
	): string {
		const result = originalKeyValue.apply(this, args);

		if (
			(this.type === Expression.TYPES.SUM || this.type === Expression.TYPES.PRD) &&
			result !== this.value
		) {
			mismatchCount++;
			if (examples.length < 5) {
				examples.push(
					[
						`type=${this.type}`,
						`stored=${this.value}`,
						`computed=${result}`,
					].join(' ')
				);
			}
		}

		return result;
	};
});

afterAll(() => {
	Expression.prototype.keyValue = originalKeyValue;

	console.log(
		[
			`Aggregate value cache probe: ${mismatchCount} mismatch(es).`,
			...examples.map(example => `  ${example}`),
		].join('\n')
	);
});
