var examples = [ 
    'partfrac((2x-1)/(x^2-x-6),x)',
    'partfrac((3x+11)/(x^2-x-6),x)',
    'partfrac((x^2+4)/(3x^3+4x^2-4x),x)',
    'factor(cos(x)^6+3*b*cos(x)^4+3*a^2*cos(x)^4+3*b^2*cos(x)^2+6*a^2*b*cos(x)^2+3*a^4*cos(x)^2+b^3+3*a^2*b^2+3*a^4*b+a^6)',
    'factor(2*x^4-6*x^3-18*x^2-6*x-20)',
    'factor(x^4-1)',
    'solve(4*x^3-2x+11,x)',
    'solve(x^3-10x^2+31x-30,x)',
    'solveEquations([10-x=y-11, x+2y=20])',
    'integrate(sin(x), x)',
    'integrate(2*x^2+x, x)',
    'integrate(log(x), x)',
    'integrate(sqrt(x), x)',
    'integrate(asin(a*x), x)',
    'integrate(x*e^x, x)',
    'integrate(x^3*log(x), x)',
    'integrate(x^2*sin(x), x)',
    'integrate(sin(x)*log(cos(x)), x)',
    'integrate(q/((2-3*x^2)^(1/2)), x)',
    'integrate(1/(a^2+x^2), x)',
    'integrate(11/(a+5*r*x)^2,x)',
    'integrate(cos(x)*sin(x), x)',
    'integrate(x*cos(x)*sin(x), x)',
    'integrate(t/(a*x+b), x)',
    'integrate(5*x*e^(-8*a*x^2),x)',
    'integrate(x^2*sin(x),x)',
    'integrate(8*tan(b*x)^2,x)',
    'integrate(sec(a*x)^3,x)',
    'integrate(sec(a*x)*tan(a*x),x)',
    'diff((e^x*sqrt(x)-e^x/(2*sqrt(x)))/x, x)',
    'diff(cos(x),x)',
    'diff(log(x),x)',
    'diff(tan(x),x)',
    'diff(4*tan(x)*sec(x),x)',
    'diff(sqrt(7),x)',
    'diff(x^2,x)',
    'diff(2*x^2+4,x)',
    'diff(sqrt(x)*x,x)',
    'diff(sqrt(x)-1/sqrt(x),x)',
    'diff(x^2/3-3/x^2,x)',
    'diff(sqrt(x)*(x^2+1),x)',
    'diff(e^x/(e^x-1),x)',
    'diff(e^x/x,x)',
    'diff(tan(x)*log(1/cos(x)),x)',
    'diff((2*x)^(e),x)',
    'diff(2*cos(x)*log(x),x)',
    'diff(x*cos(x)^log(x),x)',
    'diff(cos(2*x),x)',
    'diff(cos(x)*tan(x),x)',
    'diff(sec(sqrt(cos(x^(4/5))^2)),x)',
    'diff(6*log(x)^(3*log(x^2)),x)',
    'diff(sinh(x^2)^cos(x),x)',
    'diff(tan(x)*tanh(x),x)',
    'diff(4*x*tan(x)*7*tanh(x),x)',
    'diff(y*tan(y)*7*tanh(y),x)',
    'diff(yx*tan(y)*7*tanh(y),x)',
    'sum(x^2+x, x, 0, 10)',
    'sum(x^2*z^2+x*y-z+1, x, 0, 10)',
    'sum(x^2*z^2+x*y-z+1, z, 0, 10)',
    'gcd(5*x^6+5*x^5+27*x^4+27*x^3+28*x^2+28*x, 5*x^3+7*x)',
    'gcd(2*x^2+2*x+1,x+1)',
    'gcd(x^2+2*x+1,x+1)',
    'gcd(6*x^9+24*x^8+15*x^7+6*x^2+24*x+15, (2*x^2+8*x+5))',
    'gcd(x^8+4*x^7+4*x^6+3*x^5+12*x^4+12*x^3, (x^3+3))',
    'gcd(6*x^9+24*x^8+15*x^7+6*x^2+24*x+15, x^7+1)',
    'gcd(7*x^4+7*x^3+4*x^2+5*x+1, 21*x^6+47*x^4+80*x^3+20*x^2+49*x+11)',
    'div(x^2+5, cos(x)-1)',
    'div(-x^2*y-y+4*a*x^2+t+4*a+6*b, x^2+1)',
    'div(15*x^9-25*x^7-35*x^6+6*x^5+3*x^4-10*x^3-19*x^2-7*x+y, 3*x^3-5*x-7)',
    'div(x^2+2*x+1+u, x+1)',
    'div(y^3+x*y^2+x^2*y+x^3+x, x+y)',
    'div(b*y*z-a*x*z+4*a*b*y^4-4*a^2*x*y^3+b^2*y-a*b*x, 4*y^3*a+z+b)',
    'abs(5*x^2)-x+11',
    'cos(x)^2+cos(x)+1',
    'expand((9*y*x+1)^2)',
    'expand((x+5)*(x-3)-x^2)',
    'expand((9*y*x+1)^3)',
    'expand(x*(x+1))',
    'expand(x*(x+1)^5)',
    'expand((x*y)^x+(x*y)^2)',
    'expand((3*x+4*y)^4)',
    'cross([a, x, 1],[b, y, 2])',
    'cross([1,2,3],[5,6,7])',
    'dot([1,2,3],[5,6,7])',
    'dot([a, x, 1],[b, y, 2])',
    'imatrix(3)',
    'determinant(matrix[7,1],[11,2])',
    'sqcomp(x^2-10*x+26)',
    'line([-1,2], [4, 12])',
    'invert(matrix([a^2, b], [b^2, 4]))*matrix([3],[4])',
    'coeffs(a*x^2+b*x+c,x)',
];



