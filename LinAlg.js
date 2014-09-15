/*
* Author : Martin Donk
* Website : http://www.nerdamer.com
* Email : martin.r.donk@gmail.com
* License : http://opensource.org/licenses/LGPL-3.0
* Source : https://github.com/jiggzson/nerdamer
* This contains mostly ports from Sylvester.js
* website: http://sylvester.jcoglan.com/
*/

(function(){
    var core = nerdamer.getCore(),
        _ = core.PARSER,
        Vector = core.Vector,
        format = core.Utils.format,
        Symbol = core.Symbol,
        isSymbol = core.Utils.isSymbol,
        isVector = core.Utils.isVector,
        isArray = core.Utils.isArray,
        block = core.Utils.block,
        PRECISION = 1e-6;
    
    //add utilities
    var isMatrix = core.Utils.isMatrix = function(obj) {
        return (obj instanceof Matrix);
    };
    
    Vector.arrayPrefill = function(n, val) {
        var a = [];
        val = val || 0;
        for(var i=0; i<n; i++) a[i] = val;
        return a;
    };
    
    //Ported from Sylvester.js
    Vector.prototype = {
        custom: true,
        // Returns element i of the vector
        e: function(i) {
            return (i < 1 || i > this.elements.length) ? null : this.elements[i-1];
        },

        // Returns the number of elements the vector has
        dimensions: function() {
            return this.elements.length;
        },

        // Returns the modulus ('length') of the vector
        modulus: function() {
            return block('SAFE', function() {
                return _.pow((this.dot(this.copy())), new Symbol(0.5));
            }, undefined, this);
        },

        // Returns true iff the vector is equal to the argument
        eql: function(vector) {
            var n = this.elements.length;
            var V = vector.elements || vector;
            if (n !== V.length) { return false; }
            do {
                if (Math.abs(_.subtract(this.elements[n-1],V[n-1]).valueOf()) > PRECISION) { return false; }
            } while (--n);
            return true;
        },

        // Returns a copy of the vector
        copy: function() {
            var V = new Vector(),
                l = this.elements.length;
            for(var i=0; i<l; i++) {
                //Rule: all items within the vector must have a copy method.
                V.elements.push(this.elements[i].copy());
            }
            return V;
        },

        // Maps the vector to another vector according to the given function
        map: function(fn) {
            var elements = [];
            this.each(function(x, i) {
                elements.push(fn(x, i));
            });
            return new Vector(elements);
        },

        // Calls the iterator for each element of the vector in turn
        each: function(fn) {
            var n = this.elements.length, k=n, i;
            do { 
                i = k-n;
                fn(this.elements[i], i+1);
            } while (--n);
        },

        // Returns a new vector created by normalizing the receiver
        toUnitVector: function() {
            return block('SAFE', function() {
                var r = this.modulus();
                if (r.valueOf() === 0) { return this.copy(); }
                return this.map(function(x) { return _.divide(x, r); });
            }, undefined, this);    
        },

        // Returns the angle between the vector and the argument (also a vector)
        angleFrom: function(vector) {
            return block('SAFE', function() {
                var V = vector.elements || vector;
                var n = this.elements.length;
                if (n !== V.length) { return null; }
                var dot = new Symbol(0), mod1 = new Symbol(0), mod2 = new Symbol(0);
                // Work things out in parallel to save time
                this.each(function(x, i) {
                    dot = _.add(dot, _.multiply(x, V[i-1]));
                    mod1 = _.add(mod1, _.multiply(x, x));//will not conflict in safe block
                    mod2 = _.add(mod2, _.multiply(V[i-1], V[i-1]));//will not conflict in safe block
                });
                mod1 = _.pow(mod1, new Symbol(0.5)); mod2 = _.pow(mod2, new Symbol(0.5));
                var product = _.multiply(mod1,mod2);
                if(product.valueOf() === 0) { return null; }
                var theta = _.divide(dot, product);
                var theta_val = theta.valueOf();
                if(theta_val < -1) { theta = -1; }
                if (theta_val > 1) { theta = 1; }
                return new Symbol(Math.acos(theta));
            }, undefined, this);
        },

        // Returns true iff the vector is parallel to the argument
        isParallelTo: function(vector) {
          var angle = this.angleFrom(vector).valueOf();
          return (angle === null) ? null : (angle <= PRECISION);
        },

        // Returns true iff the vector is antiparallel to the argument
        isAntiparallelTo: function(vector) {
          var angle = this.angleFrom(vector).valueOf();
          return (angle === null) ? null : (Math.abs(angle - Math.PI) <= Sylvester.precision);
        },

        // Returns true iff the vector is perpendicular to the argument
        isPerpendicularTo: function(vector) {
          var dot = this.dot(vector);
          return (dot === null) ? null : (Math.abs(dot) <= Sylvester.precision);
        },

        // Returns the result of adding the argument to the vector
        add: function(vector) {
            return block('SAFE', function(){
                var V = vector.elements || vector;
                if (this.elements.length !== V.length) { return null; }
                return this.map(function(x, i) { return _.add(x, V[i-1]); });
            }, undefined, this);
        },

        // Returns the result of subtracting the argument from the vector
        subtract: function(vector) {
            return block('SAFE', function(){
                var V = vector.elements || vector;
                if (this.elements.length !== V.length) { return null; }
                return this.map(function(x, i) { return _.subtract(x, V[i-1]); });
            }, undefined, this);
        },

        // Returns the result of multiplying the elements of the vector by the argument
        multiply: function(k) {
            return this.map(function(x) { return x.copy()*k.copy(); });
        },

        x: function(k) { return this.multiply(k); },

        // Returns the scalar product of the vector with the argument
        // Both vectors must have equal dimensionality
        dot: function(vector) {
            return block('SAFE', function() {
                var V = vector.elements || vector;
                var product = new Symbol(0), n = this.elements.length;
                if (n !== V.length) { return null; }
                do { product = _.add(product, _.multiply(this.elements[n-1], V[n-1])); } while (--n);
                return product;
            }, undefined, this);  
        },

        // Returns the vector product of the vector with the argument
        // Both vectors must have dimensionality 3
        cross: function(vector) {
            var B = vector.elements || vector;
            if(this.elements.length !== 3 || B.length !== 3) { return null; }
            var A = this.elements;
            return block('SAFE', function() {
                return new Vector([
                    _subtract(_.multiply(A[1], B[2]), _.multiply(A[2], B[1])),
                    _subtract(_.multiply(A[2], B[0]), _.multiply(A[0], B[2])),
                    _subtract(_.multiply(A[0], B[1]), _.multiply(A[1], B[0]))
                ]);
            }, undefined, this);  
        },

        // Returns the (absolute) largest element of the vector
        max: function() {
            var m = 0, n = this.elements.length, k = n, i;
            do { i = k - n;
                if(Math.abs(this.elements[i].valueOf()) > Math.abs(m.valueOf())) { m = this.elements[i]; }
            } while (--n);
            return m;
        },

        // Returns the index of the first match found
        indexOf: function(x) {
            var index = null, n = this.elements.length, k = n, i;
            do { 
                i = k-n;
                if(index === null && this.elements[i].valueOf() === x.valueOf()) {
                    index = i+1;
                }
            } while (--n);
            return index;
        },
        text: function(x) {
            var l = this.elements.length,
                c = [];
            for(var i=0; i<l; i++) c.push(this.elements[i].text());
            return '['+c.join(',')+']';
        },
        toString: function() {
            return this.text();
        }
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
    };
    
    Matrix.zeroMatrix = function(rows, cols) {
        var m = new Matrix();
        for(var i=0; i<rows; i++) {
            m.elements.push(Vector.arrayPrefill(cols, new Symbol(0)));
        }
        return m;
    };
    
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
        each: function(fn) {
            var nr = this.rows(),
                nc = this.cols(), i, j;
            for(i=0; i<nr; i++) {
                for(j=0; j<nc; j++) {
                    fn(this.elements[i][j], i, j);
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
                        new_element = _.divide(M.elements[i][p], divisor.copy());
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
        transpose: function() {
            var rows = this.elements.length, cols = this.elements[0].length;
            var M = new Matrix(), ni = cols, i, nj, j;
            
            do { 
                i = cols - ni;
                M.elements[i] = [];
                nj = rows;
                do { j = rows - nj;
                    M.elements[i][j] = this.elements[j][i].copy();
                } while (--nj);
            } while (--ni);
            return M;
        },
        // Returns true if the matrix can multiply the argument from the left
        canMultiplyFromLeft: function(matrix) {
          var l = isMatrix(matrix) ? matrix.elements.length : matrix.length;
          // this.columns should equal matrix.rows
          return (this.elements[0].length === l);
        },
        multiply: function(matrix) {    
            return block('SAFE', function(){
                var M = matrix.elements || matrix;
                if (!this.canMultiplyFromLeft(M)) { return null; }
                var ni = this.elements.length, ki = ni, i, nj, kj = M[0].length, j;
                var cols = this.elements[0].length, elements = [], sum, nc, c;
                do { 
                    i = ki-ni;
                    elements[i] = [];
                    nj = kj;
                    do { 
                        j = kj - nj;
                        sum = new Symbol(0);
                        nc = cols;
                        do { 
                            c = cols-nc;
                            sum = _.add(sum, _.multiply(this.elements[i][c], M[c][j])) ;
                        } while (--nc);
                      elements[i][j] = sum;
                    } while (--nj);
                } while (--ni);
                return Matrix.fromArray(elements);
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
 
    _.extend('multiply', function(a, b){ 
        var isSymbolA = isSymbol(a), isSymbolB = isSymbol(b), t;
        if(isSymbolB && !isSymbolA) { //keep symbols to the right 
            t = a; a = b; b = t; //swap
            t = isSymbolB; isSymbolB = isSymbolA; isSymbolA = t;
        }
        
        var isMatrixB = isMatrix(b), isMatrixA = isMatrix(a);
        if(isSymbolA && isMatrixB) {
            b.eachElement(function(e) {
               return _.multiply(a.copy(), e); 
            });
        }
        else {
            if(isMatrixA && isMatrixB) { 
                b = a.multiply(b);
            }
            else if(isSymbolA && isVector(b)) {
                b.each(function(x, i) {
                    i--;
                    b.elements[i] = _.multiply(a.copy(), b.elements[i]);
                });
            }
            else {
                if(isVector(a) && isVector(b)) {
                    b.each(function(x, i) {
                        i--;
                        b.elements[i] = _.multiply(a.elements[i], b.elements[i]);
                    });
                }
                else if(isVector(a) && isMatrix(b)) {
                    //try to convert a to a matrix
                    a = new Matrix(a.elements);
                    b = a.multiply(b);
                }
                else if(isMatrix(a) && isVector(b)) {
                    b = new Matrix(b.elements);
                    b = a.multiply(b);
                }
            }
        }
        return b;
    });
    
    _.extend('divide', function(a, b) {
        var isSymbolA = isSymbolA = isSymbol(a), isSymbolB = isSymbol(b), t;
        var isVectorA = isVector(a), isVectorB = isVector(b);
        if(isSymbolA && isVectorB) {
            b = b.map(function(x){
                return _.divide(a.copy(),x);
            });
        }
        else if(isVectorA && isSymbolB) {
            b = a.map(function(x) {
                return _.divide(x, b.copy());
            });
        }
        else if(isVectorA && isVectorB) {
            if(a.dimensions() === b.dimensions()) {
                b = b.map(function(x, i) {
                    return _.divide(a.elements[--i], x);
                });
            }
            else _.error('Cannot divide vectors. Dimensions do not match!');
        }
        else {
            var isMatrixA = isMatrix(a), isMatrixB = isMatrix(b);
            if(isMatrixA && isSymbolB) {
                a.eachElement(function(x) {
                    return _.divide(x, b.copy());
                });
                b = a;
            }
            else if(isMatrixA && isMatrixB) {
                if(a.rows() === b.rows() && a.cols() === b.cols()) {
                    a.eachElement(function(x, i, j) {
                        return _.divide(x, b.elements[i][j]);
                    });
                }
                else {
                    _.error('Dimensions do not match!');
                }
            }
            else if(isMatrixA && isVectorB) {
                if(a.cols() === b.dimensions()) {
                    a.eachElement(function(x, i, j) {
                        return _.divide(x, b.elements[i].copy());
                    });
                    b = a;
                }
                else {
                    _.error('Unable to divide matrix by vector.');
                }
            }
        }
        return b;
    });
    
    _.extend('add', function(a, b) {
        var isSymbolA = isSymbolA = isSymbol(a), isSymbolB = isSymbol(b), t;
        if(isSymbolB) {
            t = b; b = a; a = t;
            isSymbolA = isSymbolB;
        }
        if(isSymbolA && isVector(b)) {
            b = b.map(function(x, i) {
                return _.add(x, a.copy());
            });
        }
        else if(isVector(a) && isVector(b)) {
            if(a.dimensions() === b.dimensions()) b = a.add(b);
            else _.error('Unable to add vectors. Dimensions do not match.');
        }
        else if(isMatrix(a) && isMatrix(b)) {
            var rows = a.rows(), V = new Matrix();
            if(rows === b.rows() && a.cols() === b.cols()) {
                b.eachElement(function(x, i, j) {
                    return _.add(x, a.elements[i][j]);
                });
            }
            else _.error('Matrix dimensions do not match!');
        }
        return b;
    });
    
    _.extend('subtract', function(a, b) {
        var isSymbolA = isSymbolA = isSymbol(a), isSymbolB = isSymbol(b), t;
        if(isSymbolB) {
            t = b; b = a; a = t;
            isSymbolA = isSymbolB;
        }
        if(isSymbolA && isVector(b)) {
            b = b.map(function(x) {
                return _.subtract(x, a.copy());
            });
        }
        else if(isVector(a) && isVector(b)) {
            if(a.dimensions() === b.dimensions()) b = a.subtract(b);
            else _.error('Unable to subtract vectors. Dimensions do not match.');
        }
        else if(isMatrix(a) && isMatrix(b)) {
            var rows = a.rows();
            if(rows === b.rows() && a.cols() === b.cols()) {
                b.eachElement(function(x, i, j) {
                    return _.subtract(x, a.elements[i][j]);
                });
            }
            else _.error('Matrix dimensions do not match!');
        }
        return b;
    });
    
    _.extend('pow', function(a, b) {
        var isSymbolB = isSymbol(b);
        if(isVector(a) && isSymbolB) {
            a = a.map(function(x) {
                return _.pow(x, b.copy());
            });
        }
        else if(isMatrix(a) && isSymbolB) {
            a.eachElement(function(x) {
                return _.pow(x, b.copy());
            });
        }
        return a;
    });
    
    function matrix() {
        return Matrix.fromArray(arguments);
    }
    
    nerdamer.register([
        {
            name: 'matrix',
            visible: true,
            numargs: -1,
            build: function(){ return matrix; }
        },
        {
            name: 'determinant',
            visible: true,
            numargs: 1,
            build: function() {
                return function(symbol) {
                    return symbol.determinant();
                };
            }
        },
        {
            name: 'dot',
            visible: true,
            numargs: 2,
            build: function() {
                return function(symbol1, symbol2) {
                    return symbol1.dot(symbol2);
                };
            }
        },
        {
            name: 'invert',
            visible: true,
            numargs: 1,
            build: function() {
                return function(matrix) {
                    return matrix.invert();
                };
            }
        },
        {
            name: 'transpose',
            visible: true,
            numargs: 1,
            build: function() {
                return function(matrix) {
                    return matrix.transpose();
                };
            }
        }
    ]);
})();
