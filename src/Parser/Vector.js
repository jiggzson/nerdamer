import {block} from '../Core/Utils';
import {isSymbol, Symbol} from '../Core/Symbol';
import {add, divide, multiply, pow, sqrt, subtract} from '../Core/SymbolOperators/SymbolOperators';
import {Settings} from '../Settings';
import {LaTeX} from '../LaTeX/LaTeX';

// noinspection JSUnusedGlobalSymbols
export class Vector {
    elements;
    custom = true;

    constructor(v) {
        if (isVector(v))
            this.elements = v.items.slice(0);
        else if (Array.isArray(v))
            this.elements = v.slice(0);
        else
            this.elements = [].slice.call(arguments);
    }

    /**
     * Generate a vector from and array
     * @param {type} a
     * @returns {Vector}
     */
    static fromArray(a) {
        let v = new Vector();
        v.elements = a;
        return v;
    }

    /**
     * Convert a Set to a Vector
     * @param {Set} set
     * @returns {Vector}
     */
    static fromSet(set) {
        return Vector.fromArray(set.elements);
    }

    /**
     * Generates a pre-filled array
     * @param {int} n
     * @param {any} val
     * @returns {any[]}
     */
    static arrayPrefill(n, val) {
        let a = [];
        val = val || 0;
        for (let i = 0; i < n; i++) {
            a[i] = val;
        }
        return a;
    }

    // Returns element i of the vector
    e(i) {
        return (i < 1 || i > this.elements.length) ? null : this.elements[i - 1];
    }

    set(i, val) {
        if (!isSymbol(val))
            val = new Symbol(val);
        this.elements[i] = val;
    }

    // Returns the number of elements the vector has
    dimensions() {
        return this.elements.length;
    }

    // Returns the modulus ('length') of the vector
    modulus() {
        return block('SAFE', () => {
            return pow((this.dot(this.clone())), new Symbol(0.5));
        }, undefined, this);
    }

    // Returns true iff the vector is equal to the argument
    eql(vector) {
        let n = this.elements.length;
        let V = vector.elements || vector;
        if (n !== V.length) {
            return false;
        }
        do {
            if (Math.abs(subtract(this.elements[n - 1], V[n - 1]).valueOf()) > Settings.PRECISION) {
                return false;
            }
        }
        while(--n);
        return true;
    }

    // Returns a clone of the vector
    clone() {
        let V = new Vector(),
            l = this.elements.length;
        for (let i = 0; i < l; i++) {
            //Rule: all items within the vector must have a clone method.
            V.elements.push(this.elements[i].clone());
        }
        if (this.getter) {
            V.getter = this.getter.clone();
        }
        return V;
    }

    // Maps the vector to another vector according to the given function
    map(fn) {
        let elements = [];
        this.each(function (x, i) {
            elements.push(fn(x, i));
        });

        return new Vector(elements);
    }

    // Calls the iterator for each element of the vector in turn
    each(fn) {
        let n = this.elements.length, k = n, i;
        do {
            i = k - n;
            fn(this.elements[i], i + 1);
        }
        while(--n);
    }

    // Returns a new vector created by normalizing the receiver
    toUnitVector() {
        return block('SAFE', () => {
            let r = this.modulus();
            if (r.valueOf() === 0) {
                return this.clone();
            }
            return this.map((x) => {
                return divide(x, r);
            });
        }, undefined, this);
    }

    // Returns the angle between the vector and the argument (also a vector)
    angleFrom(vector) {
        return block('SAFE', () => {
            let V = vector.elements || vector;
            let n = this.elements.length;
            if (n !== V.length) {
                return null;
            }
            let dot = new Symbol(0), mod1 = new Symbol(0), mod2 = new Symbol(0);
            // Work things out in parallel to save time
            this.each((x, i) => {
                dot = add(dot, multiply(x, V[i - 1]));
                mod1 = add(mod1, multiply(x, x));// will not conflict in safe block
                mod2 = add(mod2, multiply(V[i - 1], V[i - 1]));// will not conflict in safe block
            });
            mod1 = pow(mod1, new Symbol(0.5));
            mod2 = pow(mod2, new Symbol(0.5));
            let product = multiply(mod1, mod2);
            if (product.valueOf() === 0) {
                return null;
            }
            let theta = divide(dot, product);
            let theta_val = theta.valueOf();
            if (theta_val < -1) {
                theta = -1;
            }
            if (theta_val > 1) {
                theta = 1;
            }
            return new Symbol(Math.acos(theta));
        }, undefined, this);
    }

