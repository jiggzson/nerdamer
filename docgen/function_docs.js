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
                description: "A string or array containing additional options such as parsing directly to number or expanding the expression. Use \"numer\" to "+
                        "when wanting the expression to be evaluated. Use \"expand\" when wanting the expression to be expanded."
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
        description: 'Sets a constant value which nerdamer will automatically substitute when parsing expression/equation. Set to "delete" or "" to unset.',
        parameters: {
            name: {
                type: 'String',
                description: 'The variable to be set as the constant'
            },
            value: {
                type: "Number|expression|string",
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
        description: 'Sets a known value in nerdamer. This differs from setConstant as the value can be overridden trough the scope. See example. Set to "delete" or "" to unset',
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
        description: 'Gets the list of reserved names. This is a list of names already in use by nerdamer excluding variable names. This is not a static list. Although some variables are reserved they are not restricted and can be used. This however is not recommended.',
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
    nerdamer__convertFromLaTeX: {
        type: 'nerdamer',
        usage: 'nerdamer.convertFromLaTeX(TeX)',
        full_name: 'convertFromLaTeX',
        description: 'Attempts to import a LaTeX string.',
        parameters: {
            TeX: {
                type: 'String',
                description: "The expression being converted"
            }
        },
        examples: [
            "var x = nerdamer.convertFromLaTeX('-2 \\\\sin{\\\\left( {{x}^{2}}-1\\\\right) }-\\\\frac{\\cos{\\\\left( {{x}^{2}}-1\\\\right) }}{{{x}^{2}}}');",
            "console.log(x.toString());",
            "x = nerdamer.convertFromLaTeX('\\\\frac{18 \\\\cdot x^{5}-4 \\\\cdot x^{3}+1}{a \\\\cdot b \\\\cdot c^{x}+4}-\\\\frac{a \\\\cdot b \\\\cdot c^{x} \\\\cdot \\\\mathrm{log}\\\\left(c\\\\right) \\\\cdot \\\\left(3 \\\\cdot x^{6}-x^{4}+x\\\\right)}{\\\\left(a \\\\cdot b \\\\cdot c^{x}+4\\\\right)^{2}}')",
            "console.log(x.toString())"
        ],
        returns: 'String'
    },
    nerdamer__version: {
        type: 'nerdamer',
        usage: 'nerdamer.version()',
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
    nerdamer__tree: {
        type: 'nerdamer',
        usage: 'nerdamer.tree()',
        full_name: 'Tree',
        description: 'Generates an RPN object which can be evaluated manually.',
        parameters: {
            x: {
                type: 'Expression',
                description: "The expression for which you want to generate the RPN"
            }
        },
        examples: [
            "var x = nerdamer.tree('x^2+2*x+1');",
            "console.log(x);"
        ],
        returns: 'nerdamer'
    },
    nerdamer__htmlTree: {
        type: 'nerdamer',
        usage: 'nerdamer.htmlTree()',
        full_name: 'HTML Tree',
        description: 'Generates the RPN for the expression using <a href="./nerdamer.tree.html">Expression.tree</a> and then formats it to HTML.',
        parameters: {
            x: {
                type: 'Expression',
                description: "The expression for which you want to generate the HTML"
            }
        },
        examples: [
            "var x = nerdamer.htmlTree('x^2+2*x+1');",
            "console.log(x);"
        ],
        returns: 'nerdamer'
    },
    nerdamer__set: {
        type: 'nerdamer',
        usage: 'nerdamer.set(setting, value)',
        full_name: 'set',
        description: "Some settings within nerdamer can be changed if needed to accommodate your current needs. Below is a table and\n\
                        a description of the settings which can be changes.\n\
                    <table class='table table-condensed'>\n\
                        <thead>\n\
                            <tr>\n\
                                <th>Setting</th>\n\
                                <th>Default</th>\n\
                                <th>Description</th>\n\
                            </tr>\n\
                        </thead>\n\
                        <tbody>\n\
                            <tr>\n\
                                <td>IMAGINARY: </td>\n\
                                <td>i</td>\n\
                                <td>Use this to set the letter used for imaginary numbers. For instance for using '<strong>j</strong>' instead of '<strong>i</strong>' for imaginary numbers</td>\n\
                            </tr>\n\
                            <tr>\n\
                                <td>VALIDATION_REGEX</td>\n\
                                <td>new RegExp('^[a-z_'+\n\
                                    'αAβBγΓδΔϵEζZηHθΘιI'+\n\
                                    'κKλΛμMνNξΞoOπΠρPσΣ'+\n\
                                    'τTυϒϕΦχXψΨωΩ][a-z\\'+\n\
                                    'd\\_αAβBγΓδΔϵEζZηHθΘ'+\n\
                                    'ιIκKλΛμMνNξΞoOπΠρPσ'+\n\
                                    'ΣτTυϒϕΦχXψΨωΩ]*$$','i')\n\
                                </td>\n\
                                <td>This regex is used to validate variables. Changes this to allow other characters to be used. Caution: this might break the library \n\
                                    so proceed carefully. </td>\n\
                            </tr>\n\
                            <tr>\n\
                                <td>PARSE2NUMBER</td>\n\
                                <td>false</td>\n\
                                <td>Forces evaluation to a number for functions and variables</td>\n\
                            </tr>\n\
                            <tr>\n\
                                <td>SOLVE_RADIUS</td>\n\
                                <td>1000</td>\n\
                                <td>The distance around a suspected root within which nerdamer searches for a root numerically.</td>\n\
                            </tr>\n\
                            <tr>\n\
                                <td>ROOTS_PER_SIDE</td>\n\
                                <td>5</td>\n\
                                <td>When numerically searching for roots nerdamer stops if either this number is satisfied or the distance is exceeded.</td>\n\
                            </tr>\n\
                            <tr>\n\
                                <td>SYMBOLIC_MIN_MAX</td>\n\
                                <td>false</td>\n\
                                <td>The library returns a symbolic min or max e.g. <strong>min(sqrt(2), sqrt(3))</strong> returns <strong>sqrt(2)</strong></td>\n\
                            </tr>\n\
                            <tr>\n\
                                <td>SOLUTIONS_AS_OBJECT</td>\n\
                                <td>false</td>\n\
                                <td>Set to true to have solutions returned as an object instead of an array when using <strong>nerdamer.solveEquations</strong></td>\n\
                            </tr>\n\
                            <tr>\n\
                                <td>USE_MULTICHARACTER_VARS</td>\n\
                                <td>true</td>\n\
                                <td>When this is set to false nerdamer will treat each letter as a variable so the input '<strong>six</strong>' will be treated as '<strong>s*i*x</strong>'</td>\n\
                            </tr>\n\
                            <tr>\n\
                                <td>integration_depth</td>\n\
                                <td>10</td>\n\
                                <td>When integrating nerdamer makes recursive calls. Nerdamer will stop searching for a solution after this many recursive calls. \n\
                                    Be careful as setting this too high may result in poor preformance</td>\n\
                            </tr>\n\
                            <tr>\n\
                                <td>Laplace_integration_depth</td>\n\
                                <td>40</td>\n\
                                <td>Because Laplace transforms typically need more room to calculate the transform, this number \n\
                                    needs to be higher than <strong>integration_depth</strong>. It's strongly recommended to never set this number lower than 40.</td>\n\
                            </tr>\n\
                        </tbody>\n\
                    </table>",
        parameters: {
            setting: {
                type: 'setting',
                description: "The setting to be changed"
            },
            value: {
                type: 'VARIES',
                description: "The value to set the setting to. Pass in an object for multiple settings."
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
    Solve__solveFor: {
        type: 'internal',
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
        returns: 'Expression[]'
    },
    Solve__solve: {
        type: 'internal',
        usage: 'nerdamer("solve(expression, variable")',
        full_name: 'solve',
        description: 'Similiar to solveFor this will solve for a given variable. The difference is that this is a self contained function.',
        parameters: {
            expression: {
                type: 'Expression',
                description: 'The expression to solve'
            },
            variable: {
                type: 'String',
                description: "The variable to solve for."
            }
        },
        examples: [
            "var x = nerdamer('solve(x^3+1, x)');",
            "console.log(x.toString());",
            "x = nerdamer.solve('x^2+2*x+1', 'x');",
            "console.log(x.toString());",
            "x = nerdamer.solve('3*(x+a)*(x-b)', 'x');",
            "console.log(x.toString());"
        ],
        returns: 'Symbol[]'
    },
    Solve__solveEquations: {
        type: 'internal',
        usage: 'nerdamer.solveEquations(expression_or_array, variables)',
        full_name: 'solveEquations',
        description: 'Solves a system of linear equations. Has limited ability to solve system of nonlinear equations. With nonlinear equations, the first set of solutions which '+
                'satisfies the constraints will be returned. Also keep in mind that there may be some floating point errors.',
        parameters: {
            expressions_or_array: {
                type: 'Expression',
                description: 'An array of expression'
            },
            variables: {
                type: 'String',
                description: "The variables to solve for."
            }
        },
        examples: [
            "var sol = nerdamer.solveEquations(['x+y=1', '2*x=6', '4*z+y=6']);",
            "console.log(sol.toString());",
            "sol = nerdamer.solveEquations('cos(x)+cos(3*x)=1','x');",
            "console.log(sol.toString());",
            "sol = nerdamer.solveEquations('x^2+8+y=x+6','x');",
            "console.log(sol.toString());",
            "nerdamer.set('SOLUTIONS_AS_OBJECT', true);",
            "sol = nerdamer.solveEquations(['2*x-y=8', '10*x+7*y-z=53', '4*z+y=6']);",
            'console.log(sol)',
            "//nerdamer also has some ability to solve some nonlinear equations",
            "nerdamer.set('SOLUTIONS_AS_OBJECT', false);",
            "sol = nerdamer('solveEquations([2*x^2*z-y=-59, 0.5*y^3-z=65.5, x^2+y^3-5*z^2=89])');",
            "console.log(sol.toString());"
        ],
        returns: 'Symbol[]'
    },

    Expression__text: {
        type: 'Expression',
        usage: 'nerdamer.text(option, n)',
        full_name: 'text',
        description: 'Returns the text representation of the expression.',
        parameters: {
            option: {
                type: 'String',
                description: "Pass in the string 'decimals' to get back numers as decimals. Pass in the string 'fractions' to get back number as fractions. Defaults to decimals."
            },
            n: {
                type: 'String',
                description: "The number of decimal places if requested as decimal"
            }
        },
        examples: [
            "var x = nerdamer('1/12+1/2*cos(x)-0.5');",
            "console.log(x.text('decimals'));",
            "console.log(x.text('fractions'));"
        ],
        returns: 'String'
    },
    Expression__add: {
        type: 'Expression',
        usage: 'nerdamer(x).add(y)',
        full_name: 'add',
        description: 'Adds two expressions.',
        parameters: {
            x: {
                type: 'String',
                description: "Expression 1"
            },
            y: {
                type: 'String',
                description: "Expression 2"
            }
        },
        examples: [
            "var x = nerdamer('x+1').add('x');",
            "console.log(x.toString());",
            "var x = nerdamer(0.1).add(0.2);",
            "console.log(x.toString());"
        ],
        returns: 'Expression'
    },
    Expression__subtract: {
        type: 'Expression',
        usage: 'nerdamer(x).subtract(y)',
        full_name: 'subtract',
        description: 'Subtracts two expressions.',
        parameters: {
            x: {
                type: 'String',
                description: "Expression 1"
            },
            y: {
                type: 'String',
                description: "Expression 2"
            }
        },
        examples: [
            "var x = nerdamer('x+1').subtract('x');",
            "console.log(x.toString());",
            "var x = nerdamer(0.1).subtract(0.2);",
            "console.log(x.toString());"
        ],
        returns: 'Expression'
    },
    Expression__multiply: {
        type: 'Expression',
        usage: 'nerdamer(x).multiply(y)',
        full_name: 'multiply',
        description: 'Multiplies two expressions.',
        parameters: {
            x: {
                type: 'String',
                description: "Expression 1"
            },
            y: {
                type: 'String',
                description: "Expression 2"
            }
        },
        examples: [
            "var a = nerdamer('x');",
            "var x = nerdamer('x+1').multiply(a);",
            "console.log(x.toString());",
            "var x = nerdamer(0.1).multiply(0.2);",
            "console.log(x.toString());"
        ],
        returns: 'Expression'
    },
    Expression__divide: {
        type: 'Expression',
        usage: 'nerdamer(x).divide(y)',
        full_name: 'divide',
        description: 'Divides one expression by another.',
        parameters: {
            x: {
                type: 'String',
                description: "Expression 1"
            },
            y: {
                type: 'String',
                description: "Expression 2"
            }
        },
        examples: [
            "var x = nerdamer('x^2+x').divide('x').expand();",
            "console.log(x.toString());",
            "x = nerdamer(0.1).multiply(0.2);",
            "console.log(x.toString());",
            "var a = nerdamer('(x+a)(y+b)');",
            "var b = nerdamer('2(y+b)');",
            "console.log(a.divide(b).toString());"
        ],
        returns: 'Expression'
    },
    Expression__pow: {
        type: 'Expression',
        usage: 'nerdamer(x).pow(y)',
        full_name: 'power',
        description: 'Raises one expression to another.',
        parameters: {
            x: {
                type: 'String',
                description: "Expression 1"
            },
            y: {
                type: 'String',
                description: "Expression 2"
            }
        },
        examples: [
            "var x = nerdamer('x^2+x').pow('x');",
            "console.log(x.toString());",
            "var x = nerdamer(5).pow(2);",
            "console.log(x.toString());"
        ],
        returns: 'Expression'
    },
    Expression__eq: {
        type: 'Expression',
        usage: 'nerdamer(x).eq(y)',
        full_name: 'equals',
        description: 'Checks for equality of two expressions.',
        parameters: {
            x: {
                type: 'String',
                description: "Expression 1"
            },
            y: {
                type: 'String',
                description: "Expression 2"
            }
        },
        examples: [
            "var x = nerdamer('sqrt(2)').eq('2^(1/2)');",
            "console.log(x.toString());",
            "var x = nerdamer(5).eq(2);",
            "console.log(x.toString());",
            "var x = nerdamer('a+1').eq('a+1');",
            "console.log(x.toString());",
            "var x = nerdamer('Infinity').eq('Infinity');",
            "console.log(x.toString());"
        ],
        returns: 'Boolean'
    },
    Expression__gt: {
        type: 'Expression',
        usage: 'nerdamer(x).gt(y)',
        full_name: 'greater than',
        description: 'Checks if one expression is greater than other.',
        parameters: {
            x: {
                type: 'String',
                description: "Expression 1"
            },
            y: {
                type: 'String',
                description: "Expression 2"
            }
        },
        examples: [
            "var x = nerdamer('sqrt(2)').gt('2^(1/2)');",
            "console.log(x.toString());",
            "var x = nerdamer(5).gt(2);",
            "console.log(x.toString());",
            "var x = nerdamer('a+1').gt('a+1');",
            "console.log(x.toString());",
            "var x = nerdamer('Infinity').gt('Infinity');",
            "console.log(x.toString());"
        ],
        returns: 'Boolean'
    },
    Expression__gte: {
        type: 'Expression',
        usage: 'nerdamer(x).gte(y)',
        full_name: 'greater than or equals',
        description: 'Checks if one expression is greater than, or equal to, other.',
        parameters: {
            x: {
                type: 'String',
                description: "Expression 1"
            },
            y: {
                type: 'String',
                description: "Expression 2"
            }
        },
        examples: [
            "var x = nerdamer('sqrt(2)').gte('2^(1/2)');",
            "console.log(x.toString());",
            "var x = nerdamer(5).gte(2);",
            "console.log(x.toString());",
            "var x = nerdamer('a+1').gte('a+1');",
            "console.log(x.toString());",
            "var x = nerdamer('Infinity').gte('Infinity');",
            "console.log(x.toString());"
        ],
        returns: 'Boolean'
    },
    Expression__lte: {
        type: 'Expression',
        usage: 'nerdamer(x).lte(y)',
        full_name: 'less than or equals',
        description: 'Checks if one expression is less than, or equal to, other.',
        parameters: {
            x: {
                type: 'String',
                description: "Expression 1"
            },
            y: {
                type: 'String',
                description: "Expression 2"
            }
        },
        examples: [
            "var x = nerdamer('sqrt(2)').lte('2^(1/2)');",
            "console.log(x.toString());",
            "var x = nerdamer(5).lte(2);",
            "console.log(x.toString());",
            "var x = nerdamer('a+1').lte('a+1');",
            "console.log(x.toString());",
            "var x = nerdamer('Infinity').lte('Infinity');",
            "console.log(x.toString());"
        ],
        returns: 'Boolean'
    },
    Expression__lt: {
        type: 'Expression',
        usage: 'nerdamer(x).lt(y)',
        full_name: 'less than or equals',
        description: 'Checks if one expression is less than other.',
        parameters: {
            x: {
                type: 'String',
                description: "Expression 1"
            },
            y: {
                type: 'String',
                description: "Expression 2"
            }
        },
        examples: [
            "var x = nerdamer('sqrt(2)').lt('2^(1/2)');",
            "console.log(x.toString());",
            "var x = nerdamer(5).lt(2);",
            "console.log(x.toString());",
            "var x = nerdamer('a').lt('a+1');",
            "console.log(x.toString());",
            "var x = nerdamer('Infinity').lt('Infinity');",
            "console.log(x.toString());"
        ],
        returns: 'Boolean'
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
            "//the expression is simplified but the functions aren't called.",
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
        description: 'Substitutes a given value with another given value.',
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
                     using this. The order of the function parameters is in alphabetical order by default but an array containing the list of arguments \n\
                     in the preferred order can be passed to the function.',
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
        description: 'Get a list of the variables contained within the expression.',
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
    Expression__denominator: {
        type: 'Expression',
        usage: 'nerdamer(expression).denominator()',
        full_name: 'denominator',
        description: 'Get a list of the denominator of a polynomial',
        parameters: {
            none: {
                type: '',
                description: "This function takes no arguments."
            }
        },
        examples: [
            "var e = nerdamer('(x^2+1)/(x-1)');",
            "var denominator = e.denominator().toString();",
            "console.log(denominator);",
            "e = nerdamer('2/5');",
            "denominator = e.denominator().toString();",
            "console.log(denominator);"
        ],
        returns: 'Expression'
    },
    Expression__numerator: {
        type: 'Expression',
        usage: 'nerdamer(expression).numerator()',
        full_name: 'numerator',
        description: 'Get a list of the numerator of a polynomial',
        parameters: {
            none: {
                type: '',
                description: "This function takes no arguments."
            }
        },
        examples: [
            "var e = nerdamer('(x^2+1)/(x-1)');",
            "var numerator = e.numerator().toString();",
            "console.log(numerator);",
            "e = nerdamer('2/5');",
            "numerator = e.numerator().toString();",
            "console.log(numerator);"
        ],
        returns: 'Expression'
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
        returns: 'Expression'
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
            "console.log(v.toString());",
            "v = nerdamer.cos('pi');",
            "console.log(v)"
        ],
        returns: 'Expression'
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
        returns: 'Expression'
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
        returns: 'Expression'
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
        returns: 'Expression'
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
        returns: 'Expression'
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
        returns: 'Expression'
    },
    sech: {
        type: 'internal',
        usage: 'sech(x)',
        full_name: 'hyperbolic secant',
        description: 'This function will return the hyperbolic secant',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('sech(pi)').evaluate();", 
            "console.log(r.toString());",
            "var t = nerdamer('sech(x)')", 
            "console.log(t.toString());",
            "var u = nerdamer('sech(pi/4)').evaluate()", 
            "console.log(u.toString());"
        ],
        returns: 'Expression'
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
        returns: 'Expression'
    },
    csch: {
        type: 'internal',
        usage: 'csch(x)',
        full_name: 'hyperbolic cosecant',
        description: 'Returns the hyperbolic cosecant of a number',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('csch(pi/2)');", 
            "console.log(r.toString());",
            "var t = nerdamer('csch(x)')", 
            "console.log(t.toString());",
            "var u = nerdamer('csch(pi/4)')", 
            "console.log(u.toString());",
            "var v = nerdamer('csch(pi)')",
            "console.log(v);"
        ],
        returns: 'Expression'
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
        returns: 'Expression'
    },
    coth: {
        type: 'internal',
        usage: 'coth(x)',
        full_name: 'hyperbolic cotangent',
        description: 'Returns the hyperbolic cotangent of a number',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('coth(pi/2)');", 
            "console.log(r.toString());",
            "var t = nerdamer('coth(x)')", 
            "console.log(t.toString());",
            "var u = nerdamer('coth(pi/4)')", 
            "console.log(u.toString());",
            "var v = nerdamer('coth(pi)')",
            "console.log(v.toString());"
        ],
        errors: [
            "Throws exception for multiples of pi"
        ],
        returns: 'Expression'
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
        returns: 'Expression'
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
        returns: 'Expression'
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
            "var t = nerdamer('acosh(-1)').evaluate()", 
            "console.log(t.text());"
        ],
        returns: 'Expression'
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
        returns: 'Expression'
    },
    asec: {
        type: 'internal',
        usage: 'asec(x)',
        full_name: 'arcsecant',
        description: 'Returns the inverse of sec in radians. ',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('asec(11)');", 
            "console.log(r.toString());",
            "var t = nerdamer('asec(-21)')", 
            "console.log(t.toString());"
        ],
        returns: 'Expression'
    },
    asech: {
        type: 'internal',
        usage: 'asech(x)',
        full_name: 'inverse hyperbolic secant',
        description: 'Returns the inverse of sech. ',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('asech(11)');", 
            "console.log(r.toString());",
            "var t = nerdamer('asech(-21)')", 
            "console.log(t.toString());",
            "t = nerdamer('asech(i-21)').evaluate()", 
            "console.log(t.toString());"
        ],
        returns: 'Expression'
    },
    acsc: {
        type: 'internal',
        usage: 'acsc(x)',
        full_name: 'arccosecant',
        description: 'Returns the inverse of csc in radians. ',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('acsc(81)');", 
            "console.log(r.toString());",
            "var t = nerdamer('acsc(1)')", 
            "console.log(t.toString());"
        ],
        returns: 'Expression'
    },
    acsch: {
        type: 'internal',
        usage: 'acsch(x)',
        full_name: 'inverse hyperbolic cosecant',
        description: 'Returns the inverse of csch. ',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('acsch(81)');", 
            "console.log(r.toString());",
            "var t = nerdamer('acsch(1)')", 
            "console.log(t.toString());",
            "t = nerdamer('acsch(i+1)').evaluate()", 
            "console.log(t.toString());"
        ],
        returns: 'Expression'
    },
    acot: {
        type: 'internal',
        usage: 'acot(x)',
        full_name: 'arccotangent',
        description: 'Returns the inverse of cot in radians. ',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('acot(0)');", 
            "console.log(r.toString());",
            "var t = nerdamer('acot(-1)')", 
            "console.log(t.toString());",
            "t = nerdamer('acot(i-1)').evaluate()", 
            "console.log(t.toString());"
        ],
        returns: 'Expression'
    },
    acoth: {
        type: 'internal',
        usage: 'acoth(x)',
        full_name: 'inverse hyperbolic cotangent',
        description: 'Returns the inverse of coth. ',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('acoth(0.1)');", 
            "console.log(r.toString());",
            "var t = nerdamer('acoth(-i+8)').evaluate()", 
            "console.log(t.toString());"
        ],
        returns: 'Expression'
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
        returns: 'Expression'
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
        returns: 'Expression'
    },
    atan2: {
        type: 'internal',
        usage: 'atan2(x, y)',
        full_name: 'arctangent 2',
        description: 'Returns the four-quadrant inverse of tangent.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('atan2(0, 1)').evaluate();", 
            "console.log(r.text());",
            "var t = nerdamer('atan2(-1, 2)').evaluate()", 
            "console.log(t.text());"
        ],
        returns: 'Expression'
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
        returns: 'Expression'
    },
    min: {
        type: 'internal',
        usage: 'min(... args)',
        full_name: 'minimum',
        description: 'Returns the min of a set of numbers. Maps directly to Math.min(... args) if numeric.',
        parameters: {
            args: {
                type: 'expression',
                description: "A variable number of arguments"
            }
        },
        examples: [
            "var x = nerdamer('min(5, 2, 11)').evaluate();",
            "console.log(x.toString());",
            "x = nerdamer('min(x*x, y, z)');",
            "console.log(x.toString());",
            "//Instruct nerdamer to return symbolic min and max",
            "nerdamer.set('SYMBOLIC_MIN_MAX', true);",
            "x = nerdamer('min(sqrt(2), pi)');",
            "console.log(x.toString());"
        ],
        returns: 'Expression'
    },
    max: {
        type: 'internal',
        usage: 'max(... args)',
        full_name: 'maximum',
        description: 'Returns the maximum of a set of numbers. Maps directly to Math.max(... args) if numeric.',
        parameters: {
            args: {
                type: 'expression',
                description: "A variable number of arguments"
            }
        },
        examples: [
            "var x = nerdamer('max(5, 2, 11)').evaluate();",
            "console.log(x.toString());",
            "x = nerdamer('max(x*x, y, z)');",
            "console.log(x.toString());",
            "//Instruct nerdamer to return symbolic min and max",
            "nerdamer.set('SYMBOLIC_MIN_MAX', true);",
            "x = nerdamer('max(sqrt(2), pi)');",
            "console.log(x.toString());"
        ],
        returns: 'Expression'
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
        returns: 'Expression'
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
        returns: 'Expression'
    },
    step: {
        type: 'internal',
        usage: 'step(x)',
        full_name: 'heaviside step function',
        description: 'The Heaviside step function as defined <a href="https://en.wikipedia.org/wiki/Heaviside_step_function">here</a>',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('step(5/2)').evaluate();",
            "console.log(x.toString());",
            "var x = nerdamer('step(-2)').evaluate();",
            "console.log(x.toString());",
            "var x = nerdamer('step(0)').evaluate();",
            "console.log(x.toString());"
        ],
        returns: 'Expression'
    },
    rect: {
        type: 'internal',
        usage: 'rect(x)',
        full_name: 'rectangular function',
        description: 'The rectangular function as defined  <a href="https://en.wikipedia.org/wiki/Rectangular_function">here</a>',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('rect(5/2)').evaluate();",
            "console.log(x.toString());",
            "var x = nerdamer('rect(-2)').evaluate();",
            "console.log(x.toString());",
            "var x = nerdamer('rect(0)').evaluate();",
            "console.log(x.toString());"
        ],
        returns: 'Expression'
    },
    sinc: {
        type: 'internal',
        usage: 'sinc(x)',
        full_name: 'sinc function',
        description: 'The cardinal sine function as defined  <a href="https://en.wikipedia.org/wiki/Sinc_function">here</a>',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('sinc(5/2)').evaluate();",
            "console.log(x.text());",
            "var x = nerdamer('sinc(-2)').evaluate();",
            "console.log(x.text());",
            "var x = nerdamer('sinc(0)').evaluate();",
            "console.log(x.text());"
        ],
        returns: 'Expression'
    },
    tri: {
        type: 'internal',
        usage: 'tri(x)',
        full_name: 'triangular function',
        description: 'The triangular function as defined  <a href="https://en.wikipedia.org/wiki/Triangular_function">here</a>',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('tri(5/2)').evaluate();",
            "console.log(x.toString());",
            "var x = nerdamer('tri(-2)').evaluate();",
            "console.log(x.toString());",
            "var x = nerdamer('tri(0)').evaluate();",
            "console.log(x.toString());"
        ],
        returns: 'Expression'
    },
    factorial: {
        type: 'internal',
        usage: 'factorial(x)',
        full_name: 'factorial',
        aliases: ['fact'],
        description: 'Calculates the factorial of a number.',
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
        returns: 'Expression'
    },
    dfactorial: {
        type: 'internal',
        usage: 'dfactorial(x)',
        full_name: 'double factorial',
        description: 'Calculates the double factorial of a number.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('dfactorial(5)').evaluate();",
            "console.log(x.text());",
            "x = nerdamer('dfactorial(9)').evaluate();",
            "console.log(x.text());",
            "x = nerdamer('dfactorial(x+1)').evaluate();",
            "console.log(x.text());"
        ],
        returns: 'Expression'
    },
    fact: {
        type: 'internal',
        usage: 'factorial(x)',
        full_name: 'factorial',
        aliases: ['factorial'],
        description: 'Calculates the factorial of a number.',
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
        returns: 'Expression'
    },
    arg: {
        type: 'internal',
        usage: 'arg(z)',
        full_name: 'argument',
        description: 'Returns the argument of a complex number. ',
        parameters: {
            z: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('arg(81)');", 
            "console.log(r.toString());",
            "var t = nerdamer('arg(5+i)')", 
            "console.log(t.toString());"
        ],
        returns: 'Expression'
    },
    conjugate: {
        type: 'internal',
        usage: 'conjugate(z)',
        full_name: 'conjugate',
        description: 'Returns the conjugate of a complex number. ',
        parameters: {
            z: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('conjugate(81)');", 
            "console.log(r.toString());",
            "var t = nerdamer('conjugate(5+i)')", 
            "console.log(t.toString());"
        ],
        returns: 'Expression'
    },
    imagpart: {
        type: 'internal',
        usage: 'imagpart(z)',
        full_name: 'imaginary part',
        description: 'Returns the imaginary of a complex number. ',
        parameters: {
            z: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('imagpart(81+5*b*i)');", 
            "console.log(r.toString());",
            "var t = nerdamer('imagpart(5+i)')", 
            "console.log(t.toString());"
        ],
        returns: 'Expression'
    },
    realpart: {
        type: 'internal',
        usage: 'realpart(z)',
        full_name: 'realpart part',
        description: 'Returns the realpart of a complex number. ',
        parameters: {
            z: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('realpart(b*x+x*c*i)');", 
            "console.log(r.toString());",
            "var t = nerdamer('realpart(5+i)')", 
            "console.log(t.toString());"
        ],
        returns: 'Expression'
    },
    polarform: {
        type: 'internal',
        usage: 'polarform(z)',
        full_name: 'polar form',
        description: 'converts imaginary number from rectangular form to polar form.',
        parameters: {
            z: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('polarform(b*x+x*c*i)');", 
            "console.log(r.toString());",
            "var t = nerdamer('polarform(5+i)')", 
            "console.log(t.toString());"
        ],
        returns: 'Expression'
    },
    rectform: {
        type: 'internal',
        usage: 'rectform(z)',
        full_name: 'rectangular form  <span style="color: red">(Under development)</span>',
        description: 'converts imaginary number from polar form to rectangular form. This is still being developed so please report any issues.',
        parameters: {
            z: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var r = nerdamer('rectform(e^(atan(1/5)*i)*sqrt(26))');", 
            "console.log(r.toString());",
            "var t = nerdamer('rectform(e^(atan(-1/26)*i)*sqrt(677))')", 
            "console.log(t.toString());"
        ],
        returns: 'Expression'
    },
    Ci: {
        type: 'internal',
        usage: 'Ci(number)',
        full_name: 'cosine integral',
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
        returns: 'Expression'
    },
    Chi: {
        type: 'internal',
        usage: 'Chi(number)',
        full_name: 'hyperbolic cosine integral',
        description: 'Calculates the hyperbolic cosine integral of a number.',
        parameters: {
            number: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('Chi(5)').evaluate();",
            "console.log(x.text());",
            "x = nerdamer('Chi(0)').evaluate();",
            "console.log(x.text());"
        ],
        returns: 'Expression'
    },
    Si: {
        type: 'internal',
        usage: 'Si(number)',
        full_name: 'sine integral',
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
        returns: 'Expression'
    },
    Shi: {
        type: 'internal',
        usage: 'Shi(number)',
        full_name: 'hyperbolic sine integral',
        description: 'Calculates the hyperbolic sine integral of a number.',
        parameters: {
            number: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('Shi(5)').evaluate();",
            "console.log(x.text());",
            "x = nerdamer('Shi(0)').evaluate();",
            "console.log(x.text());"
        ],
        returns: 'Expression'
    },
    Ei: {
        type: 'internal',
        usage: 'Ei(number)',
        full_name: 'Exponential Integral',
        description: 'Calculates the exponential integral of a number.',
        parameters: {
            number: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('Ei(5)').evaluate();",
            "console.log(x.text());",
            "x = nerdamer('Ei(3)').evaluate();",
            "console.log(x.text());",
            "x = nerdamer('Ei(0)').evaluate();",
            "console.log(x.text());"
        ],
        returns: 'Expression'
    },
    continued_fraction: {
        type: 'internal',
        usage: 'continued_fraction(x)',
        full_name: 'Continued Fraction',
        description: 'Returns the fraction as a continued fraction. The first digit returned is the sign. The remainder is the continued fraction.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('continued_fraction(3.14159)');",
            "console.log(x.toString());",
            "x = nerdamer('continued_fraction(1/6)')",
            "console.log(x.toString());",
            "x = nerdamer('continued_fraction(-5/4)')",
            "console.log(x.toString());"
        ],
        returns: 'Expression'
    },
    simplify: {
        type: 'internal',
        usage: 'simplify(x)',
        full_name: 'Simplify',
        description: 'Attempts to simplify an expression. Please report any bugs or errors since this is actively being worked on.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('simplify((x^2+4*x-45)/(x^2+x-30))');",
            "console.log(x.toString());",
            "var y = nerdamer('simplify((17/2)*(-10+8*i)^(-1)-5*(-10+8*i)^(-1)*i)');",
            "console.log(y.toString());"
        ],
        returns: 'Expression'
    },
    gamma_incomplete: {
        type: 'internal',
        usage: 'gamma_incomplete(n, x)',
        full_name: 'Gamma incomplete function',
        description: '',
        parameters: {
            n: {
                type: 'expression',
                description: ""
            },
            x: {
                type: 'expression',
                description: ""
            }
        },
        examples: [
            "var x = nerdamer('gamma_incomplete(5)').evaluate();",
            "console.log(x.text());",
            "x = nerdamer.gamma_incomplete(9);",
            "console.log(x.text());"
        ],
        returns: 'Expression'
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
            "var x = nerdamer('fib(15)').evaluate();",
            "console.log(x.text());",
            "x = nerdamer('fib(0)').evaluate();",
            "console.log(x.text());"
        ],
        returns: 'Expression'
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
        returns: 'Expression'
    },
    mod: {
        type: 'internal',
        usage: 'mod(x, y)',
        full_name: 'mod',
        description: 'Calculates the modulo of two numbers.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            },
            y: {
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
        returns: 'Expression'
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
        returns: 'Expression'
    },
    nthroot: {
        type: 'internal',
        usage: 'nthroot(x, y)',
        full_name: 'nth root',
        description: 'Calculates the nth root of a number.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            },
            y: {
                type: 'expression|integer',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('nthroot(125, 3)');",
            "console.log(x.toString());",
            "x = nerdamer('nthroot(-27, 3)');",
            "console.log(x.toString());",
            "x = nerdamer('nthroot(a, 2)');",
            "console.log(x.toString());"
        ],
        returns: 'Expression'
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
        returns: 'Expression'
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
        returns: 'Expression'
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
            "console.log(y.toString());",
            "x = nerdamer('(x+y)*(x-5)*x').expand();",
            "console.log(x.toString());"
        ],
        returns: 'Expression'
    },
    sort: {
        type: 'internal',
        usage: 'sort(x)',
        full_name: 'sort',
        description: 'Returns the sorted coefficients of a polynomial. If given a vector it will be sorted alphabetically.',
        parameters: {
            x: {
                type: 'expression/polynomial',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('sort((a*x^2+9*x-1))');",
            "console.log(x.toString());",
            "var y = nerdamer('sort([b, d, 1])');",
            "console.log(y.toString());"
        ],
        returns: 'Vector'
    },
    line: {
        type: 'internal',
        usage: 'line(p1, p2)',
        full_name: 'sort',
        description: 'Computes the equation of a straight line given two points',
        parameters: {
            p1: {
                type: 'vector',
                description: "A vector in form of [x, y]"
            },
            p2: {
                type: 'vector',
                description: "A vector in form of [x, y]"
            }
        },
        examples: [
            "var x = nerdamer('line([-1,-4], [3,11])');",
            "console.log(x.toString());",
            "var y = nerdamer('line([1,2], [3,4])');",
            "console.log(y.toString());"
        ],
        returns: 'Vector'
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
        returns: 'Expression'
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
        returns: 'Expression'
    },
    sign: {
        type: 'internal',
        usage: 'sign(x)',
        full_name: 'sign function',
        description: 'Returns the sign of the number.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('sign(x)');",
            "console.log(x.toString());",
            "var y = nerdamer('sign(-1)').evaluate();",
            "console.log(y.toString());"
        ],
        returns: 'Expression'
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
        returns: 'Expression'
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
            "console.log(x.evaluate().toString());"
        ],
        returns: 'Expression'
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
        returns: 'Expression'
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
        returns: 'Expression'
    },
    imatrix: {
        type: 'internal',
        usage: 'imatrix(n)',
        full_name: 'Identity matrix',
        description: 'Creates an identity matrix of dimensions n x n',
        parameters: {
            n: {
                type: 'expression',
                description: "Dimensions of identity matrix"
            }
        },
        examples: [
            "var x = nerdamer('imatrix(4)');",
            "console.log(x.toString());",
            "x = nerdamer.imatrix(3);",
            "console.log(x.toString());"
        ],
        returns: 'Expression'
    },
    determinant: {
        type: 'internal',
        usage: 'determinant(M)',
        full_name: 'Matrix determinant',
        description: 'Computes the determinant of a matrix',
        parameters: {
            M: {
                type: 'Matrix',
                description: "The matrix for which the determinant is to be calculated."
            }
        },
        examples: [
            "nerdamer.setVar('M', 'matrix([4,5],[1,7])');",
            "x = nerdamer('determinant(M)');",
            "console.log(x.toString());"
        ],
        returns: 'Expression'
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
        returns: 'Expression'
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
        returns: 'Expression'
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
        returns: 'Expression'
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
    matgetcol: {
        type: 'internal',
        usage: 'matgetcol(M, i)',
        full_name: 'matrix get column',
        description: 'Gets a column of a matrix. Returns a new vector.',
        parameters: {
            M: {
                type: 'expression',
                description: "a matrix from which the column is being retrieved."
            },
            i: {
                type: 'expression',
                description: "the zero based column index"
            }
        },
        examples: [
            "nerdamer.setVar('M', 'matrix([x,y],[a,b])');",
            "var x = nerdamer('matgetcol(M, 0)');",
            "console.log(x.toString());"
        ],
        returns: 'Matrix'
    },
    matgetrow: {
        type: 'internal',
        usage: 'matgetrow(M, i)',
        full_name: 'matrix get row',
        description: 'Gets a row of a matrix. Returns a new vector.',
        parameters: {
            M: {
                type: 'expression',
                description: "a matrix from which the row is being retrieved."
            },
            i: {
                type: 'expression',
                description: "the zero based row index"
            }
        },
        examples: [
            "nerdamer.setVar('M', 'matrix([x,y],[a,b])');",
            "var x = nerdamer('matgetrow(M, 0)');",
            "console.log(x.toString());"
        ],
        returns: 'Matrix'
    },
    matsetcol: {
        type: 'internal',
        usage: 'matsetcol(M, i, col)',
        full_name: 'matrix set column',
        description: 'Sets a column of a matrix. Returns a new matrix.',
        parameters: {
            M: {
                type: 'expression',
                description: "a matrix for which the column is being set."
            },
            i: {
                type: 'expression',
                description: "the zero based column index"
            },
            col: {
                type: 'vector',
                description: 'the vector representation of the column'
            }
        },
        examples: [
            "nerdamer.setVar('M', 'matrix([x,y],[a,b])');",
            "var M2 = nerdamer('matsetcol(M, 0, [[1],[2]])');",
            "console.log(M2.toString());"
        ],
        returns: 'Matrix'
    },
    matsetrow: {
        type: 'internal',
        usage: 'matsetrow(M, i, row)',
        full_name: 'matrix set row',
        description: 'Sets a row of a matrix. Returns a new matrix.',
        parameters: {
            M: {
                type: 'expression',
                description: "a matrix for which the row is being set."
            },
            i: {
                type: 'expression',
                description: "the zero based row index"
            },
            row: {
                type: 'vector',
                description: 'the vector representation of the row'
            }
        },
        examples: [
            "nerdamer.setVar('M', 'matrix([x,y],[a,b])');",
            "var M2 = nerdamer('matsetrow(M, 0, [1, 2])');",
            "console.log(M2.toString());"
        ],
        returns: 'Matrix'
    },
    size: {
        type: 'internal',
        usage: 'size(M_V)',
        full_name: 'Size',
        description: 'Gets the size of the matrix or vector. Returns a vector with the [row length, column length] in matrix.',
        parameters: {
            M_V: {
                type: 'Matrix | Vector',
                description: "a matrix for which the row is being set."
            }
        },
        examples: [
            "nerdamer.setVar('M', 'matrix([x,y],[a,b])');",
            "var matrix_size = nerdamer('size(M)');",
            "console.log(matrix_size.toString());",
            "var vector_size = nerdamer('size([a, b, c])');",
            "console.log(vector_size.toString());"
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
    cross: {
        type: 'internal',
        usage: 'cross(v1, v2)',
        full_name: 'cross product',
        description: 'Calculates the cross product of two vectors',
        parameters: {
            v1: {
                type: 'Vector',
                description: "a vector"
            },
            v2: {
                type: 'Vector',
                description: "a vector"
            }
        },
        examples: [
            "var x = nerdamer('cross([1,2,3], [4,5,6])').evaluate();",
            "console.log(x.toString());",
            "x = nerdamer('cross([x+1,2,tan(x)], [4,x^2,1/x])').evaluate();",
            "console.log(x.toString());"
        ],
        returns: 'Matrix'
    },
    dot: {
        type: 'internal',
        usage: 'dot(v1, v2)',
        full_name: 'cross product',
        description: 'Calculates the dot product of two vectors',
        parameters: {
            v1: {
                type: 'Vector',
                description: "a vector"
            },
            v2: {
                type: 'Vector',
                description: "a vector"
            }
        },
        examples: [
            "var x = nerdamer('dot([1,2,3], [4,5,6])').evaluate();",
            "console.log(x.toString());",
            "x = nerdamer('dot([x+1,2,tan(x)], [4,x^2,1/x])').evaluate();",
            "console.log(x.toString());"
        ],
        returns: 'Matrix'
    },
    Set: {
        type: 'internal',
        usage: 'Set([x1, x2, x3, ...])',
        full_name: 'Set',
        description: 'Create a collecton of distinct elements. When an operation such as addition, multiplication, division, etc. is preformed on the set, '+
                'it is converted to a vector before operations are performed. The return type will also be a vector',
        parameters: {
            xn: {
                type: 'expression',
                description: "An algebraic number"
            }
        },
        examples: [
            "var x = nerdamer('Set([x, a, 2, 2, 2, x])');",
            "console.log(x.toString());"
        ],
        returns: 'Expression'
    },
    intersection: {
        type: 'internal',
        usage: 'intersection(set1, set2)',
        full_name: 'Intersection',
        description: 'Finds the intersection of two sets',
        parameters: {
            set1: {
                type: 'Set',
                description: "A set"
            },
            set2: {
                type: 'Set',
                description: "A set"
            }
        },
        examples: [
            "var x = nerdamer('intersection(Set([x, a, 2, b/t]), Set([x^2, 1, b/t, 2]))');",
            "console.log(x.toString());"
        ],
        returns: 'Expression'
    },
    intersects: {
        type: 'internal',
        usage: 'intersects(set1, set2)',
        full_name: 'Intersecst',
        description: 'Checks to see if one set intersects the other',
        parameters: {
            set1: {
                type: 'Set',
                description: "A set"
            },
            set2: {
                type: 'Set',
                description: "A set"
            }
        },
        examples: [
            "var x = nerdamer('intersects(Set([x, a, 2, b/t]), Set([x^2, 1, b/t, 2]))');",
            "console.log(x.toString());"
        ],
        returns: 'Expression'
    },
    union: {
        type: 'internal',
        usage: 'union(set1, set2)',
        full_name: 'Set',
        description: 'Finds the union of two sets',
        parameters: {
            set1: {
                type: 'Set',
                description: "A set"
            },
            set2: {
                type: 'Set',
                description: "A set"
            }
        },
        examples: [
            "var x = nerdamer('union(Set([x, a, 2, b/t]), Set([x^2, 1, b/t, 2]))');",
            "console.log(x.toString());"
        ],
        returns: 'Expression'
    },
    difference: {
        type: 'internal',
        usage: 'difference(set1, set2)',
        full_name: 'Difference',
        description: 'Finds the difference of two sets',
        parameters: {
            set1: {
                type: 'Set',
                description: "A set"
            },
            set2: {
                type: 'Set',
                description: "A set"
            }
        },
        examples: [
            "var x = nerdamer('difference(Set([x, a, 2, b/t]), Set([x^2, 1, b/t, 2]))');",
            "console.log(x.toString());"
        ],
        returns: 'Expression'
    },
    is_subset: {
        type: 'internal',
        usage: 'is_subset(set1, set2)',
        full_name: 'Is Subset',
        description: 'Checks if one set is a subset of the other',
        parameters: {
            set1: {
                type: 'Set',
                description: "A set"
            },
            set2: {
                type: 'Set',
                description: "A set"
            }
        },
        examples: [
            "var x = nerdamer('is_subset(Set([x, a, 2, b/t]), Set([b/t, 2]))');",
            "console.log(x.toString());",
            "var y = nerdamer('is_subset(Set([x, a, 2, b/t]), Set([2, q/4, r]))');",
            "console.log(y.toString());",
        ],
        returns: 'Expression'
    },
    deg: {
        type: 'internal',
        usage: 'deg(p)',
        full_name: 'sort',
        description: 'Returns the degree of the polynomial. Specify the variable to use in multivariate polynomials.',
        parameters: {
            p: {
                type: 'Expression/polynomial',
                description: "A polynomial"
            }
        },
        examples: [
            "var x = nerdamer('deg(x^2+2*x+1)');",
            "console.log(x.toString());",
            "var y = nerdamer('deg(a*x^7+2*x+1,x)');",
            "console.log(y.toString());"
        ],
        returns: 'Expression/Integer'
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
    Algebra__coeffs: {
        type: 'internal',
        usage: 'coeffs(polynomial, x)',
        full_name: 'coefficients',
        description: 'Get the coefficients of a polynomial. The coefficients will be placed in the index of their power.'+
                ' So constants are in the 0th place, x^2 would be in the 2nd place, etc. Throws an error if expression is'+
                ' not a polynomial. Holes will be filled with zeroes. Coeffs returns a vector so the methods vecget and vecset '+
                'can be used to access it\'s elements.',
        parameters: {
            polynomial: {
                type: 'expression',
                description: "The polynomial for which the coefficients are to be found."
            },
            x: {
                type: 'expression',
                description: "The respective variable with which to get the coefficients"
            }
        },
        examples: [
            "var coeffs = nerdamer.coeffs('3*x^2+1', 'x');",
            "console.log(coeffs.toString());",
            "coeffs.each(function(e, i) {",
            "   console.log('coeff #'+i+': ', nerdamer(e).add('t').toString());",
            "});",
            "var poly = nerdamer('a*x^2+b*x+c+x');",
            "coeffs = nerdamer.coeffs(poly, 'x');",
            "console.log(coeffs.toString());",
            "coeffs = nerdamer.coeffs('a*x+b/x^2', 'x');",
            "var p = nerdamer('vecget(coeffs(7*x^2+3*x+11, x), 2)');",
            "console.log(p.toString());"
        ],
        returns: 'Vector'
    },
    Algebra__sqcomp: {
        type: 'internal',
        usage: 'sqcomp(polynomial, x)',
        full_name: 'complete the square',
        description: 'Attempts to rewrite to polynomial to complete the square.',
        parameters: {
            polynomial: {
                type: 'expression',
                description: "The polynomial for which is to be rewritten."
            },
            x: {
                type: 'expression',
                description: "The variable to use. Will automatically assume the variable for univariate polynomials."
            }
        },
        examples: [
            "var x = nerdamer('sqcomp(9*x^2-18*x+17)');",
            "console.log(x.toString());",
            "var y = nerdamer('sqcomp(a*x^2+b*x-11*c, x)');",
            "console.log(y.toString());"
        ],
        returns: 'Vector'
    },
    Algebra__partfrac: {
        type: 'internal',
        usage: 'partfrac(expression, x)',
        full_name: 'partial fractions',
        description: 'Performs partial fraction decomposition',
        parameters: {
            expression: {
                type: 'expression',
                description: "The expression for which the partrial fractions are to be found."
            },
            x: {
                type: 'expression',
                description: "The variable for which the partial fractions are to be found."
            }
        },
        examples: [
            "var x = nerdamer('partfrac((x^2+a)/(x*(x-1)^3), x)');",
            "console.log(x.toString())",
            "var y = nerdamer('partfrac(1/(x^6+x^5),x)');",
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
            "console.log(y.toString());",
            "var z = nerdamer('factor(sin(x)^6+3*cos(x)^2*sin(x)^4+3*cos(x)^4*sin(x)^2+cos(x)^6)');",
            "console.log(z.toString());",
        ],
        returns: 'Expression'
    },
    Algebra__divide: {
        type: 'internal',
        usage: 'divide(x, y)',
        full_name: 'divide',
        description: 'Divides 2 polynomials.',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            },
            y: {
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
        returns: 'Expression'
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
        returns: 'Expression'
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
        returns: 'Expression'
    },
    Algebra__lcm: {
        type: 'internal',
        usage: 'lcm(x)',
        full_name: 'Least Common Multiple',
        description: 'Gets the LCM of 2 polynomials',
        parameters: {
            x: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            }
        },
        examples: [
            "var x = nerdamer('lcm(x^2+2*x+1, x^2+6*x+5)');",
            "console.log(x.toString())",
            "var y = nerdamer('lcm(3, 21)');",
            "console.log(y.toString());"
        ],
        returns: 'Expression'
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
        returns: 'Expression'
    },
    Calculus__product: {
        type: 'internal',
        usage: 'product(expression, index, lower, upper)',
        full_name: 'product',
        description: 'Calculates the product of an expression from lower to upper limit. Works both numerically and algebraically.',
        parameters: {
            expression: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            },
            index: {
                type: 'expression',
                description: "The index"
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
            "var x = nerdamer('product(x+1, x, 1, 20)');",
            "console.log(x.toString())",
            "var y = nerdamer('product(x+y, x, 1, 5)');",
            "console.log(y.toString());"
        ],
        returns: 'Expression'
    },
    Calculus__diff: {
        type: 'internal',
        usage: 'diff(expression_or_vector, x, n)',
        full_name: 'differentiate',
        description: 'Gets the derivative.',
        parameters: {
            expression_or_vector: {
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
            "var y = nerdamer('diff([x^2, cos(x), 1], x, 2)'); //second derivative",
            "console.log(y.toString());",
            "var y = nerdamer('diff(x^3+a*x^3+x^2, x, 2)'); //second derivative",
            "console.log(y.toString());",
            "x = nerdamer.diff(nerdamer('x^2').add(1).multiply('tan(x)'), 'x')",
            "console.log(x.toString())"
        ],
        returns: 'Expression'
    },
    Calculus__integrate: {
        type: 'internal',
        usage: 'integrate(expression_or_vector, dx)',
        full_name: 'integrate',
        description: 'Attempts to compute integral of the expression. The depth of integration can be set using the "integration_depth" flag but be careful as this\n\
                     can seriously degrade performance. See example below. The hasIntegral method can be used to check if the symbol was completely integrated.\n\
                     This method will return true if the method was not completely integrated. The default depth is 4.',
        parameters: {
            expression_or_vector: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            },
            dx: {
                type: 'expression',
                description: "The variable with respect to which integrate. Optional for univariate expressions."
            }
        },
        examples: [
            "var x = nerdamer('integrate(10*q/(4*x^2+24*x+20), x)');",
            "console.log(x.toString());",
            "var y = nerdamer('integrate(sec(x)^2, x)'); ",
            "console.log(y.toString());",
            "var y = nerdamer('integrate([sec(x)^2, x^2, 2], x)');",
            "console.log(y.toString());",
            "var x  = nerdamer('integrate(cos(x)*x^6, x)');",
            "console.log(x.toString());",
            "//we can use the hasIntegral method to check if it was fully integrated",
            "console.log(x.hasIntegral());",
            "x = nerdamer.integrate('sinh(x)*e^x');",
            "console.log(x.toString());"
        ],
        returns: 'Expression'
    },
    Calculus__defint: {
        type: 'internal',
        usage: 'defint(expression_or_vector, from, to, dx)',
        full_name: 'definite integral',
        description: 'Attempts to compute the definite integral of the expression. Assumes that function is continuous over interval when integrating numerically.',
        parameters: {
            expression_or_vector: {
                type: 'expression',
                description: "Returns the appropriate value if possible otherwise it returns the function with the simplified expression"
            },
            dx: {
                type: 'expression',
                description: "The variable with respect to which integrate. Optional with univariate expression."
            },
            from: {
                type: 'expression',
                description: "The lower limit of integration"
            },
            to: {
                type: 'expression',
                description: "The upper limit of integration"
            }
        },
        examples: [
            "var x = nerdamer('defint(e^(cos(x)), 1, 2)');",
            "console.log(x.text());",
            "var y = nerdamer('defint(x^2+2*x+1,0, 10)');",
            "console.log(y.text());",
            "var y = nerdamer('defint(log(2cos(x/2)),-π,π,x)');",
            "console.log(y.text());"
        ],
        returns: 'Expression'
    },
    //EXTRA
    Extra__laplace: {
        type: 'internal',
        usage: 'laplace(expression, t, s)',
        full_name: 'Laplace',
        description: 'Attempts to calculate the Laplace transform of an expression. Currently computes transforms of most common expressions.'+
                ' Throws and error if no transform could be calculated.',
        parameters: {
            expression: {
                type: 'expression',
                description: "The expression to be transformed"
            },
            t: {
                type: 'variable',
                description: "The time variable"
            },
            s: {
                type: 'variable',
                description: 'The transformation variable'
            }
        },
        examples: [
            "var x = nerdamer('laplace(t^6, t, s)').evaluate();",
            "console.log(x.toString());",
            "x = nerdamer.laplace('cos(w*t)', 't', 'x');",
            "console.log(x.toString())",
            "x = nerdamer.laplace('cos(w*t)*t', 't', 'x');",
            "console.log(x.toString())"
        ],
        returns: 'Expression'
    },
    Extra__ilt: {
        type: 'internal',
        usage: 'ilt(expression, s, t)',
        full_name: 'inverse Laplace <span style="color: red">(Under development)</span>',
        description: 'Attempts to calculate the inverse Laplace transform of an expression. Currently computes transforms of most common expressions.'+
                ' Throws and error if no transform could be calculated. This is still being developed so please report any issues.',
        parameters: {
            expression: {
                type: 'expression',
                description: "The expression to be transformed"
            },
            s: {
                type: 'variable',
                description: 'The transformation variable'
            },
            t: {
                type: 'variable',
                description: "The time variable"
            }
        },
        examples: [
            "var x = nerdamer('ilt(factorial(6)*s^(-7),s, t)').evaluate();",
            "console.log(x.toString());",
            "var y = nerdamer('ilt((1+s^2)^(-1)*s, s, t)').evaluate();",
            "console.log(y.toString());",
        ],
        returns: 'Expression'
    },
    Extra__limit: {
        type: 'internal',
        usage: 'limit(expression, variable, limit)',
        full_name: 'Limit',
        description: 'Attempts to calculate the limit of a function.',
        parameters: {
            expression: {
                type: 'expression',
                description: "The expression to be transformed"
            },
            variable: {
                type: 'variable',
                description: 'The variable'
            },
            limit: {
                type: 'limit',
                description: "The limit"
            }
        },
        examples: [
            "var x = nerdamer('limit(x^x-1,x,0)');",
            "console.log(x.toString());",
            "var y = nerdamer('limit((x^2+2*x-3)/(x^6+4),x,0)');",
            "console.log(y.toString());",
        ],
        returns: 'Expression'
    },
    Extra__mean: {
        type: 'internal',
        usage: 'mean(... args)',
        full_name: 'mean',
        description: 'Calculates the mean of a set of numbers',
        parameters: {
            args: {
                type: 'expression | expression[]',
                description: "A variable number of arguments"
            }
        },
        examples: [
            "var x = nerdamer('mean(4,2,5)');",
            "console.log(x.toString());",
            "x = nerdamer('mean([4,2,5])');",
            "console.log(x.toString());",
            "x = nerdamer.mean('x', 'r+1', '21', 'tan(x)');",
            "console.log(x.toString());",
            "x = nerdamer.mean('11', '12', '13', '14');",
            "console.log(x.toString());"
        ],
        returns: 'Expression'
    },
    Extra__mode: {
        type: 'internal',
        usage: 'mode(... args)',
        full_name: 'mode',
        description: 'Calculates the mode of a set of numbers. Returns a symbolic function if mode cannot be calculated.',
        parameters: {
            args: {
                type: 'expression | expression[]',
                description: "A variable number of arguments"
            }
        },
        examples: [
            "var x = nerdamer('mode(4,2,5,4)').evaluate();",
            "console.log(x.toString());",
            "x = nerdamer('mode([4,2,5,4])').evaluate();",
            "console.log(x.toString());",
//            "x = nerdamer('mode(x, r+1, 21, tan(x), r+1)');",
//            "console.log(x.toString());",
            "x = nerdamer.mode('11', '12', '13', '14').evaluate();",
            "console.log(x.toString());"
        ],
        returns: 'Expression'
    },
    Extra__median: {
        type: 'internal',
        usage: 'median(... args)',
        full_name: 'median',
        description: 'Calculates the median of a set of numbers. Return symbolic function of median cannot be calculated.',
        parameters: {
            args: {
                type: 'expression | expression[]',
                description: "A variable number of arguments"
            }
        },
        examples: [
            "var x = nerdamer('median(4,2,5,4)').evaluate();",
            "console.log(x.toString());",
            "x = nerdamer('median([4,2,5,4])').evaluate();",
            "console.log(x.toString());",
            "x = nerdamer.median('x', 'r+1', '21', 'tan(x)', 'r+1');",
            "console.log(x.toString());",
            "x = nerdamer.median('11', '12', '13', '14').evaluate();",
            "console.log(x.toString());"
        ],
        returns: 'Expression'
    },
    Extra__stdev: {
        type: 'internal',
        usage: 'stdev(... args)',
        full_name: 'Standard deviation',
        description: 'Calculates the population standard deviation of a set of numbers. Return symbolic function of median cannot be calculated.',
        parameters: {
            args: {
                type: 'expression | expression[]',
                description: "A variable number of arguments"
            }
        },
        examples: [
            "var x = nerdamer('stdev(4,2,5,4)').evaluate();",
            "console.log(x.text());",
            "x = nerdamer('stdev([4,2,5])');",
            "console.log(x.toString());",
            "x = nerdamer.stdev('x', 'r+1', '21', 'tan(x)', 'r+1');",
            "console.log(x.toString());",
            "x = nerdamer.stdev('11', '12', '13', '14').evaluate();",
            "console.log(x.text());"
        ],
        returns: 'Expression'
    },
    Extra__smpstdev: {
        type: 'internal',
        usage: 'smpstdev(... args)',
        full_name: 'Sample standard deviation',
        description: 'Calculates the sample standard deviation of a set of numbers. Return symbolic function of median cannot be calculated.',
        parameters: {
            args: {
                type: 'expression | expression[]',
                description: "A variable number of arguments"
            }
        },
        examples: [
            "var x = nerdamer('smpstdev(4,2,5,4)').evaluate();",
            "console.log(x.text());",
            "x = nerdamer('smpstdev([4,2,5])');",
            "console.log(x.toString());",
            "x = nerdamer.smpstdev('x', 'r+1', '21', 'tan(x)', 'r+1');",
            "console.log(x.toString());",
            "x = nerdamer.smpstdev('11', '12', '13', '14').evaluate();",
            "console.log(x.text());"
        ],
        returns: 'Expression'
    },
    Extra__variance: {
        type: 'internal',
        usage: 'variance(... args)',
        full_name: 'Variance',
        description: 'Calculates the population variance of a set of numbers. Return symbolic function of median cannot be calculated.',
        parameters: {
            args: {
                type: 'expression | expression[]',
                description: "A variable number of arguments"
            }
        },
        examples: [
            "var x = nerdamer('variance(4,2,5,4)').evaluate();",
            "console.log(x.text());",
            "x = nerdamer('variance([4,2,5])');",
            "console.log(x.toString());",
            "x = nerdamer.variance('x', 'r+1', '21', 'tan(x)', 'r+1');",
            "console.log(x.toString());",
            "x = nerdamer.variance('11', '12', '13', '14').evaluate();",
            "console.log(x.text());"
        ],
        returns: 'Expression'
    },
    Extra__smpvar: {
        type: 'internal',
        usage: 'smpvar(... args)',
        full_name: 'Sample variance',
        description: 'Calculates the sample variance of a set of numbers. Return symbolic function of median cannot be calculated.',
        parameters: {
            args: {
                type: 'expression | expression[]',
                description: "A variable number of arguments"
            }
        },
        examples: [
            "var x = nerdamer('smpvar(4,2,5,4)').evaluate();",
            "console.log(x.text());",
            "x = nerdamer('smpvar([4,2,5])');",
            "console.log(x.toString());",
            "x = nerdamer.smpvar('x', 'r+1', '21', 'tan(x)', 'r+1');",
            "console.log(x.toString());",
            "x = nerdamer.smpvar('11', '12', '13', '14').evaluate();",
            "console.log(x.text());"
        ],
        returns: 'Expression'
    },
    Extra__zscore: {
        type: 'internal',
        usage: 'zscore(x, mean, stdev)',
        full_name: 'Z-score',
        description: 'Calculates the z-score for a value.',
        parameters: {
            x: {
                type: 'expression',
                description: "The value for which to find the z-score."
            },
            mean: {
                type: 'expression',
                description: "The mean of the set of numbers."
            },
            stdev: {
                type: 'expression',
                description: "The standard deviation of the set of numbers."
            }
        },
        examples: [
            "nerdamer.setVar('x', '[3,1,2,6]');",
            "var x = nerdamer('zscore(2, mean(x), stdev(x))');",
            "console.log(x.toString());",
            "x = x.evaluate()",
            "console.log(x.text());"
        ],
        returns: 'Expression'
    },
};
module.exports = FUNCTIONS;
//https://www.math.ucdavis.edu/~kouba/CalcTwoDIRECTORY/partialfracdirectory/PartialFrac.html