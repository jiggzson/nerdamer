var nerdamer = require('../nerdamer.core.inf_prec');

var run_tests = function(test_cases, values, verbose) {
    var num_failed = 0,
        num_tests = 0;
    console.log('Running tests ... \n------------------------------------ \n');
    for(var x in test_cases) {
        num_tests++;
        var test_case = test_cases[x]; //get the test case
		var result = "";
        	//Test if nerdamer throws and error correctly
		try {
                    //run it through nerdamer
                    result = nerdamer(x).text();
                    
		}
		//Catches errors
		catch(error) {
                    //If an error was expected then save result
                    if (test_case.error)
                    {
                        result = error.message;
                    }
		}

		if(result !== test_case.expected) {
			num_failed++;
			//the first test failed but this might not mean anything other than that the structure of the
			//output string has changed. Let's take a look at the number value. It might not have one but then it's
			//up to you to decide if the test did test did indeed fail
			console.log('Case "'+x+'" did not get expected value! Expected "'+test_case.expected+'" but received "'+result+'". Testing number value:');
			var num_val = Number(nerdamer(x).evaluate(values).valueOf());

			console.log('Number value does'+(num_val === test_case.number_value ? '': ' not')+' match. Received '+num_val+' \n')
		}
                else {
                    if(verbose) console.log('test "'+x+'" passed with result '+result);
                }
    }
    console.log('Done! '+num_tests+' tests completed');
    console.log(num_failed+' test'+(num_failed === 1 ? '' : 's')+' failed.');
};

if((typeof module) !== 'undefined') {
    module.exports = run_tests;
}
