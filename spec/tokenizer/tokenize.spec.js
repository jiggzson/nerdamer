'use strict';
const fs = require("fs");
const _ = require('lodash');

const runFor = function (data, includes, noPrepare = false, prerun = null) {
    const nerdamer = require('../../src/nerdamer.core.js');
    for (let inc of includes) {
        require('../../src/' + inc);
    }
    let core = nerdamer.getCore();
    let parser = core.PARSER;

    let testData = fs.readFileSync('spec/tokenizer/data/' + data + '.data.json');
    let tests = JSON.parse(testData);

    for (let t of tests) {
        if (prerun) {
            prerun(nerdamer, core, t.e);
        }

        let expression = t.e;
        let expectedTree = t.result;

        // Settings.PARSE2NUMBER = t.p2n;

        expression = noPrepare ? expression : parser.prepare_expression(expression);
        let tokens = parser.tokenize(expression);
        let tokenTree = JSON.parse(JSON.stringify(tokens));
        let res = _.isEqual(expectedTree, tokenTree);


        if (!res) {
            console.error(`Test ${data}(${includes.join(',')}) failed for ${t.e}`);
            console.error(`  expected:\n`, JSON.stringify(expectedTree));
            console.error(`  got:\n`, JSON.stringify(tokenTree));
        }

        expect(res).toBeTruthy()
    }
}

describe('tokenize', function () {
    it('correct for core cases', function () {
        runFor('core', []);
    });

    it('correct for special cases', function () {

        runFor('special', [], false, (nerdamer, core, e) => {
            if (e === 'x+1°+π+x') {
                let _ = core.PARSER;
                let Symbol = core.Symbol;
                nerdamer.setOperator({
                    precedence: 4,
                    operator: '°',
                    postfix: true,
                    operation: function (x) {
                        return new Symbol();//_.divide(_.multiply(x, new Symbol('pi')), new Symbol(180));
                    }
                })
            }
            else if (e === 'a(b(x))') {
                nerdamer.setFunction("a", ["x"], "2*x");
                nerdamer.setFunction("b", ["x"], "x^2");
            }
        });

    });


    it('correct for latex cases', function () {
        runFor('latex', [], true);
    });

    it('correct for basic_parser cases', function () {
        runFor('basic_parser', []);
    });

    it('correct for texconvert cases', function () {
        runFor('texconvert', []);
    });

    it('correct for text cases', function () {
        runFor('text', []);
    });

    it('correct for algebra cases', function () {
        runFor('algebra', ['Algebra']);
    });

    it('correct for calculus cases', function () {
        runFor('calculus', ['Calculus']);
    });

    it('correct for extra cases', function () {
        runFor('extra', ['Extra']);
    });

    it('correct for solve cases', function () {
        runFor('solve', ['Solve']);
    });
});
