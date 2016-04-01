**version 0.5.x**
- Switched parser to Shunting-yard algorithm and added prefix support
- Split library into core and add-on modules using the register function
- Added GCD, fact, mod, erf functions
- Started vector and matrix support
- Changed parameter order for nerdamer function from nerdamer(expression, subs, location, option) to 
  nerdamer(expression, subs, option, location)

**version 0.6.x**
- Switched multipliers to fractions. 
- Implemented bigInt library (https://github.com/peterolson/BigInteger.js)
- Deferred processing of numbers. Previously sqrt(2) was processed right away but is now only processed when evaluate is called.
- Preliminary support for hyperbolic functions in the core
- e and pi are added as symbolic placeholders for PI and E
- Better support for imaginary numbers
- Get numbers as decimals when getting LaTeX
- Get numbers as fractions when get text
- Fixed numerous bugs

