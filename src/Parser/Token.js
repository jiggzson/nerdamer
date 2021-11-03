function Token(parser, node, node_type, column) {
    this.parser = parser;

    this.type = node_type;
    this.value = node;
    if(column !== undefined)
        this.column = column + 1;
    if(node_type === Token.OPERATOR) {
        //copy everything over from the operator

        this.setOperators(node);
    }
    else if(node_type === Token.FUNCTION) {
        this.precedence = Token.MAX_PRECEDENCE; //leave enough roon
        this.leftAssoc = false;
    }
}

module.exports = Token;