//Is thrown for division by zero
import {Settings} from '../Settings';

export class DivisionByZero extends Error {
  name = 'DivisionByZero';
}
// Is throw if an error occured during parsing
export class ParseError extends Error {
  name = 'ParseError';
}
// Is thrown if the expression results in undefined
export class UndefinedError extends Error {
  name = 'UndefinedError';
}
// Is throw input is out of the function domain
export class OutOfFunctionDomainError extends Error {
  name = 'OutOfFunctionDomainError';
}
// Is throw if a function exceeds x amount of iterations
export class MaximumIterationsReached extends Error {
  name = 'MaximumIterationsReached';
}
// Is thrown if the parser receives an incorrect type
export class NerdamerTypeError extends Error {
  name = 'NerdamerTypeError';
}
// Is thrown if bracket parity is not correct
export class ParityError extends Error {
  name = 'ParityError';
}
// Is thrown if an unexpectd or incorrect operator is encountered
export class OperatorError extends Error {
  name = 'OperatorError';
}
// Is thrown if an index is out of range.
export class OutOfRangeError extends Error {
  name = 'OutOfRangeError';
}
// Is thrown if dimensions are incorrect. Mostly for matrices
export class DimensionError extends Error {
  name = 'DimensionError';
}
// Is thrown if the limits of the library are exceeded for a function
// This can be that the function become unstable passed a value
export class ValueLimitExceededError extends Error {
  name = 'ValueLimitExceededError';
}
// Is throw if the value is an incorrect LH or RH value
export class NerdamerValueError extends Error {
  name = 'NerdamerValueError';
}
// Is thrown if the value is an incorrect LH or RH value
export class SolveError extends Error {
  name = 'SolveError';
}
// Is thrown for an infinite loop
export class InfiniteLoopError extends Error {
  name = 'InfiniteLoopError';
}
// Is thrown if an operator is found when there shouldn't be one
export class UnexpectedTokenError extends Error {
  name = 'UnexpectedTokenError';
}


/**
 * Use this when errors are suppressible
 * @param {String} message
 * @param {object} errorObj
 */
export function err<T>(message: string, errorObj?: { new(message: string): T }) {
  if (!Settings.suppress_errors) {
    if (errorObj) {
      throw new errorObj(message);
    }
    else {
      throw new Error(message);
    }
  }
}
