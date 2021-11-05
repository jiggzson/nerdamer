export class Token {
    //some constants
    static OPERATOR = 'OPERATOR';
    static VARIABLE_OR_LITERAL = 'VARIABLE_OR_LITERAL';
    static FUNCTION = 'FUNCTION';
    static UNIT = 'UNIT';
    static KEYWORD = 'KEYWORD';
    static MAX_PRECEDENCE = 999;

    is_prefix = false;
    type: string;
    value: string;
    column: number = 0
    precedence: number = 0;
    leftAssoc = false;

    static parser: any;

    constructor(node: string, node_type: string, column: number) {
        this.type = node_type;
        this.value = node;
        if (column !== undefined) {
            this.column = column + 1;
        }

        if (node_type === Token.OPERATOR) {
            //copy everything over from the operator
            var operator = Token.parser.getOperator(node);
            for (var x in operator)
                (this as any)[x] = operator[x];

        }
        else if (node_type === Token.FUNCTION) {
            this.precedence = Token.MAX_PRECEDENCE; //leave enough roon
            this.leftAssoc = false;
        }
    }

    toString() {
        if (this.is_prefix) {
            return '`' + this.value;
        }
        return this.value;
    }

}
