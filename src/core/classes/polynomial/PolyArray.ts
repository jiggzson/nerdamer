import { Rational } from "../parser/operations";
import { Polynomial, Term } from "./Polynomial";

export class PolyArrayTerm {
    multidegArray: number[];
    coeff: Rational;

    constructor(t: Term) {
        this.multidegArray = t.getMultidegArray().map((x) => Number(x));
        this.coeff = t.getExpression().getMultiplier();
    }

    text() {
        return `(${this.coeff.text()})[${this.multidegArray.join(', ')}]`;
    }
}

export class PolyArray {
    terms: PolyArrayTerm[] = [];
    polynomial: Polynomial;

    constructor(p: Polynomial) {
        this.polynomial = p;
        
        for (const term of p.terms) {
            this.terms.push(new PolyArrayTerm(term));
        }
    }

    sort() {
        this.terms.sort((a: PolyArrayTerm, b: PolyArrayTerm)=>{
            for(let i=0; i<a.multidegArray.length; i++) {
                const x = a.multidegArray[i];
                const y = b.multidegArray[i];
                if(x !== y) {
                    return x-y;
                }
            } 
            return 1;
        });

        return this;
    }

    text(delimiter: string = ' ') {
        return this.terms.map((x)=>x.text()).join(delimiter);
    }
}