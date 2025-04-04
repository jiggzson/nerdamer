import { Expression } from "./Expression";
import { __, NaNError } from "../../errors";


export class CoeffObject {
    coeffs: { [key: string]: Expression } = {};
    variables: string[];

    constructor(variables: string[]) {
        this.variables = variables;
    }

    add(key: string, value: Expression) {
        const e = this.coeffs[key];
        this.coeffs[key] = e ? e.plus(value) : value;
    }

    max() {
        const powers = Object.keys(this.coeffs).map((x) => { return Number(x) });
        return Math.max(...powers);
    }

    /**
     * Loops over each coefficient in the object
     * 
     * @param callback 
     */
    each(callback: (e: Expression, p: string) => void) {
        for (const x in this.coeffs) {
            callback(this.coeffs[x], x);
        }
    }

    toArray(): Expression[];
    toArray(asNumber: false): Expression[];
    toArray(asNumber: true): number[];
    toArray(asNumber: boolean = false) {
        const max = this.max();
        const coeffs: (Expression | number)[] = [];

        if (isNaN(max)) {
            throw new NaNError(__('cannotCreateArrayFromNaN'));
        }

        for (let i = 0; i <= max; i++) {
            let coeff = this.coeffs[i];
            // Fill voids with zero
            if (!coeff) {
                coeff = Expression.Number('0');
            }

            coeffs[i] = asNumber ? Number(coeff) : coeff;
        }

        return coeffs;
    }

    text(formatted: boolean = false) {
        const n = formatted ? '\n' : '';
        const t = formatted ? '    ' : '';
        const values: string[] = [];
        const d = `, ` + n;
        for (const x in this.coeffs) {
            values.push(`${t}${x}: ${this.coeffs[x]}`);
        }

        return `{ ${n}${values.join(d)} ${n}}`;
    }
}
