Nerdamer
========

As of version 0.5.0, the library is split into the core and add-ons which have to also be loaded.

Getting started with Nerdamer

Load the library in your html page

```html
<script src="nerdamer.core.js"></script> <!-- assuming you've saved the file in the root of course -->
<!-- LOAD ADD-ONS -->
<script src="Algebra.js"></script>
<script src="Calculus.js"></script>
<script src="LinAlg.js"></script> <!-- again assuming you've saved the files in root -->
```

Some functions have dependencies from other add-ons. 

You can see nerdamer in action at http://www.nerdamer.com/demo

All operations are done using the 'nerdamer' object. 

To add an expression just add it to the nerdamer object which will return a expression object which 
isn't particularly usefull at the moment other than getting its text representation.

            
                var eq = nerdamer('x^2+2*(cos(x)+x*x)');

                console.log(eq.text());
                
                //result: 
                //2*cos(x)+3*x^(2)
            
        

You can also pass in an object with known values as the second parameter.

            
                var eq = nerdamer('x^2+2*(cos(x)+x*x)',{x:6});

                console.log(eq.text());
                
                //result:
                //108+2*cos(6)
            
        

As you can see only the substitution is performed. To evaluate the result just call evaluate. 
Note that evaluate returns a text string or a number not an object.

            
                var eq = nerdamer('x^2+2*(cos(x)+x*x)',{x:6}).evaluate();

                console.log(eq);
                
                //result:
                //109.92034057330073
            
        

Alternatively you can pass an object containing known values into evaluate instead of nerdamer to get back 
the value right away. The values passed in don't have to be number the can be another expression if needed.

            
                var eq = nerdamer('x^2+2*(cos(x)+x*x)',{x:'x^2+1'});

                console.log(eq.text());
                
                //result:
                //2*cos(1+x^(2))+3*(1+x^(2))^(2)
            
        

Every time you parse an expression it's stored in nerdamer. To get a list of all the expressions you just call 
nerdamer.expressions().

            
                var knownValues = {x:'x^2+1'};
                nerdamer('x^2+2*(cos(x)+x*x)', knownValues );
                nerdamer('sin(x)^2+cos(x)^2', knownValues );
                
                console.log(nerdamer.expressions());
                
                //result:
                //[ 46.692712758272776, 1 ]
            
        

You can request it as an object as well by passing in true. This can be convenient in some 
situations as the numbering starts at 1;

            
                var knownValues = {x:'x^2+1'};
                nerdamer('x^2+2*(cos(x)+x*x)', knownValues );
                nerdamer('sin(x)^2+cos(x)^2', knownValues );
                
                console.log(nerdamer.expressions(true));
                
                //{ '1': '2*cos(1+x^(2))+3*(1+x^(2))^(2)',
                //'2': 'cos(1+x^(2))^(2)+sin(1+x^(2))^(2)' }
            
        
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

An expression can be replaced directly by passing in the index of which expression to override. For example

```javascript
    nerdamer('cos(x)',{x:6}, 'numer');
    nerdamer('sin(x)+y',{x:6}, null, 1);
    console.log(nerdamer.expressions());
    //[ 'sin(6)+y' ]
```

If you need the code as latex you can pass in true as the second parameter when requesting the expressions.

            
                nerdamer('x^2+2*(cos(x)+x*x)');
                nerdamer('sin(x)^0.25+cos(x)^0.5' );
                
                console.log(nerdamer.expressions(true, true));
                
                //{ '1': '3~{x}^{2}+2~\\cos\\left(x\\right)',
                //'2': '\\sin\\left(x\\right)^{\\frac{1}{4}}+\\sqrt{\\cos\\left(x\\right)}' }
            
        

You can specify a particular location when adding an expression, which is specified with the third parameter.

            
                nerdamer('x^2+2*(cos(x)+x*x)');
                nerdamer('sin(x)^0.25+cos(x)^0.5' );
                nerdamer('equation-override', undefined, 2 );
                
                console.log(nerdamer.expressions(true, true));
                
                //{ '1': '3~{x}^{2}+2~\\cos\\left(x\\right)',
                //'2': '-override+equation' }
            
        



Here's an example of reserved keywords.

            
                nerdamer.reserved();
                //result:
                //parens, cos, sin, tan, sec, csc, cot, acos, asin, atan, exp, log, abs, sqrt, diff, 
                //integrate, sec, cot, csc, pi, e
                
                or as an array
                
                nerdamer.reserved(true);
                //result:
                //[ 'parens','cos','sin','tan','sec','csc','cot','acos','asin','atan','exp','log','abs',
                // 'sqrt','diff','integrate','sec','cot','csc','pi','e' ]
            
        

A list can and should be generated by calling the reserved method.

Most math functions are passed in as part of the expression. If you want to differentiate for instance you just use the function diff which is located in the Calculus add-on as of 0.5.0

            
                var eqs = nerdamer('diff(x^2+2*(cos(x)+x*x),x)');
                
                console.log(eqs.text());
                
                //result: 
                //-2*sin(x)+6*x
            
        

Nerdamer can also handle runtime functions. To do this use the method setFunction. 
The runtime functions do have symbolic capabilities and support for imaginary numbers. 
The setfunction method is used as follows:

nerdamer.setFunction( function_name, parameter_array, function_body ) 

