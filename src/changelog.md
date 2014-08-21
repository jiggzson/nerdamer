0.5.0

- Switched parser to Shunting-yard algorithm and added prefix support
- Split library into core and add-on modules using the register function
- Added GCD, fact, mod, erf functions
- Started vector support
- Changed parameter order for nerdamer function from nerdamer(expression, subs, location, option) to 
  nerdamer(expression, subs, option, location)
- 0.5.0 is an almost complete rewrite of the library as it no longer tries the condense the logic but 
  focuses more on legibility
