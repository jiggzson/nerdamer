import {isNegative, isSymbol} from '../Core/Symbol';
import {isMatrix} from '../Parser/Matrix';
import {Settings} from '../Settings';
import {inBrackets} from '../Core/Utils';
import {Groups} from '../Core/Groups';
import {isSet} from '../Parser/Set';
import {isVector} from '../Parser/Vector';
import {Collection} from '../Parser/Collection';
import {parse} from '../Core/parse';

export class LaTeX {
    /** @deprecated */
    static $Parser;
    static space = '~';
    static dot = ' \\cdot ';

    static _parser;
    static get parser() {
        if (!LaTeX._parser) {
            LaTeX._parser = LaTeX.createParser();
        }
        return LaTeX._parser;
    }

    static createParser() {
        // create a parser and strip it from everything except the items that you need
        var keep = ['classes', 'setOperator', 'getOperators', 'getBrackets', 'tokenize', 'toRPN', 'tree', 'units'];
        var parser = new LaTeX.$Parser();
        for (var x in parser) {
            if (keep.indexOf(x) === -1)
                delete parser[x];
        }
        // declare the operators
        parser.setOperator({
            precedence: 8,
            operator: '\\',
            action: 'slash',
            prefix: true,
            postfix: false,
            leftAssoc: true,
            operation: function (e) {
                return e; // bypass the slash
            }
        });
        parser.setOperator({
            precedence: 8,
            operator: '\\,',
            action: 'slash_comma',
            prefix: true,
            postfix: false,
            leftAssoc: true,
            operation: function (e) {
                return e; // bypass the slash
            }
        });
        // have braces not map to anything. We want them to be return as-is
        var brackets = parser.getBrackets();
        brackets['{'].maps_to = undefined;
        return parser;
    }

    static latex(symbol, option) {
        // it might be an array
        if (symbol.clone) {
            symbol = symbol.clone(); // leave original as-is
        }
        if (symbol instanceof Collection)
            symbol = symbol.elements;

        if (Array.isArray(symbol)) {
            var LaTeXArray = [];
            for (var i = 0; i < symbol.length; i++) {
                var sym = symbol[i];
                //This way I can generate LaTeX on an array of strings.
                if (!isSymbol(sym))
                    sym = parse(sym);
                LaTeXArray.push(this.latex(sym, option));
            }
            return this.brackets(LaTeXArray.join(', '), 'square');
        }

        else if (isMatrix(symbol)) {
            var TeX = '\\begin{pmatrix}\n';
            for (var i = 0; i < symbol.elements.length; i++) {
                var rowTeX = [],
                    e = symbol.elements[i];
                for (var j = 0; j < e.length; j++) {
                    rowTeX.push(this.latex(e[j], option));
                }
                TeX += rowTeX.join(' & ');
                if (i < symbol.elements.length - 1) {
                    TeX += '\\\\\n';
                }
            }
            TeX += '\\end{pmatrix}';
            return TeX;
        }

        else if (isVector(symbol)) {
            var TeX = '\\left[';
            for (var i = 0; i < symbol.elements.length; i++) {
                TeX += this.latex(symbol.elements[i], option) + ' ' + (i !== symbol.elements.length - 1 ? ',\\,' : '');
            }
            TeX += '\\right]';
            return TeX;
        }

        else if (isSet(symbol)) {
            var TeX = '\\{';
            for (var i = 0; i < symbol.elements.length; i++) {
                TeX += this.latex(symbol.elements[i], option) + ' ' + (i !== symbol.elements.length - 1 ? ',\\,' : '');
            }
            TeX += '\\}';
            return TeX;
        }

        symbol = symbol.clone();

        var decimal = (option === 'decimal' || option === 'decimals'),
            power = symbol.power,
            invert = isNegative(power),
            negative = symbol.multiplier.lessThan(0);

        if (symbol.group === Groups.P && decimal) {
            return String(symbol.multiplier.toDecimal() * Math.pow(symbol.value, symbol.power.toDecimal()));
        }
        else {
            symbol.multiplier = symbol.multiplier.abs();

            // if the user wants the result in decimal format then return it as such by placing it at the top part
            var m_array;

            if (decimal) {
                var m = String(symbol.multiplier.toDecimal());
                // if (String(m) === '1' && !decimal) m = '';
                m_array = [m, ''];
            }
            else {
                m_array = [symbol.multiplier.num, symbol.multiplier.den];
            }
            // get the value as a two part array
            var v_array = this.value(symbol, invert, option, negative),
                p;
            // make it all positive since we know whether to push the power to the numerator or denominator already.
            if (invert)
                power.negate();
            // the power is simple since it requires no additional formatting. We can get it to a
            // string right away. pass in true to neglect unit powers
            if (decimal) {
                p = isSymbol(power) ? LaTeX.latex(power, option) : String(power.toDecimal());
                if (String(p) === '1')
                    p = '';
            }
            // get the latex representation
            else if (isSymbol(power))
                p = this.latex(power, option);
            // get it as a fraction
            else
                p = this.formatFrac(power, true);
            // use this array to specify if the power is getting attached to the top or the bottom
            var p_array = ['', ''],
                // stick it to the top or the bottom. If it's negative then the power gets placed on the bottom
                index = invert ? 1 : 0;
            p_array[index] = p;

            // special case group Groups.P and decimal
            var retval = (negative ? '-' : '') + this.set(m_array, v_array, p_array, symbol.group === Groups.CB);

            return retval.replace(/\+\-/gi, '-');
        }

    }

