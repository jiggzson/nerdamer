
/**
 * Removes the minus sign from the beginning of the string
 * 
 * @param str 
 * @returns an array with the first item as true if a minus
 * was found and the string minus the minus sign.
 */
function stripSign(str: string): [hasMinus: boolean, remainderOfString: string] {
    // Check if it has a minus sign
    const hasMinus = str.charAt(0) === '-';
    // Remove it if it does
    if (hasMinus || str.charAt(0) === '+') {
        str = str.substring(1);
    }

    return [hasMinus, str];
}

/**
 * Converts a string from scientific notation form to decimal form
 * 
 * @param str 
 * @returns 
 */
export function scientificToDecimal(str: string): string {
    let isNegative: boolean;
    // Remove the sign by slicing the string
    [isNegative, str] = stripSign(str)
    // Split it into coefficient and exponent
    const [c, e] = str.toLowerCase().split('e');
    // Split the coefficient into the whole and decimal portion
    // eslint-disable-next-line prefer-const
    let [w, d] = c.split('.');
    // Provide and empty sting for safety if in the form n(e)n
    d = d || '';
    // The total length of the string
    const length = w.length + (d ? d.length : 0);
    // The total string minus the dot
    const numString = w + d;
    // If it's small then we need to calculate the leading zeros
    // The shift of the decimal place to the left
    const dotLocation = w.length + Number(e);
    // Is the dot needed or not
    const dot = dotLocation === length ? '' : '.';

    let value: string;
    if (dotLocation <= 0) {
        // Join the value but pad after the dot with zeroes
        value = `0${dot}${'0'.repeat(Math.abs(dotLocation))}${numString}`;
    }
    else if (dotLocation > length) {
        value = `${numString}${'0'.repeat(Math.abs(dotLocation - length))}`;
    }
    else {
        value = `${numString.substring(0, dotLocation)}${dot}${numString.substring(dotLocation)}`;
    }

    return isNegative ? '-' + value : value;
}

/**
 * Splits at the decimal but ensures that array length is always 2
 * 
 * @param str 
 * @returns 
 */
export function decimalSplit(str: string) {
    const parts = str.split('.');
    if (parts.length === 1) {
        parts.push('');
    }

    return parts;
}

/**
 * A helper function to replace multiple occurrences in a string. Tag the replacement
 * with a double curly.
 * @example format('Hi. My name is {{name}}.', {name: 'John Doe'})
 * 
 * @param str 
 * @param replacements 
 * @returns 
 */
export function format(str, replacements: {[replacement: string]: string} | string[]) {
    const replace = function(str: string, replacement: string, newValue: string) {
        return str.replace(new RegExp(`{{${replacement}}}`, 'g'), newValue);
    }

    if(Array.isArray(replacements)) {
        for(let i=0; i<replacements.length; i++) {
            str = replace(str, String(i), replacements[i]);
        }
    }
    else {
        for(const x in replacements) {
            str = replace(str, x, replacements[x]);
        }
    }

    return str;
}

