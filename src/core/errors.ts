import { format } from './functions/string';
import { Settings } from './Settings';

/** Thrown when tokenization encounters invalid adjacency, punctuation, or bracket structure. */
export class UnexpectedTokenError extends Error {}
/** Thrown when an operation receives a Nerdamer entity of the wrong runtime type. */
export class UnexpectedDataType extends Error {}
/** Used when input parses successfully but does not have the form an operation requires. */
export class UnexpectedInputError extends Error {}
/** Thrown for exact division by zero. Small nonzero numerical values are not treated as zero. */
export class DivisionByZeroError extends Error {}
/** Used for invalid parser-operator definitions and operator dispatch failures. */
export class OperatorError extends Error {}
/** General parser error for construction, evaluation, and registered-function failures. */
export class ParserError extends Error {}
/** Thrown when evaluation requires a value but a construct produces no value. */
export class NullError extends Error {}
/** Used when a mathematical operation has no defined value in the handled domain. */
export class UndefinedError extends Error {}
/** Thrown when input cannot be represented as a polynomial under the requested requirements. */
export class PolynomialError extends Error {}
/** Thrown when an operation is known but unsupported for the supplied form or domain. */
export class UnsupportedOperationError extends Error {}
/** Parser syntax error kept separate from lower-level tokenization failures. */
export class ParserSyntaxError extends Error {}
/** General mathematical precondition error for cases without a more specific error type. */
export class MathError extends Error {}
/** Thrown when a required numeric conversion produces `NaN`. */
export class NaNError extends Error {}
/** Thrown when vector, matrix, or structured-entity dimensions are incompatible. */
export class DimensionError extends Error {}
/** Used for recognized operations that have not been implemented yet. */
export class NotImplementedError extends Error {}
/** Thrown when a named converter or pattern reference cannot be resolved. */
export class MissingReferenceError extends Error {}
/** Thrown for the indeterminate symbolic form `0^0`. */
export class ZeroToZeroPowerError extends Error {}
/** Thrown when code attempts to assign to a reserved or otherwise non-assignable parser name. */
export class AssignmentError extends Error {}

