//This file pulls nerdamer functions to the global scope
if(typeof global === 'undefined')
    //if we're in the DOM then the global object is window
    global = window;
else
    //require nerdamer if we're in a node environment
    var nerdamer = require('./nerdamer.core');

var core = nerdamer.getCore(),
    //get a list of nerdamer's functions
    functions = Object.keys(core.PARSER.functions),
    exceptions = [];
    
for(var i=0, l=functions.length; i<l; i++) {
    var f = functions[i];
    //if the functions is not in the exceptions list
    if(exceptions.indexOf(f) === -1) 
        global[f] = nerdamer[f];
}
