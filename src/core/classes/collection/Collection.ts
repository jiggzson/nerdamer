import { COLLECTION } from "../parser/constants";
import { Base, Scope } from "../common";
import { ParserSupportedType } from "../parser/types";

export class Collection implements Base<Collection> {
    dataType = COLLECTION;

    /**
     * The list of elements of the vector
     */
    elements: ParserSupportedType[] | Scope = [];

    /**
     * Lets the parser know
     */
    isSetOfValues: boolean = true;

    constructor(elements?: ParserSupportedType[] | Scope) {
        if (elements) {
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

    getElements() {
        return this.elements as ParserSupportedType[];
    }

    eq(V: ParserSupportedType) {
        if (!Collection.isCollection(V) || V.elements.length !== this.elements.length) {
            return false;
        }

        for (let i = 0; i < this.elements.length; i++) {
            const a = this.elements[i] as ParserSupportedType;
            const b = V.elements[i] as ParserSupportedType;
            if (!a.eq(b)) {
                return false;
            }
        }

        return true;
    }

    copy() {
        // Create a blank copy
        const copy = new Collection();
        this.each((e, i) => {
            copy.elements[i] = e.copy();
            return e;
        });
        return copy;
    }

    text() {
        return `(${this.elements.map((e) => { return e.text() }).join(', ')})`;
    }

    toString() {
        return this.text();
    }

    static isCollection(obj: unknown): obj is Collection {
        if (obj === undefined) {
            return false;
        }

        return (obj as Collection).dataType === COLLECTION;
    }
}