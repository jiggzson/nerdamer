/**
 * Class used to collect arguments for functions
 * @returns {Parser.Collection}
 */
import {pretty_print} from '../Core/Utils';

export class Collection {
    elements: any[];

    constructor() {
        this.elements = [];
    }

    static create(e: any) {
        const collection = new Collection();
        if (e) {
            collection.append(e);
        }
        return collection;
    }

    append(e: any) {
        this.elements.push(e);
    }

    getItems() {
        return this.elements;
    }

    toString() {
        return pretty_print(this.elements);
    }
}
