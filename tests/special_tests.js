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
            expression: "ft( (t+t^2),t,2*f)",
            expected: "Must be single symbol",
            error: true
        },
        {
            description: "Fourier transform 0",
            expression: "ft( 0,t,f)",
            expected: "0"
        },
        {
            description: "Fourier transform delta(t)",
            expression: "ft( delta(t) ,t,f)",
            expected: "1"
        },
        {
            description: "Fourier transform 5*delta(t)",
            expression: "ft( 5*delta(t) ,t,f)",
            expected: "5"
        },
        {
            description: "Fourier transform (1/x)*a*5*delta(t)",
            expression: "ft( (1/x)*a*5*delta(t) ,t,f)",
            expected: "5*a*x^(-1)"
        },
        {
            description: "Fourier transform 1",
            expression: "ft(1,t,f)",
            expected: "delta(f)"
        },
        {
            description: "Fourier transform delta(t-a+b)",
            expression: "ft( delta(t-a+b) ,t,f)",
            expected: "e^(j*2*PI*f*a*b)"
        },
        {
            description: "Fourier transform rect(t)",
            expression: "ft( rect(t) ,t,f)",
            expected: "sinc(f)"
        },
        {
            description: "Fourier transform sinc(t)",
            expression: "ft( sinc(t) ,t,f)",
            expected: "rect(f)"
        },
        {
            description: "Fourier transform tri(t)",
            expression: "ft( tri(t) ,t,f)",
            expected: "sinc(f)^2"
        },
        {
            description: "Fourier transform (sinc(t))^2 ",
            expression: "ft( (sinc(t))^2 ,t,f)",
            expected: "tri(f)"
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
