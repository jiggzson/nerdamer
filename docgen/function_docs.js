FUNCTIONS = {
    //register can be used to create aliases
    nerdamer: {
        type: 'nerdamer',
        usage: 'nerdamer(expression, subs, option, location)',
        full_name: 'nerdamer',
        description: 'This is the main object used to parse expression or equations. This object gets extended when additional modules are loaded. Remember that this just another variable '+
                     'which can be stored to shorter variable for convenience.',
        parameters: {
            expression: {
                type: 'String',
                description: 'The expression being parsed.'
            },
            subs: {
                type: "Object",
                description: "An object of known values"
            },
            option: {
                type: "String|String[]",
                description: "A string or array containing additional options such as parsing directly to number or expanding the expression."
            },
            location: {
                type: "int",
                description: "The index of where the expression should be stored."
            }
        },
        examples: [
            "var x = nerdamer('5*x+(x^2+2*x)*x+(x+2)');", 
            "console.log(x.toString());", 
            "var x = nerdamer('(x^2+2*x)*x+1+x+cos(y)', {y: '7'}, ['expand'])", 
            "//the substitutions was called but the functions weren't called",
            "console.log(x.toString());",
            "var x = nerdamer('(x^2+2*x)*x+1+x+cos(y)', {y: '7'}, ['expand', 'numer']);", 
            "console.log(x.toString());",
            "var x = nerdamer('(x^2+2*x)*x+1+x+cos(y)', {y: '7'}, ['expand', 'numer']);", 
            "console.log(x.text('decimals'));"
        ],
        returns: 'Expression'
    },
    nerdamer__setConstant: {
        type: 'nerdamer',
        usage: 'nerdamer.setContant(name, value)',
        full_name: 'setContant',
        description: 'Sets a constant value which nerdamer will automatically substitute when parsing expression/equation',
        parameters: {
            name: {
                type: 'String',
                description: 'The variable to be set as the constant'
            },
            value: {
                type: "Number|expression string",
                description: "The value for the expression to be set to."
            }
        },
        examples: [
            "nerdamer.setConstant('g', 9.81);", 
            "var x = nerdamer('10+g');", 
            "console.log(x.toString())",
            "nerdamer.setConstant('g', 'delete');", 
            "x = nerdamer('10+g');",
            "console.log(x.toString());"
        ],
        returns: 'nerdamer'
    },
    nerdamer__setVar: {
        type: 'nerdamer',
        usage: 'nerdamer.setVar(variable_name, value)',
        full_name: 'setVar',
        description: 'Sets a known value in nerdamer. This differs from setConstant as the value can be overridden trough the scope. See example.',
        parameters: {
            name: {
                type: 'String',
                description: 'The known value to be set'
            },
            value: {
                type: "Number|expression string",
                description: "The value for the expression to be set to."
            }
        },
        examples: [
            "nerdamer.setVar('x', '11');",
            "var x = nerdamer('x*x');",
            "console.log(x.toString());",
            "//nerdamer will use 13 instead of 11",
            "x = nerdamer('x*x', {x: 13});",
            "console.log(x.toString());",
            "//the value will be 121 again since the known value isn't being overridden",
            "x = nerdamer('x*x');",
            "console.log(x.toString());",
            "nerdamer.setVar('x', 'delete');",
            "//since there no longer is a known value it will just be evaluated symbolically",
            "x = nerdamer('x*x');",
            "console.log(x.toString());"
        ],
        returns: 'nerdamer'
    },
    nerdamer__clearVars: {
        type: 'nerdamer',
        usage: 'nerdamer.clearVars()',
        full_name: 'clearVars',
        description: 'Clears all previously set variables.',
        parameters: {
            none: {
                type: '',
                description: 'This function takes no arguments'
            }
        },
        examples: [
            "nerdamer.setVar('x', 12);",
            "nerdamer.setVar('y', '2*x');",
            "var x = nerdamer('x+y');",
            "console.log(x.toString());",
            "nerdamer.clearVars();",
            "x = nerdamer('x+y');",
            "console.log(x.toString());"
        ],
        returns: 'nerdamer'
    },
    nerdamer__getVars: {
        type: 'nerdamer',
        usage: 'nerdamer.getVars(option)',
        full_name: 'getVars',
        description: 'Gets all previously set variables.',
        parameters: {
            option: {
                type: 'String',
                description: 'Use "LaTeX" to get as LaTeX. Defaults to text.'
            }
        },
        examples: [
            "nerdamer.setVar('x', 12);",
            "nerdamer.setVar('y', '1/x/z');",
            "var x = nerdamer.getVars('LaTeX');",
            "console.log(x);",
            "var y = nerdamer.getVars('text');",
            "console.log(y);"
        ],
        returns: 'Object'
    },
    nerdamer__expressions: {
        type: 'nerdamer',
        usage: 'nerdamer.expressions(x, y)',
        full_name: 'expressions',
        description: 'Each time an expression is parsed nerdamer stores the result. Use this method to get back stored expressions.',
        parameters: {
            x: {
                type: 'bool',
                description: 'Pass in true to get expression as numbered object with 1 as starting index'
            },
            y: {
                type: 'String',
                description: 'Pass in the string "LaTeX" to get the expression to LaTeX, otherwise expressions come back as strings'
            }
        },
        examples: [
            "var x = nerdamer('x^2+1')",
            "var y = nerdamer('sin(x)*cos(x)');",
            "var expressions = nerdamer.expressions();",
            "console.log(expressions);",
            "expressions = nerdamer.expressions(true, 'LaTeX');",
            "console.log(expressions);"
        ],
        returns: 'nerdamer'
    },
    nerdamer__clear: {
        type: 'nerdamer',
        usage: 'nerdamer.clear(x, y)',
        full_name: 'clear',
        description: 'Each time an expression is parsed nerdamer stores the result. Setting the second parameter to true leaves the hole in the expressions array \n\
                      preserving the indices of the existing expressions.',
        parameters: {
            x: {
                type: 'int | String',
                description: 'The index of the expression with 1 as the starting index. Use the string "last" for last expression. \n\
                              Use the string "first" for the first. Use the string "all" to clear all stored expressions.'
            },
            fix_indeces: {
                type: 'bool',
                description: "Maintains indices as they are when expression is deleted"
            }
        },
        examples: [
            "var x = nerdamer('x^2+1')", 
            "var y = nerdamer('sin(x)*cos(x)');", 
            "var expressions = nerdamer.expressions();", 
            "console.log(expressions);",
            "nerdamer.clear(1, true);", 
            "expressions = nerdamer.expressions();",
            "console.log(expressions)"
        ],
        returns: 'nerdamer'
    },
    nerdamer__getCore: {
        type: 'nerdamer',
        usage: 'nerdamer.getCore()',
        full_name: 'getCore',
        description: 'Returns the nerdamer core object. This object contains all the core functions of nerdamer and houses the parser.',
        parameters: {
            none: {
                type: '',
                description: 'This function takes no arguments'
            }
        },
        examples: [
            "var core = nerdamer.getCore();",
            "for(var x in core) {",
            "   console.log(x);",
            '}'
        ],
        returns: 'nerdamer core'
    },
    nerdamer__getExpression: {
        type: 'nerdamer',
        usage: 'nerdamer.getExpression(x)',
        full_name: 'getExpression',
        description: 'Gets a stored expression.',
        parameters: {
            x: {
                type: 'int',
                description: "The index of the expression starting at 1. Pass in 'first' to get first and 'last' to get the last expression."
            }
        },
        examples: [
            "var x = nerdamer('6*x*x-x^2+1');",
            "var y = nerdamer('sin(y*t)');",
            "var e = nerdamer.getExpression(1);",
            "console.log(e.toString());"
        ],
        returns: 'Expression'
    },
    nerdamer__reserved: {
        type: 'nerdamer',
        usage: 'nerdamer.reserved(asArray)',
        full_name: 'reserved',
        description: 'Gets the list of reserved names. This is a list of names already in use by nerdamer excluding variable names. This is not a static list.',
        parameters: {
            asArray: {
                type: 'bool',
                description: "Pass in true to get the list back as an array instead of as an object."
            }
        },
        examples: [
            "var x = nerdamer.reserved();",
            "console.log(x);",
            "var y = nerdamer.reserved(true);",
            "console.log(y);"
        ],
        returns: 'String[] | Object'
    },
    nerdamer__flush: {
        type: 'nerdamer',
        usage: 'nerdamer.flush()',
        full_name: 'flush',
        description: 'Clears all stored expressions.;',
        parameters: {
            none: {
                type: '',
                description: "This function takes no parameters"
            }
        },
        examples: [
            "var x = nerdamer('x*x');",
            "console.log(nerdamer.expressions());",
            "nerdamer.flush(); //clear all expressions",
            "console.log(nerdamer.expressions());"
        ],
        returns: 'undefined'
    },
    nerdamer__setFunction: {
        type: 'nerdamer',
        usage: 'nerdamer.setFunction(function_name, param_array, function_body)',
        full_name: 'setFunction',
        description: 'Sets a function which can then be called using nerdamer.',
        parameters: {
            function_name: {
                type: 'String',
                description: "The function name"
            },
            param_array: {
                type: 'String[]',
                description: "The parameter array in the order in which the arguments are to be passed"
            },
            function_body: {
                type: 'String',
                description: "The body of the function"
            }
        },
        examples: [
            "nerdamer.setFunction('f', ['x', 'y'], 'x^2+y');",
            "var x = nerdamer('f(4, 7)').toString();",
            "console.log(x.toString());",
            "nerdamer.setFunction('g', ['z', 'x', 'y'], '2*x+3*y+4*z');",
            "x = nerdamer('g(3, 1, 2)');",
            "console.log(x.toString());"
        ],
        returns: 'nerdamer'
    },
    nerdamer__convertToLaTeX: {
        type: 'nerdamer',
        usage: 'nerdamer.convertToLaTeX(expression)',
        full_name: 'convertToLaTeX',
        description: 'Converts and expression to LaTeX without evaluating expression.',
        parameters: {
            expression: {
                type: 'String',
                description: "The expression being converted"
            }
        },
        examples: [
            "var x = nerdamer.convertToLaTeX('x^2/y-x');",
            "console.log(x.toString());",
            "x = nerdamer.convertToLaTeX('integrate(x+x,x)+cos(y+y)')",
            "console.log(x.toString())"
        ],
        returns: 'String'
    },
    nerdamer__version: {
        type: 'nerdamer',
        usage: 'nerdamer.version',
        full_name: 'version',
        description: 'returns the current version of nerdamer.',
        parameters: {
            none: {
                type: '',
                description: "This function does not take any arguments."
            }
        },
        examples: [
            "var x = nerdamer.version();",
            "console.log(x);"
        ],
        returns: 'nerdamer'
    },
    nerdamer__set: {
        type: 'nerdamer',
        usage: 'nerdamer.set(setting, value)',
        full_name: 'set',
        description: 'Sets the value of a nerdamer setting. Currently PARSE2NUMBER and IMAGINARY. \n\
                      Setting PARSE2NUMBER to true will let nerdamer always try to return a number whenenver possible.\n\
                      IMAGINARY allows you to change the variable used for imaginary to j for instance.',
        parameters: {
            setting: {
                type: 'setting',
                description: "The setting to be changed"
            },
            value: {
                type: 'VARIES',
                description: "The value to set the setting to."
            }
        },
        examples: [
            "nerdamer.set('PARSE2NUMBER', true);",
            "var x = nerdamer('cos(9)+1');",
            "console.log(x.toString());",
            "nerdamer.set('IMAGINARY', 'j');",
            "x = nerdamer('sqrt(-1)');",
            "console.log(x.toString());"
        ],
        returns: 'nerdamer'
    },
    nerdamer__register: {
        type: 'nerdamer',
        usage: 'nerdamer.register(o)',
        full_name: 'register',
        description: 'Registers a module function with nerdamer. The object needs to contain at a minimum, \n\
                      a name property (text), a numargs property (int), this is -1 for variable arguments or an array containing the min and max arguments,\n\
                      the visible property (bool) which allows use of this function through nerdamer, defaults to true, \n\
                      and a build property containing a function which returns the function to be used. This function is also handy for creating aliases to functions.\n\
                      See below how the alias D was created for the diff function).',
        parameters: {
            o: {
                type: 'Object | Object[]',
                description: "An array of objects to be registered"
            }
        },
        examples: [
            "var core = nerdamer.getCore();",
            "var _ = core.PARSER;",
            "function f(a, b) {",
            "//use clone for safety since a or b might be returned",
            "var sum = _.add(a.clone(), b.clone());",
            "var product = _.multiply(a.clone(), b.clone());",
            "return _.multiply(sum, product);",
            "}",
            "//register the function with nerdamer",
            "nerdamer.register({",
            "   name: 'myFunction',",
            "   numargs: 2,",
            "   visible: true,",
            "   build: function(){ return f; }",
            "});",
            "",
            "//create an alias for the diff function",
            "var core = nerdamer.getCore();",
            "nerdamer.register({",
            "    name: 'D',",
            "    visible: true,",
            "    numargs: [1, 3],",
            "    build: function(){ return core.Calculus.diff; }",
            "});",
            "",
            "var x = nerdamer('D(cos(x),x)');",
            "console.log(x.toString());",
            ""
        ],
        returns: 'nerdamer'
    },
    nerdamer__validVarName: {
        type: 'nerdamer',
        usage: 'nerdamer.validVarName(variable_name)',
        full_name: 'validVarName',
        description: 'This method can be used to check that the variable meets variable name requirements for nerdamer. Variable names Must start with a letter or underscore and\n\
                      may contains any combination of numbers, letters, and underscores after that.',
        parameters: {
            variable_name: {
                type: 'String',
                description: "The variable name being validated"
            }
        },
        examples: [
            "",
            "console.log('cos: ', nerdamer.validVarName('cos'));",
            "console.log('chicken: ', nerdamer.validVarName('chicken1'));",
            "console.log('1chicken: ', nerdamer.validVarName('1chicken'));",
            "console.log('_: ', nerdamer.validVarName('_'));",
            ""
        ],
        returns: 'bool'
    },
    nerdamer__solveFor: {
        type: 'nerdamer',
        usage: 'nerdamer(equation).solveFor(variable)',
        full_name: 'solveFor',
        description: 'This method requires that the Solve, Calculus, and Algebra add-ons are loaded. It will attempt to solve an equation. If solutions no solutions are found then\n\
                      an empty array is returned. It can solve for multivariate polynomials up to the third degree. After which it can solve numerically for polynomials up to the\n\
                      the 100th degree. If it\'s a univariate equation it will attempt to solve it using numerical methods.',
        parameters: {
            variable: {
                type: 'String',
                description: "The variable to solve for."
            }
        },
        examples: [
            "var eq = nerdamer('a*x^2+b*x=y').evaluate({y: 'x-7'});",
            "console.log(eq.toString());",
            "var solutions = eq.solveFor('x').toString();",
            "console.log(solutions);"
        ],
        returns: 'Symbol[]'
    },
    Expression__text: {
        type: 'Expression',
        usage: 'nerdamer.text(x)',
        full_name: 'text',
        description: 'Gets the list of reserved names. This is a list of names already in use by nerdamer excluding variable names. This is not a static list.',
        parameters: {
            asArray: {
                type: 'String',
                description: "Pass in the string 'decimals' to always get back numers as decimals. Pass in the string 'fractions' to always get back number as fractions. Defaults to decimals."
            }
        },
        examples: [
            "var x = nerdamer('1/12+1/2*cos(x)-0.5');",
            "console.log(x.text('decimals'));",
            "console.log(x.text('fractions'));"
        ],
        returns: 'String'
    },
    Expression__toTeX: {
        type: 'Expression',
        usage: 'nerdamer.toTeX',
        full_name: 'toTeX',
        description: 'Gets expression as LaTeX',
        parameters: {
            none: {
                type: '',
                description: "This function takes no arguments."
            }
        },
        examples: [
            "var x = nerdamer('(x+1)*cos(x+1)');",
            "console.log(x.toTeX());",
            "x = nerdamer('1/2*x+2*b/5*x^2');",
            "console.log(x.toTeX());"
        ],
        returns: 'String'
    },
    Expression__evaluate: {
        type: 'Expression',
        usage: 'nerdamer(expression).evaluate()',
        full_name: 'evaluate',
        description: 'Forces evaluation of the expression.',
        parameters: {
            none: {
                type: '',
                description: 'This function takes no arguments'
            }
        },
        examples: [
            "var x = nerdamer('sin(9+5)');",
            "//the expression is simpliefied but the functions aren't called",
            "console.log(x.toString());",
            "//force function calls with evaluate",
            "console.log(x.evaluate().toString());"
        ],
        returns: 'Expression'
    },
    Expression__sub: {
        type: 'Expression',
        usage: 'nerdamer(expression).sub(value, for_value)',
        full_name: 'substitute',
        description: 'Substitutes a given value for another given value',
        parameters: {
            value: {
                type: 'String',
                description: "The value being substituted."
            },
            for_value: {
                type: 'String',
                description: "The value to substitute for."
            }
        },
        examples: [
            "var x = nerdamer('3*(x+1)^3+8*(x+1)^2+u').sub('x+1', 'u');",
            "console.log(x.toString());",
            "x = nerdamer('cos(x)*tan(x)').sub('tan(x)', 'sin(x)/cos(x)').evaluate()",
            "console.log(x.toString());",
            "//one more",
            "x = nerdamer('(x+1)*cos(x+1)').sub('x+1', 'u');",
            "console.log(x.toString());"
        ],
        returns: 'Expression'
    },
    Expression__buildFunction: {
        type: 'Expression',
        usage: 'nerdamer(expression).buildFunction(args_array)',
        full_name: 'buildFunction',
        description: 'Generates a JavaScript function given the expression. This is perfect for plotting and filtering user input. Plotting for the demo is accomplished \n\
                     using this. The order of the parameters is in alphabetical order by default but an argument array can be provided with the desired order.',
        parameters: {
            args_array: {
                type: 'String[]',
                description: "The argument array with the order in which they are preferred."
            }
        },
        examples: [
            "var e = nerdamer('x^2+y');",
            "var f = e.buildFunction();",
            "console.log(f(2, 3));",
            "//change the variable order by passing in an array with the order",
            "var g = e.buildFunction(['y', 'x']);",
            "console.log(g(2, 3));"
        ],
        returns: 'Function'
    },
    Expression__variables: {
        type: 'Expression',
        usage: 'nerdamer(expression).variables()',
        full_name: 'variables',
        description: 'Get a list of the variables contained within the expression',
        parameters: {
            none: {
                type: '',
                description: "This function takes no arguments."
            }
        },
        examples: [
            "var e = nerdamer('x^2+y-a*e');",
            "var variables = e.variables();",
            "console.log(variables);",
            "e = nerdamer('a*b*c^r+1');",
            "variables = e.variables();",
            "console.log(variables);"
        ],
        returns: 'String[]'
    },
    cosh: {
        type: 'internal',
        usage: 'cosh(x)',
        full_name: 'hyperbolic cosine',
        description: 'For numeric values it returns the Math.cosh. In all other cases it returns \n\
                      a symbolic function. Will polyfill.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('cosh(0)').evaluate();", 
            "console.log(r.toString());",
            "var t = nerdamer('cosh(x)').evaluate()", 
            "console.log(t.toString());",
            "var u = nerdamer('cos(E)').evaluate()", 
            "console.log(u.toString());"
        ],
        returns: 'Number | Expression'
    },
    cos: {
        type: 'internal',
        usage: 'cos(x)',
        full_name: 'cosine',
        description: 'This function will return some known values for multiples of pi, pi/2, pi/3, etc. \n\
                      For numeric values it returns the javascript value for pi. In all other cases it returns \n\
                      a symbolic function.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('cos(pi)');", 
            "console.log(r.toString());",
            "var t = nerdamer('cos(x)')", 
            "console.log(t.toString());",
            "var u = nerdamer('cos(pi/4)')", 
            "console.log(u.toString());",
            "var v = nerdamer('cos(pi/2)')",
            "console.log(v.toString());"
        ],
        returns: 'Number | Expression'
    },
    sinh: {
        type: 'internal',
        usage: 'sinh(x)',
        full_name: 'hyperbolic sine',
        description: 'For numeric values it returns the Math.sinh value. In all other cases it returns \n\
                      a symbolic function. Will polyfill.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('sinh(0)');", 
            "console.log(r.toString());",
            "var t = nerdamer('sinh(x+x)')", 
            "console.log(t.toString());",
            "var u = nerdamer('sin(0.8813735870195429)').evaluate().text()", 
            "console.log(u.toString());",
            "var v = nerdamer('sinh(E)').evaluate().evaluate().text()",
            "console.log(v.toString());"
        ],
        returns: 'Number | Expression'
    },
    sin: {
        type: 'internal',
        usage: 'sin(x)',
        full_name: 'sine',
        description: 'This function will return some known values for multiples of pi, pi/2, pi/3, etc. \n\
                      For numeric values it returns the javascript value for pi. In all other cases it returns \n\
                      a symbolic function.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('sin(pi)').evaluate().toString();", 
            "console.log(r);",
            "var t = nerdamer('sin(x)').evaluate().toString()", 
            "console.log(t);",
            "var u = nerdamer('sin(pi/4)').evaluate().toString()", 
            "console.log(u);",
            "var v = nerdamer('sin(pi)').toString()",
            "console.log(v);"
        ],
        returns: 'Number | Expression'
    },
    tanh: {
        type: 'internal',
        usage: 'tan(x)',
        full_name: 'hyperbolic tangent',
        description: 'For numeric values it returns Math.tanh value. In all other cases it returns \n\
                      a symbolic function. Will polyfill.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('tanh(0)').evaluate();", 
            "console.log(r.toString());",
            "var t = nerdamer('tanh(x)')", 
            "console.log(t.toString());",
            "var u = nerdamer('tan(1)').evaluate()", 
            "console.log(u.toString());"
        ],
        errors: [
            "Throws exception for multiples of pi/2"
        ],
        returns: 'Number | Expression'
    },
    tan: {
        type: 'internal',
        usage: 'tan(x)',
        full_name: 'tangent',
        description: 'This function will return some known values for multiples of pi, pi/2, pi/3, etc. \n\
                      For numeric values it returns the javascript value for pi. In all other cases it returns \n\
                      a symbolic function.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('tan(pi)');", 
            "console.log(r.toString());",
            "var t = nerdamer('tan(x)')", 
            "console.log(t.toString());",
            "var u = nerdamer('tan(pi/4)')", 
            "console.log(u.toString());",
            "var v = nerdamer('tan(pi/2)')",
            "console.log(v.toString());"
        ],
        errors: [
            "Throws exception for multiples of pi/2"
        ],
        returns: 'Number | Expression'
    },
    sec: {
        type: 'internal',
        usage: 'sec(x)',
        full_name: 'secant',
        description: 'This function will return some known values for multiples of pi, pi/2, pi/3, etc. \n\
                      For numeric values it returns the javascript value for pi. In all other cases it returns \n\
                      a symbolic function.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('sec(pi)');", 
            "console.log(r.toString());",
            "var t = nerdamer('sec(x)')", 
            "console.log(t.toString());",
            "var u = nerdamer('sec(pi/4)')", 
            "console.log(u.toString());",
            "var v = nerdamer('sec(pi/2)')",
            "console.log(v.toString());"
        ],
        errors: [
            "Throws exception for multiples of pi/2"
        ],
        returns: 'Number | Expression'
    },
    csc: {
        type: 'internal',
        usage: 'csc(x)',
        full_name: 'cosecant',
        description: 'This function will return some known values for multiples of pi, pi/2, pi/3, etc. \n\
                      For numeric values it returns the javascript value for pi. In all other cases it returns \n\
                      a symbolic function.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('csc(pi/2)');", 
            "console.log(r.toString());",
            "var t = nerdamer('csc(x)')", 
            "console.log(t.toString());",
            "var u = nerdamer('csc(pi/4)')", 
            "console.log(u.toString());",
            "var v = nerdamer('csc(pi)')",
            "console.log(v);"
        ],
        errors: [
            "Throws exception for multiples of pi"
        ],
        returns: 'Number | Expression'
    },
    cot: {
        type: 'internal',
        usage: 'cot(x)',
        full_name: 'cotangent',
        description: 'This function will return some known values for multiples of pi, pi/2, pi/3, etc. \n\
                      For numeric values it returns the javascript value for pi. In all other cases it returns \n\
                      a symbolic function.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('cot(pi/2)');", 
            "console.log(r.toString());",
            "var t = nerdamer('cot(x)')", 
            "console.log(t.toString());",
            "var u = nerdamer('cot(pi/4)')", 
            "console.log(u.toString());",
            "var v = nerdamer('cot(pi)')",
            "console.log(v.toString());"
        ],
        errors: [
            "Throws exception for multiples of pi"
        ],
        returns: 'Number | Expression'
    },
    asinh: {
        type: 'internal',
        usage: 'asinh(x)',
        full_name: 'inverse hyperbolic sine',
        description: 'Returns the inverse of sinh. ',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('asinh(0)');", 
            "console.log(r.toString());",
            "var t = nerdamer('asinh(1)').evaluate();", 
            "console.log(t.toString());"
        ],
        returns: 'Number | Expression'
    },
    asin: {
        type: 'internal',
        usage: 'asin(x)',
        full_name: 'arcsine',
        description: 'Returns the inverse of sin in radians. Does not detect for known values of pi at them moment. ',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('asin(0)');", 
            "console.log(r.toString());",
            "var t = nerdamer('asin(sqrt(2)/2)')", 
            "console.log(t.toString());"
        ],
        returns: 'Number | Expression'
    },
    acosh: {
        type: 'internal',
        usage: 'acosh(x)',
        full_name: 'inverse hyperbolic cosine',
        description: 'Returns the inverse of cosh.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('acosh(0)');", 
            "console.log(r.text());",
            "//TODO imaginary numbers for acosh",
            "var t = nerdamer('acosh(-1)').evaluate()", 
            "console.log(t.text());"
        ],
        returns: 'Number | Expression'
    },
    acos: {
        type: 'internal',
        usage: 'acos(x)',
        full_name: 'arccosine',
        description: 'Returns the inverse of cos in radians. Does not detect for known values of pi at them moment. ',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('acos(0)');", 
            "console.log(r.toString());",
            "var t = nerdamer('acos(-1)')", 
            "console.log(t.toString());"
        ],
        returns: 'Number | Expression'
    },
    atanh: {
        type: 'internal',
        usage: 'atan(x)',
        full_name: 'inverse hyperbolic tangent',
        description: 'Returns the inverse of tanh.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('atanh(0)');", 
            "console.log(r.text());",
            "var t = nerdamer('atanh(-1)').evaluate()", 
            "console.log(t.text());"
        ],
        returns: 'Number | Expression'
    },
    atan: {
        type: 'internal',
        usage: 'atan(x)',
        full_name: 'arctangent',
        description: 'Returns the inverse of tan.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('atan(0)');", 
            "console.log(r.text());",
            "var t = nerdamer('atan(-1)').evaluate()", 
            "console.log(t.text());"
        ],
        returns: 'Number | Expression'
    },
    exp: {
        type: 'internal',
        usage: 'exp(x)',
        full_name: 'exp',
        description: 'Maps directly to Math.exp(x) if numeric.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('exp(1)').evaluate();",
            "console.log(x.text());"
        ],
        returns: 'Number | Expression'
    },
    min: {
        type: 'internal',
        usage: 'min(x, y, z)',
        full_name: 'minimum',
        description: 'Returns the min of a set of numbers. Maps directly to Math.min(x, y, z) if numeric.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('min(5, 2, 11)').evaluate();",
            "console.log(x.toString());",
            "x = nerdamer('min(x*x, y, z)');",
            "console.log(x.toString());"
        ],
        returns: 'Number | Expression'
    },
    max: {
        type: 'internal',
        usage: 'max(x, y, z)',
        full_name: 'maximum',
        description: 'Returns the maximum of a set of numbers. Maps directly to Math.max(x, y, z) if numeric.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('max(5, 2, 11)').evaluate();",
            "console.log(x.toString());",
            "x = nerdamer('max(x*x, y, z)');",
            "console.log(x.toString());"
        ],
        returns: 'Number | Expression'
    },
    floor: {
        type: 'internal',
        usage: 'floor(x)',
        full_name: 'floor',
        description: 'Returns the floor of a number. Maps directly to Math.floor(x) if numeric.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('floor(5/2)').evaluate();",
            "console.log(x.toString());"
        ],
        returns: 'Number | Expression'
    },
    ceil: {
        type: 'internal',
        usage: 'ceil(x)',
        full_name: 'ceiling',
        description: 'Returns the ceiling of a number. Maps directly to Math.ceil(x) if numeric.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('ceil(5/2)').evaluate();",
            "console.log(x.toString());"
        ],
        returns: 'Number | Expression'
    },
    factorial: {
        type: 'internal',
        usage: 'factorial(x)',
        full_name: 'factorial',
        aliases: ['fact'],
        description: 'Calculates the factorial of a number. Maps directly to Math.ceil(x) if numeric.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('factorial(5)').evaluate();",
            "console.log(x.text());",
            "x = nerdamer('factorial(9.1)').evaluate();",
            "console.log(x.text());"
        ],
        returns: 'Number | Expression'
    },
    fact: {
        type: 'internal',
        usage: 'factorial(x)',
        full_name: 'factorial',
        aliases: ['factorial'],
        description: 'Calculates the factorial of a number. Maps directly to Math.ceil(x) if numeric.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('fact(5)').evaluate();",
            "console.log(x.text());",
            "x = nerdamer('fact(9.1)').evaluate();",
            "console.log(x.text());",
            "x = nerdamer('(4/5)!*3!-1').evaluate();;",
            "console.log(x.text());"
        ],
        returns: 'Number | Expression'
    },
    Ci: {
        type: 'internal',
        usage: 'Ci(number)',
        full_name: 'CosineIntegral',
        description: 'Calculates the cosine integral of a number.',
        parameters: {
            number: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('Ci(5)').evaluate();",
            "console.log(x.text());",
            "x = nerdamer('Ci(0)').evaluate();",
            "console.log(x.text());"
        ],
        returns: 'Number | Expression'
    },
    Si: {
        type: 'internal',
        usage: 'Si(number)',
        full_name: 'SineIntegral',
        description: 'Calculates the sine integral of a number.',
        parameters: {
            number: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('Si(5)').evaluate();",
            "console.log(x.text());",
            "x = nerdamer('Si(0)').evaluate();",
            "console.log(x.text());"
        ],
        returns: 'Number | Expression'
    },
    fib: {
        type: 'internal',
        usage: 'fib(number)',
        full_name: 'fibonacci',
        description: 'Calculates the fibonacci value given a number.',
        parameters: {
            number: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('fib(5)').evaluate();",
            "console.log(x.text());",
            "x = nerdamer('fib(0)').evaluate();",
            "console.log(x.text());"
        ],
        returns: 'Number | Expression'
    },
    round: {
        type: 'internal',
        usage: 'round(number)',
        full_name: 'round',
        description: 'Rounds a number to the nearest integer.',
        parameters: {
            number: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('round(5.7)').evaluate();",
            "console.log(x.text());",
            "x = nerdamer('round(1.4)').evaluate();",
            "console.log(x.text());"
        ],
        returns: 'Number | Expression'
    },
    mod: {
        type: 'internal',
        usage: 'mod(x)',
        full_name: 'mod',
        description: 'Calculates the modulo of two numbers.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('mod(5, 2)').evaluate();",
            "console.log(x.toString());",
            "x = nerdamer('mod(10/12, 1/2)');",
            "console.log(x.toString());"
        ],
        returns: 'Number | Expression'
    },
    sqrt: {
        type: 'internal',
        usage: 'sqrt(x)',
        full_name: 'square root',
        description: 'Calculates the square root of a number',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('sqrt(-1)');",
            "console.log(x.toString());",
            "x = nerdamer('sqrt(2)');",
            "console.log(x.toString());",
            "x = nerdamer('sqrt(3/2)');",
            "console.log(x.toString());",
            "x = nerdamer('sqrt(x^2/5)');",
            "console.log(x.toString());"
        ],
        returns: 'Number | Expression'
    },
    log: {
        type: 'internal',
        usage: 'log(x)',
        full_name: 'natural logarithm',
        description: 'Calculates the log of a number base e.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('log(e^2)');",
            "console.log(x.toString());",
            "var y = nerdamer('log(2*e^2)');",
            "console.log(y.toString());"
        ],
        returns: 'Number | Expression'
    },
    log10: {
        type: 'internal',
        usage: 'log10(x)',
        full_name: 'logarithm',
        description: 'Calculates the log of a number base 10. Is a direct extension of Math.log10.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('log10(100)').evaluate();",
            "console.log(x.toString());",
            "x = nerdamer('log10(100000)').evaluate();",
            "console.log(x.toString());"
        ],
        returns: 'Number | Expression'
    },
    expand: {
        type: 'internal',
        usage: 'expand(x)',
        full_name: 'expand',
        description: 'Expands a function or expression.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('expand((x^2+1)^2/4)');",
            "console.log(x.toString());",
            "var y = nerdamer('expand(x*(x+1))');",
            "console.log(y.toString());"
        ],
        returns: 'Number | Expression'
    },
    abs: {
        type: 'internal',
        usage: 'abs(x)',
        full_name: 'absolute value',
        description: 'Returns the absolute value of a number/expression',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('abs(-x)');",
            "console.log(x.toString());",
            "var y = nerdamer('abs(-2-x)');",
            "console.log(y.toString());"
        ],
        returns: 'Number | Expression'
    },
    erf: {
        type: 'internal',
        usage: 'erf(x)',
        full_name: 'error function',
        description: 'Returns the computed value for the error function.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('erf(x)');",
            "console.log(x.toString());",
            "var y = nerdamer('erf(1)').evaluate();",
            "console.log(y.toString());"
        ],
        returns: 'Number | Expression'
    },
    pfactor: {
        type: 'internal',
        usage: 'pfactor(x)',
        full_name: 'pfactor',
        description: 'Returns the prime factors of a number. CAUTION: Calling evaluate will cause the factors to be re-evaluated causing the number to be returned.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('pfactor(5.2)');",
            "console.log(x.text());",
            "x = nerdamer('pfactor(113)');",
            "console.log(x.text());"
        ],
        returns: 'Number | Expression'
    },
    parens: {
        type: 'internal',
        usage: 'parens(x)',
        full_name: 'parentheses',
        description: 'Wraps an expression in parentheses. Useful for expressing factors. Calling evaluate removes parentheses.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('parens(9)*parens(7)');",
            "console.log(x.toString());",
            "console.log(x.evaluate().toString();"
        ],
        returns: 'Number | Expression'
    },
    vector: {
        type: 'internal',
        usage: 'vector(x, y, ...)',
        full_name: 'vector',
        description: 'Creates a vector',
        parameters: {
            x: {
                type: 'expression',
                description: "element of the vector"
            },
            y: {
                type: 'expression',
                description: "element of the vector"
            }
        },
        examples: [
            "nerdamer.setVar('v1', 'vector(a-2, x*y, 6)');",
            "x = nerdamer('a*v1');",
            "console.log(x.toString())"
        ],
        returns: 'Number | Expression'
    },
    matrix: {
        type: 'internal',
        usage: 'matrix(x, y, ...)',
        full_name: 'matrix',
        description: 'Creates a matrix',
        parameters: {
            x: {
                type: 'expression',
                description: "a row of the matrix containing the columns [e1, e2, ...]"
            },
            y: {
                type: 'expression',
                description: "a row of the matrix containing the columns [e1, e2, ...]"
            }
        },
        examples: [
            "nerdamer.setVar('M', 'matrix([a, b], [x^2, y-4])');",
            "var x = nerdamer('a*x*M');",
            "console.log(x.toString());"
        ],
        returns: 'Number | Expression'
    },
    invert: {
        type: 'internal',
        usage: 'invert(M)',
        full_name: 'invert',
        description: 'Inverts a matrix',
        parameters: {
            M: {
                type: 'expression',
                description: "a matrix"
            }
        },
        examples: [
            "nerdamer.setVar('M', 'matrix([1, 5], [4, 4])');",
            "var x = nerdamer('invert(M)');",
            "console.log(x.toString());"
        ],
        returns: 'Number | Expression'
    },
    vecget: {
        type: 'internal',
        usage: 'vecget(v)',
        full_name: 'vector get',
        description: 'Gets an element in a vector with zero based index.',
        parameters: {
            v: {
                type: 'expression',
                description: "a vector"
            }
        },
        examples: [
            "nerdamer.setVar('v', 'vector(a-r, x*x, z)');",
            "var x = nerdamer('vecget(v, 0)');",
            "console.log(x.toString());"
        ],
        returns: 'Number | Expression'
    },
    vecset: {
        type: 'internal',
        usage: 'vecset(v)',
        full_name: 'vector set',
        description: 'Set an element in a vector with zero based index. Returns the modified vector.',
        parameters: {
            v: {
                type: 'expression',
                description: "a vector"
            }
        },
        examples: [
            "nerdamer.setVar('v', 'vector(a-r, x*x, z)');",
            "nerdamer.setVar('v', 'vecset(v, 0, sqrt(2*g*h))');",
            "console.log(nerdamer('v').toString());"
        ],
        returns: 'Vector'
    },
    matget: {
        type: 'internal',
        usage: 'matget(M, i, j)',
        full_name: 'vector get',
        description: 'Gets an element in a matrix with zero based index.',
        parameters: {
            M: {
                type: 'expression',
                description: "a matrix from which the element is being retrieved."
            },
            i: {
                type: 'expression',
                description: "row index"
            },
            j: {
                type: 'expression',
                description: "column index"
            }
        },
        examples: [
            "nerdamer.setVar('M', 'matrix([x,y],[a,b])');",
            "console.log(nerdamer('matget(M, 0, 1)').toString());",
            "console.log(nerdamer('M').toString());"
        ],
        returns: 'Number | Expression'
    },
    matset: {
        type: 'internal',
        usage: 'matset(m, i, j)',
        full_name: 'matrix set',
        description: 'Set an element in a matrix with zero based index. Returns the modified vector.',
        parameters: {
            M: {
                type: 'expression',
                description: "a matrix from which the element is being retrieved."
            },
            i: {
                type: 'expression',
                description: "row index"
            },
            j: {
                type: 'expression',
                description: "column index"
            }
        },
        examples: [
            "nerdamer.setVar('M', 'matrix([x,y],[a,b])');",
            "nerdamer.setVar('M', 'matset(M, 0, 1, 5*x)');",
            "console.log(nerdamer('M').toString());"
        ],
        returns: 'Matrix'
    },
    transpose: {
        type: 'internal',
        usage: 'transpose(M)',
        full_name: 'transpose',
        description: 'Transposes a matrix.',
        parameters: {
            M: {
                type: 'expression',
                description: "a matrix from which the element is being retrieved."
            }
        },
        examples: [
            "nerdamer.setVar('M', 'matrix([x,y],[a,b])');",
            "console.log(nerdamer('transpose(M)').toString());"
        ],
        returns: 'Matrix'
    },
    Algebra__roots: {
        type: 'internal',
        usage: 'roots(x)',
        full_name: 'polynomial roots',
        description: 'Finds the roots of a univariate polynomial.',
        parameters: {
            x: {
                type: 'expression',
                description: "The expression for which the roots are to be found."
            }
        },
        examples: [
            "var x = nerdamer('roots(x^2-3*x-10)');",
            "console.log(x.toString())",
            "var y = nerdamer('roots(x^2+1)');",
            "console.log(y.toString());"
        ],
        returns: 'Vector'
    },
    Algebra__factor: {
        type: 'internal',
        usage: 'factor(x)',
        full_name: 'factor',
        description: 'Factor an expression. Multivariate factoring in currently under development.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('factor(x^2-3*x-10)');",
            "console.log(x.toString())",
            "var y = nerdamer('factor(-b*z-a*z+b^3+a*b^2+a*b+a^2)');",
            "console.log(y.toString());"
        ],
        returns: 'Number | Expression'
    },
    Algebra__divide: {
        type: 'internal',
        usage: 'divide(x)',
        full_name: 'divide',
        description: 'Divides 2 polynomials.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('divide(x^2+2*x+1, x+1)');",
            "console.log(x.toString())",
            "var y = nerdamer('divide(-b*z-a*z+b^3+a*b^2+a*b+a^2, b+a)');",
            "console.log(y.toString());"
        ],
        returns: 'Number | Expression'
    },
    Algebra__div: {
        type: 'internal',
        usage: 'divide(x)',
        full_name: 'divide',
        description: 'Divides to polynomials and returns whole and remainder. CAUTION: For direct use only. Do not use through nerdamer since the return value\n\
                      will be an expression and the array has be accessed through the symbol property.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('div(x^2+2*x+1, x+1)');",
            "console.log(x.toString())",
            "var y = nerdamer('div(b*z+a*z+b^2+a*b, a+b)');",
            "console.log(y.toString());"
        ],
        returns: 'Number | Expression'
    },
    Algebra__gcd: {
        type: 'internal',
        usage: 'gcd(x)',
        full_name: 'Greatest Common Divisor',
        description: 'Gets the GCD of 2 polynomials',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('gcd(x^2+2*x+1, x^2+6*x+5)');",
            "console.log(x.toString())",
            "var y = nerdamer('gcd(b*z+a*z+b^2+a*b, a+b)');",
            "console.log(y.toString());"
        ],
        returns: 'Number | Expression'
    },
    Calculus__sum: {
        type: 'internal',
        usage: 'sum(expression, index, lower, upper)',
        full_name: 'summation',
        description: 'Sums an expression from lower to upper limit. Works both numerically and algebraically.',
        parameters: {
            expression: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            },
            index: {
                type: 'expression',
                description: "The index of summation"
            },
            lower: {
                type: 'expression',
                description: "Starting index"
            },
            upper: {
                type: 'expression',
                description: "Ending index"
            }
        },
        examples: [
            "var x = nerdamer('sum(x+1, x, 1, 5)');",
            "console.log(x.toString())",
            "var y = nerdamer('sum(x+y, x, 1, 20)');",
            "console.log(y.toString());"
        ],
        returns: 'Number | Expression'
    },
    Calculus__diff: {
        type: 'internal',
        usage: 'diff(expression, x, n)',
        full_name: 'differentiate',
        description: 'Gets the derivative.',
        parameters: {
            expression: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            },
            x: {
                type: 'expression',
                description: "The variable with respect to differentiate"
            },
            n: {
                type: 'expression',
                description: "(Optional) The nth derivative."
            }
        },
        examples: [
            "var x = nerdamer('diff(cos(x)*sin(x), x)');",
            "console.log(x.toString());",
            "var y = nerdamer('diff(x^3+a*x^3+x^2, x, 2)'); //second derivative",
            "console.log(y.toString());"
        ],
        returns: 'Number | Expression'
    },
    Calculus__integrate: {
        type: 'internal',
        usage: 'integrate(expression, x)',
        full_name: 'integrate',
        description: 'Attempts to compute integral of the expression. The depth of integration can be set using the "integration_depth" flag but be careful as this\n\
                     can seriously degrade performance. See example below. The hasIntegral method can be used to check if the symbol was completely integrated.\n\
                     This method will return true if the method was not completely integrated. The default depth is 4.',
        parameters: {
            expression: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            },
            x: {
                type: 'expression',
                description: "The variable with respect to which integrate"
            }
        },
        examples: [
            "var x = nerdamer('integrate(10*q/(4*x^2+24*x+20), x)');",
            "console.log(x.toString());",
            "var y = nerdamer('integrate(sec(x)^2, x)'); //second derivative",
            "console.log(y.toString());",
            "var x  = nerdamer('integrate(cos(x)*x^6, x)');",
            "console.log(x.toString());",
            "//we can use the hasIntegral method to check if it was fully integrated",
            "console.log(x.hasIntegral());",
        ],
        returns: 'bool'
    },
};
module.exports = FUNCTIONS;
//https://www.math.ucdavis.edu/~kouba/CalcTwoDIRECTORY/partialfracdirectory/PartialFrac.html