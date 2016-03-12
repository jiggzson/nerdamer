var test = require('./test');

var values = {
    x: 2.1,
    y: 3.3,
    z: 1,
    a: 7.42
};

var cases = {
    '((((((1+1))))))': {
        expected: '2',
        number_value: 2
    },
    '((((((1+1))+4)))+3)': {
        expected: '9',
        number_value: 9
    },
    '1+1': {
        expected: '2',
        number_value: 2
    },
    '4^2': {
        expected: '16',
        number_value: 16
    },
    '2+(3/4)': {
        expected: '11/4',
        number_value: 2.75
    },
    '2/3+2/3': {
        expected: '4/3',
        number_value: 1.3333333333333333
    },
    'x+x': {
        expected: '2*x',
        number_value: 4.2
    },
    'x+1': {
        expected: '1+x',
        number_value: 3.1
    },
    'x+y': {
        expected: 'x+y',
        number_value: 5.2
    },
    '(x+1)+(1+x)': {
        expected: '2*(1+x)',
        number_value: 6.2
    },
    '(x+y)+(a+x)': {
        expected: '2*x+a+y',
        number_value: 14.92
    },
    '7*(x+y)+2*(a+x)': { //
        expected: '2*a+7*y+9*x',
        number_value: 56.84,
        note: 'This test is a huge compromise. Do I expand as much as possible or '+
                     'do I simplify only at the highest level?'
    },
    '(x+x^2)+x': {
        expected: '2*x+x^2',
        number_value: 8.61
    },
    '(x+1)+4': {
        expected: '5+x',
        number_value: 7.1
    },
    'x+x+1+x': {
        expected: '1+3*x',
        number_value: 7.3
    },
    '(x+1)+(8+y)': {
        expected: '9+x+y',
        number_value: 14.4
    },
    '(x+1)+(a+y)': {
        expected: '1+a+x+y',
        number_value: 13.82
    },
    '(x+x^2)+(x^3+x)': {
        expected: '2*x+x^2+x^3',
        number_value: 17.871
    },
    '3*(x+x^2)+5*(x^3+x)': {
        expected: '3*x^2+5*x^3+8*x',
        number_value: 76.335
    },
    'x^y+x^y': {
        expected: '2*x^y',
        number_value: 23.13948390048293
    },
    //power
    '2^(1/2)': {
        expected: 'sqrt(2)',
        number_value: 23.13948390048293
    },
    '(2/5)^(1/2)': {
        expected: 'sqrt(2)*sqrt(5)^(-1)',
        number_value: 0.6324555320336759
    },
    '2^(1/2)+sqrt(2)': {
        expected: '2*sqrt(2)',
        number_value: 2.8284271247461903
    },
    'sqrt(2)*sqrt(2)': {
        expected: '2',
        number_value: 2
    },
    'x*x': {
        expected: 'x^2',
        number_value: 4.41
    },
    'sqrt(1/2)': {
        expected: 'sqrt(2)^(-1)',
        number_value: 0.7071067811865476
    },
    'sqrt(1+x)^(4*x)': {
        expected: '(1+x)^(2*x)',
        number_value: 115.80281433592612
    },
    'sqrt(2)^2': {
        expected: '2',
        number_value: 2
    },
    '6*sqrt(2)^4': {
        expected: '24',
        number_value: 24
    },
    'sqrt(x^2)*sqrt(x^4)': {
        expected: 'abs(x)*x^2',
        number_value: 9.261
    },
    'sqrt((5/2)*x^10)': {
        expected: 'abs(x)*sqrt(2)^(-1)*sqrt(5)*x^4',
        number_value: 64.5753067708499
    },
    '(sqrt((5/2)*x^10))*-sqrt(2)': {
        expected: '-abs(x)*sqrt(5)*x^4',
        number_value: -91.3232746297487,
        note: 'The function is supposed to contain a sqrt(2) which has to be removed but retain the sign'
    },
    'y*tan(x)*tan(x)': {
        expected: 'tan(x)^2*y',
        number_value: 9.647798160932233
    },
    '5*(x+x^2)*(2*(x+x^2)^x)': {
        expected: '10*(x+x^2)^(1+x)',
        number_value: 3327.3697542441078
    },
    '2*(1+x)*3*(z+x)^x*8': {
        expected: '48*(1+x)*(x+z)^x',
        number_value: 1601.2623349876335
    },
    '(x+1)^x*(z+1)^z*(x+1)': {
        expected: '(1+x)^(1+x)*(1+z)^z',
        number_value: 66.71926395781806
    },
    '2*cos(x)+cos(x)': {
        expected: '3*cos(x)',
        number_value: -1.5145383137995727
    },
    '2*cos(x)+cos(x+8+5*x)': {
        expected: '2*cos(x)+cos(6*x+8)',
        number_value: 0.18041483808986802
    },
    'x^2+2*cos(x)+cos(x+8+5*x)+4*x^2': {
        expected: '2*cos(x)+5*x^2+cos(6*x+8)',
        number_value: 22.230414838089867
    },
    'x-y': {
        expected: '-y+x',
        number_value: 1.1999999999999997
    },
    'x-x': {
        expected: '0',
        number_value: 0
    },
    '3*(x^2+1)^x*(2*(x^2+1))': {
        expected: '6*(1+x^2)^(1+x)',
        number_value: 1353.4633360721534
    },
    '2*(x+x^2)+1': {
        expected: '1+2*x+2*x^2',
        number_value: 14.02
    },
    '2*(x+x^2)+3*(x^2+x^3)': {
        expected: '2*x+3*x^3+5*x^2',
        number_value: 54.033
    },
    '2*(x+x^2)+3*(x^2+x^3)^2': {
        expected: '2*x+2*x^2+3*(x^2+x^3)^2',
        number_value: 573.7087230000001
    },
    '2*(x+x^2)+3*(x^2+x^3)^2+x': {
        expected: '2*x^2+3*x+3*(x^2+x^3)^2',
        number_value: 575.8087230000001
    },
    '2*(x+x^2)+3*(x^2+x^3)^2+(x^2+x)': {
        expected: '3*(x^2+x^3)^2+3*x+3*x^2',
        number_value: 580.2187230000001
    },
    '2*(x+x^2)^2+3*(x^2+x)^2': {
        expected: '5*(x+x^2)^2',
        number_value: 32.55
    },
    '2*(x+x^2)^2+2*(x+x^2)^3+4*(x+x^2)^2': {
        expected: '2*(x+x^2)^3+6*(x+x^2)^2',
        number_value: 806.069502
    },
    '2*x^2+3*x+y+y^2': {
        expected: '2*x^2+y^2+3*x+y',
        number_value: 29.31
    },
    '(y+y^2)^6+y': {
        expected: '(y+y^2)^6+y',
        number_value: 8163841.19820367
    },
    '2*(x+x^2)+(y+y^2)^6+y': {
        expected: '(y+y^2)^6+2*x+2*x^2+y',
        number_value: 8163854.218203679
    },
    '2*(x+x^2)+4': {
        expected: '2*x+2*x^2+4',
        number_value: 17.02
    },
    '2*(x+x^2)+48*x*y': {
        expected: '2*(x+x^2)+48*x*y',
        number_value: 345.66 
    },
    '2*(x+x^2)+(48+x+2*y)': {
        expected: '2*x^2+3*x+2*y+48',
        number_value: 69.72 
    },
    'cos(x)+(x+x^2+x)': {
        expected: '2*x+cos(x)+x^2',
        number_value: 8.105153895400228 
    },
    'cos(x)+(x+x^2+7)': {
        expected: '7+cos(x)+x+x^2',
        number_value: 13.005153895400229 
    },
    '(x^2+1)-1': {
        expected: 'x^2',
        number_value: 4.41
    },
    '(x^2+1)-1+x+x^3+x': {
        expected: '2*x+x^2+x^3',
        number_value: 17.871
    },
    '5+(x^2+y+1)+(x+y+15)': {
        expected: '2*y+21+x+x^2',
        number_value: 34.11
    },
    '(x^2+y+1)+(x+y+15)+(x^2+y+1)': {
        expected: '17+2*x^2+x+3*y',
        number_value: 37.82
    },
    '(x^2+y+1)+(x+x^2)': {
        expected: '1+2*x^2+x+y',
        number_value: 15.22 
    },
    '(1+(1+x)^2)': {
        expected: '(1+x)^2+1',
        number_value: 10.61
    },
    '(x+x)^x': {
        expected: '2^x*x^x',
        number_value: 20.362144253523596
    },
    '1/4*2^x*x^x': {
        expected: '(1/4)*2^x*x^x',
        number_value: 5.090536063380899
    },
    'x^2+x-x^y+x': {
        expected: '-x^y+2*x+x^2',
        number_value: -2.9597419502415643 
    },
    'x^x+x^x-1-2*x^x': {
        expected: '-1',
        number_value: -1
    },
    'x^x+x^x-1-2*x^x+2*y+1-2*y': {
        expected: '0',
        number_value: 0
    },
    '(x+1)-x*y-5+2*x*y': {
        expected: '-4+x+x*y',
        number_value: 5.03
    },
    '(2*x-y+7-x+y-x-5)*2+15/3': {
        expected: '9',
        number_value: 9
    },
    '6.5*2': {
        expected: '13',
        number_value: 13
    },
    'x*2': {
        expected: '2*x',
        number_value: 4.2
    },
    'x*y': {
        expected: 'x*y',
        number_value: 6.93
    },
    'cos(x)*cos(x)': {
        expected: 'cos(x)^2',
        number_value: 0.25486958932951276
    },
    '(x+x^2)*(x+x^2)': {
        expected: '(x+x^2)^2',
        number_value: 42.3801
    },
    '(x+x^2)*2*(x+x^2)': {
        expected: '2*(x+x^2)^2',
        number_value: 84.7602
    },
    '(x*y)*(x*y)': {
        expected: '(x*y)^2',
        number_value: 84.7602
    },
    '(x*y)*(x*z)': {
        expected: 'x^2*y*z',
        number_value: 14.553
    },
    '(x+y)*(x+y)': {
        expected: '(x+y)^2',
        number_value: 29.16
    },
    '(x+y)*(y+x)': {
        expected: '(x+y)^2',
        number_value: 29.16
    },
    '(1+x)*(x+y)': {
        expected: '(1+x)*(x+y)',
        number_value: 16.74
    },
    'x*y*x': {
        expected: 'x^2*y',
        number_value: 14.553
    },
    'x*y*x/x': {
        expected: 'x*y',
        number_value: 6.93
    },
    'x*y*x/x/x/y': {
        expected: '1',
        number_value: 1
    },
    'x^x*cos(x)*sin(x)/x': {
        expected: '(x)^(-1+x)*cos(x)*sin(x)',
        number_value: -0.985635592498768 
    },
    '(x+x^2)^x*x': {
        expected: '(x+x^2)^x*x',
        number_value: 107.33450820142276 
    },
    '(x+x^2)^x*(x+x^x)': {
        expected: '(x+x^2)^x*(x+x^x)',
        number_value: 350.09644568327695 
    },
    '(x+x^2)^x*(x+x^2)': {
        expected: '(x+x^2)^(1+x)',
        number_value: 332.7369754244108 
    },
    '(x+x^2)^2*x': {
        expected: '(x+x^2)^2*x',
        number_value: 88.99821 
    },
    '(z+z^2)^x*(x+y^2+1)': {
        expected: '(1+x+y^2)*(z+z^2)^x',
        number_value: 59.97644296353172 
    },
    'tan(x)*tan(x)': {
        expected: 'tan(x)^2',
        number_value: 2.923575200282259 
    },
    '(x+1)/(x+1)': {
        expected: '1',
        number_value: 1
    },
    'x*y*z/(x*y*z)': {
        expected: '1',
        number_value: 1
    },
    'x^y/x^y': {
        expected: '1',
        number_value: 1
    },
    '5*x^y/x^y': {
        expected: '5',
        number_value: 5
    },
    '(x+x^6)^y/(x+x^6)^y': {
        expected: '1',
        number_value: 1
    },
    '2^y*2^y': {
        expected: '(2)^(2*y)',
        number_value: 97.00586025666554
    },
    '2^x': {
        expected: '2^x',
        number_value: 4.28709385014522
    },
    '((x^3+x)^x*(x^2+x)^x+1)*x': {
        expected: '((x+x^2)^x*(x+x^3)^x+1)*x',
        number_value: 17667.120525566257
    },
    'x^x': {
        expected: 'x^x',
        number_value: 4.749638091742232
    },
    'x^(x)': {
        expected: 'x^x',
        number_value: 4.749638091742232
    },
    'y^y^3': {
        expected: 'y^y^3',
        number_value: 4303635263255155700
    },
    'sqrt(9)': {
        expected: '3',
        number_value: 3
    },
    'sqrt(-9)': {
        expected: '3*i',
        number_value: '3*i'
    },
    'sqrt(-x)': {
        expected: 'sqrt(-x)',
        number_value: 'sqrt(-x)'
    },
    'sqrt(-x)*sqrt(-x)': {
        expected: '-x',
        number_value: -2.1
    },
    'sqrt(-x)*sqrt(-x)+4*x': {
        expected: '3*x',
        number_value: 6.3
    },
    '4*x^2': {
        expected: '4*x^2',
        number_value: 6.3
    },
    'sqrt(4*x^2)': {
        expected: '2*abs(x)',
        number_value: 4.2
    },
    '2*cos(x)+5*cos(2*x)': {
        expected: '2*cos(x)+5*cos(2*x)',
        number_value: 2.4750626589174187
    },
    '2*cos(x)*5*cos(2*x)': {
        expected: '10*cos(2*x)*cos(x)',
        number_value: 3.0431891166997898
    },
    '(8*x)^(2/3)': {
        expected: '4*x^(2/3)',
        number_value: 6.559531991200376
    },
    '(y^3+2)/(z^4*(y^3/2))^2*cos(x)*sqrt(x)': {
        expected: '4*(2+y^3)*(y^3*z^4)^(-2)*cos(x)*sqrt(x)',
        number_value: -0.08596229339343128
    },
    '2*x^4*(1+log(x)^2)-(-x^4)': {
        expected: '2*(1+log(x)^2)*x^4+x^4',
        number_value: 79.75553102441694
    },
    '(x^6)^(1/4)': {
        expected: 'abs(x)^(3/2)',
        number_value: 3.0431891166997898
    },
    'i*i': {
        expected: '-1',
        number_value: -1
    },
    'i*8*i': {
        expected: '-8',
        number_value: -8
    },
    'i^(2/3)': {
        expected: '-1',
        number_value: -1
    },
    '(256*i)^(1/8)': {
        expected: '2*(-1)^(1/16)',
        number_value: '2*(-1)^(1/16)'
    },
    '2*x*(4^(1/3))^3': {
        expected: '8*x',
        number_value: 16.8
    },
    '6*(4^(1/3)*4^(2/3))': {
        expected: '24',
        number_value: 24
    },
    '(5*(4^(1/3)))^3': {
        expected: '500',
        number_value: 500
    },
    '2*x*(5*(4^(1/3)))^3': {
        expected: '1000*x',
        number_value: 2100
    },
    'y^y^y': {
        expected: 'y^y^y',
        number_value: 4.568487550255984e+26
    },
    '(x^4)^(1/4)': {
        expected: 'abs(x)',
        number_value: 2.1
    },
    'x/cos(x)*cos(x)': {
        expected: 'x',
        number_value: 2.1
    },
    '(-2*x)^2': {
        expected: '4*x^2',
        number_value: 17.64
    },
    '-4*x^3--x^3+x^2-(-2*x)^2+y': {
        expected: '-3*x^2-3*x^3+y',
        number_value: -37.713
    },
    '2*x/x': {
        expected: '2',
        number_value: 2
    },
    '2*(tan(x)+tan(2*x)+7)-6*tan(x)': {
        expected: '-4*tan(x)+14+2*tan(2*x)',
        number_value: 24.394945720635487
    },
    '(x^2*y)^2': {
        expected: '(x^2*y)^2',
        number_value: 211.789809
    },
    '((3+y)*2-(cos(x)*4+z))': {
        expected: '-4*cos(x)-z+2*y+6',
        number_value: 13.619384418399054
    },
    'i/i': {
        expected: '1',
        number_value: 1
    },
    '(1/i)*i': {
        expected: '1',
        number_value: 1
    },
    'cos(x^2)*cos(x^2)^x': {
        expected: 'cos(x^2)^(1+x)',
        number_value: '0.02339774318212161*(-1)^3.1'
    },
    '(x+1)^(z+1)*(1+x)^(1+z)': {
        expected: '(1+x)^(2*(1+z))',
        number_value: 92.3521
    },
    '(x+1)^(z+1)*(1+x)^4': {
        expected: '(1+x)^(5+z)',
        number_value: 887.5036810000004
    },
    '(-1)^x': {
        expected: '(-1)^x',
        number_value: '(-1)^x'
    },
//    'E^(2*i*PI)+E^(i*PI)': {
//        expected: '0',
//        number_value: '0'
//    },
    //parser related
    '(x+y)--(x+y)': {
        expected: '2*(x+y)',
        number_value: '10.8'
    },
    '-z-(r+x)--(r+x)': {
        expected: '-z',
        number_value: '-1'
    },
    '+-z-(r+x)+--+(r+x)': {
        expected: '-z',
        number_value: '-1'
    },
    '(-2/3*x)^x': {
        expected: '(-x)^x*2^x*3^(-x)',
        number_value: '(-x)^x*2^x*3^(-x)'
    },
    '(x)^(3-x)': {
        expected: 'x^(-x+3)',
        number_value: 1.9498327706486434
    },
    '(1/2*x)^(1/2)': {
        expected: 'sqrt(2)^(-1)*x^(1/2)',
        number_value: 1.0246950765958776
    },
    '256^(1/8)': {
        expected: '2',
        number_value: 2
    },

};

test(cases, values, true); 
