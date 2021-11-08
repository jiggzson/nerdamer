'use strict';
const fs = require("fs");
const lodash = require('lodash');

const {Tokenizer} = require("../../src/Parser/Tokenizer");
const assert = require('assert');


const runFor = function (data, includes, noPrepare = false, prerun = null, refactored = false) {
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

        let functions = core.PARSER.getFunctionProvider();
        let operators = core.PARSER.getOperatorsClass();

        let tokenizer = new Tokenizer(functions, operators, {});

        let tokens = tokenizer.tokenize(expression, !noPrepare);
        let tokenTree = JSON.parse(JSON.stringify(tokens));
        let res = lodash.isEqual(expectedTree, tokenTree);

        if (!res) {
            console.error(`Test ${data}(${includes.join(',')}) failed for ${t.e}`);
            console.error(`  expected:\n`, JSON.stringify(expectedTree));
            console.error(`  got:\n`, JSON.stringify(tokenTree));
        }

        expect(res).toBeTruthy()

        if (!res) {
            break;
        }
    }
}

xdescribe('test expression', () => {
    it('test expression', () => {
        const nerdamer = require('../../src/nerdamer.core.js');
        let core = nerdamer.getCore();


        let expression = ' j + z + (max(j * 0.280587, z * 0.280587, 176))';

        let preprocessors = {names: [], actions: []};
        let functions = core.PARSER.getFunctions();
        let brackets = core.PARSER.getBrackets();
        let operators = core.PARSER.getOperatorsClass();
        let units = {};

        let deps = {preprocessors, functions, brackets, operators, units};

        let tokenizer = new Tokenizer(deps);
        tokenizer.tokenize(expression);

        assert('failure');
    })
});

describe('tokenize core', function () {
    it('correct', function () {
        runFor('core', [], false, false, true);
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
});

describe('tokenize latex', function () {
    it('correct', function () {
        runFor('latex', [], true);
    });
});

describe('tokenize basic_parser', function () {
    it('correct', function () {
        runFor('basic_parser', []);
    });

});

describe('tokenize texconvert', function () {
    it('correct', function () {
        runFor('texconvert', []);
    });

});

describe('tokenize text', function () {
    it('correct', function () {
        runFor('text', []);
    });

});

describe('tokenize algebra', function () {
    it('correct', function () {
        runFor('algebra', ['Algebra']);
    });

});

describe('tokenize calculus', function () {
    it('correct', function () {
        runFor('calculus', ['Calculus']);
    });

});

describe('tokenize extra', function () {
    it('correct', function () {
        runFor('extra', ['Extra']);
    });

});

describe('tokenize solve', function () {
    it('correct', function () {
        runFor('solve', ['Solve']);
    });
});
