import {Symbol} from '../../../Types/Symbol';

export function intersects(set1, set2) {
    return new Symbol(Number(set1.intersects(set2)));
}
