function Slice(upper, lower) {
    this.start = upper;
    this.end = lower;
}
;
Slice.prototype.isConstant = function () {
    return this.start.isConstant() && this.end.isConstant();
};
// Slice.prototype.text = function () {
//     return text(this.start) + ':' + text(this.end);
// };

module.exports = Slice;