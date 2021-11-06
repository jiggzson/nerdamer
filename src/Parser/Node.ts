/**
 * This is the method that triggers the parsing of the string. It generates a parse tree but processes
 * it right away. The operator functions are called when their respective operators are reached. For instance
 * + with cause this.add to be called with the left and right hand values. It works by walking along each
 * character of the string and placing the operators on the stack and values on the output. When an operator
 * having a lower order than the last is reached then the stack is processed from the last operator on the
 * stack.
 * @param {String} token
 */
import {Token} from './Token';

export class Node {
    type: string;
    value: string;
    left?: Node;
    right?: Node;

    constructor(token: Token | Node) {
        this.type = token.type;
        this.value = token.value;

        //the incoming token may already be a Node type
        if (token instanceof Node) {
            this.left = token.left;
            this.right = token.right;
        }
    }

    toString() {
        let left: string = this.left ? this.left.toString() + '---' : '';
        let right: string = this.right ? '---' + this.right.toString() : '';
        return left + '(' + this.value + ')' + right;
    }

    toHTML(depth: number = 0, indent: number = 4) {
        let tab = function(n: number) {
            return ' '.repeat(indent * n);
        }

        let html = '';
        let left = this.left ? tab(depth + 1) + '<li>\n' + this.left.toHTML(depth + 2, indent) + tab(depth + 1) + '</li> \n' : '';
        let right = this.right ? tab(depth + 1) + '<li>\n' + this.right.toHTML(depth + 2, indent) + tab(depth + 1) + '</li>\n' : '';
        html = tab(depth) + '<div class="' + this.type.toLowerCase() + '"><span>' + this.value + '</span></div>' + tab(depth) + '\n';
        if (left || right) {
            html += tab(depth) + '<ul>\n' + left + right + tab(depth) + '</ul>\n';
        }
        html += '';
        return html;
    }
}