    // Returns true iff the vector is parallel to the argument
    isParallelTo(vector) {
        let angle = this.angleFrom(vector).valueOf();
        return (angle === null) ? null : (angle <= Settings.PRECISION);
    }

    // Returns true iff the vector is antiparallel to the argument
    isAntiparallelTo(vector) {
        let angle = this.angleFrom(vector).valueOf();
        return (angle === null) ? null : (Math.abs(angle - Math.PI) <= Settings.PRECISION);
    }

    // Returns true iff the vector is perpendicular to the argument
    isPerpendicularTo(vector) {
        let dot = this.dot(vector);
        return (dot === null) ? null : (Math.abs(dot) <= Settings.PRECISION);
    }

    // Returns the result of adding the argument to the vector
    add(vector) {
        return block('SAFE', () => {
            let V = vector.elements || vector;
            if (this.elements.length !== V.length) {
                return null;
            }
            return this.map((x, i) => {
                return add(x, V[i - 1]);
            });
        }, undefined, this);
    }

    // Returns the result of subtracting the argument from the vector
    subtract(vector) {
        return block('SAFE', () => {
            let V = vector.elements || vector;
            if (this.elements.length !== V.length) {
                return null;
            }
            return this.map((x, i) => {
                return subtract(x, V[i - 1]);
            });
        }, undefined, this);
    }

    // Returns the result of multiplying the elements of the vector by the argument
    multiply(k) {
        return this.map(function (x) {
            return x.clone() * k.clone();
        });
    }

    x(k) {
        return this.multiply(k);
    }

    // Returns the scalar product of the vector with the argument
    // Both vectors must have equal dimensionality
    dot(vector) {
        return block('SAFE', () => {
            let V = vector.elements || vector;
            let product = new Symbol(0), n = this.elements.length;
            if (n !== V.length) {
                return null;
            }
            do {
                product = add(product, multiply(this.elements[n - 1], V[n - 1]));
            }
            while(--n);
            return product;
        }, undefined, this);
    }

    // Returns the vector product of the vector with the argument
    // Both vectors must have dimensionality 3
    cross(vector) {
        let B = vector.elements || vector;
        if (this.elements.length !== 3 || B.length !== 3) {
            return null;
        }
        let A = this.elements;
        return block('SAFE', function () {
            return new Vector([
                subtract(multiply(A[1], B[2]), multiply(A[2], B[1])),
                subtract(multiply(A[2], B[0]), multiply(A[0], B[2])),
                subtract(multiply(A[0], B[1]), multiply(A[1], B[0]))
            ]);
        }, undefined, this);
    }

    // Returns the (absolute) largest element of the vector
    max() {
        let m = 0, n = this.elements.length, k = n, i;
        do {
            i = k - n;
            if (Math.abs(this.elements[i].valueOf()) > Math.abs(m.valueOf())) {
                m = this.elements[i];
            }
        }
        while(--n);
        return m;
    }
    magnitude() {
        let magnitude = new Symbol(0);
        this.each(function (e) {
            magnitude = add(magnitude, pow(e, new Symbol(2)));
        });
        return sqrt(magnitude);
    }
    // Returns the index of the first match found
    indexOf(x) {
        let index = null, n = this.elements.length, k = n, i;
        do {
            i = k - n;
            if (index === null && this.elements[i].valueOf() === x.valueOf()) {
                index = i + 1;
            }
        }
        while(--n);
        return index;
    }
    text() {
        return this.$text(this);
    }
    toString() {
        return this.text();
    }
    latex(option) {
        let tex = [];
        for (let i = 0; i < this.elements.length; i++) {
            tex.push(LaTeX.latex.call(LaTeX, this.elements[i], option));
        }
        return '[' + tex.join(', ') + ']';
    }
}

/**
 *
 * Checks to see if the object provided is a Vector
 * @param {Object} obj
 */
export function isVector(obj) {
    return (obj instanceof Vector);
}