    static greek = {
        alpha: '\\alpha',
        beta: '\\beta',
        gamma: '\\gamma',
        delta: '\\delta',
        epsilon: '\\epsilon',
        zeta: '\\zeta',
        eta: '\\eta',
        theta: '\\theta',
        iota: '\\iota',
        kappa: '\\kappa',
        lambda: '\\lambda',
        mu: '\\mu',
        nu: '\\nu',
        xi: '\\xi',
        omnikron: '\\omnikron',
        pi: '\\pi',
        rho: '\\rho',
        sigma: '\\sigma',
        tau: '\\tau',
        upsilon: '\\upsilon',
        phi: '\\phi',
        chi: '\\chi',
        psi: '\\psi',
        omega: '\\omega',
        Gamma: '\\Gamma',
        Delta: '\\Delta',
        Epsilon: '\\Epsilon',
        Theta: '\\Theta',
        Lambda: '\\Lambda',
        Xi: '\\Xi',
        Pi: '\\Pi',
        Sigma: '\\Sigma',
        Phi: '\\Phi',
        Psi: '\\Psi',
        Omega: '\\Omega'
    }

    static symbols = {
        arccos: '\\arccos',
        cos: '\\cos',
        csc: '\\csc',
        exp: '\\exp',
        ker: '\\ker',
        limsup: '\\limsup',
        min: '\\min',
        sinh: '\\sinh',
        arcsin: '\\arcsin',
        cosh: '\\cosh',
        deg: '\\deg',
        gcd: '\\gcd',
        lg: '\\lg',
        ln: '\\ln',
        Pr: '\\Pr',
        sqrt: '\\sqrt',
        sup: '\\sup',
        arctan: '\\arctan',
        cot: '\\cot',
        det: '\\det',
        hom: '\\hom',
        lim: '\\lim',
        log: '\\log',
        LN: '\\LN',
        sec: '\\sec',
        tan: '\\tan',
        arg: '\\arg',
        coth: '\\coth',
        dim: '\\dim',
        inf: '\\inf',
        liminf: '\\liminf',
        max: '\\max',
        sin: '\\sin',
        tanh: '\\tanh'
    }

