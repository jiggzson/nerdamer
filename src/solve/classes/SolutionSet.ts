import { SOLUTIONS_SET } from '../../core/classes/parser/constants';
import { ValuesSet } from '../../core/classes/valuesSet/ValuesSet';
import { DivisionByZeroError } from '../../core/errors';

import type { Expression } from '../../core/classes/expression/Expression';
import type { Root } from './FunctionSolver';

export type SolutionsType = 'numeric' | 'symbolic' | 'mixed' | undefined;

export class SolutionSet extends ValuesSet {
	private excluded = new ValuesSet();
	private roots: Root[] = [];
	override dataType: string;
	override elements: Expression[];
	partial = false;
	solutionsType: SolutionsType = undefined;
	unsolved?: Expression;

	constructor(values?: Iterable<Expression>) {
		super();
		this.dataType = SOLUTIONS_SET;
		this.elements = [];
		if (values) {
			for (const v of values) {
				this.add(v);
			}
		}
	}

	// ─── Set-like uniqueness methods ────────────────────────────────

	static isSolutionsSet(obj: unknown): obj is SolutionSet {
		if (obj === undefined || obj === null) {
			return false;
		}
		return (obj as SolutionSet).dataType === SOLUTIONS_SET;
	}

	override add(x: Expression): SolutionSet {
		if (!this.has(x)) {
			this.elements.push(x);
		}
		return this;
	}

	addMany(x: Expression[]) {
		for (const e of x) {
			this.add(e);
		}
		return this;
	}

	// ─── Solution-specific methods ──────────────────────────────────

	public addRawRoot(root: Root) {
		this.roots.push(root);
		return this;
	}

	public addSolution(solution: Expression, forFunction: Expression, variable: string) {
		try {
			// If the solution is numeric and not zero then don't add it
			if (solution.isNUM() && solution.isZero()) {
				this.add(solution);
			} else {
				const simplified = solution;
				// Test it
				const evaluated = forFunction.evaluate({ [variable]: solution.evaluate() });
				const isConstant = evaluated.isConstant();
				// Don't discard possibly good solutions because we're unable to evaluate them
				if ((isConstant && evaluated.isNearlyZero()) || !isConstant) {
					this.add(simplified);
				}
			}
		} catch (e) {
			if (e instanceof DivisionByZeroError) {
				this.excluded.add(solution);
			}
		}

		return this;
	}

	public addSolutions(
		arr: Expression[] | SolutionSet,
		forFunction: Expression,
		variable: string
	) {
		const solutions: Expression[] = SolutionSet.isSolutionsSet(arr) ? arr.elements : arr;
		for (const sol of solutions) {
			this.addSolution(sol, forFunction, variable);
		}
		return this;
	}

	public append(s: SolutionSet) {
		this.elements = [...this.elements, ...s.elements];
	}

	override copy(): SolutionSet {
		const copy = new SolutionSet();
		for (let i = 0; i < this.elements.length; i++) {
			copy.add(this.elements[i].copy() as Expression);
		}
		copy.solutionsType = this.solutionsType;
		copy.partial = this.partial;
		if (this.unsolved) {
			copy.unsolved = this.unsolved.copy() as Expression;
		}
		return copy;
	}

	override evaluate() {
		return this.copy().each(e => e.evaluate()) as SolutionSet;
	}

	public exclude(set: SolutionSet) {
		this.excluded.addMany(set.elements);
		return this;
	}

	// ─── Required overrides ─────────────────────────────────────────

	override expand(): SolutionSet {
		const copy = this.copy();
		copy.each(e => e.expand());
		return copy;
	}

	public getExcluded() {
		return this.excluded;
	}

	public getRawRoots() {
		return this.roots.map(e => e);
	}

	override text(): string {
		return `{${this.elements.map(e => e.text()).join(', ')}}`;
	}
}
