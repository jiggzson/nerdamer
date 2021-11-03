/**
 * Class used to collect arguments for functions
 * @returns {Parser.Collection}
 */
function Collection() {
    this.elements = [];
}
Collection.prototype.append = function (e) {
    this.elements.push(e);
};
Collection.prototype.getItems = function () {
    return this.elements;
};
Collection.create = function (e) {
    var collection = new Collection();
    if (e) {
        collection.append(e);
    }
    return collection;
};

module.exports = Collection;