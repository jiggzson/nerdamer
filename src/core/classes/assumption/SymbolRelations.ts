import { message, UnexpectedInputError } from '../../errors';

import type { Rational } from '../rational/Rational';
import type { Assumption } from './Assumption';
import type { SymbolRelation } from './symbolRelation';

// Keep module initialization independent of Rational and Expression.
// The zero sentinel is only used internally; nonzero offsets remain exact Rational values.
const ZERO_OFFSET = '0' as const;
type Offset = Rational | typeof ZERO_OFFSET;

function addOffset(a: Offset, b: Offset): Offset {
	return a === ZERO_OFFSET ? b : b === ZERO_OFFSET ? a : a.plus(b);
}

function negateOffset(value: Offset): Offset {
	return value === ZERO_OFFSET ? ZERO_OFFSET : value.neg();
}

function subtractOffset(a: Offset, b: Offset): Offset {
	return addOffset(a, negateOffset(b));
}

function compareOffset(a: Offset, b: Offset): -1 | 0 | 1 {
	let result: -1 | 0 | 1;
	if (a === ZERO_OFFSET) {
		if (b === ZERO_OFFSET) {
			result = 0;
		} else {
			const sign = b.sign();
			result = sign === 0 ? 0 : sign < 0 ? 1 : -1;
		}
	} else if (b === ZERO_OFFSET) {
		const sign = a.sign();
		result = sign === 0 ? 0 : sign < 0 ? -1 : 1;
	} else if (a.lt(b)) {
		result = -1;
	} else {
		result = a.gt(b) ? 1 : 0;
	}
	return result;
}

type RelationPaths = Readonly<{
	names: string[];
	lower: (Offset | undefined)[][];
	strict: boolean[][];
}>;

/** Find the strongest known lower bound for each difference of two symbols. */
function relationshipPaths(relations: readonly SymbolRelation[], extraNames: readonly string[] = []): RelationPaths {
	const names = [...new Set([...relations.flatMap(item => [item.left, item.right]), ...extraNames])];
	const lower: (Offset | undefined)[][] = names.map((_, i) =>
		names.map((_, j) => i === j ? ZERO_OFFSET : undefined));
	const strict = names.map(() => names.map(() => false));

	// A strict comparison wins when two paths establish the same numeric bound.
	const update = (from: number, to: number, value: Offset, open: boolean): void => {
		const previous = lower[from][to];
		if (previous === undefined || compareOffset(value, previous) > 0 ||
			(compareOffset(value, previous) === 0 && open && !strict[from][to])) {
			lower[from][to] = value;
			strict[from][to] = open;
		}
	};

	for (const item of relations) {
		const left = names.indexOf(item.left);
		const right = names.indexOf(item.right);
		const offset = item.offset ?? ZERO_OFFSET;
		update(left, right, offset, item.operator === '>');
		if (item.operator === '=') {
			update(right, left, negateOffset(offset), false);
		}
	}

	// Adding lower bounds is valid along a chain: x >= y+a, y >= z+b.
	names.forEach((_, k) => {
		names.forEach((_, i) => {
			names.forEach((_, j) => {
				const first = lower[i][k];
				const second = lower[k][j];
				if (first !== undefined && second !== undefined) {
					update(i, j, addOffset(first, second), strict[i][k] || strict[k][j]);
				}
			});
		});
	});

	return { names, lower, strict };
}

/** Stores exact comparisons between symbols, including constant differences. */
export class SymbolRelations {
	private paths: RelationPaths | undefined;
	private readonly relations: SymbolRelation[] = [];

	/** Rejects a new relation if its implied bounds are inconsistent. */
	add(relation: SymbolRelation): void {
		const { names, lower, strict } = relationshipPaths([...this.relations, relation]);

		if (names.some((_, i) => {
			const self = lower[i][i];
			return self !== undefined && (compareOffset(self, ZERO_OFFSET) > 0 || (compareOffset(self, ZERO_OFFSET) === 0 && strict[i][i]));
		})) {
			throw new UnexpectedInputError(message('inconsistentAssumptions'));
		}

		const duplicate = this.relations.some(current =>
			current.left === relation.left && current.right === relation.right &&
				current.operator === relation.operator &&
				compareOffset(current.offset ?? ZERO_OFFSET, relation.offset ?? ZERO_OFFSET) === 0 ||
			current.operator === '=' && relation.operator === '=' &&
				current.left === relation.right && current.right === relation.left &&
				compareOffset(current.offset ?? ZERO_OFFSET, negateOffset(relation.offset ?? ZERO_OFFSET)) === 0
		);
		if (!duplicate) {
			this.paths = undefined;
			this.relations.push({
				...relation,
				...(relation.offset ? { offset: relation.offset.copy() } : {}),
			});
		}
	}

