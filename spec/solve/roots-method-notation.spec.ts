import nerdamer from '../../src/index';

describe('Polynomial algorithm in Nerdamer notation', () => {
    const input = 'x^5-x+1';

    it('keeps Aberth as the default in direct and parsed roots calls', () => {
        expect(nerdamer.roots(input, 'x').count()).toBe(5);
        expect(nerdamer('roots(x^5-x+1,x)').toString())
            .toBe(nerdamer('roots(x^5-x+1,x,aberth)').toString());
    });

    it('accepts lowercase jenkinstraub via both public entry points', () => {
        const direct = nerdamer.roots(input, 'x', 'jenkinstraub');
        const parsed = nerdamer('roots(x^5-x+1,x,jenkinstraub)');
        expect(direct.count()).toBe(5);
        expect(parsed.toString()).toBe(direct.toString());
    });

    it('rejects unknown method names', () => {
        expect(() => nerdamer.roots(input, 'x', 'unknownsolver')).toThrow();
        expect(() => nerdamer('roots(x^5-x+1,x,unknownsolver)')).toThrow();
    });

    it('rejects unsupported complex coefficients with explicit selection', () => {
        expect(() => nerdamer.roots('(x-(1+i))^3', 'x', 'jenkinstraub')).toThrow();
    });
});
