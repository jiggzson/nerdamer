/**
 * Contributor-facing diagnostic inspection helpers.
 *
 * @remarks
 * This module exposes plain-data views of Nerdamer parser and expression internals for
 * debugging tools, issue reports, and visual inspectors. The shapes reflect Nerdamer's
 * implementation and may change between releases; they are not part of the mathematical
 * compatibility surface provided by the ordinary package APIs.
 *
 * Import these helpers from `nerdamer/debug`. Loading this subpath does not add them to
 * the browser UMD bundle or the root `nerdamer` callable.
 *
 * @module debug
 */
export {
	inspectEntity,
	inspectExpressionData as inspectExpression,
	inspectParse,
	inspectPolynomialData as inspectPolynomial,
	inspectTermData as inspectTerm,
} from '../utils/debug';

export type {
	DebugCollection,
	DebugDictionary,
	DebugDictionaryEntry,
	DebugEntity,
	DebugEquation,
	DebugExpression,
	DebugMatrix,
	DebugPolynomial,
	DebugScope,
	DebugScopeItem,
	DebugTerm,
	DebugToken,
	DebugValuesSet,
	DebugVector,
	ParseInspection,
} from '../utils/debug';
