QUnit.module( "Special.js" );
QUnit.test( "Functions test", function( assert ) {
    nerdamer.clear('all'); //make sure that we start fresh
    var test_cases = [
        {
            description: "Dirac delta function",
            expression: "delta(0)",
            expected: "Infinity"
        },
        {
            description: "Multiples of dirac delta function",
            expression: "5*delta(0)",
            expected: "5*Infinity"
        },
        {
            description: "Fourier transform invalid input",
            expression: "ft( (t+t^2),t,1)",
            expected: "Must be single symbol",
            error: true
        },
        {
            description: "Fourier transform more invalid input",
            expression: "ft( (t+t^2),t,2*s)",
            expected: "Must be single symbol",
            error: true
        },
        {
            description: "Fourier transform delta",
            expression: "ft(a*5*(1/x)*delta(sin(t)) ,t,s)",
            expected: "1"
        }
    ];
    var run_tests = function() {
        test_cases.forEach(function(element, index, array) {
            var test_case = element; //get the test case
            var result = "";
            var num_result = Infinity;
            //Test if nerdamer throws and error correctly
            try {
                //run it through nerdamer
                result = nerdamer(test_case.expression).text();
            }
            //Catches errors
            catch(error) {
                //If an error was expected then save result
                if (test_case.error)
                {
                    result = error.message;
                }
            }
            assert.equal( result, test_case.expected, test_case.description );
        });
    };
    run_tests();
});
