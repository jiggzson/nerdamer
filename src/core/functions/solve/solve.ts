import { rpSolve } from "./JTraub/rpoly";

/**
 * Solve numerically using the Jenkins-Traub algorithm. This relies on JS number currently 
 * and therefore has limited precision. This is a fallback function if all else fails.
 * 
 * @returns 
 */
export function solveJT() {
    const coeffs = [3000, 2000, 5000, 17000];
    const rVector = [0, 0, 0];
    const iVector = [0, 0, 0]
    rpSolve({Degree: coeffs.length-1}, coeffs, rVector, iVector);

    return {
        re: rVector,
        im: iVector
    }

    // Make sure to set result precision = 16;
}