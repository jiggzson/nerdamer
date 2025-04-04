import { DOT, SPACE, PLUS, MINUS, TOKEN } from "./constants"
import { brackets } from "../common";
import { getOperatorSymbolArray } from "../common";

// Additional characters allowed in the parser which haven't already been defined
export const ALLOWED_CHARACTERS: string[] = [];

export const operatorArray = getOperatorSymbolArray();
export const operatorRegex = new RegExp(`[${operatorArray.join('')}]`);
export const bracketRegex = new RegExp(`[${Object.keys(brackets).join('\\')}]`);
export const variableRegex = /[a-z_αAβBγΓδΔϵEζZηHθΘιIκKλΛμMνNξΞoOπΠρPσΣτTυϒϕΦχXψΨωΩ∞]/i;
export const digitRegex = /\d/;
export const dotOrDigitRegex = /\d|\./;


export interface TokenBuffer {
    tokenType: string;
    chars: string[];
    inputString: string;
    scientificNumber: boolean;
    last(): string;
    next(at: number): string;
    prev(at: number): string;
    is(tokenType: string): boolean;
}

export class Token {
    dataType: string;
    type?: string;
    value: string;
    position: number;
    // args?: any;

    public static readonly UNDEFINED = 'UND';
    public static readonly BRACKET = 'BKT';
    public static readonly NUMBER = 'NUM';
    public static readonly OPERATOR = 'OPR';
    public static readonly VARIABLE = 'VAR';
    public static readonly SPACE = 'SPC';
    public static readonly CHARACTER = 'CHR';
    public static readonly FUNCTION = 'FUN';
    public static readonly PREFIX = 'PFX';

    /**
     * Helper function for creating an operator token
     * 
     * @param value 
     * @returns 
     */
    public static O(value: string) {
        return new Token(value, Token.OPERATOR, -1);
    }
    
    /**
     * Helper function for creating an variable token
     * 
     * @param value 
     * @returns 
     */
    public static V(value: string) {
        return new Token(value, Token.VARIABLE, -1);
    }

    constructor(value: string | number | Token, type: string, position: number) {
        this.dataType = TOKEN;
        // Where was start of the token found
        this.position = position;
        // What type of token is it
        this.type = type;
        // The actual contents
        this.value = String(value);
    }

    is(type: string) {
        return this.type === type;
    }

    static getCharType(ch: string, at: number, buffer: TokenBuffer) {
        // If it's a number.
        if (digitRegex.test(ch)) {
            // If the number or underscore comes after a variable then it belongs to the variable
            if (buffer.tokenType === Token.VARIABLE) {
                return Token.VARIABLE;
            }
            return Token.NUMBER;
        }
        else if (ch === SPACE) {
            return Token.SPACE;
        }
        // It's a decimal and belongs to a number.
        else if (ch === DOT) {
            // If the "." comes after a variable then we make it an operator to allow for dot notation at some point
            if (buffer.tokenType === Token.VARIABLE) {
                return Token.OPERATOR;
            }
            return Token.NUMBER;
        }
        // Scientific numbers
        else if ((ch === 'e' || ch === 'E') && buffer.tokenType === Token.NUMBER) {
            const prev = buffer.prev(at);
            const next = buffer.next(at);
            if (next === PLUS || next === MINUS || dotOrDigitRegex.test(prev) && digitRegex.test(next)) {
                buffer.scientificNumber = true;
                return Token.NUMBER;
            }
            return Token.VARIABLE;
        }
        // If it's a letter. 
        // Disable highlighting: https://stackoverflow.com/questions/70290603/strange-border-outline-on-greek-characters-since-v1-63-vs-code
        else if (variableRegex.test(ch) || ALLOWED_CHARACTERS.includes(ch)) {
            return Token.VARIABLE;
        }
        // It's a bracket
        else if (bracketRegex.test(ch)) {
            return Token.BRACKET;
        }
        // It's an operator
        else if (operatorRegex.test(ch)) {
            const last = buffer.last();
            // Bypass the + and - for scientific numbers
            if (buffer.tokenType === Token.NUMBER && (ch === PLUS || ch === MINUS) && (last === 'e' || last === 'E')) {
                return Token.NUMBER;
            }
            return Token.OPERATOR;
        }
        // All else
        else {
            return Token.CHARACTER;
        }
    }

    text() {
        return this.value;
    }

    toString() {
        if (this.type === Token.PREFIX)
            return '`' + this.value;
        return this.value;
    }
} 