import { format } from "./functions/string";
import { Settings } from "./Settings";

export class UnexpectedTokenError extends Error { }
export class UnexpectedDataType extends Error { }
export class OperatorError extends Error { }
export class ParserError extends Error { }
export class UndefinedError extends Error { }
export class PolynomialError extends Error { }
export class UnsupportedOperationError extends Error { }
export class ParserSyntaxError extends Error { }
export class MathError extends Error { }
export class NaNError extends Error { }

export const ErrorMessages: { [type: string]: { [language: string]: string } } = {
    eng: {
        // Parser
        unsupportedType: "The provided type ({{type}}) is not supported for this function!",
        unsupportedOperation: "This operation is currently not supported!",
        nonMatchingDimensions: "This operation cannot be completed because the dimensions don't match!",
        malformedExpression: "Unable to parse malformed expression!",
        divisionByZero: 'Division by zero is not defined!',
        infinityToPowerZero: 'Infinity^0 is not defined!',
        infinityTimesZero: '0*Infinity is not defined!',
        infinityToInfinity: 'Infinity^Infinity is not defined!',
        valueToInfinityUndefined: '{{value}}^Infinity is not defined!',
        atan2Undefined: 'atan2 is undefined for 0, 0!',
        tanUndefined: 'tan is undefined for multiples of pi/2!',
        atanhUndefined: 'atanh is undefined for 0!',
        cannotCreateArrayFromNaN: 'Cannot create array from NaN!',
        expressionExpected: 'Expression expected!. Received {{type}}!',

        // TeX Converter. 
        unrecognizedMode: '"{{mode}}" is is not a valid mode!',
        // Polynomials
        notAPolynomial: "The expression is not a valid polynomial!",
        multidegreeMismatch: "The number of variables must match the multidegree of the polynomial!",
        // Matrix
        cannotCreateMatrix: "Unable to create Matrix. Row dimensions do not match!",
        squareMatrixRequired: "The matrix must be square!",
        rowsMustMatch: "The rows of the matrices must match!",
        columnsMustMatch: "The columns of the matrices must match!",
    },
    spa: {
        // Parser
        unsupportedType: "¡El tipo ({{type}}) proporcionado no es compatible con esta función!",
        unsupportedOperation: "¡Esta operación no está soportada actualmente!",
        nonMatchingDimensions: "¡Esta operación no se puede completar porque las dimensiones no coinciden!",
        malformedExpression: "¡No se puede analizar la expresión malformada!",
        divisionByZero: '¡La división por cero no está definida!',
        infinityToPowerZero: '¡Infinito^0 no está definido!',
        infinityTimesZero: '¡0*Infinito no está definido!',
        infinityToInfinity: '¡Infinito^Infinito no está definido!',
        valueToInfinityUndefined: '{{value}}^Infinito no está definido!',
        atan2Undefined: '¡atan2 no está definida para 0, 0!',
        tanUndefined: '¡tan no está definida para múltiplos de pi / 2!',
        atanhUndefined: '¡Atanh no está definida para 0!',
        cannotCreateArrayFromNaN: '¡No se puede crear una matriz de NaN!',
        expressionExpected: '¡Se esperaba Expression! ¡Se recibió {{type}}!',

        // TeX Converter
        unrecognizedMode: '¡{{mode}} no es un modo válido!',
        // Polynomials
        notAPolynomial: "¡La expresión no es un polinomio válido!",
        multidegreeMismatch: "¡El número de variables debe coincidir con el multigrado del polinomio!",
        // Matrix
        cannotCreateMatrix: "No se puede crear la matriz. ¡Las dimensiones de las filas no coinciden!",
        squareMatrixRequired: "¡La matriz debe ser cuadrada!",
        rowsMustMatch: "¡Las filas de las matrices deben coincidir!",
        columnsMustMatch: "¡Las columnas de las matrices deben coincidir!",
    }
}

export function __(errorType: keyof typeof ErrorMessages, values?: { [name: string]: string }) {
    const error = ErrorMessages[Settings.LANGUAGE][errorType];
    return format(error, values || {});
}