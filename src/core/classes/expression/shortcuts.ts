import { Expression } from "./Expression";

export function one() {
    return Expression.Number('1');
}

export function zero() {
    return Expression.Number('0');
}

export function I() {
    return Expression.Img();
}