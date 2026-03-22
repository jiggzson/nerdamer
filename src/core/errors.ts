import { format } from './functions/string';
import { Settings } from './Settings';

export class UnexpectedTokenError extends Error {}
export class UnexpectedDataType extends Error {}
export class UnexpectedInputError extends Error {}
export class DivisionByZeroError extends Error {}
export class OperatorError extends Error {}
export class ParserError extends Error {}
export class UndefinedError extends Error {}
export class PolynomialError extends Error {}
export class UnsupportedOperationError extends Error {}
export class ParserSyntaxError extends Error {}
export class MathError extends Error {}
export class NaNError extends Error {}
export class DimensionError extends Error {}
export class NotImplementedError extends Error {}
export class MissingReferenceError extends Error {}
export class ZeroToZeroPowerError extends Error {}
export class AssignmentError extends Error {}

export const ErrorMessages = {
	eng: {
		// General
		notImplemented: 'This method has not yet been implemented.',
		noInverse: 'Unable to calculate inverse!',
		undefinedValue: 'The requested value is undefined!',
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
		infinityMinusInfinityUndefined: 'Infinity-Infinity is undefined!',

		// Assumptions
		inconsistentAssumptions: 'Assumptions are inconsistent (empty intersection)!',

		// Parser
		unsupportedType: 'The provided type ({{type}}) is not supported for this function!',
		unsupportedOperation: 'This operation is currently not supported!',
		nonMatchingDimensions:
			"This operation cannot be completed because the dimensions don't match!",
		malformedExpression: 'Unable to parse malformed expression!',
		divisionByZero: 'Division by zero is not defined!',
		infinityToPowerZero: 'Infinity^0 is not defined!',
		infinityTimesZero: '0*Infinity is not defined!',
		infinityToInfinity: 'Infinity^Infinity is not defined!',
		valueToInfinityUndefined: '{{value}}^Infinity is not defined!',
		atan2Undefined: 'atan2 is undefined for 0, 0!',
		tanUndefined: 'tan is undefined for multiples of pi/2!',

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
	},
	spa: {
		// General
		notImplemented: 'Este método aún no se ha implementado.',
		noInverse: 'Incapaz de calcular inversa!',
		undefinedValue: '¡El valor solicitado no está definido!',
		univariateInputOnly: '¡La entrada para esta función debe ser univariada!',
		differentSignsAtEndPointsRequired:
			'¡La función debe tener signos opuestos en los puntos extremos a y b!',
		integerRequired: '¡Esta función requiere que el coeficiente sea un número entero!',
		plainVariableExpected: '¡Se esperaba una variable simple! Se recibió {{input}}.',
		missingReference: '¡La referencia "{{ref}}" no existe en este patrón!',
		undefinedDivision: '¡División no definida expresión de este tipo! {{type}}',
		restrictedVariableName:
			'¡No se puede asignar el valor solicitado al nombre reservado "{{name}}"!',
		noVariableInExpression: '¡No se encontró ninguna variable en la expresión!',
		quadraticExpressionExpected: '¡La expresión debe ser cuadrática!',
		wrongInput: '¡Entrada incorrecta! Se esperaba {{expected}}, pero se recibió {{received}}.',
		infinityMinusInfinityUndefined: '¡Infinito menos infinito es indefinido!',

		// Assumptions
		inconsistentAssumptions: '¡Las suposiciones son inconsistentes (intersección vacía)!',

		// Parser
		unsupportedType: '¡El tipo ({{type}}) proporcionado no es compatible con esta función!',
		unsupportedOperation: '¡Esta operación no está soportada actualmente!',
		nonMatchingDimensions:
			'¡Esta operación no se puede completar porque las dimensiones no coinciden!',
		malformedExpression: '¡No se puede analizar la expresión malformada!',
		divisionByZero: '¡La división por cero no está definida!',
		infinityToPowerZero: '¡Infinito^0 no está definido!',
		infinityTimesZero: '¡0*Infinito no está definido!',
		infinityToInfinity: '¡Infinito^Infinito no está definido!',
		valueToInfinityUndefined: '{{value}}^Infinito no está definido!',
		atan2Undefined: '¡atan2 no está definida para 0, 0!',
		tanUndefined: '¡tan no está definida para múltiplos de pi / 2!',

		secUndefined: '¡sec no está definida para múltiplos impares de pi/2!',
		cscUndefined: '¡csc no está definida para múltiplos de pi!',
		cotUndefined: '¡cot no está definida para múltiplos de pi!',
		cothUndefined: '¡coth no está definida para 0!',
		cschUndefined: '¡csch no está definida para 0!',
		atanhUndefined: '¡Atanh no está definida para 0!',
		cannotCreateArrayFromNaN: '¡No se puede crear una matriz de NaN!',
		expressionExpected: '¡Se esperaba Expression! ¡Se recibió {{type}}!',

		// TeX Converter
		unrecognizedMode: '¡{{mode}} no es un modo válido!',
		// Polynomials
		notAPolynomial: '¡La expresión no es un polinomio válido!',
		multidegreeMismatch:
			'¡El número de variables debe coincidir con el multigrado del polinomio!',
		unknownVariable: '¡Variable desconocida! "{{variable}}"',
		// Matrix
		cannotCreateMatrix:
			'No se puede crear la matriz. ¡Las dimensiones de las filas no coinciden!',
		cannotMultiplyMatrix: '¡No se puede multiplicar la matriz!',
		squareMatrixRequired: '¡La matriz debe ser cuadrada!',
		rowsMustMatch: '¡Las filas de las matrices deben coincidir!',
		columnsMustMatch: '¡Las columnas de las matrices deben coincidir!',
		singularMatrix: '¡La matriz proporcionada es singular!',
		matrixExpected: '¡Matriz esperada! Se recibió {{type}}.',
		// Vector
		mismatchedDimensions: '¡Las dimensiones deben coincidir para la función "{{function}}"!',
		incorrectCrossDimension:
			'¡El producto vectorial sólo está definido para vectores de dimensión 3!',
		vectorExpected: '¡Vector esperado! Recibido. {{type}}.',
		// Polynomial
		univariatePolynomialOnly: '¡Esta función solo es compatible con polinomios univariados!',
		// Solve
		convergenceFailed: '¡No se logró la convergencia! Se intentaron {{iters}} iteraciones.',
		endPointIsRoot: 'El punto final es la raíz.',
		zeroDerivative: 'La derivada es cero en x = 0. No se puede continuar.',
		tooManyUnknowns: '¡Demasiadas incógnitas!',
		solveSystemInfiniteSolutions:
			'¡Este sistema no tiene un conjunto finito de soluciones aisladas!',
		solveSystemPolynomialOnly:
			'¡solveSystem actualmente solo admite sistemas lineales o polinómicos!',
		solveSystemNonRationalUnsupported:
			'¡Este sistema polinómico no lineal requiere resolución no racional o no simbólica, lo cual aún no está soportado!',
		// Set Function
		setJSFunctionExpectsFunction:
			'¡El parámetro de la función, al configurar una función JS, debe ser de tipo función!',
		functionRequiresMinAndMaxArgs:
			'¡Debes proporcionar los argumentos mínimo y máximo al configurar la función!',
	},
} as const;

type Language = keyof typeof ErrorMessages; // "eng" | "spa"
type ErrorType = keyof (typeof ErrorMessages)['eng']; // "notImplemented" | ...

export function message(e: ErrorType, values?: { [name: string]: string }) {
	const error = ErrorMessages[Settings.LANGUAGE as Language][e];
	return format(error, values || {});
}