    // get the raw value of the symbol as an array
    static value(symbol, inverted, option, negative) {
        var group = symbol.group,
            previousGroup = symbol.previousGroup,
            v = ['', ''],
            index = inverted ? 1 : 0;
        /*if (group === Groups.N) // do nothing since we want to return top & bottom blank; */
        if (symbol.isInfinity) {
            v[index] = '\\infty';
        }
        else if (group === Groups.S || group === Groups.P || previousGroup === Groups.S || previousGroup === Groups.P || previousGroup === Groups.N) {
            var value = this.formatSubscripts(symbol.value);
            if (value.replace)
                value = value.replace(/(.+)_$/, '$1\\_');
            // split it so we can check for instances of alpha as well as alpha_b
            var t_varray = String(value).split('_');
            var greek = this.greek[t_varray[0]];
            if (greek) {
                t_varray[0] = greek;
                value = t_varray.join('_');
            }
            var symbol = this.symbols[t_varray[0]];
            if (symbol) {
                t_varray[0] = symbol;
                value = t_varray.join('_');
            }
            v[index] = value;
        }
        else if (group === Groups.FN || previousGroup === Groups.FN) {
            var name,
                input = [],
                fname = symbol.fname;
            // collect the arguments
            for (var i = 0; i < symbol.args.length; i++) {
                var arg = symbol.args[i], item;
                if (typeof arg === 'string')
                    item = arg;
                else {
                    item = this.latex(arg, option);
                }
                input.push(item);
            }

            if (fname === Settings.SQRT) {
                v[index] = '\\sqrt' + this.braces(input.join(','));
            }
            else if (fname === Settings.ABS) {
                v[index] = this.brackets(input.join(','), 'abs');
            }
            else if (fname === Settings.PARENTHESIS) {
                v[index] = this.brackets(input.join(','), 'parens');
            }
            else if (fname === 'limit') {
                v[index] = ' \\lim\\limits_{' + input[1] + ' \\to ' + input[2] + '} ' + input[0];
            }
            else if (fname === 'integrate') {
                v[index] = '\\int' + this.braces(input[0]) + this.braces('d' + input[1]);
            }
            else if (fname === 'defint') {
                v[index] = '\\int\\limits_' + this.braces(input[1]) + '^' + this.braces(input[2]) + ' ' + input[0] + ' d' + input[3];
            }
            else if (fname === Settings.FACTORIAL || fname === Settings.DOUBLEFACTORIAL) {
                var arg = symbol.args[0];
                if (arg.power.equals(1) && (arg.isComposite() || arg.isCombination())) {
                    input[0] = this.brackets(input[0]);
                }
                v[index] = input[0] + (fname === Settings.FACTORIAL ? '!' : '!!');
            }
            else if (fname === 'floor') {
                v[index] = '\\left \\lfloor' + this.braces(input[0]) + '\\right \\rfloor';
            }
            else if (fname === 'ceil') {
                v[index] = '\\left \\lceil' + this.braces(input[0]) + '\\right \\rceil';
            }
            // capture log(a, b)
            else if (fname === Settings.LOG && input.length > 1) {
                v[index] = '\\mathrm' + this.braces(Settings.LOG) + '_' + this.braces(input[1]) + this.brackets(input[0]);
            }
            // capture log(a, b)
            else if (fname === Settings.LOG10) {
                v[index] = '\\mathrm' + this.braces(Settings.LOG) + '_' + this.braces(10) + this.brackets(input[0]);
            }
            else if (fname === 'sum') {
                var a = input[0],
                    b = input[1],
                    c = input[2],
                    d = input[3];
                v[index] = '\\sum\\limits_{' + this.braces(b) + '=' + this.braces(c) + '}^' + this.braces(d) + ' ' + this.braces(a) + '';
            }
            else if (fname === 'product') {
                var a = input[0],
                    b = input[1],
                    c = input[2],
                    d = input[3];
                v[index] = '\\prod\\limits_{' + this.braces(b) + '=' + this.braces(c) + '}^' + this.braces(d) + ' ' + this.braces(a) + '';
            }
            else if (fname === 'nthroot') {
                v[index] = '\\sqrt[' + input[1] + ']' + this.braces(input[0]);
            }
            else if (fname === 'mod') {
                v[index] = input[0] + ' \\bmod ' + input[1];
            }
            else if (fname === 'realpart') {
                v[index] = '\\operatorname{Re}' + this.brackets(input[0]);
            }
            else if (fname === 'imagpart') {
                v[index] = '\\operatorname{Im}' + this.brackets(input[0]);
            }
            else {
                var name = fname !== '' ? '\\mathrm' + this.braces(fname.replace(/_/g, '\\_')) : '';
                if (symbol.isConversion)
                    v[index] = name + this.brackets(input.join(''), 'parens');
                else
                    v[index] = name + this.brackets(input.join(','), 'parens');
            }
        }
        else if (symbol.isComposite()) {
            var collected = symbol.collectSymbols().sort(
                    group === Groups.CP || previousGroup === Groups.CP ?
                        function (a, b) {
                            return b.group - a.group;
                        } :
                        function (a, b) {
                            var x = isSymbol(a.power) ? -1 : a.power;
                            var y = isSymbol(b.power) ? -1 : b.power;
                            return y - x;
                        }
                ),
                symbols = [],
                l = collected.length;
            for (var i = 0; i < l; i++) {
                symbols.push(LaTeX.latex(collected[i], option));
            }
            var value = symbols.join('+');

            v[index] = !(symbol.isLinear() && symbol.multiplier.equals(1)) || negative ? this.brackets(value, 'parens') : value;
        }
        else if (group === Groups.CB || previousGroup === Groups.EX || previousGroup === Groups.CB) {
            if (group === Groups.CB)
                symbol.distributeExponent();
            // This almost feels a little like cheating but I need to know if I should be wrapping the symbol
            // in brackets or not. We'll do this by checking the value of the numerator and then comparing it
            // to whether the symbol value is "simple" or not.
            var denominator = [],
                numerator = [];
            // Generate a profile
            var den_map = [], num_map = [], num_c = 0, den_c = 0;
            var setBrackets = function (container, map, counter) {
                if (counter > 1 && map.length > 0) {
                    var l = map.length;
                    for (var i = 0; i < l; i++) {
                        var idx = map[i], item = container[idx];
                        if (!(/^\\left\(.+\\right\)\^\{.+\}$/g.test(item) || /^\\left\(.+\\right\)$/g.test(item))) {
                            container[idx] = LaTeX.brackets(item, 'parens');
                        }
                    }
                }
                return container;
            };

            // Generate latex for each of them
            symbol.each(function (x) {
                var isDenom = isNegative(x.power),
                    laTex;

                if (isDenom) {
                    laTex = LaTeX.latex(x.invert(), option);
                    den_c++;
                    if (x.isComposite()) {
                        if (symbol.multiplier.den != 1 && Math.abs(x.power) == 1)
                            laTex = LaTeX.brackets(laTex, 'parens');
                        den_map.push(denominator.length); // make a note of where the composite was found
                    }

                    denominator.push(laTex);
                }
                else {
                    laTex = LaTeX.latex(x, option);
                    num_c++;
                    if (x.isComposite()) {
                        if (symbol.multiplier.num != 1 && Math.abs(x.power) == 1)
                            laTex = LaTeX.brackets(laTex, 'parens');
                        num_map.push(numerator.length);   // make a note of where the composite was found
                    }
                    numerator.push(laTex);
                }
            });

            // Apply brackets
            setBrackets(numerator, num_map, num_c);
            v[0] = numerator.join(this.dot); // collapse the numerator into one string

            setBrackets(denominator, den_map, den_c);
            v[1] = denominator.join(this.dot);
        }

        return v;
    }

