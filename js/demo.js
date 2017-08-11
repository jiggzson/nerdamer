/*
 * Author   : Martin Donk
 * Website  : http://www.nerdamer.com
 * Email    : martin.r.donk@gmail.com
 * version  : 3.0
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 * Graphing Utility: http://maurizzzio.github.io/function-plot/
 * 
 * Special thanks:
 *  Brosnan Yuen for his contributions to graphing
 *  Guppy for graphical input
 */

(function(){
    $(function() {
        var chartNumber = 0;
        //the panel where the expressions get displayed
        var $panel = $('#demo-panel');
        //the id of input of the expression/equation
        var inputId = "demo-input";
        //the id of the button to trigger processing
        var buttonId = "process-btn";
        //caches the process button
        var processBtn = $('#'+buttonId)
        //bind the button for processing
        processBtn.click(process);
        //text input
        var textInput = $('#text-input');
        //bind the editor enter button
        editor.setOption("extraKeys", {
            Enter: function(cm) {
                processBtn.click();
            }
        });
        //make preparations for Guppy
        Guppy.get_symbols(["builtins","plugins/guppy/sym/symbols.json","plugins/guppy/sym/extra_symbols.json"]);
        var guppy = new Guppy(inputId, {
                empty_content: "\\color{gray}{\\text{Visual editor. Enter your expression here}}",
                done_callback: process
            });
        //store the validation regex
        var validation_regex_str = nerdamer.getCore().Settings.VALIDATION_REGEX.toString();
        //create the regex for extracting variables
        var variable_regex = new RegExp('('+validation_regex_str.substring(1, validation_regex_str.length-3)+'\\(?,*.*\\)?)(\\s*,\\s*)(.*)');
        //define how the user is being notified.
        function notify(msg) {
            var modal = $('#alertModal');
            modal.find('.modal-body').html(msg);
            modal.modal('show');
        }
        //the graphing method. This method builds on Brosnan Yuen's idea and work.
        //the biggest change is no longer graphing everything to one graph but it's own graph
        function graph(expression, element) {
            try {
                var defaults = {
                    start:  -10,
                    end:    10,
                    step:   1
                };
                var label = function(text) {
                    return $('<label/>', {text: text});
                };
                var evaluated = nerdamer(expression),
                    vars = evaluated.variables();
                //we are only able go graph functions of 1 variable
                if(vars.length > 1)
                    throw new Error('Cannot graph function containing more than 1 variable');
                //call the evaluate function and create a function for a speed boost
                var f = evaluated.buildFunction();
                //generate the id for the graph
                var id = 'chart'+chartNumber++;
                //add a wrapper
                var wrapper = $('<div/>', {class: 'graph-wrapper'});
                //generate the container for the graph
                var container = $('<div/>', {'id': id, class: 'graph'}); 
                //put it all together
                wrapper.append($('<a/>', {class: 'remove-graph pull-right', text:'remove', href: 'javascript:void(0)'}));
                wrapper.append(container);
                wrapper.insertBefore(element);
                //create the plot
                functionPlot({
                    title: expression,
                    target: '#'+id,
                    width: $('#demo-panel').width(),
                    height: 300,
                    grid: true,
                    data: [{
                        // force the use of builtIn math
                        graphType: 'polyline',
                        fn: function (scope) {
                          // scope.x = Number
                          var x = scope.x;
                          return f(x);
                        }
                      }]
                });
            }
            catch(e) {
                notify('Cannot graph expression</br>'+e.toString());
            }   
            
        }
        //function to fetch the text from the input
        function getText() {
            if(USE_GUPPY)
                return Guppy.instances[inputId].get_content('text');
            //else return textInput.val();
            else return editor.getValue();
        }
        //function to fetch LaTeX
        function getLaTeX() {
            return Guppy.instances[inputId].get_content('latex');
        }
        //check to see if the evaluate box is checked
        function evaluateIsChecked() {
            return $('#expression-evaluate').is(':checked');
        }
        //check to see if the expand box is checked
        function expandIsChecked() {
            return $('#expression-expand').is(':checked');
        }
        //check to see if the expand box is checked
        function toDecimal() {
            return $('#to-decimal').is(':checked');
        }
        //Get the expression from the user input. The expression will come in the form expression, x=a, y=b, ...
        //the problem becomes that the user might input some_function(param1, param2) , x=a, y=b
        //doing a split by the comma would yield the undesired result. This method walks the string and looks for an open bracket
        //and then a close bracket. If none is found we're golden and it returns the string. If one is found then it looks 
        //for a close bracket. Any comma after that has to be the variable declarations
        
        //Note: I cannot use a regex for example diff(cos(x), x). A regex cannot check for matching brackets. Recursively maybe but 
        //that's tricky with commas
        function extractExpression(str) {
            /*
            var match = variable_regex.exec(str);
            if(match) 
                return [match[1], match[3]];
            return [str, ''];
            */
            var l = str.length,
                openBrackets = 0,
                retval;
            for(var i=0; i<l; i++) {
                var ch = str.charAt(i);
                if(ch === '(' || ch === '[') openBrackets++; //record and open brackets
                if(ch === ')' || ch === ']') openBrackets--; //close the bracket
                if(ch === ',' && !openBrackets) {
                    retval = [str.substr(0, i), str.substr(i+1, l)];
                    return retval;
                }
            }

            return [str, ''];
        };
        //this method dictates the formatting of the expression for the panel
        function PanelExpression(o) {
            this.valueMap = o;
        }
        //CLASSES
        PanelExpression.prototype = {
            template: 
                    '<div class="expression" data-variable={{variable}}>'+
                        '<div class="expression-delete expression-btn">'+
                            '<a href="javascript:void(0)" title="Remove expression"><i class="fa fa-close"></i></a>'+
                        '</div>'+
                        '<div class="expression-graph expression-btn">'+
                            '<a href="javascript:void(0)" title="Graph expression" data-expression="{{expression}}"><i class="fa fa-line-chart"></i></a>'+
                        '</div>'+
                        '<div class="expression-reload expression-btn">'+
                            '<a href="javascript:void(0)" title="Load expression to editor" data-expression="{{expression}}"><i class="fa fa-refresh"></i></a>'+
                        '</div>'+
                        '<div class="expression-reload-output expression-btn">'+
                            '<a href="javascript:void(0)" title="Load output to editor" data-output="{{output}}"><i class="fa fa-arrow-up"></i></a>'+
                        '</div>'+
                        '<div class="expression-body">{{LaTeX}}</div>'+
                    '</div>',
            format: function(valueMap) {
                valueMap = valueMap || this.valueMap;
                var t = this.template;
                for(var x in valueMap) 
                    t = t.replace(new RegExp('{{'+x+'}}', 'g'), valueMap[x]);
                return t;
            },
            toHTML: function() {
                return $(this.format());
            },
            toString: function() {
                return this.format();
            }
        };
        //set the value for the input
        function setInputValue(value) {
            clear();
            if(USE_GUPPY) {
                guppy.insert_string(value);
                guppy.activate();
            }
            else {
                //textInput.val(value);
                editor.setValue(value);
            }    
        }

        //This function is used to add the expression to the panel for display
        function addToPanel(LaTeX, expression, output, variable) {
            output = output || expression;
            var TeX = katex.renderToString(LaTeX);
            var h = /.+class="strut" style="height:([0-9\.]+)em.+/.exec(TeX)[1];
            var adjustment = ''; 
            if(h > 1)
                adjustment = '\\large ';
            $panel.append(new PanelExpression({
                LaTeX: katex.renderToString(adjustment+LaTeX),
                expression: expression,
                output: output,
                variable: variable
            }).toHTML());
        }
        //perform preparations before parsing. Extract variables and declarations
        function prepareExpression(str) {
            //the string will come in the form x+x, x=y, y=z
            var extracted = extractExpression(str),
                expression = extracted[0],
                scope = {};
            extracted[1].split(',').map(function(x) {
                x = x.trim(); //remove white space at both ends
                var parts = x.split('='),
                   varname = parts[0],
                   value = parts[1];
                if(nerdamer.validVarName(varname) && typeof value !== 'undefined')
                    scope[varname] = parts[1];
            });
            return [expression, scope];
        }
        //Clears the input
        function clear() {
            if(USE_GUPPY) {
                guppy.set_content('<m><e/></m>');
                guppy.render(true);
            }
            else {
                //$('#text-input').val('');
                editor.setValue('')
            }    
        }
        //callback for handling of entered expression
        function process() {
            var expressionAndScope = prepareExpression(getText()),
                expression = expressionAndScope[0],
                scope = expressionAndScope[1],
                //alternative regex: ^([a-z_][a-z\d\_]*)\(([a-z_,])\):=([\+\-\*\/a-z\d*_,\^!\(\)]+)
                functionRegex = /^([a-z_][a-z\d\_]*)\(([a-z_,\s]*)\):=(.+)$/gi, //does not validate the expression
                functionDeclaration = functionRegex.exec(expression),
                LaTeX;
            
            //it might be a function declaration. If it is the scope object gets ignored
            if(functionDeclaration) { 
                //Remember: The match comes back as [str, fnName, params, fnBody]
                //the function name should be the first group of the match
                var fnName = functionDeclaration[1],
                    //the parameters are the second group according to this regex but comes with commas 
                    //hence the splitting by ,
                    params = functionDeclaration[2].split(','),
                    //the third group is just the body and now we have all three parts nerdamer needs to create the function
                    fnBody = functionDeclaration[3];
                //we never checked if this is in proper format for nerdamer so we'll just try and if nerdamer complains we'll let the person know
                try {
                    nerdamer.setFunction(fnName, params, fnBody);
                    //generate the latex
                    LaTeX = fnName+ //parse the function name with nerdamer so we can get back some nice LaTeX
                            '('+ //do the same for the parameters
                                params.map(function(x) {
                                    return nerdamer(x).toTeX();
                                }).join(',')+
                            '):='+
                            nerdamer(fnBody).toTeX();

                    if(Object.keys(scope).length > 0) 
                        notify('A variable object was provided but is ignored for function declaration.');
                    
                    //add the LaTeX to the panel
                    addToPanel(LaTeX, expression);   
                    clear();
                }
                catch(e) { 
                    notify('Error: Could not set function.</br>'+e.toString());
                }
            }
            else {
                var variableDeclaration = /^([a-z_][a-z\d\_]*):(.+)$/gi.exec(expression);
                if(variableDeclaration) {
                    try {
                        var varName = variableDeclaration[1],
                            varValue = variableDeclaration[2];
                        //set the value
                        nerdamer.setVar(varName, varValue);
                        //generate the LaTeX
                        LaTeX = varName+':'+nerdamer(varValue).toTeX();
                        addToPanel(LaTeX, expression, undefined, varName);   
                        clear();
                    }
                    catch(e){
                        notify('Something went wrong. Nerdamer could not parse expression!</br>'+e.toString());
                    } 
                }
                else {
                    try {
                        //wrap the expression in expand if expand is checked
                        var evaluated = nerdamer(expandIsChecked() ? 'expand('+expression+')' : expression, scope),
                            //check if the user wants decimals
                            decimal = toDecimal() ? 'decimal' : undefined,
                            //the output is for the reload button
                            output = evaluated.toString(); 
                        //call evaluate if the evaluate box is checked
                        if(evaluateIsChecked()) {
                            evaluated = evaluated.evaluate();
                        }
                        LaTeX = evaluated.toTeX(decimal);
                        //add the LaTeX to the panel
                        addToPanel(LaTeX, expression, output);   
                        clear();
                    }
                    catch(e){
                        console.log(e.stack)
                        notify('Something went wrong. Nerdamer could not parse expression!</br>'+e.toString());
                    } 
                }  
            }
        }
        //EVENTS
        //bind event for reload button click. This will reload the expression into
        //the editor. The expression is stored in the data-expression property
        $('#demo-panel').on('click', '.expression-reload a', function(e) {
            setInputValue($(this).data('expression'));
        });
        //the editor. The expression is stored in the data-expression property
        $('#demo-panel').on('click', '.expression-reload-output a', function(e) {
            setInputValue($(this).data('output'));
        });
        //bind the event for graphing the expression
        $('#demo-panel').on('click', '.expression-graph a', function(e) {
            var $this = $(this),
                expression = $this.data('expression'),
                insertBefore = $this.parents().eq(1);;
            //load this information to the graph data object and show the modal 
            graph(expression, insertBefore);
        });
        //bind the delete event
        //bind the event for graphing the expression
        $('#demo-panel').on('click', '.expression-delete a', function(e) {
            var variable = $(this).parents().eq(1).data('variable');
            if(variable) 
                nerdamer.setVar(variable, 'delete');
            $(this).parents().eq(1).remove();
        });
        //bind the event for removing graph
        $('#demo-panel').on('click', '.remove-graph', function(e) { 
            $(this).parents().eq(0).remove();
        });
    });
})();
//Π