var parsed = [], //the parsed expression container
    TeX = [], //the generated LaTeX container
    parsedTeX = [], //the parsed LaTeX container
    benchmarks = {}, //the benchmark time container
    l = examples.length,
    parsing = 'parsing', //the name for the parsing time in the benchmark container
    LaTeX = 'LaTeX',//the name for the LaTeX  time in the benchmark container
    KaTeX = 'KaTeX';//the name for the LaTeX  time in the benchmark container

var benchmark = function(callback, name) {
    var start = new Date();
    callback.call();
    var end = new Date();
    benchmarks[name] = Math.abs(end.getTime() - start.getTime());
};

//benchmark the parsing of the expressions and place them in the parsed container
benchmark(function() {
    for(var i=0; i<l; i++) 
        parsed.push(nerdamer(examples[i]));
}, parsing);
//benchmark how long it took for generation of LaTeX
benchmark(function() {
    for(var i=0; i<l; i++) {
        TeX.push(parsed[i].toTeX());
    }
}, LaTeX);
//benchmark how long it took for generation of LaTeX
benchmark(function() {
    for(var i=0; i<l; i++) 
        parsedTeX.push(katex.renderToString(TeX[i]));
}, KaTeX);

$(function() {
    $('.number-expressions').html(l);
    $('.'+parsing).html(benchmarks[parsing]+' ms');
    $('.'+LaTeX).html(benchmarks[LaTeX]+' ms');
    $('.'+KaTeX).html(benchmarks[KaTeX]+' ms');
    
    var table = $('#result-table');
    for(var i=0; i<l; i++) {
        var row = $('<div/>', {class: 'example'})
                .append($('<div class="expression-raw">'+examples[i]+'</div>'))
                .append($('<div class="expression-parsed">'+parsed[i].toString()+'</div>'))
                .append($('<div/>', {class: "parsed-tex"}).html(parsedTeX[i]));
        table.append(row);
    }
    
    $('#calculating').hide();
    $('.stats').show();
});