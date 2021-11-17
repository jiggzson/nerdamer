[![Build Status](https://travis-ci.org/jiggzson/nerdamer.svg?branch=master)](https://travis-ci.org/jiggzson/nerdamer)

Nerdamer
========

As of version 0.5.0, the library is split into the core and optional add-ons which can be loaded after the core has been loaded.

Getting started with Nerdamer

Load the library in your html page

```html
<!-- assuming you've saved the file in the root of course -->
<!-- This the core and the only file needed if all you'll be doing is evaluating expresssions -->
<script src="nerdamer.core.js"></script> 
<!-- LOAD ADD-ONS. These files contain extended functions. See documentation -->
<!-- again assuming you've saved the files in root -->
<script src="Algebra.js"></script>
<script src="Calculus.js"></script>
<script src="Solve.js"></script>
<script src="Extra.js"></script>
```
Or import everything
```html
<script src="all.min.js"></script>  <!-- assuming you've saved the file in the root -->
```
If you're using node.js install it using `npm i nerdamer` and then

```javascript
// const cannot be used since nerdamer gets modified when other modules are loaded  
var nerdamer = require('nerdamer'); 
// Load additional modules. These are not required.  
require('nerdamer/Algebra'); 
require('nerdamer/Calculus'); 
require('nerdamer/Solve'); 
require('nerdamer/Extra');
```
Or do a single import to import everything
```javascript
const nerdamer = require("nerdamer/all.min")
```

Some functions have dependencies from other add-ons. 

You can see nerdamer in action at http://nerdamer.com/demo

For full documentation go to http://nerdamer.com/documentation

All operations are done using the 'nerdamer' object. 

To add an expression just add it to the nerdamer object which will return a `Expression` object.

```javascript             
var e = nerdamer('x^2+2*(cos(x)+x*x)');
console.log(e.text());

//result: 
//2*cos(x)+3*x^2
```            
It is also possible to use `nerdamer` functions directly within the need for string manipulation of the input. The input will be parsed and the output will of type `Expression`. For example:
```javascript
var ans = nerdamer.expand('(x-1)^5');
console.log(ans.text());
// -1-10*x^2-5*x^4+10*x^3+5*x+x^5

var sol = nerdamer.solve('x^2-4', 'x');
console.log(sol.text())
// [2,-2]
```

You can also pass in an object with known values as the second parameter.

```javascript             
var e = nerdamer('x^2+2*(cos(x)+x*x)',{x:6});
console.log(e.text());

//result:
//108+2*cos(6)
```            
        

As you can see only the substitution is performed. To evaluate the result just call evaluate. 
Note that evaluate returns a text string or a number not an object.

```javascript             
var e = nerdamer('x^2+2*(cos(x)+x*x)',{x:6}).evaluate();
console.log(e.text());

//result:
//109.9203405733006
```            
To get back the text as a fraction, call the text method and pass in the string 'fractions'.

```javascript             
var e = nerdamer('x^2+2*(cos(x)+x*x)',{x:6}).evaluate();
console.log(e.text('fractions'));

//result:
//429607273/3908351
```    
You can get your expression back as LaTeX by calling the toTeX method
```javascript             
var LaTeX = nerdamer('x^2+2*(cos(x)+x*x)',{x:0.25}).toTeX();
console.log(LaTeX);

//result:
//2 \cdot \mathrm{cos}\left(\frac{1}{4}\right)+\frac{3}{16}
```   

To have numbers returned as decimals pass in the string 'decimals' to the toTeX method

```javascript             
var LaTeX = nerdamer('x^2+2*(cos(x)+x*x)',{x:0.25}).toTeX('decimal');
console.log(LaTeX);

//result:
//2 \cdot \mathrm{cos}\left(0.25\right)+0.1875
```   

Alternatively you can pass an object containing known values into evaluate method instead. The values passed in don't have to be number they can be another expression if needed.

```javascript             
var e = nerdamer('x^2+2*(cos(x)+x*x)',{x:'x^2+1'});
console.log(e.text());

//result:
//2*cos(1+x^2)+3*(1+x^2)^2
```            

Every time you parse an expression it's stored in nerdamer. To get a list of all the expressions you just call 
nerdamer.expressions().

```javascript             
var knownValues = {x:'x^2+1'};
nerdamer('x^2+2*(cos(x)+x*x)').evaluate(knownValues);
nerdamer('sin(x)^2+cos(x)^2').evaluate(knownValues);

console.log(nerdamer.expressions());

//result:
//[ 46.692712758272776, 1 ]
```            

You can request it as an object as well by passing in true. This can be convenient in some 
situations as the numbering starts at 1;

```javascript             
var knownValues = {x:'x^2+1'};
nerdamer('x^2+2*(cos(x)+x*x)', knownValues );
nerdamer('sin(x)^2+cos(x)^2', knownValues );

console.log(nerdamer.expressions(true));

//{ '1': '2*cos(1+x^(2))+3*(1+x^(2))^(2)',
//'2': 'cos(1+x^(2))^(2)+sin(1+x^(2))^(2)' }
```            
        
Functions aren't always immediately parsed to numbers. For example

```javascript
var result = nerdamer('cos(x)',{x:6});
console.log(result.text());
//cos(6)
```
will only subsitute out the variable name. To change this behaviour numer should be passed in as the 3rd argument.

```javascript
var result = nerdamer('cos(x)',{x:6}, 'numer');
console.log(result.text());
//0.960170286650366
```
or alternatively

```javascript
var result = nerdamer('cos(x)').evaluate({x:6});
console.log(result.text());
//0.960170286650366
```
The difference however is that the first option directly substitutes the variables while the second first evaluates
the expression and then makes the substitutions. This library utilizes native javascript functions as much as possible. As a result it inherits whatever rounding errors they possess. One major change with version 0.6.0 however, is dealing with floating point issues.

```javascript
var result = nerdamer('sqrt(x)*sqrt(x)-2', {x: 2});
console.log(result.text());
//0
```
The above expample now returns zero whereas in previous version the result would be 4.440892098500626e-16. Same goes for 0.1+0.2.

An expression can be replaced directly by passing in the index of which expression to override. For example

```javascript
nerdamer('cos(x)',{x:6}, 'numer');
nerdamer('sin(x)+y',{x:6}, null, 1);
console.log(nerdamer.expressions());
//[ 'sin(6)+y' ]
```

If multiple modifier options need to be passed into nerdamer you can do so using an array. For example ...

```javascript
var e = nerdamer('cos(x)+(y-x)^2', {x:7}, ['expand', 'numer']);
console.log(e.text());
//-14*y+y^2+49.7539022543433
```

If you need the code as LaTeX you can pass in true as the second parameter when requesting the expressions.

```javascript             
nerdamer('x^2+2*(cos(x)+x*x)');
nerdamer('sin(x)^0.25+cos(x)^0.5' );
var asObject = true;
var asLaTeX = true;
console.log(nerdamer.expressions(asObject, asLaTeX));

/*{ '1': '2 \\cdot \\mathrm{cos}\\left(x\\right)+3 \\cdot x^{2}',
  '2': '\\sqrt{\\mathrm{cos}\\left(x\\right)}+\\mathrm{sin}\\left(x\\right)^{\\frac{1}{4}}' }*/
```            
        

You can specify a particular location when adding an expression, which is specified with the third parameter.

```javascript 
nerdamer('x^2+2*(cos(x)+x*x)');
nerdamer('sin(x)^0.25+cos(x)^0.5' );
nerdamer('expr-override', undefined, 2 );
var asObject = false;
var asLaTeX = true;
console.log(nerdamer.expressions(asObject, asLaTeX));

/* [ '2 \\cdot \\mathrm{cos}\\left(x\\right)+3 \\cdot x^{2}',
  '\\sqrt{\\mathrm{cos}\\left(x\\right)}+\\mathrm{sin}\\left(x\\right)^{\\frac{1}{4}}',
  'expr-override' ]
 */
```

Here's an example of reserved variable and function names.

```javascript 
var reserved = nerdamer.reserved();
console.log(reserved);
//result:
/* csc, sec, cot, erf, fact, mod, GCD, QGCD, LCM, pow, PI, E, cos, sin, tan, acos, asin, atan, sinh, cosh, tanh, asinh, acosh, atanh, exp, min, max, floor, ceil, round, vector, matrix, parens, sqrt, log, expand, abs, invert, transpose, dot */

//or as an array

var reserved = nerdamer.reserved(true);
console.log(reserved);
//result:
/* [ 'csc', 'sec', 'cot', 'erf', 'fact', 'mod', 'GCD', 'QGCD', 'LCM', 'pow', 'PI', 'E', 'cos', 'sin', 'tan', 'acos', 'asin', 'atan', 'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh', 'exp', 'min', 'max', 'floor', 'ceil', 'round', 'vector', 'matrix',
  'parens', 'sqrt', 'log', 'expand', 'abs', 'invert', 'transpose', 'dot' ]  */
```            

Most math functions are passed in as part of the expression. If you want to differentiate for instance you just use the function diff which is located in the Calculus add-on as of version 0.5.0

```javascript             
var e = nerdamer('diff(x^2+2*(cos(x)+x*x),x)');

console.log(e.text());

//result: 
//-2*sin(x)+6*x
```
        

Nerdamer can also handle runtime functions. To do this use the method setFunction. 
The runtime functions do have symbolic capabilities and support for imaginary numbers. 
The setfunction method is used as follows:

nerdamer.setFunction( function_name, parameter_array, function_body ) 

For Example:

```javascript             
//generate some points
var f = function(x) { return 5*x-1; }
console.log(f(1)); //4
console.log(f(2)); //9 - value to be found
console.log(f(7)); //34

nerdamer.setFunction('interpolate',['y0','x0','y1','x1','x'],'y0+(y1-y0)*((x-x0)/(x1-x0))')
var answer = nerdamer('interpolate(4,1,34,7,2)').evaluate();

console.log(answer);

//result: 9
```

Custom functions alternatively be set in following manner.

```javascript
nerdamer('hyp(a, b) := sqrt(a^2 + b^2) ');
var result = nerdamer('hyp(3, 4)').evaluate().text();
console.log(result);
//result: 5
```


If you need to add a constant use the setConstant method

```javascript             
nerdamer.setConstant( 'g', 9.81);
var weight = nerdamer('100*g').text();
console.log(weight);
//result:
//981
```            
        
To delete just set it to delete

```javascript             
nerdamer.setConstant( 'g', 9.81);
var weight = nerdamer('100*g').text();
console.log(weight);
//981
nerdamer.setConstant( 'g', 'delete');
var weight = nerdamer('100*g').text();
console.log(weight);
//100*g
```        

You also have the option of exporting your function to a javascript function which can be useful if you need some 
filtering from user input. Do keep in mind that the parameters are sorted alphabetically for more than one 
parameter. To use it add the expression to nerdamer and use the buildFunction method.

```javascript             
var f = nerdamer('x^2+5').buildFunction();
console.log(f(9));

//result:
//86
```            
If you have a particular order in which you need the parameters to be set, then you pass in an array with the variables in the order in which you want them for instance:

 ```javascript
var f = nerdamer('z+x^2+y').buildFunction(['y', 'x', 'z']);
 console.log(f(9,2,1));
 //result
 //14
 ```

Every time you add an expression to nerdamer it's stored. To list the expressions currently in nerdamer call 
the 'expressions' method. To delete an expression use the 'clear' method and pass in the expression you want to delete. 
To clear everything pass in the string 'all'.

```javascript            
nerdamer('n*R*T/v');
nerdamer('mc^2');
nerdamer('G*m1*m2/d^2');

nerdamer.clear(2);

console.log(nerdamer.expressions(true));

//result:
//{ '1': 'R*T*n*v^(-1)', '2': 'G*d^(-2)*m1*m2' }

nerdamer.clear('all');
console.log(nerdamer.expressions(true));
//result:
//{}
```            
     
If you need go get the variables of an expression use the variables method. This method can be called after
nerdamer was provided an expression. For example

```javascript
var variables = nerdamer('csc(x*cos(y))-no_boring_x').variables();
console.log(variables);
//result:
//[ 'no_boring_x', 'x', 'y' ]
```

The order in which the variables appear require a little bit of knowledge of how nerdamer organizes symbols. For the
sake of simplicity we'll just assume that there is no particular order   

----------------------------------------------------------------------------------------------------------------------

Using the solver
===============
To solve equations first load Solve.js. Just remember that Solve also required Algebra.js and Calculus.js to be loaded. You can then solve equations using nerdamer. Important: State the variable for which you are trying to solve.
```javascript
var sol = nerdamer.solveEquations('x^3+8=x^2+6','x');
console.log(sol.toString());
//1+i,-i+1,-1
```

Notice that we use toString rather than text as this returns a javascript array.

You can also solve an expression
```javascript
var e = nerdamer.solveEquations('x^2+4-y', 'y');
console.log(e[0].text());
//4+x^2
```

You can also solve multivariate equations
```javascript
var sol = nerdamer.solveEquations('x^2+8+y=x+6','x');
console.log(sol.toString());
//0.5*((-4*y-7)^0.5+1),0.5*(-(-4*y-7)^0.5+1)
```
You can do up to 3rd order polynomials for multivariate polynomials

Additionally you can try for equations containing functions. This is more of a hit or miss approach unlike single variable polynomials (which uses Mr. David Binner's Jenkins-Traub port - http://www.akiti.ca/PolyRootRe.html) but it's there if you want to give it a try.

```javascript
var sol = nerdamer.solveEquations('cos(x)+cos(3*x)=1','x');
console.log(sol.toString());
//5.7981235959208695,0.4850617112587174
```
To solve a system of linear equations pass them in as an array. For example

```javascript
var sol = nerdamer.solveEquations(['x+y=1', '2*x=6', '4*z+y=6']);
console.log(sol);
//[ [ 'x', 3 ], [ 'y', -2 ], [ 'z', 2 ] ]
```
In version 0.7.2 and up the solver can additionally be used in the following way
```javascript
//first parse the equation
var x = nerdamer('x^2+2=y-7*a');
//You can make substitutions to the equation
x = x.evaluate({a: 'x^2-3'});
console.log(x.toString()); //2+x^2=-7*x^2+21+y
var solutions = x.solveFor('x');
console.log(solutions.toString()); //(1/16)*sqrt(32*y+608),(-1/16)*sqrt(32*y+608)
```