    static set(m, v, p, combine_power) {
        var isBracketed = function (v) {
            return /^\\left\(.+\\right\)$/.test(v);
        };
        // format the power if it exists
        if (p)
            p = this.formatP(p);
        // group Groups.CB will have to be wrapped since the power applies to both it's numerator and denominator
        if (combine_power) {
            // POSSIBLE BUG: If powers for group Groups.CB format wrong, investigate this since I might have overlooked something
            // the assumption is that in every case the denonimator should be empty when dealing with CB. I can't think
            // of a case where this isn't true
            var tp = p[0];
            p[0] = ''; // temporarily make p blank
        }

        // merge v and p. Not that v MUST be first since the order matters
        v = this.merge(v, p);
        var mn = m[0], md = m[1], vn = v[0], vd = v[1];
        // filters
        // if the top has a variable but the numerator is one drop it
        if (vn && Number(mn) === 1)
            mn = '';
        // if denominator is 1 drop it always
        if (Number(md) === 1)
            md = '';
        // prepare the top portion but check that it's not already bracketed. If it is then leave out the cdot
        var top = this.join(mn, vn, !isBracketed(vn) ? this.dot : '');

        // prepare the bottom portion but check that it's not already bracketed. If it is then leave out the cdot
        var bottom = this.join(md, vd, !isBracketed(vd) ? this.dot : '');
        // format the power if it exists
        // make it a fraction if both top and bottom exists
        if (top && bottom) {
            var frac = this.frac(top, bottom);
            if (combine_power && tp)
                frac = this.brackets(frac) + tp;
            return frac;
        }
        // otherwise only the top exists so return that
        else
            return top;
    }

