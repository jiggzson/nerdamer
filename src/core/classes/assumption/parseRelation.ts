import { Scope } from '../../common/classes/Scope';
import { Parser } from '../parser/Parser';
import { Token } from '../parser/Token';

type RelationOperator = '=' | '==' | '<' | '<=' | '>' | '>=';
type Relation = Readonly<{
	left: readonly Token[];
	operator: RelationOperator;
	right: readonly Token[];
}>;

const RELATIONS: readonly string[] = ['=', '==', '<', '<=', '>', '>='];
const ARITHMETIC: readonly string[] = ['+', '-', '*', '/', '^'];

/** Reads arithmetic RPN as one operand without evaluating functions or comparisons. */
function readScope(scope: Scope, allowRelation: boolean): { operand?: Token[]; relation?: Relation } {
	const stack: Token[][] = [];
	let valid = true;
	let relation: Relation | undefined;

	for (let index = 0; index < scope.length; index++) {
		const entry = scope[index];
		if (Scope.isScope(entry)) {
			const nested = entry.type === 'parenthesis' ? readScope(entry, false).operand : undefined;
			if (!nested) {
				valid = false;
				break;
			}
			stack.push(nested);
		} else if (entry.type === Token.FUNCTION) {
			const argumentsScope = scope[++index];
			const argument = Scope.isScope(argumentsScope) && argumentsScope.type === 'parenthesis'
				? readScope(argumentsScope, false).operand : undefined;
			if (!argument) {
				valid = false;
				break;
			}
			stack.push([...argument, entry]);
		} else if (entry.type === Token.NUMBER || entry.type === Token.VARIABLE) {
			stack.push([entry]);
		} else if (entry.type === Token.PREFIX && (entry.value === '-' || entry.value === '+')) {
			const value = stack.pop();
			if (!value) {
				valid = false;
				break;
			}
			stack.push([...value, entry]);
		} else if (entry.type === Token.OPERATOR && ARITHMETIC.includes(entry.value)) {
			const right = stack.pop();
			const left = stack.pop();
			if (!left || !right) {
				valid = false;
				break;
			}
			stack.push([...left, ...right, entry]);
		} else if (allowRelation && entry.type === Token.OPERATOR && RELATIONS.includes(entry.value)) {
			const right = stack.pop();
			const left = stack.pop();
			if (!left || !right || relation) {
				valid = false;
				break;
			}
			relation = { left, operator: entry.value as RelationOperator, right };
		} else {
			valid = false;
			break;
		}
	}
	return valid && (relation ? stack.length === 0 : stack.length === 1)
		? { operand: relation ? undefined : stack[0], relation } : {};
}

/** Extracts one relation from shared RPN without evaluating either operand. */
export function parseRelation(source: string): Relation | undefined {
	const syntax = Parser.parseSyntax(source);
	return readScope(syntax, true).relation;
}
