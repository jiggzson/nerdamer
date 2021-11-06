import {each} from '../Core/Utils';
import {Symbol} from '../Core/Symbol';

export class ReservedDictionary {
    private readonly reserved: (string|undefined)[] = [];

    constructor() {
        this.reserved = [];
    }

    /**
     * Checks to see if value is one of nerdamer's reserved names
     * @param {String} name
     * @return boolean
     */
    isReserved(name: string) {
        return this.reserved.indexOf(name) !== -1;
    }

    /**
     * Is used for u-substitution. Gets a suitable u for substitution. If for
     * instance a is used in the symbol then it keeps going down the line until
     * one is found that's not in use. If all letters are taken then it
     * starts appending numbers.
     * IMPORTANT! It assumes that the substitution will be undone
     * beore the user gets to interact with the object again.
     * @param {Symbol} symbol
     */
    getU(symbol: Symbol) {
        //start with u
        let u = 'u', //start with u
            v = u, //init with u
            c = 0, //postfix number
            vars = symbol.variables();

        //make sure this variable isn't reserved and isn't in the variable list
        while(!(this.reserved.indexOf(v) === - 1 && vars.indexOf(v) === - 1)) {
            v = u + c++;
        }

        //get an empty slot. It seems easier to just push but the
        //problem is that we may have some which are created by clearU
        for (let i = 0, l = this.reserved.length; i <= l; i++) {
            //reserved cannot equals false or 0 so we can safely check for a falsy type
            if (!this.reserved[i]) {
                this.reserved[i] = v; //reserve the variable
                break;
            }
        }
        return v;
    }

    /**
     * Clears the u variable so it's no longer reserved
     * @param {String} u
     */
    clearU(u: string) {
        let idx = this.reserved.indexOf(u);
        if (idx !== -1) {
            this.reserved[idx] = undefined;
        }
    };

    reserveName(name: string) {
        if (!this.isReserved(name)) {
            this.reserved.push(name);
        }
    }

    /**
     * Reserves the names in an object so they cannot be used as function names
     * @param {Object} obj
     */
    reserveNames(obj: object | string) {
        if (typeof obj === 'string') {
            this.reserveName(obj);
        }
        else {
            each(obj, (x) => {
                this.reserveName(String(x));
            });
        }
    }

    getReserved() {
        return this.reserved;
    }
}
