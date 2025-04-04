import { VECTOR } from "../parser/constants";
import { Base, Scope } from "../common";
import { ParserSupportedType } from "../parser/types";
import { Collection } from "../collection/Collection";

export class Vector implements Base<Vector> {
    dataType = VECTOR;

    /**
     * The list of elements of the vector
     */
    elements: ParserSupportedType[];

    /**
     * Lets the parser know
     */
    isSetOfValues: boolean = true;

    constructor(elements?: ParserSupportedType[] | Collection) {
        if (elements instanceof Collection) {
            this.elements = [];
            for (let i = 0; i < Scope.length; i++) {
                this.elements.push(Scope[i]);
            }
        }
        else if (elements) {
            this.elements = elements;
        }
        else {
            this.elements = [];
        }
    }

    each(callback: (a: ParserSupportedType, b: string | number) => ParserSupportedType): this {
        for (let i = 0; i < this.elements.length; i++) {
            const result = callback(this.elements[i] as ParserSupportedType, i);
            this.elements[i] = result;
        }

        return this;
    }

    eq(V: ParserSupportedType) {
        if (!Vector.isVector(V) || V.elements.length !== this.elements.length) {
            return false;
        }

        for (let i = 0; i < this.elements.length; i++) {
            if (!this.elements[i].eq(V.elements[i])) {
                return false;
            }
        }

        return true;
    }

    /**
     * Creates a copy of the vector
     * 
     * @returns 
     */
    copy() {
        // Create a blank copy
        const copy = new Vector();
        this.each((e, i) => {
            copy.elements[i] = e.copy();
            return e;
        });
        return copy;
    }

    text() {
        return `[${this.elements.map((e) => { return e.text() }).join(', ')}]`;
    }

    toString() {
        return this.text();
    }

    static isVector(obj: unknown): obj is Vector {
        if (obj === undefined) {
            return false;
        }

        return (obj as Vector).dataType === VECTOR;
    }
}
