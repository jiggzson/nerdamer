export function scientific(symbol, sigfigs) {
    //Just set the flag and keep it moving. Symbol.toString will deal with how to
    //display this
    symbol.scientific = sigfigs || 10;
    return symbol;
}
