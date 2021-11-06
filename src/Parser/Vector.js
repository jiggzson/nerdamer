import {block} from '../Core/Utils';
import {Symbol} from '../Core/Symbol';

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
        return block('SAFE', function () {
            return this.$.pow((this.dot(this.clone())), new Symbol(0.5));
        }, undefined, this);
    }

    // Returns true iff the vector is equal to the argument
    eql(vector) {
        var n = this.elements.length;
        var V = vector.elements || vector;
        if (n !== V.length) {
            return false;
        }
        do {
            if (Math.abs(this.$.subtract(this.elements[n - 1], V[n - 1]).valueOf()) > PRECISION) {
                return false;
            }
        }
        while(--n);
        return true;
    }

    // Returns a clone of the vector
    clone() {
        var V = new Vector(),
            l = this.elements.length;
        for (var i = 0; i < l; i++) {
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
        var elements = [];
        this.each(function (x, i) {
            elements.push(fn(x, i));
        });

        return new Vector(elements);
    }

    // Calls the iterator for each element of the vector in turn
    each(fn) {
        var n = this.elements.length, k = n, i;
        do {
            i = k - n;
            fn(this.elements[i], i + 1);
        }
        while(--n);
    }

    // Returns a new vector created by normalizing the receiver
    toUnitVector() {
        return block('SAFE', function () {
            var r = this.modulus();
            if (r.valueOf() === 0) {
                return this.clone();
            }
            return this.map((x) => {
                return this.$.divide(x, r);
            });
        }, undefined, this);
    }

    // Returns the angle between the vector and the argument (also a vector)
    angleFrom(vector) {
        return block('SAFE', function () {
            var V = vector.elements || vector;
            var n = this.elements.length;
            if (n !== V.length) {
                return null;
            }
            var dot = new Symbol(0), mod1 = new Symbol(0), mod2 = new Symbol(0);
            // Work things out in parallel to save time
            this.each((x, i) => {
                dot = this.$.add(dot, this.$.multiply(x, V[i - 1]));
                mod1 = this.$.add(mod1, this.$.multiply(x, x));// will not conflict in safe block
                mod2 = this.$.add(mod2, this.$.multiply(V[i - 1], V[i - 1]));// will not conflict in safe block
            });
            mod1 = this.$.pow(mod1, new Symbol(0.5));
            mod2 = this.$.pow(mod2, new Symbol(0.5));
            var product = this.$.multiply(mod1, mod2);
            if (product.valueOf() === 0) {
                return null;
            }
            var theta = this.$.divide(dot, product);
            var theta_val = theta.valueOf();
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
        var angle = this.angleFrom(vector).valueOf();
        return (angle === null) ? null : (angle <= PRECISION);
    }

    // Returns true iff the vector is antiparallel to the argument
    isAntiparallelTo(vector) {
        var angle = this.angleFrom(vector).valueOf();
        return (angle === null) ? null : (Math.abs(angle - Math.PI) <= PRECISION);
    }

    // Returns true iff the vector is perpendicular to the argument
    isPerpendicularTo(vector) {
        var dot = this.dot(vector);
        return (dot === null) ? null : (Math.abs(dot) <= PRECISION);
    }

    // Returns the result of adding the argument to the vector
    add(vector) {
        return block('SAFE', function () {
            var V = vector.elements || vector;
            if (this.elements.length !== V.length) {
                return null;
            }
            return this.map((x, i) => {
                return this.$.add(x, V[i - 1]);
            });
        }, undefined, this);
    }

    // Returns the result of subtracting the argument from the vector
    subtract(vector) {
        return block('SAFE', function () {
            var V = vector.elements || vector;
            if (this.elements.length !== V.length) {
                return null;
            }
            return this.map((x, i) => {
                return this.$.subtract(x, V[i - 1]);
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
        return block('SAFE', function () {
            var V = vector.elements || vector;
            var product = new Symbol(0), n = this.elements.length;
            if (n !== V.length) {
                return null;
            }
            do {
                product = this.$.add(product, this.$.multiply(this.elements[n - 1], V[n - 1]));
            }
            while(--n);
            return product;
        }, undefined, this);
    }

    // Returns the vector product of the vector with the argument
    // Both vectors must have dimensionality 3
    cross(vector) {
        var B = vector.elements || vector;
        if (this.elements.length !== 3 || B.length !== 3) {
            return null;
        }
        var A = this.elements;
        return block('SAFE', function () {
            return new Vector([
                this.$.subtract(this.$.multiply(A[1], B[2]), this.$.multiply(A[2], B[1])),
                this.$.subtract(this.$.multiply(A[2], B[0]), this.$.multiply(A[0], B[2])),
                this.$.subtract(this.$.multiply(A[0], B[1]), this.$.multiply(A[1], B[0]))
            ]);
        }, undefined, this);
    }

    // Returns the (absolute) largest element of the vector
    max() {
        var m = 0, n = this.elements.length, k = n, i;
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
        var magnitude = new Symbol(0);
        this.each(function (e) {
            magnitude = this.$.add(magnitude, this.$.pow(e, new Symbol(2)));
        });
        return this.$.sqrt(magnitude);
    }
    // Returns the index of the first match found
    indexOf(x) {
        var index = null, n = this.elements.length, k = n, i;
        do {
            i = k - n;
            if (index === null && this.elements[i].valueOf() === x.valueOf()) {
                index = i + 1;
            }
        }
        while(--n);
        return index;
    }
    text(x) {
        return this.$text(this);
    }
    toString() {
        return this.text();
    }
    latex(option) {
        var tex = [];
        for (var i = 0; i < this.elements.length; i++) {
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
