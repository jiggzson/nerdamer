interface Constant {
    isConstant: () => boolean;
}

export class Slice {
    /// injected dependency
    private $text!: (array: any) => string;

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
        return this.$text(this.start) + ':' + this.$text(this.end);
    }
}