    static merge(a, b) {
        var r = [];
        for (var i = 0; i < 2; i++)
            r[i] = a[i] + b[i];
        return r;
    }

    // joins together two strings if both exist
    static join(n, d, glue) {
        if (!n && !d)
            return '';
        if (n && !d)
            return n;
        if (d && !n)
            return d;
        return n + glue + d;
    }

    /**
     * Places subscripts in braces for proper formatting
     * @param {String} v
     * @returns {String}
     */
    static formatSubscripts(v) {
        // Split it at the underscore
        var arr = v.toString().split('_');

        var name = '';

        // Loop over all entries except the first one
        while(arr.length > 1) {
            // Wrap all in braces except for the last one
            if (arr.length > 0) {
                name = '_' + this.braces(arr.pop() + name);
            }
        }

        return arr[0] + name;
    }

    static formatP(p_array) {
        for (var i = 0; i < 2; i++) {
            var p = p_array[i];
            if (p)
                p_array[i] = '^' + this.braces(p);
        }
        return p_array;
    }

    /**
     * formats the fractions accordingly.
     * @param {Frac} f
     * @param {boolean} is_pow
     */
    static formatFrac(f, is_pow) {
        var n = f.num.toString(),
            d = f.den.toString();
        // no need to have x^1
        if (is_pow && n === '1' && d === '1')
            return '';
        // no need to have x/1
        if (d === '1')
            return n;
        return this.frac(n, d);
    }

    static frac(n, d) {
        return '\\frac' + this.braces(n) + this.braces(d);
    }

    static braces(e) {
        return '{' + e + '}';
    }

    static brackets(e, typ) {
        typ = typ || 'parens';
        var bracketTypes = {
            parens: ['(', ')'],
            square: ['[', ']'],
            brace: ['{', '}'],
            abs: ['|', '|'],
            angle: ['\\langle', '\\rangle']
        };
        var bracket = bracketTypes[typ];
        return '\\left' + bracket[0] + e + '\\right' + bracket[1];
    }

    /**
     * Removes extreneous tokens
     * @param {Tokens[]} tokens
     * @returns {Tokens[]}
     */
    static filterTokens(tokens) {
        var filtered = [];

        // Copy over the type of the scope
        if (Array.isArray(tokens)) {
            filtered.type = tokens.type;
        }

        // the items that need to be disposed
        var d = ['\\', 'left', 'right', 'big', 'Big', 'large', 'Large'];
        for (var i = 0, l = tokens.length; i < l; i++) {
            var token = tokens[i];
            var next_token = tokens[i + 1];
            if (token.value === '\\' && next_token.value === '\\') {
                filtered.push(token);
            }
            else if (Array.isArray(token)) {
                filtered.push(LaTeX.filterTokens(token));
            }
            else if (d.indexOf(token.value) === -1) {
                filtered.push(token);
            }
        }
        return filtered;
    }

