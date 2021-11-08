export class VariableDictionary {
    private vars: Record<string, any> = {};
    private constants: Record<string, any> = {};

    setVar(name: string, value: any) {
        this.vars[name] = value;
    }

    getVar(name: string): any {
        return this.vars[name];
    }

    isVar(name: string): any {
        return name in this.vars;
    }

    deleteVar(name: string) {
        delete this.vars[name];
    }

    clearAllVars() {
        this.vars = {};
    }

    getAllVars() {
        return this.vars;
    }

    setConstant(name: string, value: any) {
        this.constants[name] = value;
    }

    getConstant(name: string): any {
        return this.constants[name];
    }

    isConstant(name: string): boolean {
        return name in this.constants;
    }

    getAllConstants() {
        return this.constants;
    }

    deleteConstant(name: string) {
        delete this.constants[name];
    }

}
