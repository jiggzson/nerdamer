import { Decimal } from 'decimal.js';

export function gcd(a: Decimal, b: Decimal) {
    while (!b.equals(0)) {
        const t = a;
        a = b;
        b = t.mod(b);
    }

    return a;
}

export function isEven(n: string | Decimal | number) {
    return Decimal.mod(n, 2).eq(0);
}