/** Internal localized message templates used when constructing Nerdamer errors. */
export const EnglishErrorMessages = {
		// General
		notImplemented: 'This method has not yet been implemented.',
		noInverse: 'Unable to calculate inverse!',
		undefinedValue: 'The requested value is undefined!',
		nullValue: 'Value expected but received null.',
		univariateInputOnly: 'The input for this function must be univariate!',
		differentSignsAtEndPointsRequired:
			'Function must have opposite signs at endpoints a and b!',
		integerRequired: 'This function requires the coefficient to be an integer!',
		plainVariableExpected: 'Expected plain variable! Received {{input}}.',
		missingReference: 'The reference "{{ref}}" does not exist on this pattern!!',
		undefinedDivision: 'Division not defined expression of this type! {{type}}',
		restrictedVariableName:
			'Cannot assign the requested value to the reserved name "{{name}}"!',
		noVariableInExpression: 'No variable found in expression!',
		quadraticExpressionExpected: 'Expression must be quadratic!',
		wrongInput: 'Wrong input! Expected {{expected}} but received {{received}}.',
		unsupportedFunction: 'Unsupported function {{function}}',
		functionMinArgs: '{{function}} requires a minimum of {{min}} arguments but {{actual}} provided!',
		functionMaxArgs: '{{function}} allows a maximum of {{max}} arguments but {{actual}} provided!',
		invalidFunctionDeclaration: 'Invalid function declaration {{declaration}}.',
		indexOutOfBounds: 'Index {{index}} out of bounds for {{type}} of length {{length}}',
		matrixRowIndexOutOfBounds: 'Row index {{index}} out of bounds for Matrix with {{length}} rows',
		matrixColumnIndexOutOfBounds: 'Column index {{index}} out of bounds for Matrix with {{length}} columns',
		dictionaryKeyNotFound: 'Key "{{key}}" not found in Dictionary. Available keys: {{keys}}',
		rangeValuesFinite: 'Range values must be finite.',
		rangeStepNonzero: 'Step cannot be zero',
		rangeStepNoAdvance: 'Step does not advance range at current precision',
		sparseVariableCountInvalid: 'SparsePolynomial variableCount must be a non-negative safe integer.',
		sparseExponentVectorLengthMismatch: 'SparsePolynomial exponent vector length must equal variableCount.',
		sparseExponentsNonNegativeBigInt: 'SparsePolynomial exponents must be non-negative bigints.',
		sparseVariableIndexOutOfRing: 'SparsePolynomial variable index is outside the polynomial ring.',
		sparseAdditionRingMismatch: 'SparsePolynomial addition requires the same polynomial ring.',
		sparseCoefficientExponentNonNegative: 'SparsePolynomial coefficient exponent must be non-negative.',
		sparseZeroMonomialDivision: 'SparsePolynomial cannot divide by a zero monomial.',
		sparseZeroScalarDivision: 'SparsePolynomial cannot divide by zero.',
		sparseScalarDivisionExact: 'SparsePolynomial scalar division must be exact for every coefficient.',
		sparseDivisionRingMismatch: 'SparsePolynomial division requires the same polynomial ring.',
		sparseZeroPolynomialDivision: 'SparsePolynomial cannot divide by the zero polynomial.',
		sparseMonomialOrderUnsupported: 'SparsePolynomial monomial order is not supported.',
		sparseMultiplicationRingMismatch: 'SparsePolynomial multiplication requires the same polynomial ring.',
		sparseExponentNonNegative: 'SparsePolynomial exponent must be non-negative.',
		sparseSubtractionRingMismatch: 'SparsePolynomial subtraction requires the same polynomial ring.',
		invalidDecimal: 'Invalid Decimal: "{{value}}"',
		invalidInterval: 'Invalid interval: ({{start}}, {{end}})',
		invalidAssumption: 'Invalid assumption: "{{input}}"',
		assumptionIdentifierExpected: 'Expected identifier',
		assumptionOperatorMissing: 'Missing operator',
		assumptionValueMissing: 'Missing value',
		assumptionOperatorUnsupported: 'Unsupported operator "{{operator}}"',
		matrixStringKeyUnsupported: 'Matrix does not support string key access',
		matrixTraceUnavailable: 'Unable to calculate trace for the matrix',
		defintMaxEvals: 'defint: maxEvals exceeded ({{max}}).',
		defintNonFiniteValue: 'defint: non-finite f(x) at x={{x}}',
		defintEndpointSingularity: 'defint: endpoint singularity could not be regularized near x={{x}}',
		defintSingularity: 'defint: singular/non-finite encountered near [{{a}}, {{b}}]',
		defintInfiniteBounds: 'defint: infinite bounds require allowInfinite: true',
		defintUnsupportedInfiniteBounds: 'defint: unsupported infinite bound configuration',
		symbolicAccessNamedTargetRequired: 'Symbolic indexed access requires a named Vector or Matrix target.',
		symbolicVectorIndexCount: 'Symbolic Vector access requires exactly one index.',
		symbolicMatrixRowNonScalar: 'Symbolic Matrix row access is not scalar and cannot be deferred as an Expression.',
		symbolicMatrixCellIndexCount: 'Symbolic Matrix cell access requires exactly two indices.',
		symbolicAccessMaxIndices: 'Symbolic indexed access supports at most two unresolved indices.',
		symbolicAccessIndexScalar: 'Symbolic accessor indices must evaluate to scalar expressions.',
		symbolicAccessTargetType: 'Symbolic indexed access target must resolve to a Vector or Matrix.',
		expectedOperatorOrFunction: 'Expected operator or function name but "{{value}}" found!',
		missingOpeningBracket: 'Missing opening bracket for "{{bracket}}":{{position}}',
		missingClosingBracket: 'Missing closing bracket for "{{bracket}}":{{position}}',
		prefixOperatorExpected: 'Prefix operator expected but {{operator}} encountered.',
		groebnerBasisSizeBudgetExceeded: 'Groebner budget exceeded: basis size > {{max}}',
		groebnerPairsBudgetExceeded: 'Groebner budget exceeded: pairsPopped > {{max}}',
		unsupportedParserEntity: 'Unsupported parser entity',
		factorialNegativeUndefined: 'Factorial is undefined for negative integers.',
		erfConvergenceFailed: 'erf not converging. Exiting!',
		defintInfiniteBoundsDecimal: 'defint: infinite bounds require allowInfinite:true',
		seqStartsAtInteger: "startsAt must be an integer",
		seqPolynomialOrMaxPower: "Sequence is not a polynomial or exceeds maxPower",
		seqInsufficientData: "Insufficient data points for detected degree",
		arithPowNegativeExponent: "pow: negative exponent",
		arithPowNNonnegativeInteger: "powN: exponent must be a nonnegative integer",
		arithBigIntSqrtNegative: "bigIntSqrt: negative input",
		arithNthRootPositiveInteger: "intNthRootExact: n must be a positive integer",
		arithDivisorsPositive: "getDivisors: n must be positive",
		arithModNormNonzeroModulus: "modNorm: modulus must be nonzero",
		arithModSymmetricNonzeroModulus: "modSymmetric: modulus must be nonzero",
		arithModInvZeroNoninvertible: "modInv: non-invertible (0)",
		arithModInvNoninvertible: "modInv: non-invertible",
		integerSqrtNonnegative: "Integer square root requires a non-negative value.",
		modularExponentiationPositiveModulus: "Modular exponentiation requires a positive modulus.",
		modularExponentiationNonnegativeExponent: "Modular exponentiation requires a non-negative exponent.",
		maxBigIntRequiresArgument: "maxBigInt() requires at least one argument",
		minBigIntEmpty: "Min of empty list is not defined for BigInt.",
		binomBigIntNonnegativeN: "binomBigInt: n must be non-negative",
		invalidDecimalValue: "Invalid decimal value: {{value}}",
		subtractionNotDefined: "Subtraction not defined for {{leftType}}-{{rightType}} | {{left}}-{{right}}",
		sparseAdapterVariablesUnique: "Sparse polynomial adapter variables must be unique.",
		sparseAdapterVariablesIncludeEvery: "Sparse polynomial adapter variables must include every polynomial variable.",
		sparseExpressionConversionNameCount: "Sparse polynomial expression conversion requires one name per ring variable.",
		converterMissingArgumentScope: "Missing argument scope for function {{function}}",
		converterMissingPrefixOperand: "Missing operand for prefix operator {{operator}}",
		converterMissingOperandMetadata: "Missing operand or metadata for operator {{operator}}",
		converterMissingLeftOperand: "Missing left operand for operator {{operator}}",
		converterTexConversionFailed: "Unable to convert source expression to TeX",
		unknownOperator: "Unknown operator {{operator}}",
		polynomialMaximumIterations: "Maximum iterations reached",
		polyRequires: "{{operation}} requires {{requirement}}.",
		polyVariablesUnique: "{{operation}} variables must be unique.",
		polyVariablesRingOrder: "{{operation}} variables must follow polynomial-ring order.",
		polyVariablesIncludeActive: "{{operation}} variables must include every active variable.",
		polyInputsSelectedOnly: "{{operation}} inputs may use only the selected variables.",
		polyCannotFactorZeroPolynomial: "{{operation}} cannot factor the zero polynomial.",
		polyCannotFactorZero: "{{operation}} cannot factor zero.",
		polyModulusGreaterThanOne: "ModularSparsePolynomial modulus must be greater than one.",
		polyVariableCountMatch: "ModularSparsePolynomial variableCount must match the supplied sparse polynomial.",
		polyInterpolationCannotDepend: "ModularSparsePolynomial interpolation samples cannot depend on the interpolated variable.",
		polyInterpolationInvertibleDifferences: "ModularSparsePolynomial interpolation points must have invertible pairwise differences.",
		polyCoefficientExponentNonnegative: "ModularSparsePolynomial coefficient exponent must be non-negative.",
		polyCannotDivideZero: "ModularSparsePolynomial cannot divide by the zero polynomial.",
		polyDivisorLeadingCoefficientInvertible: "ModularSparsePolynomial divisor leading coefficient is not invertible.",
		polyLeadingCoefficientInvertible: "ModularSparsePolynomial leading coefficient is not invertible.",
		polyExponentNonnegative: "ModularSparsePolynomial exponent must be non-negative.",
		polyDegreeMatrixLimit: "Modular factorization degree exceeds the supported matrix dimension.",
		polyExtendedGcdTwoZeroUndefined: "Modular extended GCD is undefined for two zero polynomials.",
		polyHenselPrimeExceedsTailDegree: "Multivariate Hensel lifting prime must exceed every tail-variable degree.",
		polyHenselTargetNotSmaller: "Hensel lifting target modulus cannot be smaller than the base prime.",
		polyHenselTargetRepeatedSquaring: "Hensel lifting target modulus must be obtained by repeated squaring of the base prime.",
		polyHenselFactorsReconstructModuloBase: "Hensel lifting factors do not reconstruct the integer polynomial modulo the base prime.",
		polyZassenhausFactorsReconstructModuloLift: "Zassenhaus recombination factors do not reconstruct the input modulo the lift modulus.",
		polyWangCannotSpecializeZero: "Wang evaluation search cannot specialize zero.",
		polyModularContentExactDivision: "Modular polynomial content must divide the polynomial exactly.",
		factorizationNoFactors: "Nonconstant factorization returned no factors.",
		polyCrtModuliInvertible: "Polynomial CRT moduli must be invertible.",
		polyIntegerFactorPrimeZero: "Integer factorization cannot choose a prime for zero.",
		polySquareFreeNonExactDivision: "Square-free factorization encountered a non-exact polynomial division.",
		polyZassenhausLostRemaining: "Zassenhaus recombination lost the remaining polynomial.",
		polyZassenhausReconstructionFailed: "Zassenhaus recombination factors do not reconstruct the integer polynomial.",
		polyIntegerFactorLostLeading: "Integer factorization lost the leading term.",
		parserMalformedSymbolicAccessor: "Malformed internal symbolic accessor.",
		parserMalformedSymbolicAccessorIndex: "Malformed internal symbolic accessor index.",
		unknownOperatorAction: "Unknown operator action {{action}}",
		parserBracketTokenMissingCharacter: "Bracket token is missing its character.",
		polyWangLeadingEvaluationInteger: "Wang leading-coefficient evaluation did not produce an integer.",
		polyWangSpecializedLeadingInteger: "Wang specialized factor did not have an integer leading coefficient.",
		polyMultivariateContentDivisionFailed: "Multivariate factorization could not divide a square-free block by its main-variable content.",
		polyMultivariateContentVariableMissing: "Multivariate main-variable content did not retain an active coefficient variable.",
		polyMultivariateReconstructionFailed: "Complete multivariate factorization does not reconstruct the input polynomial.",
		polyBerlekampNoninvertiblePivot: "Berlekamp elimination encountered a noninvertible pivot.",
		polyHenselZeroFactorGroup: "Hensel lifting cannot lift a zero factor group.",
		polyHenselCannotLiftZero: "Hensel lifting cannot lift the zero polynomial.",
		polyHenselModulusExceeded: "Hensel lifting exceeded the requested prime-power modulus.",
		polyHenselLeadingLost: "Hensel lifting lost the target leading coefficient.",
		polyHenselReconstructionFailed: "Hensel-lifted factors do not reconstruct the target polynomial.",
		polyBerlekampNonExactSplit: "Berlekamp splitting produced a non-exact factor division.",
		polyBerlekampIncompleteSplit: "Berlekamp factorization did not fully split the polynomial.",
		polyBerlekampReconstructionFailed: "Berlekamp factors do not reconstruct the input polynomial.",
		expressionKeyValueUnsupported: "The function 'keyValue' is not implemented for type {{type}}.",
		solveLinearNonlinearDegree: "Nonlinear term detected in equation {{equation}}: degree {{degree}} term found. solveLinearSystem only handles linear systems.",
		solveLinearNonPolynomialVariable: "Nonlinear term detected in equation {{equation}}: variable \"{{variable}}\" appears in a non-polynomial position. solveLinearSystem only handles linear systems.",
		polyReqPrimeModulus: "a prime modulus",
		polyReqUnivariatePolynomial: "a univariate polynomial",
		polyReqSquareFreeInput: "square-free input",
		polyReqSamePolynomialRing: "the same polynomial ring",
		polyReqAtLeastOneVariable: "at least one variable",
		polyReqAtLeastTwoSelectedVariables: "at least two selected variables",
		polyReqOneEvaluationPerTailVariable: "one evaluation value per tail variable",
		polyReqMatchingFactorLeadingLists: "matching factor and leading-coefficient lists",
		polyReqPairwiseCoprimeModularFactors: "pairwise coprime modular factors",
		polyReqPrimeBaseModulus: "a prime base modulus",
		polyReqAtLeastOneModularFactor: "at least one modular factor",
		polyReqUnivariateIntegerPolynomial: "a univariate integer polynomial",
		polyReqFactorsSameRingAndPrime: "factors from the same integer polynomial ring and base prime",
		polyReqUnivariateFactors: "univariate factors",
		polyReqMonicModularFactors: "monic modular factors",
		polyReqPrimitiveIntegerPolynomial: "a primitive integer polynomial",
		polyReqPositiveLeadingCoefficient: "a positive leading coefficient",
		polyReqLiftedModularFactors: "lifted modular factors",
		polyReqLiftedFactorsSameRing: "lifted factors from one polynomial ring",
		polyReqUnivariateLiftedFactors: "univariate lifted factors",
		polyReqMonicLiftedFactors: "monic lifted factors",
		polyReqLargerHenselModulus: "a larger Hensel lifting modulus",
		polyReqPrimitivePolynomial: "a primitive polynomial",
		polyReqPositiveLexLeadingSign: "positive lexicographic leading sign",
		polyReqSquareFreeMainVariable: "square-free input in the main variable",
		polyReqExactlyTwoSelectedVariables: "exactly two selected variables",
		polyReqExactlyTwoVariables: "exactly two variables",
		polyReqOneValuePerNonMainVariable: "one value for every non-main selected variable",
		polyReqOneValuePerTailVariable: "one value for every tail variable",
		polyReqPositiveDegreeMainVariable: "positive degree in the main variable",
		polyReqAllOtherVariablesDormant: "all other variables to be dormant",
		polyReqPositiveModuli: "positive moduli",
		polyReqCoprimeModuli: "coprime moduli",
		polyReqAtLeastOneSample: "at least one sample",
		polyReqInvertibleLeadingCoefficient: "an invertible leading coefficient",
		polyReqIntegerLeadingCoefficientInvertible: "the integer leading coefficient to be invertible modulo the base prime",
		infinityMinusInfinityUndefined: 'Infinity-Infinity is undefined!',

		// Assumptions
		inconsistentAssumptions: 'Assumptions are inconsistent (empty intersection)!',

		// Parser
		unsupportedType: 'The provided type ({{type}}) is not supported for this function!',
		unsupportedOperation: 'This operation is currently not supported!',
		buildFunctionUnsupportedFunction:
			'buildFunction cannot compile the function "{{function}}" to JavaScript number arithmetic!',
		buildFunctionComplexUnsupported:
			'buildFunction cannot compile expressions containing the imaginary unit to JavaScript number arithmetic!',
		nonMatchingDimensions:
			"This operation cannot be completed because the dimensions don't match!",
		malformedExpression: 'Unable to parse malformed expression!',
		unsupportedCharacter: 'Unsupported character "{{character}}" at position {{position}}.',
		missingCommentDelimiter: 'Missing closing comment delimiter "{{delimiter}}".',
		divisionByZero: 'Division by zero is not defined!',
		zeroToZeroPower: '0^0 is undefined!',
		infinityToPowerZero: 'Infinity^0 is not defined!',
		infinityTimesZero: '0*Infinity is not defined!',
		infinityToInfinity: 'Infinity^Infinity is not defined!',
		valueToInfinityUndefined: '{{value}}^Infinity is not defined!',
		atan2Undefined: 'atan2 is undefined for 0, 0!',
		tanUndefined: 'tan is undefined for multiples of pi/2!',
		loopIterationLimitExceeded: 'Loop exceeded the maximum of {{max}} iterations.',
		breakOutsideLoop: 'break can only be used inside a loop.',
		continueOutsideLoop: 'continue can only be used inside a loop.',
		letRequiresBindingsAndBody:
			'let requires one or more name/value pairs followed by a body expression.',

		secUndefined: 'sec is undefined for odd multiples of pi/2!',
		cscUndefined: 'csc is undefined for multiples of pi!',
		cotUndefined: 'cot is undefined for multiples of pi!',
		cothUndefined: 'coth is undefined for 0!',
		cschUndefined: 'csch is undefined for 0!',
		atanhUndefined: 'atanh is undefined for 0!',
		cannotCreateArrayFromNaN: 'Cannot create array from NaN!',
		expressionExpected: 'Expression expected!. Received {{type}}!',

		// TeX Converter.
		unrecognizedMode: '"{{mode}}" is is not a valid mode!',
		// Polynomials
		notAPolynomial: 'The expression is not a valid polynomial!',
		multidegreeMismatch:
			'The number of variables must match the multidegree of the polynomial!',

		// Matrix
		cannotCreateMatrix: 'Unable to create Matrix. Row dimensions do not match!',
		cannotMultiplyMatrix: 'Cannot multiply matrix!',
		squareMatrixRequired: 'The matrix must be square!',
		rowsMustMatch: 'The rows of the matrices must match!',
		columnsMustMatch: 'The columns of the matrices must match!',
		singularMatrix: 'The provided matrix is singular!',
		matrixExpected: 'Matrix expected! Received {{type}}.',
		// Vector
		mismatchedDimensions: 'The dimensions must match for the function "{{function}}"!',
		incorrectCrossDimension: 'The cross product is only defined for vectors of dimension 3!',
		vectorExpected: 'Expected Vector! Received {{type}}.',
		// Polynomial
		univariatePolynomialOnly: 'This function is only supported for univariate polynomials!',
		unknownVariable: 'Unknown variable! "{{variable}}"',
		// Solve
		convergenceFailed: 'Failed to converge! {{iters}} iterations were tried.',
		endPointIsRoot: 'End point is root.',
		zeroDerivative: 'The derivative is zero at x = {{x}}. Cannot continue.',
		tooManyUnknowns: 'Too many unknowns!',
		solveSystemInfiniteSolutions: 'This system does not have a finite isolated solution set!',
		solveSystemPolynomialOnly:
			'solveSystem currently supports only linear or polynomial systems!',
		solveSystemNonRationalUnsupported:
			'This nonlinear polynomial system requires non-rational or non-symbolic solving, which is not yet supported!',
		// Set function
		setJSFunctionExpectsFunction:
			'The function parameter when setting a JS function must be of type function!',
		functionRequiresMinAndMaxArgs:
			'You must provide a min and max arg when setting the function!',
	} as const;

export type ErrorType = keyof typeof EnglishErrorMessages;
export type Language = 'eng' | 'spa' | 'fra' | 'deu' | 'por' | 'ita' | 'nld';
export type MessageCatalog = { [K in ErrorType]: string };

export const ErrorMessages: Partial<Record<Language, MessageCatalog>> & {
	eng: MessageCatalog;
} = {
	eng: EnglishErrorMessages,
};

/** Registers one optional localized message catalog. */
export function registerLanguage(language: Exclude<Language, 'eng'>, catalog: MessageCatalog) {
	ErrorMessages[language] = catalog;
}

/** Formats an internal localized error message with named template values. */
export function message(e: ErrorType, values?: { [name: string]: string }) {
	const catalog = ErrorMessages[Settings.LANGUAGE] ?? ErrorMessages.eng;
	return format(catalog[e], values || {});
}