	/** Removes all stored facts. */
	clear(): void {
		this.relations.length = 0;
		this.paths = undefined;
	}

	/** Proves, disproves, or leaves unresolved a symbolic comparison. */
	compare(relation: SymbolRelation): boolean | undefined {
		const cached = this.paths ?? (this.paths = relationshipPaths(this.relations));
		const { names, lower, strict } = cached.names.includes(relation.left) && cached.names.includes(relation.right)
			? cached : relationshipPaths(this.relations, [relation.left, relation.right]);
		const left = names.indexOf(relation.left);
		const right = names.indexOf(relation.right);
		const required = relation.offset ?? ZERO_OFFSET;
		const forward = lower[left][right];
		const reverse = lower[right][left];
		const forwardDifference = forward === undefined ? undefined : subtractOffset(forward, required);
		const reverseDifference = reverse === undefined ? undefined : addOffset(reverse, required);
		let result: boolean | undefined;

		if (relation.operator === '=') {
			if (forwardDifference !== undefined && reverseDifference !== undefined &&
				compareOffset(forwardDifference, ZERO_OFFSET) >= 0 && compareOffset(reverseDifference, ZERO_OFFSET) >= 0) {
				result = true;
			} else if (forwardDifference !== undefined &&
					(compareOffset(forwardDifference, ZERO_OFFSET) > 0 ||
					(compareOffset(forwardDifference, ZERO_OFFSET) === 0 && strict[left][right])) ||
				reverseDifference !== undefined &&
					(compareOffset(reverseDifference, ZERO_OFFSET) > 0 ||
					(compareOffset(reverseDifference, ZERO_OFFSET) === 0 && strict[right][left]))) {
				result = false;
			}
		} else if (relation.operator === '>') {
			if (forwardDifference !== undefined &&
				(compareOffset(forwardDifference, ZERO_OFFSET) > 0 ||
					(compareOffset(forwardDifference, ZERO_OFFSET) === 0 && strict[left][right]))) {
				result = true;
			} else if (reverseDifference !== undefined && compareOffset(reverseDifference, ZERO_OFFSET) >= 0) {
				result = false;
			}
		} else {
			if (forwardDifference !== undefined && compareOffset(forwardDifference, ZERO_OFFSET) >= 0) {
				result = true;
			} else if (reverseDifference !== undefined &&
				(compareOffset(reverseDifference, ZERO_OFFSET) > 0 ||
					(compareOffset(reverseDifference, ZERO_OFFSET) === 0 && strict[right][left]))) {
				result = false;
			}
		}
		return result;
	}

	/** Forgets facts dependent on the given symbol. */
	forget(symbol: string): void {
		for (let index = this.relations.length - 1; index >= 0; index--) {
			const relation = this.relations[index];
			if (relation.left === symbol || relation.right === symbol) {
				this.relations.splice(index, 1);
				this.paths = undefined;
			}
		}
	}

	/** Returns independent copies of stored relation facts. */
	getAll(): readonly SymbolRelation[] {
		return this.relations.map(item => ({
			...item,
			...(item.offset ? { offset: item.offset.copy() } : {}),
		}));
	}

	/**
	 * Derives current numeric bounds without storing them as permanent facts.
	 * Removing a source assumption therefore removes its inferred consequences.
	 */
	getInterval(symbol: string, bounds: ReadonlyMap<string, Assumption>, assumptionType: typeof Assumption): Assumption | undefined {
		let result = bounds.get(symbol);
		if (!this.relations.length || !bounds.size) {
			return result;
		}

		const { names, lower, strict } = this.paths ?? (this.paths = relationshipPaths(this.relations));
		const index = names.indexOf(symbol);
		if (index < 0) {
			return result;
		}
		for (const [otherSymbol, interval] of bounds) {
			const other = names.indexOf(otherSymbol);
			if (other < 0 || other === index) {
				continue;
			}

			const lowerValue = interval.getFiniteLowerBound();
			const upperValue = interval.getFiniteUpperBound();
			const lowerOffset = lower[index][other];
			const upperOffset = lower[other][index];
			const candidates: Assumption[] = [];

			if (lowerValue?.isNUM() && lowerOffset !== undefined) {
				candidates.push(assumptionType.atLeast(
					lowerValue.getMultiplier().plus(lowerOffset),
					interval.start.inclusive && !strict[index][other]
				));
			}
			if (upperValue?.isNUM() && upperOffset !== undefined) {
				candidates.push(assumptionType.atMost(
					upperValue.getMultiplier().minus(upperOffset),
					interval.end.inclusive && !strict[other][index]
				));
			}

			for (const candidate of candidates) {
				const intersection = result?.intersect(candidate);
				if (result && !intersection) {
					throw new UnexpectedInputError(message('inconsistentAssumptions'));
				}
				result = intersection ?? candidate;
			}
		}
		return result;
	}
}
