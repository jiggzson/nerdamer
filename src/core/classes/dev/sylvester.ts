
import {Matrix} from "sylvester";

Matrix.prototype.text = function () {
    const rows: string[] = [];
    this.elements.forEach(element => {
        rows.push(`[${(element.join(','))}]`);
    });
    return `matrix(${rows.join(', ')})`;
}

export {
    Matrix
};