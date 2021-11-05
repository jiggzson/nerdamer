/**
 * Class used to collect arguments for functions
 * @returns {Parser.Collection}
 */
export class Collection {
    elements: any[];
    /// injected dependency
    $pretty_print!: (array: any) => string;

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
        return this.$pretty_print(this.elements);
    }
}
