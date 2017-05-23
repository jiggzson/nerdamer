export as namespace nerdamer
export = nerdamer
declare function nerdamer(
	expression: nerdamer.ExpressionParam,
	subs?: { [name: string]: string },
	option?: keyof nerdamer.Options | (keyof nerdamer.Options)[],
	location?: nerdamer.int): nerdamer.Expression
declare namespace nerdamer {
	export type ExpressionParam = Expression | string
	export interface Options {
		numer: never, expand: never
	}
	type int = number
	/**
	 * Returns the current version of nerdamer.
	 */
	export function version(): string

	/**
	 * Sets a constant value which nerdamer will automatically substitute when parsing expression/equation
	 * @param name The variable to be set as the constant.
	 * @param value The value for the expression to be set to.
	 */
	export function setConstant(name: string, value: number | string): typeof nerdamer

	/**
	 * Sets a function which can then be called using nerdamer.
	 * @param function_name The function name
	 * @param param_array The parameter array in the order in which the arguments are to be passed
	 * @param function_body The body of the function
	 * @example
	 * nerdamer.setFunction('f', ['x', 'y'], 'x^2+y')
	 * var x = nerdamer('f(4, 7)').toString()
	 * console.log(x.toString())
	 * nerdamer.setFunction('g', ['z', 'x', 'y'], '2*x+3*y+4*z')
	 * x = nerdamer('g(3, 1, 2)')
	 * console.log(x.toString())
	 */
	export function setFunction(function_name: string, param_array: string[], function_body: string): typeof nerdamer

	/**
	 * Returns the nerdamer core object. This object contains all the core functions of nerdamer and houses the parser.
	 * @example
	 * Object.keys(nerdamer.getCore())
	 */
	export function getCore(): any

	/**
	 * Gets the list of reserved names. This is a list of names already in use by nerdamer excluding variable names. This is not a static list.
	 * @param asArray Pass in true to get the list back as an array instead of as an object.
	 */
	export function reserved(asArray: true): string[]
	export function reserved(asArray?: false): any

	/**
	 * Clears all stored expressions.
	 * @example
	 * var x = nerdamer('x*x')
	 console.log(nerdamer.expressions())
	 nerdamer.flush() //clear all expressions
	 console.log(nerdamer.expressions())
	 */
	export function flush(): typeof nerdamer

	/**
	 * Converts and expression to LaTeX without evaluating expression.
	 * @param expression The expression being converted.
	 */
	export function convertToLaTeX(expression: string): string

	/**
	 * Each time an expression is parsed nerdamer stores the result. Use this method to get back stored expressions.
	 * @param asObject Pass in true to get expressions as numbered object with 1 as starting index
	 * @param asLatex Pass in the string "LaTeX" to get the expression to LaTeX, otherwise expressions come back as strings
	 */
	export function expressions(asObject?: boolean, asLatex?: 'LaTeX'): string[]

	/**
	 * Registers a module function with nerdamer. The object needs to contain at a minimum, a name property (text), a numargs property (int), this is -1 for variable arguments or an array containing the min and max arguments, the visible property (bool) which allows use of this function through nerdamer, defaults to true, and a build property containing a function which returns the function to be used. This function is also handy for creating aliases to functions. See below how the alias D was created for the diff function).
	 * @param o
	 */
	export interface ModuleFunction {
		/**
		 * Name of function.
		 */
		name: string,

		/**
		 * Number of function arguments, -1 for variable arguments or an tuple containing minimum and maximum number of arguments.
		 */
		numargs: int | [int, int],

		/**
		 * Allows use of this function through nerdamer. Defaults to true.
		 */
		visible?: boolean,

		/**
		 * Return the function to be used.
		 */
		build(): (...args: number[]) => number
	}

	/**
	 * Registers one or more module functions with nerdamer.
	 * @param f
	 * @example
	 * var core = nerdamer.getCore()
	 var _ = core.PARSER
	 function f(a, b) {
//use clone for safety since a or b might be returned
var sum = _.add(a.clone(), b.clone())
var product = _.multiply(a.clone(), b.clone())
return _.multiply(sum, product)
}
	 //register the function with nerdamer
	 nerdamer.register({
   name: 'myFunction',
   numargs: 2,
   visible: true,
   build: function(){ return f }
})

	 //create an alias for the diff function
	 var core = nerdamer.getCore()
	 nerdamer.register({
    name: 'D',
    visible: true,
    numargs: [1, 3],
    build: function(){ return core.Calculus.diff }
})
	 */
	export function register(f: ModuleFunction | ModuleFunction[]): typeof nerdamer

	/**
	 * This method can be used to check that the variable meets variable name requirements for nerdamer. Variable names Must start with a letter or underscore and may contains any combination of numbers, letters, and underscores after that.
	 * @param variable_name The variable name being validated.
	 * @example
	 * nerdamer.validVarName('cos') // false
	 * nerdamer.validVarName('chicken1') // true
	 * nerdamer.validVarName('1chicken') // false
	 * nerdamer.validVarName('_') // true
	 */
	export function validVarName(variable_name: string): boolean

