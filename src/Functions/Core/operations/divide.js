import {Symbol} from '../../../Types/Symbol';
import {DivisionByZero, err} from '../../../Core/Errors';
import {Matrix} from '../../../Types/Matrix';
import {multiply} from '../index';
import {isMatrix, isSymbol, isVector} from '../../../Core/Utils';

/**
 * Gets called when the parser finds the / operator. See this.add
 * @param {Symbol} a
 * @param {Symbol} b
 * @returns {Symbol}
 */
export function divide(a, b) {
    var aIsSymbol = isSymbol(a),
        bIsSymbol = isSymbol(b);

    if (aIsSymbol && bIsSymbol) {
        //forward to Unit division
        if (a.unit || b.unit) {
            return deps.Unit.divide(a, b);
        }
        var result;
        if (b.equals(0))
            throw new DivisionByZero('Division by zero not allowed!');

        if (a.isConstant() && b.isConstant()) {
            result = a.clone();
            result.multiplier = result.multiplier.divide(b.multiplier);
        }
        else {
            b.invert();
            result = multiply(a, b);
        }
        return result;
    }
    else {
        //******* Vectors & Matrices *********//
        var isVectorA = isVector(a), isVectorB = isVector(b);
        if (aIsSymbol && isVectorB) {
            b = b.map(function (x) {
                return divide(a.clone(), x);
            });
        }
        else if (isVectorA && bIsSymbol) {
            b = a.map(function (x) {
                return divide(x, b.clone());
            });
        }
        else if (isVectorA && isVectorB) {
            if (a.dimensions() === b.dimensions()) {
                b = b.map(function (x, i) {
                    return divide(a.elements[--i], x);
                });
            }
            else
                err('Cannot divide vectors. Dimensions do not match!');
        }
        else {
            var isMatrixA = isMatrix(a), isMatrixB = isMatrix(b);
            if (isMatrixA && bIsSymbol) {
                var M = new Matrix();
                a.eachElement(function (x, i, j) {
                    M.set(i, j, divide(x, b.clone()));
                });
                b = M;
            }
            else if (aIsSymbol && isMatrixB) {
                var M = new Matrix();
                b.eachElement(function (x, i, j) {
                    M.set(i, j, divide(a.clone(), x));
                });
                b = M;
            }
            else if (isMatrixA && isMatrixB) {
                var M = new Matrix();
                if (a.rows() === b.rows() && a.cols() === b.cols()) {
                    a.eachElement(function (x, i, j) {
                        M.set(i, j, divide(x, b.elements[i][j]));
                    });
                    b = M;
                }
                else {
                    err('Dimensions do not match!');
                }
            }
            else if (isMatrixA && isVectorB) {
                if (a.cols() === b.dimensions()) {
                    var M = new Matrix();
                    a.eachElement(function (x, i, j) {
                        M.set(i, j, divide(x, b.elements[i].clone()));
                    });
                    b = M;
                }
                else {
                    err('Unable to divide matrix by vector.');
                }
            }
        }
        return b;
    }
}

