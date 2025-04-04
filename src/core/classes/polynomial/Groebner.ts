import { Ordering, Polynomial, PolyType } from "./Polynomial";
import { polyMod, polyDiv, S } from "./utils";


// Groebner Example 1. page 107
// Reduced Groebner page 109
// Refine Groebner page 120
/**
 * NOTE: This function requires some additional inspection and tests to ensure that
 * everything works correctly. Additionally, the Polynomial class needs some serious 
 * optimization.
 * 
 * Calculates the Groebner basis given a set of polynomials. Does not work.
 * 
 * @param F 
 * @param ordering 
 * @param variables 
 * @param reduce 
 * @returns 
 */
export function groebner(F: PolyType[], ordering?: Ordering, variables?: string[], reduce?: boolean) {
    reduce ??= true;
    // The pairs which have already been seen
    const seen: string[] = [];
    // The flag if the entire process should be repeated
    let repeat: boolean;

    const G = Polynomial.polyArraySort(
        F.map((f) => Polynomial.toPolynomial(f, ordering, variables)), ordering);

    do {
        repeat = false;
        for (let i = 0; i < G.length; i++) {
            for (let j = 0; j < G.length; j++) {
                const key = `${i},${j}`;
                const key2 = `${j},${i}`;
                if (!(i === j || seen.includes(key) || seen.includes(key2))) {
                    seen.push(key, key2);
                    const sPoly = S(G[i], G[j]);
                    const r = polyDiv(G, sPoly)[1];
                    if (!r.isZero()) {
                        G.push(new Polynomial(r).gcdFree());
                        repeat = true;
                    }
                }
            }
        }
    }
    while (repeat);

    let gb = new GroebnerBasis(G, ordering || Polynomial.defaultOrdering);

    if (reduce) {
        // TODO: polyArraySort needs work
        // G = reduceGroebnerBasis(G);
        gb = gb.reduceGroebnerBasis();
    }

    return gb;
}

export class GroebnerBasis {
    polys: Polynomial[];
    variables: string[] = [];
    ordering: Ordering;

    // constructor(polys: Polynomial[], ordering?: Ordering, variables?: string[]) {
    constructor(polys: Polynomial[], ordering: Ordering) {
        this.polys = polys;
        this.ordering = ordering;
    }

    /**
     * Interpolates to include f mod g for all polynomials in basis
     * 
     * @returns 
     */
    interpolate() {
        const polys = this.polys;
        const seen: string[] = [];
        const basis = new GroebnerBasis([], this.ordering);
        for (let i = 0; i < polys.length; i++) {
            const f = polys[i];
            for (let j = 0; j < polys.length; j++) {
                // Don't divide by itself
                if (i === j) {
                    continue;
                }
                const g = polys[j];
                if (!g.LM().divides(f.LM())) {
                    let r = polyMod(f, g);
                    if (!r.isZero()) {
                        // REVIEW: Polynomial potentially has a bug with existing polynomials which causes them to not be ordered correctly
                        r = new Polynomial(r.text(), undefined, this.ordering).gcdFree();
                        const rText = r.text();
                        if (!seen.includes(rText)) {
                            seen.push(rText);
                            basis.add(r);
                        }
                    }
                }
            }

            const fText = f.text();
            if (!seen.includes(fText)) {
                basis.add(f);
            }
        }

        return basis;
    }

    /**
     * Ensures that all the polynomial in the basis have the same ordering
     * 
     * @returns 
     */
    order() {
        for (const p of this.polys) {
            p.order(this.ordering);
        }

        return this;
    }

    /**
     * Reduces the Groebner Basis
     * 
     * @returns 
     */
    reduce() {
        const eliminated: number[] = [];
        const reducedBasis = new GroebnerBasis([], this.ordering);
        const polys = this.polys;
        for (let i = 0; i < polys.length; i++) {
            const f = polys[i];
            const fLM = f.LM();
            // Assume the polynomial is unique
            let unique = true;
            for (let j = 0; j < polys.length; j++) {
                // Don't divide by itself and don't re-evaluate eliminated polynomials
                if (i === j || eliminated.includes(j)) {
                    continue;
                }
                const g = polys[j];

                if (g.LM().divides(fLM)) {
                    eliminated.push(i);
                    unique = false;
                    break;
                }
            }

            if (unique) {
                reducedBasis.add(f);
            }
        }

        return reducedBasis;
    }

    /**
     * Calculates the reduced Groebner basis.
     * 
     * @param G 
     * @returns 
     */
    reduceGroebnerBasis() {
        if (this.count() < 2) {
            return new GroebnerBasis(this.polys, this.ordering);
        }

        const minimalBasis = this.interpolate().sortDescending();
        return minimalBasis.reduce();
    }

    /**
     * Checks if a polynomial p is in a Groebner basis
     * 
     * @param G The Groebner basis
     * @param p The polynomial being checked
     * @returns 
     */
    contains(p: Polynomial) {
        for (const f of this.polys) {
            if (f.eq(p)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Adds a polynomial at the given index. If none is provided, then it's just pushed. If there's a polynomial at the given index, it's overridden.
     * 
     * @param p The polynomial being added
     * @param i The index where the polynomial should be added
     * @returns 
     */
    add(p: Polynomial, i?: number) {
        if (i !== undefined) {
            this.polys[i] = p;
        }
        else {
            this.polys.push(p);
        }

        return this;
    }

    /**
     * Get a basis at a given index
     * 
     * @param index 
     * @returns 
     */
    at(index: number) {
        return this.polys.at(index);
    }

    /**
     * Returns the number of elements in the basis
     * 
     * @returns 
     */
    count() {
        return this.polys.length;
    }

    /**
     * Sort the array of polynomials descending by placing first LT with the most variables then Polynomial with the most terms
     * 
     * @returns 
     */
    sortDescending() {
        this.polys.sort(
            (a: Polynomial, b: Polynomial) => {
                const aLength = a.terms.length;
                const bLength = b.terms.length;
                if (aLength === bLength) {
                    for (let i = 0; i < aLength; i++) {
                        const x = a.terms[i];
                        const y = b.terms[i];
                        if (x.length < y.length)
                            return 1;
                        if (x.length > y.length)
                            return -1;
                    }
                }
                return b.terms.length - a.terms.length
            }
        );

        return this;
    }

    text() {
        return this.polys.toString();
    }

    toString() {
        return this.text();
    }

}