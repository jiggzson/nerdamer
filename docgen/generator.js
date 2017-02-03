const fs = require('fs');
const fdocs = require('./function_docs');


const template_file = './templates/page.html';
const parameter_file = './templates/parameters.html';
const example_file = './templates/example.html';
const target_dir = '../functions/';

let data_template = fs.readFileSync(template_file).toString();
let parameter_template = fs.readFileSync(parameter_file).toString(); 
let example_template = fs.readFileSync(example_file).toString();

 for(var file in fdocs) {
    let page = fdocs[file];
    let file_name_parts = file.split('__');
    let file_name;
    if(page.type === 'internal' && file_name_parts.length > 1) 
        file_name = file_name_parts[1]; //use the part after the double dash for simplicity
    else 
        file_name = file.replace(/__/g, '.');
    
    let html_file = file_name+'.html';
    let file_path = target_dir+html_file;
    let output = data_template.replace(/%name%/g, file_name);
    
    
    
    for(let tag in page) {
        let contents = '';
        if(tag === 'parameters') {
            //put together the parameter list
            for(let parameter_name in page.parameters) {
                let parameter = page.parameters[parameter_name];
                let t = parameter_template.replace(/%name%/g, parameter_name);
                for(let entry in parameter) {
                    t = t.replace(new RegExp('%'+entry+'%', 'g'), parameter[entry]);
                }
                contents += t;
            }
        }
        else if(tag === 'usage' && page.type === 'internal') {
            contents = 'nerdamer("'+page[tag]+'")';
        }
        else if(tag === 'examples') {
            contents = page.examples.join('\n');
            let script = contents.replace(/console\.log/g, 'oprint');
            output = output.replace(/%script%/g, script);
        }
        else {
            contents = page[tag];
        }
        
        output = output.replace(new RegExp('%'+tag+'%'), contents);
    }
    fs.writeFileSync(file_path, output);
}

console.log('Done!');