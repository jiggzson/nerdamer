var nerdamer = require('../nerdamer.core');

var line = function(ch, n) {
    n = n || 40;
    var str = '';
    for(var i=0; i<=n; i++) str += ch;
    return str;
};

var tester = function(header, test_cases, f, verbose) {
    var report = {
        REPORT: 'Running tests for '+header+' \n'+line('-')+'\n',
        write: function(msg) {
            this.REPORT += msg+'\n';
        },
        getReport: function() {
            this.write(line('='));
            this.write(this.num_tests+' tests completed');
            this.write(this.failed+' tests failed \n');
            this.write('Time elapsed: '+this.time+' ms');
            return this.REPORT;
        },
        failed: 0,
        num_tests: 0
    };
    var start = new Date().getTime();
    for(var x in test_cases) {
        report.num_tests++;
        var test_case = test_cases[x];
        var result = f.call(test_case, x, report, nerdamer);
        if(verbose && result.passed) {
            var result_report = result.contents ? ' with result '+result.contents : '';
            report.write(x+' passed'+result_report);
        }
        else if(!result.passed) {
            report.failed++;
            var expected_msg = test_case.expected ? ' Expected '+test_case.expected+' but received '+result.contents : '';
            report.write(x+' did NOT pass.'+expected_msg);
        }
    }
    var stop = new Date().getTime();
    
    report.time = stop - start;
    
    return report;
};

if((typeof module) !== 'undefined') {
    module.exports = tester;
}
