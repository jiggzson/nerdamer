/* 
 * Contains ports from Sylvester.js
 * website: http://sylvester.jcoglan.com/
 */

module.exports = function(nerdamer){
    var core = nerdamer.getCore(),
        _ = core.PARSER,
        Symbol = core.Symbol,
        isSymbol = core.Utils.isSymbol,
        isVector = core.Utils.isVector,
        isArray = core.Utils.isArray,
        block = core.Utils.block;
    
    //add utilities
    var isMatrix = core.Utils.isMatrix = function(obj) {
        return (obj instanceof Matrix);
    };
    
    function Matrix() {
        var m = arguments,
            l = m.length, i, el = [];
        if(isMatrix(m)) { //if it's a matrix then make a copy
            for(i=0; i<l; i++) {
                el.push(m[i].slice(0));
            }
        }
        else {
            var row, lw, rl;
            for(i=0; i<l; i++) {
                row = m[i];
                if(isVector(row)) row = row.elements;
                if(!isArray(row)) row = [row];
                rl = row.length;
                if(lw && lw !== rl) throw new Error('Unable to create Matrix. Row dimensions do not match!');
                el.push(row);
                lw = rl;
            }
        }
        this.elements = el;
    }
    
    Matrix.identity = function(n) {
        var m = new Matrix();
        for(var i=0; i<n; i++) {
            m.elements.push([]);
            for(var j=0; j<n; j++) {
                m.set(i, j, i === j ? new Symbol(1) : new Symbol(0));
            }
        }
        return m;
    };

    Matrix.fromArray = function(arr) {
        function F(args) {
            return Matrix.apply(this, args);
        }
        F.prototype = Matrix.prototype;

        return new F(arr);
    },
    
    Matrix.prototype = {
        //needs be true to let the parser know not to try to cast it to a symbol
        custom: true, 
        set: function(row, column, value) {
            this.elements[row][column] = value;
        },
        cols: function() {
            return this.elements[0].length;
        },
        rows: function() {
            return this.elements.length;
        },
        row: function(n) {
            if(!n || n > this.cols()) return [];
            return this.elements[n-1];
        },
        col: function(n) {
            var nr = this.rows(),
                col = []; 
            if(n > this.cols() || !n) return col;
            for(var i=0; i<nr; i++) {
                col.push(this.elements[i][n-1]);
            }
            return col;
        },
        eachElement: function(fn) {
            var nr = this.rows(),
                nc = this.cols(), i, j;
            for(i=0; i<nr; i++) {
                for(j=0; j<nc; j++) {
                    this.elements[i][j] = fn.call(this, this.elements[i][j], i, j);
                }
            }
        },
        //ported from Sylvester.js
        determinant: function() {
            if (!this.isSquare()) { return null; }
            var M = this.toRightTriangular();
            var det = M.elements[0][0], n = M.elements.length-1, k = n, i;
            do { 
                i = k-n+1;
                det = _.multiply(det,M.elements[i][i]);
            } while (--n);
            return det;
        },
        isSquare: function() {
            return this.elements.length === this.elements[0].length;
        },
        isSingular: function() {
            return this.isSquare() && this.determinant() === 0;
        },
        augment: function(m) {
            var r = this.rows(), rr = m.rows();
            if(r !== rr) throw new Error("Cannot augment matrix. Rows don't match.")
            for(var i=0; i<r; i++) {
                this.elements[i] = this.elements[i].concat(m.elements[i]);
            }
            return this;
        },
        copy: function() {
            var r = this.rows(), c = this.cols(),
                m = new Matrix();
            for(var i=0; i<r; i++) {
                m.elements[i] = [];
                for(var j=0; j<c; j++) { 
                    var symbol = this.elements[i][j]; 
                    m.elements[i][j] = isSymbol(symbol) ? symbol.copy() : symbol;
                }
            }
            return m;
        },
        //ported from Sylvester.js
        invert: function() {
            return block('SAFE', function() {
                var ni = this.elements.length, ki = ni, i, j;
                var M = this.augment(Matrix.identity(ni)).toRightTriangular(); 
                var np, kp = M.elements[0].length, p, els, divisor;
                var inverse_elements = [], new_element;
                // Matrix is non-singular so there will be no zeros on the diagonal
                // Cycle through rows from last to first
                do { 
                    i = ni-1;
                    // First, normalise diagonal elements to 1
                    els = []; np = kp;
                    inverse_elements[i] = [];
                    divisor = M.elements[i][i];
                    do { 
                        p = kp - np;
                        new_element = _.divide(M.elements[i][p], divisor);
                        els.push(new_element);
                        // Shuffle of the current row of the right hand side into the results
                        // array as it will not be modified by later runs through this loop
                        if (p >= ki) { inverse_elements[i].push(new_element); }
                    } while (--np);
                    M.elements[i] = els;
                    // Then, subtract this row from those above it to
                    // give the identity matrix on the left hand side
                    for (j=0; j<i; j++) {
                      els = []; np = kp;
                      do { p = kp - np;
                        els.push(_.subtract(M.elements[j][p],_.multiply(M.elements[i][p], M.elements[j][i])));
                      } while (--np);
                      M.elements[j] = els;
                    }
                } while (--ni);
                return Matrix.fromArray(inverse_elements);
            }, undefined, this);
        },
        //ported from Sylvester.js
        toRightTriangular: function() {
            return block('SAFE', function(){
                var M = this.copy(), els, fel, nel, 
                    n = this.elements.length, k = n, i, np, kp = this.elements[0].length, p;
                do { 
                    i = k-n;
                    fel = M.elements[i][i]; 
                    if(fel.valueOf() === 0) {
                        for(var j=i+1; j<k; j++) {
                        nel = M.elements[j][i];
                        if (nel && nel.valueOf() !== 0) {
                            els = []; np = kp;
                            do { 
                                p = kp-np; 
                                els.push(_.add(M.elements[i][p].copy(), M.elements[j][p].copy()));
                            } while (--np);
                            M.elements[i] = els;
                            break;
                        }
                      }
                    }
                    var fel = M.elements[i][i]; 
                    if(fel.valueOf() !== 0) {
                        for (j=i+1; j<k; j++) { 
                            var multiplier = _.divide(M.elements[j][i].copy(),M.elements[i][i].copy()); 
                            els = []; np = kp;
                            do { p = kp - np;
                                // Elements with column numbers up to an including the number
                                // of the row that we're subtracting can safely be set straight to
                                // zero, since that's the point of this routine and it avoids having
                                // to loop over and correct rounding errors later
                                els.push(p <= i ? new Symbol(0) : 
                                        _.subtract(M.elements[j][p].copy(), _.multiply(M.elements[i][p].copy(), multiplier.copy())));
                            } while (--np);
                            M.elements[j] = els;
                        }
                    }
                } while (--n);

                return M;  
            }, undefined, this);     
        },
        toString: function(newline) {
            var l = this.rows(),
                s = [];
            newline = newline === undefined ? '\n' : newline;
            for(var i=0; i<l; i++) {
                s.push('['+this.elements[i].map(function(x) {
                    return x !== undefined ? x.toString() : '';
                }).join(',')+']');
            }
            return s.join(','+newline);
        },
        text: function() {
            return 'matrix('+this.toString('')+')';
        }
    };
    core.Matrix = Matrix;
    
    var __ = core.LinAlg = {
        dot: function(a1, a2) {
            var l1 = a1.length, l2 = a2.length, 
                sum = new Symbol(0);
            if(l1 !== l2) throw new Error('Dimensions do not match!');
            for(var i=0; i<l1; i++) {
                sum = _.add(sum, _.multiply(a1[i].copy(), a2[i].copy()));
            }
            return sum;
        },
        arrayPrefill: function(n, val) {
            var a = [], val = val || 0;
            for(var i=0; i<n; i++) a[i] = val;
            return a;
        },
        zeroMatrix: function(rows, cols) {
            var m = new Matrix();
            for(var i=0; i<rows; i++) {
                m.elements.push(__.arrayPrefill(cols, new Symbol(0)));
            }
            return m;
        }
    };
 
    _.extend('multiply', function(a, b, multiply){ 
        var aIsSym = isSymbol(a), bIsSym = isSymbol(b);
        if(bIsSym && !aIsSym) { //keep symbols to the right 
            var t = a; a = b; b = t; //swap
        }
        if(aIsSym && bIsSym) {
            return multiply(a, b);
        }
        else if(isSymbol(a) && isMatrix(b)) {
            b.eachElement(function(e) {
               return multiply(a.copy(), e); 
            });
        }
        else if(isMatrix(a) && isMatrix(b)) { 
            var rows = a.rows();
            if(rows !== b.cols()) throw new Error('Dimensions do not match!');
            //prepare the matrix
            var bcols = [],
                m = new Matrix();
            for(var i=0; i<rows; i++) {
                m.elements.push([]);
                bcols.push(b.col(i+1));
            }
            //multiply
            for(var i=0; i<rows; i++) { 
                for(var j=0; j<rows; j++) { 
                    m.set(i, j, __.dot(a.row(i+1), bcols[j]));
                }
            }
            b = m;
        }

        
        return b;
    });
    
    function matrix() {
        var M = Matrix.fromArray(arguments);
        return M;
    }
    
    return [
        {
            name: 'matrix',
            visible: true,
            numargs: -1,
            build: function(){ return matrix; }
        }];
    
};
