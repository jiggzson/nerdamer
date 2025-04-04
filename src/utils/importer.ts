import nerdamer from "nerdamer"
import { Parser } from "../core/classes/parser/operations"
// expect(parser.parse('-24.160787001838543^1.3^(-1)').text()).toEqual('-108007829^(-10/13)*2609554151^(10/13)');
export function importCases() {
    const cases = `
   // expect(parser.parse('(5*(4^(1/3)))^3').text()).toEqual('500');
        // expect(parser.parse('2*x*(5*(4^(1/3)))^3').text()).toEqual('1000*x');
        // expect(parser.parse('y^y^y').text()).toEqual('y^y^y');
        // expect(parser.parse('(x^4)^(1/4)').text()).toEqual('abs(x)');
        // expect(parser.parse('(-2*x)^2').text()).toEqual('4*x^2');
        // expect(parser.parse('-4*x^3--x^3+x^2-(-2*x)^2+y').text()).toEqual('-3*x^2-3*x^3+y');
        // expect(parser.parse('2*x/x').text()).toEqual('2');
        // expect(parser.parse('(x^2*y)^2').text()).toEqual('x^4*y^2');
        // expect(parser.parse('(x+1)^(z+1)*(1+x)^(1+z)').text()).toEqual('(1+x)^(2+2*z)');
        // expect(parser.parse('(x+1)^(z+1)*(1+x)^4').text()).toEqual('(1+x)^(5+z)');
        // expect(parser.parse('(-1)^x').text()).toEqual('(-1)^x');
        // expect(parser.parse('(-25)^(1/5)').text()).toEqual('(-1)^(1/5)*5^(2/5)');
    `
    let output = '';
    let failed = '';
    for(const c of cases.split('\n')) {
        try {
            const regex = /'(.+?)'/;
            const match1 = c.match(regex)!;
            const d = c.replace(match1[0], '$');
            const match2 = d.match(regex)!;
            const expression = match1[1];
            const existingOutput = match2[1];
            // console.log(expression, '   ', existingOutput)

            const newOutput = Parser.parse(expression).text();
            if(nerdamer(newOutput).text() === existingOutput) {
                output += `expect(parser.parse('${expression}').text()).toEqual('${newOutput}');\n`;
            }
            else {
                failed += c+'\n';
            }
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        catch(e) {
            failed += c+'\n'
        };    
    }

    console.log(output);
    console.log('=========================================='); 
    console.log(failed);
}