    /*
     * Parses tokens from LaTeX string. Does not do any error checking
     * @param {Tokens[]} rpn
     * @returns {String}
     */
    static parse(raw_tokens) {
        var i, l;
        var retval = '';
        var tokens = this.filterTokens(raw_tokens);
        var replace = {
            'cdot': '',
            'times': '',
            'infty': 'Infinity'
        };
        // get the next token
        var next = function (n) {
            return tokens[(typeof n === 'undefined' ? ++i : i += n)];
        };
        var parse_next = function () {
            return LaTeX.parse(next());
        };
        var get = function (token) {
            if (token in replace) {
                return replace[token];
            }
            // A quirk with implicit multiplication forces us to check for *
            if (token === '*' && tokens[i + 1].value === '&') {
                next(2); // skip this and the &
                return ',';
            }

            if (token === '&') {
                next();
                return ','; // Skip the *
            }
            // If it's the end of a row, return the row separator
            if (token === '\\') {
                return '],[';
            }
            return token;
        };

        // start parsing the tokens
        for (i = 0, l = tokens.length; i < l; i++) {
            var token = tokens[i];
            // fractions
            if (token.value === 'frac') {
                // parse and wrap it in brackets
                var n = parse_next();
                var d = parse_next();
                retval += n + '/' + d;
            }
            else if (token.value in LaTeX.symbols) {
                if (token.value === Settings.SQRT && tokens[i + 1].type === 'vector' && tokens[i + 2].type === 'Set') {
                    var base = parse_next();
                    var expr = parse_next();
                    retval += (expr + '^' + inBrackets('1/' + base));
                }
                else {
                    retval += token.value + parse_next();
                }
            }
            else if (token.value === 'int') {
                var f = parse_next();
                // skip the comma
                i++;
                // get the variable of integration
                var dx = next().value;
                dx = get(dx.substring(1, dx.length));
                retval += 'integrate' + inBrackets(f + ',' + dx);
            }
            else if (token.value === 'int_') {
                var l = parse_next(); // lower
                i++; // skip the ^
                var u = next().value; // upper
                // if it is in brackets
                if (u === undefined) {
                    i--;
                    var u = parse_next();
                }
                var f = parse_next(); // function

                // get the variable of integration
                var dx = next().value;
                // skip the comma
                if (dx === ',') {
                    var dx = next().value;
                }
                // if 'd', skip
                if (dx === 'differentialD') {
                    // skip the *
                    i++;
                    var dx = next().value;
                }
                if (dx === 'mathrm') {
                    // skip the mathrm{d}
                    i++;
                    var dx = next().value;
                }
                retval += 'defint' + inBrackets(f + ',' + l + ',' + u + ',' + dx);
            }
            else if (token.value && token.value.startsWith('int_')) {
                // var l = parse_next(); // lower
                var l = token.value.replace('int_', '')
                console.log('uppernow')
                i++; // skip the ^
                var u = next().value; // upper
                // if it is in brackets
                if (u === undefined) {
                    i--;
                    var u = parse_next();
                }
                var f = parse_next(); // function

                // get the variable of integration
                var dx = next().value;
                // skip the comma
                if (dx === ',') {
                    var dx = next().value;
                }
                // if 'd', skip
                if (dx === 'differentialD') {
                    // skip the *
                    i++;
                    var dx = next().value;
                }
                if (dx === 'mathrm') {
                    // skip the mathrm{d}
                    i++;
                    var dx = next().value;
                }
                retval += 'defint' + inBrackets(f + ',' + l + ',' + u + ',' + dx);
            }
            else if (token.value === 'mathrm') {
                var f = tokens[++i][0].value;
                retval += f + parse_next();
            }
            // sum and product
            else if (token.value === 'sum_' || token.value === 'prod_') {
                var fn = token.value === 'sum_' ? 'sum' : 'product';
                var nxt = next();
                i++; // skip the caret
                var end = parse_next();
                var f = parse_next();
                retval += fn + inBrackets([f, get(nxt[0]), get(nxt[2]), get(end)].join(','));
            }
            else if (token.value === 'lim_') {
                var nxt = next();
                retval += 'limit' + inBrackets([parse_next(), get(nxt[0]), get(nxt[2])].join(','));
            }
            else if (token.value === 'begin') {
                var nxt = next();
                if (Array.isArray(nxt)) {
                    var v = nxt[0].value;
                    if (v === 'matrix') {
                        // Start a matrix
                        retval += 'matrix([';
                    }
                }
            }
            else if (token.value === 'end') {
                var nxt = next();
                if (Array.isArray(nxt)) {
                    var v = nxt[0].value;
                    if (v === 'matrix') {
                        // End a matrix
                        retval += '])';
                    }
                }
            }
            else {
                if (Array.isArray(token)) {
                    retval += get(LaTeX.parse(token));
                }
                else {
                    retval += get(token.value.toString());
                }
            }
        }

        return inBrackets(retval);
    }
}
