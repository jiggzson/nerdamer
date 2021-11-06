import {isVector, Vector} from './Vector';

export class Set {
    elements;

    constructor(set) {
        this.elements = [];
        // if the first object isn't an array, convert it to one.
        if (!isVector(set))
            set = Vector.fromArray(arguments);

        if (set) {
            var elements = set.elements;
            for (var i = 0, l = elements.length; i < l; i++) {
                this.add(elements[i]);
            }
        }
    }

    static fromArray(arr) {
        function F(args) {
            return Set.apply(this, args);
        }
        F.prototype = Set.prototype;

        return new F(arr);
    }

    add(x) {
        if (!this.contains(x))
            this.elements.push(x.clone());
    }

    contains(x) {
        for (var i = 0; i < this.elements.length; i++) {
            var e = this.elements[i];
            if (x.equals(e))
                return true;
        }
        return false;
    }

    each(f) {
        var elements = this.elements;
        var set = new Set();
        for (var i = 0, l = elements.length; i < l; i++) {
            var e = elements[i];
            f.call(this, e, set, i);
        }
        return set;
    }

    clone() {
        var set = new Set();
        this.each(function (e) {
            set.add(e.clone());
        });
        return set;
    }

    union(set) {
        var _union = this.clone();
        set.each(function (e) {
            _union.add(e);
        });

        return _union;
    }

    difference(set) {
        var diff = this.clone();
        set.each(function (e) {
            diff.remove(e);
        });
        return diff;
    }

    remove(element) {
        for (var i = 0, l = this.elements.length; i < l; i++) {
            var e = this.elements[i];
            if (e.equals(element)) {
                remove(this.elements, i);
                return true;
            }
        }
        return false;
    }

    intersection(set) {
        var _intersection = new Set();
        var A = this;
        set.each(function (e) {
            if (A.contains(e)) {
                _intersection.add(e);
            }
            ;
        });

        return _intersection;
    }

    intersects(set) {
        return this.intersection(set).elements.length > 0;
    }

    is_subset(set) {
        var elements = set.elements;
        for (var i = 0, l = elements.length; i < l; i++) {
            if (!this.contains(elements[i])) {
                return false;
            }
        }
        return true;
    }

    toString() {
        return '{' + this.elements.join(',') + '}';
    }
}

export function isSet(obj) {
    return (obj instanceof Set);
}
