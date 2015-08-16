QUnit.module( "Special.js" );
QUnit.test( "Functions test", function( assert ) {
    nerdamer.clear('all'); //make sure that we start fresh
    var values = {
        x: 0,
        y: 4,
        z: 1,
        t: 0.5,
        r: 4,
        q: 0.2,
        n: 1
    };
    var test_cases = [
        {
            description: "Dirac delta function",
            expression: "delta(x)",
            expected: "delta(x)",
            numval: "Infinity"
        },
        {
            description: "Multiples of dirac delta function",
            expression: "5*delta(x)",
            expected: "5*delta(x)",
            numval: "5*Infinity"
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
                var num_val = nerdamer(test_case.expression).evaluate(values).valueOf();
                if (typeof num_val === 'string' || num_val instanceof String)
                {
                    num_result = num_val;
                }
                else
                {
                    num_result = Number(num_val);
                }
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
            assert.equal( num_result, test_case.numval, test_case.description+" numerical values" );
        });
    };
    run_tests();
});
