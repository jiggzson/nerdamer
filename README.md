nerdamer
========
Nerdamer is currently in beta.

This branch includes differentiation.
It is untested and raw. In fact most of the code will need refactoring.


Getting started with Nerdamer

To add an equation to the object, you must use the addEquation method.
e.g.


        nerdamer.addEquation('(x+1)*(x+2)-3*x');
        


To get a list of the equations currently contained in the object simply call the equations method.



        var equations = nerdamer.equations();
        
        console.log(equations);

         >>> [ '2+x^(2)' ]

        

This will return the equations as an array. If you prefer to get the equations as a numbered object however simply pass in true when calling equations.


        console.log(nerdamer.equations(true));
        


         >>> { '1': '2+x^(2)' }
        


Let's add another equation. This time let's make it an exponential.


        nerdamer.addEquation('4*2^x');
        

and then


        console.log(nerdamer.equations(true));
        


         >>> { '1': '2+x^(2)', '2': '4*2^(x)' }
        


To clear an equation use the clear method and pass in the equation number you choose to clear. If you want to clear the last equation just call clear without a parameter.


        nerdamer.clear(1);
        


         >>> { '1': '4*2^(x)' }
        


If you have a known value you can pass this into nerdamer using the known method.


        nerdamer.known('x=4');

        nerdamer.addEquation('x^2+2*x+1');

        console.log(nerdamer.equations(true))

         >>> { '1': '4*2^(x)', '2': '25' }
        

As you can see the previous equation was untouched when you declared x to be known.
If you've added an equation before you inserted your known you have to call the evaluate function and pass in the function number that you want evaluated.



        var answer = nerdamer.evaluate(1);
        
        console.log(answer);
        
        >>> 64
            
        

To get a list of your knowns call the knowns method.
This will return an object containing the known equations. Another function that may be useful is the buildFunction method. This will return a javascript function using methods from the native Math class which are supported by the nerdamer library. This can be useful if you need to have a function from user input but need to have it filtered.
Let's first clear our known value for x;
To remove a known value we use the clear method as well but pass in the string 'known' as the second parameter.


        nerdamer.clear('x', 'known');
        

Now let's add the equation for which we wish to build a function.



        nerdamer.addEquation('cos(x^2+sin(x)-4)');

        var f = nerdamer.buildFunction();

        console.log(f.toString());

         >>> function anonymous(x) {
                    return Math.cos(-4+Math.pow(x,2)+Math.sin(x));
               }

        

This can be done with multiple variables. One thing to note is that the parameter names are sorted alphabetically so keep that in mind when passing in your values.
If we call f with let's say 4:



        f(4);

        >>> 0.24510036817001535

        

I would recommend using this function if you plan on doing many iterations
There is currently no method for formatting the output or declaring functions although I hope to include them in future releases.
