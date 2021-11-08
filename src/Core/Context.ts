export class Context<T> {
    private currentData?: T;
    private stack: T[] = [];

    constructor(initialData?: T) {
        this.currentData = initialData;
        if (initialData) {
            this.stack.push(initialData);
        }
    }

    with(data: T, block: (data: T) => void) {
        this.#push(data);
        block(data);
        this.#pop();
    }

    get(): T {
        if (!this.currentData) {
            throw new Error(`Context stack corrupted`);
        }
        return this.currentData;
    }

    #push(data: T) {
        this.stack.push(data);
        this.currentData = data;
    }

    #pop() {
        if (this.stack.length > 0) {
            this.currentData = this.stack.pop()!
        }
    }
}