For Example:

            
                //generate some points
                var f = function(x) { return 5*x-1; }
                console.log(f(1)); //4
                console.log(f(2)); //9 - value to be found
                console.log(f(7)); //34
                
                nerdamer.setFunction('interpolate',['y0','x0','y1','x1','x'],'y0+(y1-y0)*((x-x0)/(x1-x0))')
                var answer = nerdamer('interpolate(4,1,34,7,2)').evaluate();
                
                console.log(answer);
                
                //result: 9
            
        

If you need to add a constant use the setConstant method

            
                nerdamer.setConstant( 'g', 9.81);

                var weight = nerdamer('100*g').evaluate();

                console.log(weight);
                
                //result:
                //981
            
        

To delete just set it to delete

            
                nerdamer.setConstant( 'g', 'delete');
            
        

You also have the option of exporting your function to a javascript function which can be useful if you need some 
filtering from user input. Do keep in mind that the parameters are sorted alphabetically for more than one 
parameter. To use it add the expression to nerdamer and use the buildFunction method.

            
                var f = nerdamer('x^2+5').buildFunction();
                console.log(f(9));
                
                //result:
                //86
            
        

Every time you add an expression to nerdamer it's stored. To list the expressions currently in nerdamer call 
the 'expressions' method. To delete an expression use the 'clear' method and pass in the expression you want to delete. 
To clear everything pass in the string 'all'.

            
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
            
        


The Core
========

To use the core simply request it using the getCore method

```javascript
var core = nerdamer.getCore();
```
The core contains:

* The various classes -> Symbol, Fraction, Parser, Expression, Latex, Vector
* The groups into which the Symbol classes is the divided -> groups
* The utility functions -> Utils
* The extended math functions -> Math2
* And an instance of the current parser being used -> PARSER



**EXTENDING THE CORE**

To add a function to nerdamer use the register method is used


```javascript

var some_function = {
  //Algebra for example
  parent: 'Algebra',
  name: 'some_function',
  //this determines if the functions can be used by the user when passing a string. 
  visibility: true, 
  //the minimum number of arguments your function requires. 
  //Defaults to 1 but is currently not used
  numargs: some_integer, 
  //the constructor. This is the environent under which your function is built. 
  build: {
    //this refers to the Parser
    //return the function which need to be set
    return function(/*args*/) {
      //body
    }
  }
};

nerdamer.register(some_function);
```

_**parent**_:  The parent is optional. If this object does not exist it will be created. If it does then it is added. Ommitting the parent does not result in it being added to the core directly. 

_**numargs**_:  tells nerdamer how many arguments are allowed and can be either an integer, a range in the form of an array [min arguments, max arguments], or -1 which enables any amount of arguments.

_**visibiity**_:  enables nerdamer's parse function to see the function and allows the user to use it.

_**build**_:  is the constructor and is within the core's scope. It returns a function which is within the scope of the PARSER (the parser instance which nerdamer uses). The arguments for the return function are Symbols. This means that any algorithm can be directly applied using nerdamer's abstraction layer using the functions, add, subtract, divide, multiply, and pow. 

**Example 1**

```javascript
nerdamer.register({
    parent: 'Algebra',
    name: 'quad',
    visible: true,
    numargs: 3,
    build: function(){
        var core = this; //get the core
        //I use underscore because it makes the algorithm easier to read but choose what you prefer
        var _ = core.PARSER; 
        var Symbol = core.Symbol;//grab the symbol class or use it directly
        return function(a, b, c) {
            //apply algorithm (-b+sqrt(b^2-4ac))/2a
            var det = _.subtract(_.pow(b.copy(), new Symbol(2)), _.multiply(_.multiply(a.copy(), c), new Symbol(4)));
            return _.divide(_.add(b.negate(), _.pow(det, new Symbol(0.5))), _.multiply(new Symbol(2), a));
        };
    }
});
```
Notice the use of the copy method when the symbol is used more than once. When parsing one or more symbols drop per operation. On the next cycle a fresh new Symbol is created. To minimize the creation of new Symbols nerdamer reuses one of the symbols supplied so the return symbol is usually a modified version of one of the parameters. This usually does not cause a problem when the parsing is in a linear fashion but it creates a problem when applying algorithms in which symbols get called again. This is one of the issues I'll be tackling in the future but for now either use a safe block or call the copy method on symbols which get reused.

In this example the layer is used directly. When an algorithm is applied in this fashion the additional cost is negligible. You could alternatively use the parse method as in example 2.

**Example 2**

```javascript
nerdamer.register({
    parent: 'Algebra',
    name: 'quad',
    visible: true,
    numargs: 3,
    build: function(){
        var core = this; //get the core
        return function(a, b, c) {
            //apply algorithm (-b+sqrt(b^2-4ac))/2a
            return core.PARSER.parse(core.Utils.format('(-{1}+sqrt({1}^2-4*{0}*{2}))/2*{0}', a, b, c));
        };
    }
});
```

Although shorter and easier to read it generally comes at a higher cost so choose wisely.

**THE PARSER**

The core comes with a parser instance fired up and ready to go. It is wise to keep using that parser instance as this is the instance that get extened and modified. To modify the parser instance call the extend method of the parser and supply the name of the function you're extending and the function you are extending it with. The extended function gets called with 3 parameters, the first symbol, the second symbol, and the original function. Here's an example of how it's done in the LinAlg add-on.

```javascript
var core = nerdamer.getCore();
core.PARSER.extend('add', function(symbol1, symbol2, add){
    var isSymbol = core.Utils.isSymbol;
    //do stuff with your new types
});
```
