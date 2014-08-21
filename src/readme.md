This folder contains a split version of nerdamer. The library is separated into the core, which contains all the basic symbolic parsing, 
and additional math functions. These functions belong to one of the predetermined internal classes of nerdamer. 
This makes it easy to only use the parts that you need. To build add a functionto nerdamer use the register function. This functions takes 
a declaration object or an array of declaration objects. The class to which it belongs and the name of the function are the basic requirements
for adding a funciton

```javascript

var some_function = {
  //Algebra for example
  parent: 'Algebra',
  name: 'some_function',
  //this determines if the functions can be used by the user when passing a string. 
  visibility: true, 
  //the minimum number of arguments your function requires. 
  //Defaults to 1 but is currently not used
  numargs: some_integer, 
  //the constructor. This is the environent under which your function is built. 
  build: {
    //this refers to the Parser
    //return the function which need to be set
    return function(/*args*/) {
      //body
    }
  }
};

nerdamer.register(some_function);
```
this in the constructor's scope refers to the Parser (the core).
The classes are accessed through the Parser.classes and the Parser functions are accessed through Parser.utils
An array of functions can be supplied.

```javascript
nerdamer.register([
{/*first declaration*/}, {/*second declaration*/} // ... etc
]);
```
