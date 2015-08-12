if((typeof module) !== 'undefined') {
    nerdamer = require('../nerdamer.core.js');
    nerdamer = require('../Special.js');
}

nerdamer.clear('all'); //make sure that we start fresh
var test_cases = [
    {
        description: "Step function",
        expression: "step(x)",
        input: [-2,-1,0,1,2,"x+x","x^2+2x"],
        expected: [0,0,0.5,1,1,"step(2*x)","step(2*x+x^2)"]
    },
    {
        description: "Sign function",
        expression: "sign(x)",
        input: [-2,-1,0,1,2,"x+x","x^2+2x"],
        expected: [-1,-1,0,1,1,"sign(2*x)","sign(2*x+x^2)"]
    },
    {
        description: "Rectangle function",
        expression: "rect(x)",
        input: [-1,-0.5,-0.1,0,0.1,0.5,1,"x+x","x^2+2x"],
        expected: [0,0.5,1,1,1,0.5,0,"rect(2*x)","rect(2*x+x^2)"]
    },
    {
        description: "Sinc function",
        expression: "sinc(x)",
        input: [-Infinity,-2,0,2,Infinity,"x+x","x^2+2x"],
        expected: [0,0.45464871341284085,1,0.45464871341284085,0,"sinc(2*x)","sinc(2*x+x^2)"]
    },
    {
        description: "Tri function",
        expression: "tri(x)",
        input: [-2,-1,-0.5,0,0.5,1,2,"x+x","x^2+2x"],
        expected: [0,0,0.5,1,0.5,0,0,"tri(2*x)","tri(2*x+x^2)"]
    },
    {
        description: "Dirac delta function",
        expression: "delta(x)",
        input: [-1,0,1,"x+x","x^2+2x"],
        expected: [0,Infinity,0,"delta(2*x)","delta(2*x+x^2)"]
    },
    {
        description: "Parabola function",
        expression: "x^2",
        input: [-2,-1,0,1,2],
        expected: [4,1,0,1,4]
    },
    {
        description: "Integration test",
        expression: "(sinc(x))^2 + x^2 + step(x) -tri(sign(x))",
        input: [-2,-1,0,1,2],
        expected: [4.2067054526079515,1.708073418273571,0.5,2.708073418273571,5.2067054526079515]
    },
    {
        description: "Multivariable Integration test",
        expression: "(sinc(x))^2 + y^2 + step(z) -tri(sign(a))",
        variables: ['x','y','z','a'],
        input: [[1,3,4,9],[0,-2,0,9],[Infinity,3,2,-19],[-2,2,-1,0]],
        expected: [10.708073418273571,5.5,10,3.2067054526079515]
    }
];

var failed = false;
var num_failed = 0;
console.log('Running tests ... \n------------------------------------ \n');
//Run tests
test_cases.forEach(function (element, index, array) {

    var result = [];
    try {
        //run it through nerdamer
        if (element.variables == undefined)
        {
            var f = nerdamer(element.expression).buildFunction();
            result = element.input.map(f);
        }
        else
        {
            var f = nerdamer(element.expression).buildFunction(element.variables);
            result = element.input.map(function(v,i) { return f.apply(null, v); });
        }

    }
    //Catches errors
    catch(error) {
        result = [];
    }

    if ( !( (element.expected.length == result.length) && element.expected.every(function(v,i) { return v === result[i]}) ) )
    {
        num_failed++;
        console.log('Case number '+(index+1)+' , "'+element.expression+'" did not get expected value!');
        console.log('Expected values:'+element.expected);
        console.log('Produced values:'+result);
    }
});
console.log('Done!');
console.log(num_failed+' test'+(num_failed === 1 ? '' : 's')+' failed.');

