import {Symbol} from '../../Symbol';

export function intersects(set1, set2) {
    return new Symbol(Number(set1.intersects(set2)));
}