	/**
	 * Sets a known value in nerdamer. This differs from setConstant as the value can be overridden trough the scope. See example.
	 * @param name The known value to be set.
	 * @param value The value for the expression to be set to
	 * @example
	 * nerdamer.setVar('x', '11')
	 * nerdamer('x*x') // == 121
	 * // nerdamer will use 13 instead of 11:
	 * nerdamer('x*x', {x: 13}) // == 169
	 * // the value will be 121 again since the known value isn't being overridden:
	 * nerdamer('x*x') // == 121
	 * nerdamer.setVar('x', 'delete')
	 * // since there no longer is a known value it will just be evaluated symbolically:
	 * nerdamer('x*x') // == x^2
	 */
	export function setVar(name: string, value: number | string | 'delete'): void

	/**
	 * Clears all previously set variables.
	 */
	export function clearVars(): typeof nerdamer

	/**
	 * Gets all previously set variables.
	 * @param option Use "LaTeX" to get as LaTeX. Defaults to text.
	 */
	export function getVars(option: 'LaTeX' | 'text'): { [name: string]: string }

	/**
	 * Sets the value of a nerdamer setting. Currently PARSE2NUMBER and IMAGINARY. Setting PARSE2NUMBER to true will let nerdamer always try to return a number whenenver possible. IMAGINARY allows you to change the variable used for imaginary to j for instance.
	 * @param setting The setting to be changed
	 * @param value The value to set the setting to.
	 * @example
	 * nerdamer.set('PARSE2NUMBER', true)
	 * nerdamer('cos(9)+1') // == 14846499/167059106
	 * nerdamer.set('IMAGINARY', 'j')
	 * nerdamer('sqrt(-1)') // == j
	 */
	export function set(setting: 'PARSE2NUMBER', value: boolean): typeof nerdamer
	export function set(setting: 'IMAGINARY', value: string | 'i'): typeof nerdamer
	export function set(setting: 'POWER_OPERATOR', value: '**' | '^'): typeof nerdamer

	export interface Expression {
		/**
		 * Generates a JavaScript function given the expression. This is perfect for plotting and filtering user input. Plotting for the demo is accomplished using this. The order of the parameters is in alphabetical order by default but an argument array can be provided with the desired order.
		 * @param args_array The argument array with the order in which they are preferred.
		 */
		buildFunction(args_array: string[]): (...args: number[]) => number

		/**
		 * Forces evaluation of the expression.
		 * @example
		 * const x = nerdamer('sin(9+5)')
		 * //the expression is simplified but the functions aren't called:
		 * x.toString() // == sin(14)
		 * // force function calls with evaluate:
		 * x.evaluate().toString() // == 127690464/128901187
		 */
		evaluate(): Expression

		/**
		 * Substitutes a given value for another given value
		 * @param value The value being substituted.
		 * @param for_value The value to substitute for.
		 */
		sub(value: string, for_value: string): Expression

		/**
		 * Get a list of the variables contained within the expression.
		 */
		variables(): string[]

		/**
		 * Gets expression as LaTeX
		 */
		toTeX(): string

		/**
		 * Gets the list of reserved names. This is a list of names already in use by nerdamer excluding variable names. This is not a static list.
		 * @param outputType Pass in the string 'decimals' to always get back numers as decimals. Pass in the string 'fractions' to always get back number as fractions. Defaults to decimals.
		 */
		text(outputType?: 'decimals' | 'fractions'): string

		/**
		 * This method requires that the Solve, Calculus, and Algebra add-ons are loaded. It will attempt to solve an equation. If solutions no solutions are found then an empty array is returned. It can solve for multivariate polynomials up to the third degree. After which it can solve numerically for polynomials up to the the 100th degree. If it's a univariate equation it will attempt to solve it using numerical methods.
		 * @param variable The variable to solve for.
		 * @example
		 * nerdamer('a*x^2+b*x=y').evaluate({y: 'x-7'}) // == ??
		 * eq.solveFor('x') // ?? TODO
		 */
		solveFor(variable: string): Expression
	}

	////////// CALCULUS

	/**
	 * Gets the GCD of 2 polynomials
	 * @param expression Returns the appropriate value if possible otherwise it returns the function with the simplified expression.
	 * @param index The index of summation.
	 * @param lower Starting index.
	 * @param upper Ending index.
	 */
	export function sum(expression: ExpressionParam,
					    index: string,
	  					lower: ExpressionParam, 
	  					upper: ExpressionParam): Expression

	/**
	 *
	 * @param expression Returns the appropriate value if possible otherwise it returns the function with the simplified expression.
	 * @param variable The variable with respect to which to integrate.
	 */
	export function integrate(expression: ExpressionParam, variable: string): Expression

	/**
	 *
	 * @param expression Returns the appropriate value if possible otherwise it returns the function with the simplified expression.
	 * @param variable The variable with respect to which to differentiate.
	 * @param n Calculate the nth derivative.
	 */
	export function diff(expression: ExpressionParam, variable: string, n?: int): Expression

	////////// ALGEBRA

	/**
	 * Divides 2 polynominals.
	 * @param expression Returns the appropriate value if possible otherwise it returns the function with the simplified expression.
	 */
	export function divide(expression: ExpressionParam): Expression

	/**
	 * Factor an expression.
	 * @param expression Returns the appropriate value if possible otherwise it returns the function with the simplified expression.
	 */
	export function factor(expression: ExpressionParam): Expression

	/**
	 * Gets the GCD of 2 polynomials.
	 * @param expression Returns the appropriate value if possible otherwise it returns the function with the simplified expression.
	 */
	export function gcd(expression: ExpressionParam): Expression

	/**
	 * Finds the roots of a univariate polynomial.
	 * @param expression
	 */
	export function factor(expression: ExpressionParam): Expression
}