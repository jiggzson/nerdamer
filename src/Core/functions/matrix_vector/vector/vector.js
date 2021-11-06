import {Vector} from '../../../../Parser/Vector';

//the constructor for vectors
export function vector() {
    return new Vector([].slice.call(arguments));
}
