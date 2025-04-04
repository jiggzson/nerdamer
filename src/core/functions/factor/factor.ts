import { Expression } from "../../classes/parser/operations";
import { Rational } from "../../classes/parser/operations";
import { sum, product, toFactor } from "../../../math/utils";
import { one } from "../../classes/expression/shortcuts";

export function sumFactorObject(x: Expression) {
    // The set of elements containing all common terms
    let commonElements: Expression[] = [];
    const remainder: Expression[] = [];
    const multipliers: Rational[] = [];

    let retval;

    if (x.isSum()) {
        // The array in which all the products will be stored.
        const products: Expression[] = [];
        const componentsArray = x.componentsArray();
        // Split up the sum into terms and separate out the remainder.
        componentsArray.forEach((x) => {
            const target = x.isSum() ? remainder : products;
            target.push(x);
        });

        // Convert them to arrays and sort the arrays longest to shortest
        const productsArrays = products.map((x) => {
            multipliers.push(x.getMultiplier());
            return x.componentsArray();
        }).sort((a, b) => {
            return a.length - b.length;
        });

        // Assume the common elements to be the shortest array
        commonElements = productsArrays[0];

        // Loop through the remaining component arrays and compare. The elements must occur in both arrays.
        // Additionally, the smaller of the two is the one that is kept
        for (const componentsArray of productsArrays) {
            const filtered: Expression[] = [];
            // Compare the elements
            for (const c of commonElements) {
                for (const e of componentsArray) {
                    if (e.value === c.value) {
                        filtered.push(e.getPower().gt(c.getPower()) ? c : e);
                    }
                }
            }

            // Update the common elements with the new set. This list should be equal or less in length.
            commonElements = filtered;
        }

        // The factor is just the product of the common terms
        const factor = product(...commonElements).times(Rational.GCD(...multipliers));

        // If the factor is one then there's nothing left to do so just return the expression
        if (!factor.isOne()) {
            // We have now calculated the common factor and we can now update the terms
            const reducedExpression = toFactor(sum(...products.map((e) => {
                return e.div(factor);
            })));

            retval = {
                reduced: reducedExpression,
                factor: factor.times(x.getMultiplier()),
                remainder: sum(...remainder),
                power: x.getPower()
            }
        }
    }

    retval = retval || {
        reduced: x,
        factor: one(),
        remainder: Expression.Number('0'),
        power: one()
    };

    return retval;
}

export function sumFactor(x: Expression) {
    const o = sumFactorObject(x);
    let retval = (o.factor.isOne() ? o.reduced : toFactor(o.reduced).times(o.factor)).plus(o.remainder);
    retval = Expression.setPower(retval, o.power);
    return retval;
}