import {text} from '../Core/Text';

interface Constant {
    isConstant: () => boolean;
}

export class Slice {
    /// injected dependency

    start: Constant;
    end: Constant;

    constructor(upper: Constant, lower: Constant) {
        this.start = upper;
        this.end = lower;
    }

    isConstant() {
        return this.start.isConstant() && this.end.isConstant();
    }

    text() {
        return text(this.start) + ':' + text(this.end);
    }
}
