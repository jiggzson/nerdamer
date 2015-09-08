QUnit.module( "Special.js" );
QUnit.test( "Functions test", function( assert ) {
    nerdamer.clear('all'); //make sure that we start fresh
    var test_cases = [
        {
            description: "Dirac delta delta(0)",
            expression: "delta(0)",
            expected: "Infinity"
        },
        {
            description: "Dirac delta delta(2)",
            expression: "delta(2)",
            expected: "0"
        },
        /*
        {
            description: "Multiples of dirac delta function",
            expression: "5*delta(0)",
            expected: "5*Infinity"
        },
        */
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
            expected: "exp(2*(-a+b)*PI*f*i)"
        },
        {
            description: "Fourier transform rect(t-a+b+c+4)",
            expression: "ft( rect(t-a+b+c+4) ,t,f)",
            expected: "exp(2*(-a+4+b+c)*PI*f*i)*sinc(f)"
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
        },
        {
            description: "Fourier transform sign(t) ",
            expression: "ft( sign(t) ,t,f)",
            expected: "(PI*f*i)^(-1)"
        },
        {
            description: "Fourier transform step(t) ",
            expression: "ft( step(t) ,t,f)",
            expected: "0.5*(0.5*PI^(-1)*f^(-1)*i^(-1)+delta(f))"
        },
        {
            description: "Fourier transform exp(i*t) ",
            expression: "ft( exp(i*t) ,t,f)",
            expected: "delta(-0.5*PI^(-1)+f)"
        },
        {
            description: "Fourier transform cos(t) ",
            expression: "ft( cos(t) ,t,f)",
            expected: "0.5*delta(-0.5*PI^(-1)+f)+0.5*delta(0.5*PI^(-1)+f)"
        },
        {
            description: "Fourier transform sin(t) ",
            expression: "ft( sin(t) ,t,f)",
            expected: "-0.5*delta(0.5*PI^(-1)+f)*i^(-1)+0.5*delta(-0.5*PI^(-1)+f)*i^(-1)"
        },
        {
            description: "Fourier transform exp(2*PI*i*t) ",
            expression: "ft( exp(2*PI*i*t),t,f)",
            expected: "delta(-1+f)"
        },
        {
            description: "Fourier transform exp(2*PI*i*t*b*l) ",
            expression: "ft( exp(2*PI*i*t*b*l),t,f)",
            expected: "delta(-b*l+f)"
        },
        {
            description: "Fourier transform exp(2*PI*i*t*z*c)*delta(t-m+l) ",
            expression: "ft( exp(2*PI*i*t*z*c)*delta(t-m+l) ,t,f)",
            expected: "exp(2*(-c*z+f)*(-m+l)*PI*i)"
        },
        {
            description: "Fourier transform d*exp(2*PI*i*t*q*5)*rect(t-3*v) ",
            expression: "ft( d*exp(2*PI*i*t*q*5)*rect(t-3*v) ,t,f)",
            expected: "d*exp(-6*(-5*q+f)*PI*i*v)*sinc(-5*q+f)"
        },
        {
            description: "Fourier transform g*exp(2*PI*i*t*n)*sign(t-p) ",
            expression: "ft( g*exp(2*PI*i*t*n)*sign(t-p) , t , f)",
            expected: "(-n+f)^(-1)*PI^(-1)*exp(-2*(-n+f)*PI*i*p)*g*i^(-1)"
        },
        {
            description: "Fourier transform a*rect(t)+b*delta(t)+1+5*(sinc(t))^2 ",
            expression: "ft( a*rect(t)+b*delta(t)+1+5*(sinc(t))^2 ,t,f)",
            expected: "5*tri(f)+a*sinc(f)+b+delta(f)"
        },
        {
            description: "Fourier transform a*rect(t+b)+b*delta(t-h)+1+5*(sinc(t))^2 ",
            expression: "ft( a*rect(t+b)+b*delta(t-h)+1+5*(sinc(t))^2 ,t,f)",
            expected: "5*tri(f)+a*exp(2*PI*b*f*i)*sinc(f)+b*exp(-2*PI*f*h*i)+delta(f)"
        },
        {
            description: "Fourier transform a*rect(t+b)+b*delta(t-h)+exp(2*PI*i*t*r)+5*exp(2*PI*i*t*u)*(sinc(t+j))^2 ",
            expression: "ft( a*rect(t+b)+b*delta(t-h)+exp(2*PI*i*t*r)+5*exp(2*PI*i*t*u)*(sinc(t+j))^2  ,t,f)",
            expected: "5*exp(2*(-u+f)*PI*i*j)*tri(-u+f)+a*exp(2*PI*b*f*i)*sinc(f)+b*exp(-2*PI*f*h*i)+delta(-r+f)"
        },
        {
            description: "Fourier transform exp(2*PI*i*t*q*5)*(delta(t-m+l)+rect(t-3*v)) ",
            expression: "ft( exp(2*PI*i*t*q*5)*(delta(t-m+l)+rect(t-3*v))    ,t,f)",
            expected: "exp(-6*(-5*q+f)*PI*i*v)*sinc(-5*q+f)+exp(2*(-5*q+f)*(-m+l)*PI*i)"
        },
        {
            description: "Fourier transform sin(2*PI*t) ",
            expression: "ft( sin(2*PI*t) ,t,f)",
            expected: "-0.5*delta(1+f)*i^(-1)+0.5*delta(-1+f)*i^(-1)"
        }
        /*
        {
            description: "Fourier transform sin(2*PI*t-x+o) ",
            expression: "ft( sin(2*PI*t-x+o) ,t,f)",
            expected: "-0.5*delta(1+f)*i^(-1)+0.5*delta(-1+f)*i^(-1)"
        }
        */
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
