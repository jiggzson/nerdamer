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
		buildFunctionUnsupportedFunction:
			'buildFunction cannot compile the function "{{function}}" to JavaScript number arithmetic!',
		buildFunctionComplexUnsupported:
			'buildFunction cannot compile expressions containing the imaginary unit to JavaScript number arithmetic!',
		nonMatchingDimensions:
			"This operation cannot be completed because the dimensions don't match!",
		malformedExpression: 'Unable to parse malformed expression!',
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
		buildFunctionUnsupportedFunction:
			'¡buildFunction no puede compilar la función "{{function}}" a aritmética numérica de JavaScript!',
		buildFunctionComplexUnsupported:
			'¡buildFunction no puede compilar expresiones que contienen la unidad imaginaria a aritmética numérica de JavaScript!',
		nonMatchingDimensions:
			'¡Esta operación no se puede completar porque las dimensiones no coinciden!',
		malformedExpression: '¡No se puede analizar la expresión malformada!',
		divisionByZero: '¡La división por cero no está definida!',
		zeroToZeroPower: '¡0^0 no está definido!',
		infinityToPowerZero: '¡Infinito^0 no está definido!',
		infinityTimesZero: '¡0*Infinito no está definido!',
		infinityToInfinity: '¡Infinito^Infinito no está definido!',
		valueToInfinityUndefined: '{{value}}^Infinito no está definido!',
		atan2Undefined: '¡atan2 no está definida para 0, 0!',
		tanUndefined: '¡tan no está definida para múltiplos de pi / 2!',
		loopIterationLimitExceeded: 'El bucle superó el máximo de {{max}} iteraciones.',
		breakOutsideLoop: 'break solo se puede usar dentro de un bucle.',
		continueOutsideLoop: 'continue solo se puede usar dentro de un bucle.',
		letRequiresBindingsAndBody:
			'let requiere uno o más pares nombre/valor seguidos de una expresión de cuerpo.',

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
		zeroDerivative: 'La derivada es cero en x = {{x}}. No se puede continuar.',
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
	fra: {
		// General
		notImplemented: "Cette méthode n'a pas encore été implémentée.",
		noInverse: "Impossible de calculer l'inverse !",
		undefinedValue: "La valeur demandée n'est pas définie !",
		univariateInputOnly: "L'entrée de cette fonction doit être univariée !",
		differentSignsAtEndPointsRequired:
			'La fonction doit avoir des signes opposés aux extrémités a et b !',
		integerRequired: 'Cette fonction exige que le coefficient soit un entier !',
		plainVariableExpected: 'Une variable simple était attendue ! Reçu : {{input}}.',
		missingReference: "La référence « {{ref}} » n'existe pas dans ce modèle !",
		undefinedDivision: "La division n'est pas définie pour une expression de ce type ! {{type}}",
		restrictedVariableName:
			"Impossible d'affecter la valeur demandée au nom réservé « {{name}} » !",
		noVariableInExpression: "Aucune variable n'a été trouvée dans l'expression !",
		quadraticExpressionExpected: "L'expression doit être quadratique !",
		wrongInput: 'Entrée incorrecte ! {{expected}} était attendu, mais {{received}} a été reçu.',
		infinityMinusInfinityUndefined: "Infini moins infini n'est pas défini !",

		// Assumptions
		inconsistentAssumptions: 'Les hypothèses sont incohérentes (intersection vide) !',

		// Parser
		unsupportedType: "Le type fourni ({{type}}) n'est pas pris en charge par cette fonction !",
		unsupportedOperation: "Cette opération n'est actuellement pas prise en charge !",
		buildFunctionUnsupportedFunction:
			'buildFunction ne peut pas compiler la fonction « {{function}} » en arithmétique numérique JavaScript !',
		buildFunctionComplexUnsupported:
			"buildFunction ne peut pas compiler les expressions contenant l'unité imaginaire en arithmétique numérique JavaScript !",
		nonMatchingDimensions:
			'Cette opération ne peut pas être effectuée car les dimensions ne correspondent pas !',
		malformedExpression: "Impossible d'analyser l'expression mal formée !",
		divisionByZero: "La division par zéro n'est pas définie !",
		zeroToZeroPower: "0^0 n'est pas défini !",
		infinityToPowerZero: "Infini^0 n'est pas défini !",
		infinityTimesZero: "0*Infini n'est pas défini !",
		infinityToInfinity: "Infini^Infini n'est pas défini !",
		valueToInfinityUndefined: "{{value}}^Infini n'est pas défini !",
		atan2Undefined: "atan2 n'est pas définie pour 0, 0 !",
		tanUndefined: "tan n'est pas définie pour les multiples de pi/2 !",
		loopIterationLimitExceeded: 'La boucle a dépassé le maximum de {{max}} itérations.',
		breakOutsideLoop: "break ne peut être utilisé qu'à l'intérieur d'une boucle.",
		continueOutsideLoop: "continue ne peut être utilisé qu'à l'intérieur d'une boucle.",
		letRequiresBindingsAndBody:
			'let exige une ou plusieurs paires nom/valeur suivies d’une expression de corps.',

		secUndefined: "sec n'est pas définie pour les multiples impairs de pi/2 !",
		cscUndefined: "csc n'est pas définie pour les multiples de pi !",
		cotUndefined: "cot n'est pas définie pour les multiples de pi !",
		cothUndefined: "coth n'est pas définie pour 0 !",
		cschUndefined: "csch n'est pas définie pour 0 !",
		atanhUndefined: "atanh n'est pas définie pour 0 !",
		cannotCreateArrayFromNaN: 'Impossible de créer un tableau à partir de NaN !',
		expressionExpected: 'Une expression était attendue ! Reçu : {{type}} !',

		// TeX Converter
		unrecognizedMode: '« {{mode}} » n’est pas un mode valide !',
		// Polynomials
		notAPolynomial: "L'expression n'est pas un polynôme valide !",
		multidegreeMismatch:
			'Le nombre de variables doit correspondre au multidegré du polynôme !',
		unknownVariable: 'Variable inconnue ! « {{variable}} »',
		// Matrix
		cannotCreateMatrix:
			'Impossible de créer la matrice. Les dimensions des lignes ne correspondent pas !',
		cannotMultiplyMatrix: 'Impossible de multiplier la matrice !',
		squareMatrixRequired: 'La matrice doit être carrée !',
		rowsMustMatch: 'Les lignes des matrices doivent correspondre !',
		columnsMustMatch: 'Les colonnes des matrices doivent correspondre !',
		singularMatrix: 'La matrice fournie est singulière !',
		matrixExpected: 'Une matrice était attendue ! Reçu : {{type}}.',
		// Vector
		mismatchedDimensions: 'Les dimensions doivent correspondre pour la fonction « {{function}} » !',
		incorrectCrossDimension:
			'Le produit vectoriel est défini uniquement pour les vecteurs de dimension 3 !',
		vectorExpected: 'Un vecteur était attendu ! Reçu : {{type}}.',
		// Polynomial
		univariatePolynomialOnly:
			'Cette fonction est prise en charge uniquement pour les polynômes univariés !',
		// Solve
		convergenceFailed: 'Échec de la convergence ! {{iters}} itérations ont été tentées.',
		endPointIsRoot: "Le point d'extrémité est une racine.",
		zeroDerivative: 'La dérivée est nulle en x = {{x}}. Impossible de continuer.',
		tooManyUnknowns: "Trop d'inconnues !",
		solveSystemInfiniteSolutions:
			"Ce système ne possède pas un ensemble fini de solutions isolées !",
		solveSystemPolynomialOnly:
			'solveSystem prend actuellement en charge uniquement les systèmes linéaires ou polynomiaux !',
		solveSystemNonRationalUnsupported:
			'Ce système polynomial non linéaire nécessite une résolution non rationnelle ou non symbolique, qui n’est pas encore prise en charge !',
		// Set Function
		setJSFunctionExpectsFunction:
			'Le paramètre function lors de la définition d’une fonction JS doit être de type function !',
		functionRequiresMinAndMaxArgs:
			'Vous devez fournir un nombre minimal et maximal d’arguments lors de la définition de la fonction !',
	},
	deu: {
		// General
		notImplemented: 'Diese Methode wurde noch nicht implementiert.',
		noInverse: 'Die Inverse konnte nicht berechnet werden!',
		undefinedValue: 'Der angeforderte Wert ist nicht definiert!',
		univariateInputOnly: 'Die Eingabe für diese Funktion muss univariat sein!',
		differentSignsAtEndPointsRequired:
			'Die Funktion muss an den Endpunkten a und b unterschiedliche Vorzeichen haben!',
		integerRequired: 'Für diese Funktion muss der Koeffizient eine ganze Zahl sein!',
		plainVariableExpected: 'Eine einfache Variable wurde erwartet! Erhalten: {{input}}.',
		missingReference: 'Die Referenz „{{ref}}“ existiert in diesem Muster nicht!',
		undefinedDivision: 'Division ist für einen Ausdruck dieses Typs nicht definiert! {{type}}',
		restrictedVariableName:
			'Der angeforderte Wert kann dem reservierten Namen „{{name}}“ nicht zugewiesen werden!',
		noVariableInExpression: 'Im Ausdruck wurde keine Variable gefunden!',
		quadraticExpressionExpected: 'Der Ausdruck muss quadratisch sein!',
		wrongInput: 'Falsche Eingabe! Erwartet wurde {{expected}}, erhalten wurde {{received}}.',
		infinityMinusInfinityUndefined: 'Unendlich minus Unendlich ist nicht definiert!',

		// Assumptions
		inconsistentAssumptions: 'Die Annahmen sind widersprüchlich (leere Schnittmenge)!',

		// Parser
		unsupportedType: 'Der angegebene Typ ({{type}}) wird von dieser Funktion nicht unterstützt!',
		unsupportedOperation: 'Diese Operation wird derzeit nicht unterstützt!',
		buildFunctionUnsupportedFunction:
			'buildFunction kann die Funktion „{{function}}“ nicht in JavaScript-Zahlenarithmetik kompilieren!',
		buildFunctionComplexUnsupported:
			'buildFunction kann Ausdrücke mit der imaginären Einheit nicht in JavaScript-Zahlenarithmetik kompilieren!',
		nonMatchingDimensions:
			'Diese Operation kann nicht ausgeführt werden, weil die Dimensionen nicht übereinstimmen!',
		malformedExpression: 'Der fehlerhafte Ausdruck konnte nicht geparst werden!',
		divisionByZero: 'Division durch null ist nicht definiert!',
		zeroToZeroPower: '0^0 ist nicht definiert!',
		infinityToPowerZero: 'Unendlich^0 ist nicht definiert!',
		infinityTimesZero: '0*Unendlich ist nicht definiert!',
		infinityToInfinity: 'Unendlich^Unendlich ist nicht definiert!',
		valueToInfinityUndefined: '{{value}}^Unendlich ist nicht definiert!',
		atan2Undefined: 'atan2 ist für 0, 0 nicht definiert!',
		tanUndefined: 'tan ist für Vielfache von pi/2 nicht definiert!',
		loopIterationLimitExceeded: 'Die Schleife hat das Maximum von {{max}} Iterationen überschritten.',
		breakOutsideLoop: 'break kann nur innerhalb einer Schleife verwendet werden.',
		continueOutsideLoop: 'continue kann nur innerhalb einer Schleife verwendet werden.',
		letRequiresBindingsAndBody:
			'let benötigt ein oder mehrere Name/Wert-Paare, gefolgt von einem Ausdrucksrumpf.',

		secUndefined: 'sec ist für ungerade Vielfache von pi/2 nicht definiert!',
		cscUndefined: 'csc ist für Vielfache von pi nicht definiert!',
		cotUndefined: 'cot ist für Vielfache von pi nicht definiert!',
		cothUndefined: 'coth ist für 0 nicht definiert!',
		cschUndefined: 'csch ist für 0 nicht definiert!',
		atanhUndefined: 'atanh ist für 0 nicht definiert!',
		cannotCreateArrayFromNaN: 'Aus NaN kann kein Array erstellt werden!',
		expressionExpected: 'Ein Ausdruck wurde erwartet! Erhalten: {{type}}!',

		// TeX Converter
		unrecognizedMode: '„{{mode}}“ ist kein gültiger Modus!',
		// Polynomials
		notAPolynomial: 'Der Ausdruck ist kein gültiges Polynom!',
		multidegreeMismatch:
			'Die Anzahl der Variablen muss mit dem Multigrad des Polynoms übereinstimmen!',
		unknownVariable: 'Unbekannte Variable! „{{variable}}“',
		// Matrix
		cannotCreateMatrix:
			'Die Matrix kann nicht erstellt werden. Die Zeilendimensionen stimmen nicht überein!',
		cannotMultiplyMatrix: 'Die Matrix kann nicht multipliziert werden!',
		squareMatrixRequired: 'Die Matrix muss quadratisch sein!',
		rowsMustMatch: 'Die Zeilen der Matrizen müssen übereinstimmen!',
		columnsMustMatch: 'Die Spalten der Matrizen müssen übereinstimmen!',
		singularMatrix: 'Die angegebene Matrix ist singulär!',
		matrixExpected: 'Eine Matrix wurde erwartet! Erhalten: {{type}}.',
		// Vector
		mismatchedDimensions: 'Die Dimensionen müssen für die Funktion „{{function}}“ übereinstimmen!',
		incorrectCrossDimension:
			'Das Kreuzprodukt ist nur für Vektoren der Dimension 3 definiert!',
		vectorExpected: 'Ein Vektor wurde erwartet! Erhalten: {{type}}.',
		// Polynomial
		univariatePolynomialOnly:
			'Diese Funktion wird nur für univariate Polynome unterstützt!',
		// Solve
		convergenceFailed: 'Keine Konvergenz! {{iters}} Iterationen wurden versucht.',
		endPointIsRoot: 'Der Endpunkt ist eine Nullstelle.',
		zeroDerivative: 'Die Ableitung ist bei x = {{x}} null. Fortsetzung nicht möglich.',
		tooManyUnknowns: 'Zu viele Unbekannte!',
		solveSystemInfiniteSolutions:
			'Dieses System besitzt keine endliche Menge isolierter Lösungen!',
		solveSystemPolynomialOnly:
			'solveSystem unterstützt derzeit nur lineare oder polynomielle Systeme!',
		solveSystemNonRationalUnsupported:
			'Dieses nichtlineare polynomielle System erfordert eine nicht rationale oder nicht symbolische Lösung, die noch nicht unterstützt wird!',
		// Set Function
		setJSFunctionExpectsFunction:
			'Der Funktionsparameter muss beim Festlegen einer JS-Funktion vom Typ function sein!',
		functionRequiresMinAndMaxArgs:
			'Beim Festlegen der Funktion müssen minimale und maximale Argumentanzahl angegeben werden!',
	},
	por: {
		// General
		notImplemented: 'Este método ainda não foi implementado.',
		noInverse: 'Não foi possível calcular a inversa!',
		undefinedValue: 'O valor solicitado não está definido!',
		univariateInputOnly: 'A entrada desta função deve ser univariada!',
		differentSignsAtEndPointsRequired:
			'A função deve ter sinais opostos nos pontos extremos a e b!',
		integerRequired: 'Esta função exige que o coeficiente seja um número inteiro!',
		plainVariableExpected: 'Era esperada uma variável simples! Recebido: {{input}}.',
		missingReference: 'A referência "{{ref}}" não existe neste padrão!',
		undefinedDivision: 'A divisão não está definida para uma expressão deste tipo! {{type}}',
		restrictedVariableName:
			'Não é possível atribuir o valor solicitado ao nome reservado "{{name}}"!',
		noVariableInExpression: 'Nenhuma variável foi encontrada na expressão!',
		quadraticExpressionExpected: 'A expressão deve ser quadrática!',
		wrongInput: 'Entrada incorreta! Esperado {{expected}}, mas recebido {{received}}.',
		infinityMinusInfinityUndefined: 'Infinito menos infinito não está definido!',

		// Assumptions
		inconsistentAssumptions: 'As suposições são inconsistentes (interseção vazia)!',

		// Parser
		unsupportedType: 'O tipo fornecido ({{type}}) não é compatível com esta função!',
		unsupportedOperation: 'Esta operação não é suportada atualmente!',
		buildFunctionUnsupportedFunction:
			'buildFunction não pode compilar a função "{{function}}" para aritmética numérica JavaScript!',
		buildFunctionComplexUnsupported:
			'buildFunction não pode compilar expressões que contêm a unidade imaginária para aritmética numérica JavaScript!',
		nonMatchingDimensions:
			'Esta operação não pode ser concluída porque as dimensões não correspondem!',
		malformedExpression: 'Não foi possível analisar a expressão malformada!',
		divisionByZero: 'A divisão por zero não está definida!',
		zeroToZeroPower: '0^0 não está definido!',
		infinityToPowerZero: 'Infinito^0 não está definido!',
		infinityTimesZero: '0*Infinito não está definido!',
		infinityToInfinity: 'Infinito^Infinito não está definido!',
		valueToInfinityUndefined: '{{value}}^Infinito não está definido!',
		atan2Undefined: 'atan2 não está definida para 0, 0!',
		tanUndefined: 'tan não está definida para múltiplos de pi/2!',
		loopIterationLimitExceeded: 'O laço excedeu o máximo de {{max}} iterações.',
		breakOutsideLoop: 'break só pode ser usado dentro de um laço.',
		continueOutsideLoop: 'continue só pode ser usado dentro de um laço.',
		letRequiresBindingsAndBody:
			'let exige um ou mais pares nome/valor seguidos de uma expressão de corpo.',

		secUndefined: 'sec não está definida para múltiplos ímpares de pi/2!',
		cscUndefined: 'csc não está definida para múltiplos de pi!',
		cotUndefined: 'cot não está definida para múltiplos de pi!',
		cothUndefined: 'coth não está definida para 0!',
		cschUndefined: 'csch não está definida para 0!',
		atanhUndefined: 'atanh não está definida para 0!',
		cannotCreateArrayFromNaN: 'Não é possível criar um array a partir de NaN!',
		expressionExpected: 'Era esperada uma expressão! Recebido: {{type}}!',

		// TeX Converter
		unrecognizedMode: '"{{mode}}" não é um modo válido!',
		// Polynomials
		notAPolynomial: 'A expressão não é um polinômio válido!',
		multidegreeMismatch:
			'O número de variáveis deve corresponder ao multigrau do polinômio!',
		unknownVariable: 'Variável desconhecida! "{{variable}}"',
		// Matrix
		cannotCreateMatrix:
			'Não foi possível criar a matriz. As dimensões das linhas não correspondem!',
		cannotMultiplyMatrix: 'Não é possível multiplicar a matriz!',
		squareMatrixRequired: 'A matriz deve ser quadrada!',
		rowsMustMatch: 'As linhas das matrizes devem corresponder!',
		columnsMustMatch: 'As colunas das matrizes devem corresponder!',
		singularMatrix: 'A matriz fornecida é singular!',
		matrixExpected: 'Era esperada uma matriz! Recebido: {{type}}.',
		// Vector
		mismatchedDimensions: 'As dimensões devem corresponder para a função "{{function}}"!',
		incorrectCrossDimension:
			'O produto vetorial só é definido para vetores de dimensão 3!',
		vectorExpected: 'Era esperado um vetor! Recebido: {{type}}.',
		// Polynomial
		univariatePolynomialOnly:
			'Esta função é suportada apenas para polinômios univariados!',
		// Solve
		convergenceFailed: 'Falha na convergência! Foram tentadas {{iters}} iterações.',
		endPointIsRoot: 'O ponto extremo é uma raiz.',
		zeroDerivative: 'A derivada é zero em x = {{x}}. Não é possível continuar.',
		tooManyUnknowns: 'Muitas incógnitas!',
		solveSystemInfiniteSolutions:
			'Este sistema não possui um conjunto finito de soluções isoladas!',
		solveSystemPolynomialOnly:
			'solveSystem atualmente suporta apenas sistemas lineares ou polinomiais!',
		solveSystemNonRationalUnsupported:
			'Este sistema polinomial não linear exige resolução não racional ou não simbólica, que ainda não é suportada!',
		// Set Function
		setJSFunctionExpectsFunction:
			'O parâmetro da função, ao definir uma função JS, deve ser do tipo function!',
		functionRequiresMinAndMaxArgs:
			'É necessário fornecer os números mínimo e máximo de argumentos ao definir a função!',
	},
	ita: {
		// General
		notImplemented: 'Questo metodo non è ancora stato implementato.',
		noInverse: 'Impossibile calcolare l’inversa!',
		undefinedValue: 'Il valore richiesto non è definito!',
		univariateInputOnly: 'L’input di questa funzione deve essere univariato!',
		differentSignsAtEndPointsRequired:
			'La funzione deve avere segni opposti agli estremi a e b!',
		integerRequired: 'Questa funzione richiede che il coefficiente sia un numero intero!',
		plainVariableExpected: 'Era attesa una variabile semplice! Ricevuto: {{input}}.',
		missingReference: 'Il riferimento "{{ref}}" non esiste in questo modello!',
		undefinedDivision: 'La divisione non è definita per un’espressione di questo tipo! {{type}}',
		restrictedVariableName:
			'Impossibile assegnare il valore richiesto al nome riservato "{{name}}"!',
		noVariableInExpression: 'Nessuna variabile trovata nell’espressione!',
		quadraticExpressionExpected: 'L’espressione deve essere quadratica!',
		wrongInput: 'Input errato! Atteso {{expected}}, ricevuto {{received}}.',
		infinityMinusInfinityUndefined: 'Infinito meno infinito non è definito!',

		// Assumptions
		inconsistentAssumptions: 'Le ipotesi sono incoerenti (intersezione vuota)!',

		// Parser
		unsupportedType: 'Il tipo fornito ({{type}}) non è supportato da questa funzione!',
		unsupportedOperation: 'Questa operazione non è attualmente supportata!',
		buildFunctionUnsupportedFunction:
			'buildFunction non può compilare la funzione "{{function}}" nell’aritmetica numerica JavaScript!',
		buildFunctionComplexUnsupported:
			'buildFunction non può compilare espressioni contenenti l’unità immaginaria nell’aritmetica numerica JavaScript!',
		nonMatchingDimensions:
			'Questa operazione non può essere completata perché le dimensioni non corrispondono!',
		malformedExpression: 'Impossibile analizzare l’espressione non valida!',
		divisionByZero: 'La divisione per zero non è definita!',
		zeroToZeroPower: '0^0 non è definito!',
		infinityToPowerZero: 'Infinito^0 non è definito!',
		infinityTimesZero: '0*Infinito non è definito!',
		infinityToInfinity: 'Infinito^Infinito non è definito!',
		valueToInfinityUndefined: '{{value}}^Infinito non è definito!',
		atan2Undefined: 'atan2 non è definita per 0, 0!',
		tanUndefined: 'tan non è definita per multipli di pi/2!',
		loopIterationLimitExceeded: 'Il ciclo ha superato il massimo di {{max}} iterazioni.',
		breakOutsideLoop: 'break può essere usato solo all’interno di un ciclo.',
		continueOutsideLoop: 'continue può essere usato solo all’interno di un ciclo.',
		letRequiresBindingsAndBody:
			'let richiede una o più coppie nome/valore seguite da un’espressione corpo.',

		secUndefined: 'sec non è definita per multipli dispari di pi/2!',
		cscUndefined: 'csc non è definita per multipli di pi!',
		cotUndefined: 'cot non è definita per multipli di pi!',
		cothUndefined: 'coth non è definita per 0!',
		cschUndefined: 'csch non è definita per 0!',
		atanhUndefined: 'atanh non è definita per 0!',
		cannotCreateArrayFromNaN: 'Impossibile creare un array da NaN!',
		expressionExpected: 'Era attesa un’espressione! Ricevuto: {{type}}!',

		// TeX Converter
		unrecognizedMode: '"{{mode}}" non è una modalità valida!',
		// Polynomials
		notAPolynomial: 'L’espressione non è un polinomio valido!',
		multidegreeMismatch:
			'Il numero di variabili deve corrispondere al multigrado del polinomio!',
		unknownVariable: 'Variabile sconosciuta! "{{variable}}"',
		// Matrix
		cannotCreateMatrix:
			'Impossibile creare la matrice. Le dimensioni delle righe non corrispondono!',
		cannotMultiplyMatrix: 'Impossibile moltiplicare la matrice!',
		squareMatrixRequired: 'La matrice deve essere quadrata!',
		rowsMustMatch: 'Le righe delle matrici devono corrispondere!',
		columnsMustMatch: 'Le colonne delle matrici devono corrispondere!',
		singularMatrix: 'La matrice fornita è singolare!',
		matrixExpected: 'Era attesa una matrice! Ricevuto: {{type}}.',
		// Vector
		mismatchedDimensions: 'Le dimensioni devono corrispondere per la funzione "{{function}}"!',
		incorrectCrossDimension:
			'Il prodotto vettoriale è definito solo per vettori di dimensione 3!',
		vectorExpected: 'Era atteso un vettore! Ricevuto: {{type}}.',
		// Polynomial
		univariatePolynomialOnly:
			'Questa funzione è supportata solo per polinomi univariati!',
		// Solve
		convergenceFailed: 'Convergenza non riuscita! Sono state tentate {{iters}} iterazioni.',
		endPointIsRoot: 'Il punto estremo è una radice.',
		zeroDerivative: 'La derivata è zero in x = {{x}}. Impossibile continuare.',
		tooManyUnknowns: 'Troppe incognite!',
		solveSystemInfiniteSolutions:
			'Questo sistema non ha un insieme finito di soluzioni isolate!',
		solveSystemPolynomialOnly:
			'solveSystem attualmente supporta solo sistemi lineari o polinomiali!',
		solveSystemNonRationalUnsupported:
			'Questo sistema polinomiale non lineare richiede una risoluzione non razionale o non simbolica, che non è ancora supportata!',
		// Set Function
		setJSFunctionExpectsFunction:
			'Il parametro della funzione, quando si imposta una funzione JS, deve essere di tipo function!',
		functionRequiresMinAndMaxArgs:
			'È necessario fornire il numero minimo e massimo di argomenti quando si imposta la funzione!',
	},
	nld: {
		// General
		notImplemented: 'Deze methode is nog niet geïmplementeerd.',
		noInverse: 'Kan de inverse niet berekenen!',
		undefinedValue: 'De gevraagde waarde is niet gedefinieerd!',
		univariateInputOnly: 'De invoer voor deze functie moet univariaat zijn!',
		differentSignsAtEndPointsRequired:
			'De functie moet tegengestelde tekens hebben bij de eindpunten a en b!',
		integerRequired: 'Deze functie vereist dat de coëfficiënt een geheel getal is!',
		plainVariableExpected: 'Er werd een eenvoudige variabele verwacht! Ontvangen: {{input}}.',
		missingReference: 'De verwijzing "{{ref}}" bestaat niet in dit patroon!',
		undefinedDivision: 'Deling is niet gedefinieerd voor een uitdrukking van dit type! {{type}}',
		restrictedVariableName:
			'Kan de gevraagde waarde niet toewijzen aan de gereserveerde naam "{{name}}"!',
		noVariableInExpression: 'Geen variabele gevonden in de uitdrukking!',
		quadraticExpressionExpected: 'De uitdrukking moet kwadratisch zijn!',
		wrongInput: 'Onjuiste invoer! Verwacht: {{expected}}, ontvangen: {{received}}.',
		infinityMinusInfinityUndefined: 'Oneindig min oneindig is niet gedefinieerd!',

		// Assumptions
		inconsistentAssumptions: 'De aannames zijn inconsistent (lege doorsnede)!',

		// Parser
		unsupportedType: 'Het opgegeven type ({{type}}) wordt niet ondersteund voor deze functie!',
		unsupportedOperation: 'Deze bewerking wordt momenteel niet ondersteund!',
		buildFunctionUnsupportedFunction:
			'buildFunction kan de functie "{{function}}" niet compileren naar JavaScript-rekenkunde met getallen!',
		buildFunctionComplexUnsupported:
			'buildFunction kan uitdrukkingen met de imaginaire eenheid niet compileren naar JavaScript-rekenkunde met getallen!',
		nonMatchingDimensions:
			'Deze bewerking kan niet worden voltooid omdat de dimensies niet overeenkomen!',
		malformedExpression: 'Kan de onjuist gevormde uitdrukking niet parseren!',
		divisionByZero: 'Delen door nul is niet gedefinieerd!',
		zeroToZeroPower: '0^0 is niet gedefinieerd!',
		infinityToPowerZero: 'Oneindig^0 is niet gedefinieerd!',
		infinityTimesZero: '0*Oneindig is niet gedefinieerd!',
		infinityToInfinity: 'Oneindig^Oneindig is niet gedefinieerd!',
		valueToInfinityUndefined: '{{value}}^Oneindig is niet gedefinieerd!',
		atan2Undefined: 'atan2 is niet gedefinieerd voor 0, 0!',
		tanUndefined: 'tan is niet gedefinieerd voor veelvouden van pi/2!',
		loopIterationLimitExceeded: 'De lus heeft het maximum van {{max}} iteraties overschreden.',
		breakOutsideLoop: 'break kan alleen binnen een lus worden gebruikt.',
		continueOutsideLoop: 'continue kan alleen binnen een lus worden gebruikt.',
		letRequiresBindingsAndBody:
			'let vereist een of meer naam/waarde-paren gevolgd door een hoofdexpressie.',

		secUndefined: 'sec is niet gedefinieerd voor oneven veelvouden van pi/2!',
		cscUndefined: 'csc is niet gedefinieerd voor veelvouden van pi!',
		cotUndefined: 'cot is niet gedefinieerd voor veelvouden van pi!',
		cothUndefined: 'coth is niet gedefinieerd voor 0!',
		cschUndefined: 'csch is niet gedefinieerd voor 0!',
		atanhUndefined: 'atanh is niet gedefinieerd voor 0!',
		cannotCreateArrayFromNaN: 'Kan geen array maken van NaN!',
		expressionExpected: 'Er werd een uitdrukking verwacht! Ontvangen: {{type}}!',

		// TeX Converter
		unrecognizedMode: '"{{mode}}" is geen geldige modus!',
		// Polynomials
		notAPolynomial: 'De uitdrukking is geen geldig polynoom!',
		multidegreeMismatch:
			'Het aantal variabelen moet overeenkomen met de multigraad van het polynoom!',
		unknownVariable: 'Onbekende variabele! "{{variable}}"',
		// Matrix
		cannotCreateMatrix:
			'Kan de matrix niet maken. De rijafmetingen komen niet overeen!',
		cannotMultiplyMatrix: 'Kan de matrix niet vermenigvuldigen!',
		squareMatrixRequired: 'De matrix moet vierkant zijn!',
		rowsMustMatch: 'De rijen van de matrices moeten overeenkomen!',
		columnsMustMatch: 'De kolommen van de matrices moeten overeenkomen!',
		singularMatrix: 'De opgegeven matrix is singulier!',
		matrixExpected: 'Er werd een matrix verwacht! Ontvangen: {{type}}.',
		// Vector
		mismatchedDimensions: 'De dimensies moeten overeenkomen voor de functie "{{function}}"!',
		incorrectCrossDimension:
			'Het kruisproduct is alleen gedefinieerd voor vectoren met dimensie 3!',
		vectorExpected: 'Er werd een vector verwacht! Ontvangen: {{type}}.',
		// Polynomial
		univariatePolynomialOnly:
			'Deze functie wordt alleen ondersteund voor univariate polynomen!',
		// Solve
		convergenceFailed: 'Convergentie mislukt! Er zijn {{iters}} iteraties geprobeerd.',
		endPointIsRoot: 'Het eindpunt is een wortel.',
		zeroDerivative: 'De afgeleide is nul bij x = {{x}}. Kan niet doorgaan.',
		tooManyUnknowns: 'Te veel onbekenden!',
		solveSystemInfiniteSolutions:
			'Dit stelsel heeft geen eindige verzameling geïsoleerde oplossingen!',
		solveSystemPolynomialOnly:
			'solveSystem ondersteunt momenteel alleen lineaire of polynomiale stelsels!',
		solveSystemNonRationalUnsupported:
			'Dit niet-lineaire polynomiale stelsel vereist een niet-rationele of niet-symbolische oplossing, die nog niet wordt ondersteund!',
		// Set Function
		setJSFunctionExpectsFunction:
			'De functieparameter moet bij het instellen van een JS-functie van het type function zijn!',
		functionRequiresMinAndMaxArgs:
			'U moet het minimale en maximale aantal argumenten opgeven bij het instellen van de functie!',
	},
} as const;

/** Internal language keys supported by the message catalog. */
export type Language = keyof typeof ErrorMessages;
type ErrorType = keyof (typeof ErrorMessages)['eng']; // "notImplemented" | ...

/** Formats an internal localized error message with named template values. */
export function message(e: ErrorType, values?: { [name: string]: string }) {
	const error = ErrorMessages[Settings.LANGUAGE][e];
	return format(error, values || {});
}
