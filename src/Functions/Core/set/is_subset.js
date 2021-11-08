import {Symbol} from '../../../Types/Symbol';

export function is_subset(set1, set2) {
    return new Symbol(Number(set1.is_subset(set2)));
}
