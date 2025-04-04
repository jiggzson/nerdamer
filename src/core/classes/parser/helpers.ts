import { Settings } from "../../Settings";
import { Expression } from "./operations";
import { Parser } from "./Parser";
import { ParserValuesObject, ParserSupportedType } from "./types";

/**
 * Allows for the parser to run with a desired setting for a single call
 * 
 * @param setting The setting to modified for the call
 * @param value The value of the setting under which the function is called
 * @param callback The function to be called
 * @returns The result of the call
 */
export function block(setting: string, value: boolean, callback: () => ParserSupportedType) {
    let error: Error | undefined = undefined;
    let result;
    // Store the value being currently used
    const currentSettingValue = Settings[setting];
    // Update the setting to the desired value
    Settings[setting] = value;
    try {
        // Call the function and store the result
        result = callback();
    }
    catch (e) {
        error = e as Error;
    }
    // Restore the value
    Settings[setting] = currentSettingValue;

    // Rethrow the error if there was one
    if (error) {
        throw error;
    }

    // Return the result
    return result;
}

/**
 * Forces the expression to be evaluated
 * 
 * @param expression The expression to be evaluated
 * @param values The values to be substituted
 * @returns 
 */
export function evaluate(expression: string, values?: ParserValuesObject) {
    return block('EVALUATE', true, function () {
        return Parser.parse(expression, values);
    });
}

export function _(expr: string) {
    return Expression.toExpression(expr);
}