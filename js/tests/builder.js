var s = "-(b/(4*a))+S-(1/2)*sqrt(-4*S^2-2*p-(q/S))"
        .replace(/a/g, '({0})')
        .replace(/b/g, '({1})')
        .replace(/p/g, '({2})')
        .replace(/q/g, '({3})')
        .replace(/S/g, '({4})');
console.log(s.toString());