module.exports = function(core) {
    const PL = core.PL;

    core.Symbol.prototype.hasTrig = function () {
        return this.containsFunction(['cos', 'sin', 'tan', 'cot', 'csc', 'sec']);
    };

    core.Symbol.prototype.hasNegativeTerms = function () {
        if (this.isComposite()) {
            for (let x in this.symbols) {
                let sym = this.symbols[x];
                if (sym.group === PL && sym.hasNegativeTerms() || this.symbols[x].power.lessThan(0))
                    return true;
            }
        }
        return false;
    };
}
