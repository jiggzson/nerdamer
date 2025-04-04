/* eslint-disable */

type DegParType = {
    // The maximum degree allowed with Jenkins-Traub is 100 
    // so this can remain a JS number.
    Degree: number
}

type RefObjType1 = {
    a?: number; // FLAG - This is likely an error
    NZ: number,
    lzi: number,
    lzr: number,
    szi: number,
    szr: number,
}

type RefObjType2 = {
    a: number,
    b: number
}

type RefObjType3 = {
    sr: number,
    si: number,
    lr: number,
    li: number
};

type RefObjType4 = {
    a1: number,
    a3: number,
    a7: number,
    c: number,
    d: number,
    e: number,
    f: number,
    g: number,
    h: number
};


function QuadSD_ak1(NN: number, u: number, v: number, p: number[], q: number[], iPar: RefObjType2) {

    // Divides p by the quadratic 1, u, v placing the quotient in q and the remainder in a, b

    // iPar is a dummy variable for passing in the two parameters--a and b--by reference

    q[0] = iPar.b = p[0];
    q[1] = iPar.a = -(u * iPar.b) + p[1];

    for (var i = 2; i < NN; ++i) {
        q[i] = -(u * iPar.a + v * iPar.b) + p[i];
        iPar.b = iPar.a;
        iPar.a = q[i];
    }

    return;
} // End QuadSD_ak1

function calcSC_ak1(DBL_EPSILON: number, N: number, a: number, b: number, iPar: RefObjType4, K: number[], u: number, v: number, qk: number[]) {

    // This routine calculates scalar quantities used to compute the next K polynomial and
    // new estimates of the quadratic coefficients.

    // calcSC -	integer variable set here indicating how the calculations are normalized
    //			    to avoid overflow.

    // iPar is a dummy variable for passing in the nine parameters--a1, a3, a7, c, d, e, f, g, and h--by reference

    // sdPar is a dummy variable for passing the two parameters--c and d--into QuadSD_ak1 by reference
    var sdPar = { a: 0.0, b: 0.0 };

    var dumFlag = 3;	// TYPE = 3 indicates the quadratic is almost a factor of K

    // Synthetic division of K by the quadratic 1, u, v
    QuadSD_ak1(N, u, v, K, qk, sdPar);
    iPar.c = sdPar.a;
    iPar.d = sdPar.b;

    if (Math.abs(iPar.c) <= (100.0 * DBL_EPSILON * Math.abs(K[N - 1]))) {
        if (Math.abs(iPar.d) <= (100.0 * DBL_EPSILON * Math.abs(K[N - 2]))) return dumFlag;
    } // End if (abs(c) <= (100.0*DBL_EPSILON*abs(K[N - 1])))

    iPar.h = v * b;
    if (Math.abs(iPar.d) >= Math.abs(iPar.c)) {
        dumFlag = 2;		// TYPE = 2 indicates that all formulas are divided by d
        iPar.e = a / (iPar.d);
        iPar.f = (iPar.c) / (iPar.d);
        iPar.g = u * b;
        iPar.a3 = (iPar.e) * ((iPar.g) + a) + (iPar.h) * (b / (iPar.d));
        iPar.a1 = -a + (iPar.f) * b;
        iPar.a7 = (iPar.h) + ((iPar.f) + u) * a;
    } // End if(abs(d) >= abs(c))
    else {
        dumFlag = 1;		// TYPE = 1 indicates that all formulas are divided by c
        iPar.e = a / (iPar.c);
        iPar.f = (iPar.d) / (iPar.c);
        iPar.g = (iPar.e) * u;
        iPar.a3 = (iPar.e) * a + ((iPar.g) + (iPar.h) / (iPar.c)) * b;
        iPar.a1 = -(a * ((iPar.d) / (iPar.c))) + b;
        iPar.a7 = (iPar.g) * (iPar.d) + (iPar.h) * (iPar.f) + a;
    } // End else

    return dumFlag;
} // End calcSC_ak1

function nextK_ak1(DBL_EPSILON: number, N: number, tFlag: number, a: number, b: number, iPar: RefObjType4, K: number[], qk: number[], qp: number[]) {

    // Computes the next K polynomials using the scalars computed in calcSC_ak1

    // iPar is a dummy variable for passing in three parameters--a1, a3, and a7

    var temp;

    if (tFlag === 3) {	// Use unscaled form of the recurrence
        K[1] = K[0] = 0.0;

        for (var i = 2; i < N; ++i)	 K[i] = qk[i - 2];

        return;
    } // End if (tFlag == 3)

    temp = ((tFlag === 1) ? b : a);

    if (Math.abs(iPar.a1) > (10.0 * DBL_EPSILON * Math.abs(temp))) {
        // Use scaled form of the recurrence

        iPar.a7 /= iPar.a1;
        iPar.a3 /= iPar.a1;
        K[0] = qp[0];
        K[1] = -(qp[0] * iPar.a7) + qp[1];

        for (var i = 2; i < N; ++i)	 K[i] = -(qp[i - 1] * iPar.a7) + qk[i - 2] * iPar.a3 + qp[i];

    } // End if (abs(a1) > (10.0*DBL_EPSILON*abs(temp)))
    else {
        // If a1 is nearly zero, use a special form of the recurrence

        K[0] = 0.0;
        K[1] = -(qp[0] * iPar.a7);

        for (var i = 2; i < N; ++i)	 K[i] = -(qp[i - 1] * iPar.a7) + qk[i - 2] * iPar.a3;
    } // End else

    return;
} // End nextK_ak1

function newest_ak1(tFlag: number, iPar: RefObjType2, a: number, a1: number, a3: number, a7: number, b: number, c: number, d: number, f: number, g: number, h: number, u: number, v: number, K: number[], N: number, p: number[]) {
    // Compute new estimates of the quadratic coefficients using the scalars computed in calcSC_ak1

    // iPar is a dummy variable for passing in the two parameters--uu and vv--by reference
    // iPar.a = uu, iPar.b = vv

    var a4, a5, b1, b2, c1, c2, c3, c4, temp;

    iPar.b = iPar.a = 0.0;		// The quadratic is zeroed

    if (tFlag !== 3) {

        if (tFlag !== 2) {
            a4 = a + u * b + h * f;
            a5 = c + (u + v * f) * d;
        } // End if (tFlag != 2)
        else { // else tFlag == 2
            a4 = (a + g) * f + h;
            a5 = (f + u) * c + v * d;
        } // End else tFlag == 2

        // Evaluate new quadratic coefficients

        b1 = -(K[N - 1] / p[N]);
        b2 = -(K[N - 2] + b1 * p[N - 1]) / p[N];
        c1 = v * b2 * a1;
        c2 = b1 * a7;
        c3 = b1 * b1 * a3;
        c4 = -(c2 + c3) + c1;
        temp = -c4 + a5 + b1 * a4;
        if (temp) {
            iPar.a = -((u * (c3 + c2) + v * (b1 * a1 + b2 * a7)) / temp) + u;
            iPar.b = v * (1.0 + c4 / temp);
        } // End if (temp)

    } // End if (tFlag != 3)

    return;
} // End newest_ak1

function Quad_ak1(a: number, b1: number, c: number, iPar: RefObjType3) {
    // Calculates the zeros of the quadratic a*Z^2 + b1*Z + c
    // The quadratic formula, modified to avoid overflow, is used to find the larger zero if the
    // zeros are real and both zeros are complex. The smaller real zero is found directly from
    // the product of the zeros c/a.

    // iPar is a dummy variable for passing in the four parameters--sr, si, lr, and li--by reference

    var b, d, e;

    iPar.sr = iPar.si = iPar.lr = iPar.li = 0.0;

    if (!a) {
        if (b1) iPar.sr = -(c / b1);
        return;
    } // End if (!a)

    if (!c) {
        iPar.lr = -(b1 / a);
        return;
    } // End if (!c)

    // Compute discriminant avoiding overflow

    b = b1 / 2.0;
    if (Math.abs(b) < Math.abs(c)) {
        e = ((c >= 0) ? a : -a);
        e = -e + b * (b / Math.abs(c));
        d = Math.sqrt(Math.abs(e)) * Math.sqrt(Math.abs(c));
    } // End if (Math.abs(b) < Math.abs(c))
    else { // Else (abs(b) >= abs(c))
        e = -((a / b) * (c / b)) + 1.0;
        d = Math.sqrt(Math.abs(e)) * (Math.abs(b));
    } // End else (abs(b) >= abs(c))

    if (e >= 0) {
        // Real zeros

        if (b >= 0) d = -d;
        iPar.lr = (-b + d) / a;
        if (iPar.lr) iPar.sr = (c / (iPar.lr)) / a;
    } // End if (e >= 0)
    else { // Else (e < 0)
        // Complex conjugate zeros

        iPar.lr = iPar.sr = -(b / a);
        iPar.si = Math.abs(d / a);
        iPar.li = -(iPar.si);
    } // End else (e < 0)

    return;
}  // End of Quad_ak1

function QuadIT_ak1(DBL_EPSILON: number, N: number, iPar: RefObjType1, uu: number, vv: number, qp: number[], NN: number, sdPar: RefObjType2, p: number[], qk: number[], calcPar: RefObjType4, K: number[]) {

    // Variable-shift K-polynomial iteration for a quadratic factor converges only if the
    // zeros are equimodular or nearly so.

    // iPar is a dummy variable for passing in the five parameters--NZ, lzi, lzr, szi, and szr--by reference
    // sdPar is a dummy variable for passing the two parameters--a and b--in by reference
    // calcPar is a dummy variable for passing the nine parameters--a1, a3, a7, c, d, e, f, g, and h--in by reference

    // qPar is a dummy variable for passing the four parameters--szr, szi, lzr, and lzi--into Quad_ak1 by reference
    var qPar = { sr: 0.0, si: 0.0, lr: 0.0, li: 0.0 };

    var ee, mp, omp, relstp, t, u, ui, v, vi, zm;
    var i, j = 0, tFlag;     // Integer variables
    var triedFlag = 1;     // Boolean variable

    iPar.NZ = 0;	// Number of zeros found
    u = uu;	// uu and vv are coefficients of the starting quadratic
    v = vv;

    for (; ;) {
        Quad_ak1(1.0, u, v, qPar);
        iPar.szr = qPar.sr;
        iPar.szi = qPar.si;
        iPar.lzr = qPar.lr;
        iPar.lzi = qPar.li;

        // Return if roots of the quadratic are real and not close to multiple or nearly
        // equal and of opposite sign.

        if (Math.abs(Math.abs(iPar.szr) - Math.abs(iPar.lzr)) > 0.01 * Math.abs(iPar.lzr)) break;

        // Evaluate polynomial by quadratic synthetic division

        QuadSD_ak1(NN, u, v, p, qp, sdPar);

        mp = Math.abs(-((iPar.szr) * (sdPar.b)) + (sdPar.a)) + Math.abs((iPar.szi) * (sdPar.b));

        // Compute a rigorous bound on the rounding error in evaluating p

        zm = Math.sqrt(Math.abs(v));
        ee = 2.0 * Math.abs(qp[0]);
        t = -((iPar.szr) * (sdPar.b));

        for (i = 1; i < N; ++i)  ee = ee * zm + Math.abs(qp[i]);

        ee = ee * zm + Math.abs(t + sdPar.a);

        ee = (9.0 * ee + 2.0 * Math.abs(t) - 7.0 * (Math.abs((sdPar.a) + t) + zm * Math.abs((sdPar.b)))) * DBL_EPSILON;

        // Iteration has converged sufficiently if the polynomial value is less than 20 times this bound

        if (mp <= 20.0 * ee) {
            iPar.NZ = 2;
            break;
        } // End if (mp <= 20.0*ee)

        ++j;

        // Stop iteration after 20 steps
        if (j > 20) break;

        if (j > 1) {
            if (triedFlag && (relstp <= 0.01) && (mp >= omp)) {
                // A cluster appears to be stalling the convergence. Five fixed shift
                // steps are taken with a u, v close to the cluster.

                relstp = ((relstp < DBL_EPSILON) ? Math.sqrt(DBL_EPSILON) : Math.sqrt(relstp));

                u -= u * relstp;
                v += v * relstp;

                QuadSD_ak1(NN, u, v, p, qp, sdPar);

                for (i = 0; i < 5; ++i) {
                    tFlag = calcSC_ak1(DBL_EPSILON, N, sdPar.a, sdPar.b, calcPar, K, u, v, qk);
                    nextK_ak1(DBL_EPSILON, N, tFlag, sdPar.a, sdPar.b, calcPar, K, qk, qp);
                } // End for i

                triedFlag = 0;
                j = 0;

            } // End if (triedFlag && (relstp <= 0.01) && (mp >= omp))

        } // End if (j > 1)

        omp = mp;

        // Calculate next K polynomial and new u and v

        tFlag = calcSC_ak1(DBL_EPSILON, N, sdPar.a, sdPar.b, calcPar, K, u, v, qk);
        nextK_ak1(DBL_EPSILON, N, tFlag, sdPar.a, sdPar.b, calcPar, K, qk, qp);
        tFlag = calcSC_ak1(DBL_EPSILON, N, sdPar.a, sdPar.b, calcPar, K, u, v, qk);
        newest_ak1(tFlag, sdPar, sdPar.a, calcPar.a1, calcPar.a3, calcPar.a7, sdPar.b, calcPar.c, calcPar.d, calcPar.f, calcPar.g, calcPar.h, u, v, K, N, p);
        ui = sdPar.a;
        vi = sdPar.b;

        // If vi is zero, the iteration is not converging
        if (!vi) break;

        relstp = Math.abs((-v + vi) / vi);
        u = ui;
        v = vi;

    } // End infinite for loop

    return;
} //End QuadIT_ak1

function RealIT_ak1(DBL_EPSILON: number, iPar: RefObjType1, sdPar: RefObjType2, N: number, p: number[], NN: number, qp: number[], K: number[], qk: number[]) {

    // Variable-shift H-polynomial iteration for a real zero

    // sss	- starting iterate = sdPar.a
    // NZ		- number of zeros found = iPar.NZ
    // dumFlag	- flag to indicate a pair of zeros near real axis, returned to iFlag

    var ee, kv, mp, ms, omp, pv, s, t;
    var i, j, nm1 = N - 1;   // Integer variables
    var dumFlag = 0;       // Boolean variable

    iPar.NZ = j = 0;
    s = sdPar.a;

    for (; ;) {
        qp[0] = pv = p[0];

        // Evaluate p at s
        for (i = 1; i < NN; ++i)  qp[i] = pv = pv * s + p[i];

        mp = Math.abs(pv);

        // Compute a rigorous bound on the error in evaluating p

        ms = Math.abs(s);
        ee = 0.5 * Math.abs(qp[0]);
        for (i = 1; i < NN; ++i)  ee = ee * ms + Math.abs(qp[i]);

        // Iteration has converged sufficiently if the polynomial value is less than
        // 20 times this bound

        if (mp <= 20.0 * DBL_EPSILON * (2.0 * ee - mp)) {
            iPar.NZ = 1;
            iPar.szr = s;
            iPar.szi = 0.0;
            break;
        } // End if (mp <= 20.0*DBL_EPSILON*(2.0*ee - mp))

        ++j;

        // Stop iteration after 10 steps
        if (j > 10) break;

        if (j > 1) {
            if ((Math.abs(t) <= 0.001 * Math.abs(-t + s)) && (mp > omp)) {
                // A cluster of zeros near the real axis has been encountered.
                // Return with iFlag set to initiate a quadratic iteration.

                dumFlag = 1;
                iPar.a = s;
                break;
            } // End if ((fabs(t) <= 0.001*fabs(s - t)) && (mp > omp))

        } //End if (j > 1)

        // Return if the polynomial value has increased significantly

        omp = mp;

        // Compute t, the next polynomial and the new iterate
        qk[0] = kv = K[0];
        for (i = 1; i < N; ++i)	 qk[i] = kv = kv * s + K[i];

        if (Math.abs(kv) > Math.abs(K[nm1]) * 10.0 * DBL_EPSILON) {
            // Use the scaled form of the recurrence if the value of K at s is non-zero
            t = -(pv / kv);
            K[0] = qp[0];
            for (i = 1; i < N; ++i)	 K[i] = t * qk[i - 1] + qp[i];
        } // End if (fabs(kv) > fabs(K[nm1])*10.0*DBL_EPSILON)
        else { // else (fabs(kv) <= fabs(K[nm1])*10.0*DBL_EPSILON)
            // Use unscaled form
            K[0] = 0.0;
            for (i = 1; i < N; ++i)	 K[i] = qk[i - 1];
        } // End else (fabs(kv) <= fabs(K[nm1])*10.0*DBL_EPSILON)

        kv = K[0];
        for (i = 1; i < N; ++i)	 kv = kv * s + K[i];

        t = ((Math.abs(kv) > (Math.abs(K[nm1]) * 10.0 * DBL_EPSILON)) ? -(pv / kv) : 0.0);

        s += t;

    } // End infinite for loop

    return dumFlag;
} // End RealIT_ak1

function Fxshfr_ak1(DBL_EPSILON: number, MDP1: number, L2: number, sr: number, bnd: number, K: number[], N: number, p: number[], NN: number, qp: number[], iPar: RefObjType1) {

    // Computes up to L2 fixed shift K-polynomials, testing for convergence in the linear or
    // quadratic case. Initiates one of the variable shift iterations and returns with the
    // number of zeros found.

    // L2	limit of fixed shift steps

    // iPar is a dummy variable for passing in the five parameters--NZ, lzi, lzr, szi, and szr--by reference
    iPar.NZ = 0;   // NZ: number of zeros found

    // sdPar is a dummy variable for passing the two parameters--a and b--into QuadSD_ak1 by reference
    var sdPar = { a: 0.0, b: 0.0 };

    // calcPar is a dummy variable for passing the nine parameters--a1, a3, a7, c, d, e, f, g, and h--into calcSC_ak1 by reference
    var calcPar = { a1: 0.0, a3: 0.0, a7: 0.0, c: 0.0, d: 0.0, e: 0.0, f: 0.0, g: 0.0, h: 0.0 };

    var qk = new Array(MDP1);
    var svk = new Array(MDP1);

    var a, b, betas, betav, oss, ots, otv, ovv, s, ss, ts, tss, tv, tvv, u, ui, v, vi, vv;

    var i, j, tFlag;                                            // Integer variables
    var fflag, iFlag, spass, stry, vpass, vtry;   // Boolean variables

    betav = betas = 0.25;
    u = -(2.0 * sr);
    oss = sr;
    ovv = v = bnd;

    //Evaluate polynomial by synthetic division
    QuadSD_ak1(NN, u, v, p, qp, sdPar);

    a = sdPar.a;
    b = sdPar.b;

    tFlag = calcSC_ak1(DBL_EPSILON, N, a, b, calcPar, K, u, v, qk);

    for (j = 0; j < L2; ++j) {

        // Calculate next K polynomial and estimate v
        nextK_ak1(DBL_EPSILON, N, tFlag, a, b, calcPar, K, qk, qp);
        tFlag = calcSC_ak1(DBL_EPSILON, N, a, b, calcPar, K, u, v, qk);

        // Use sdPar for passing in uu and vv instead of defining a brand-new variable.
        // sdPar.a = ui, sdPar.b = vi

        newest_ak1(tFlag, sdPar, a, calcPar.a1, calcPar.a3, calcPar.a7, b, calcPar.c, calcPar.d, calcPar.f, calcPar.g, calcPar.h, u, v, K, N, p);

        ui = sdPar.a;
        vv = vi = sdPar.b;

        // Estimate s

        ss = ((K[N - 1] != 0.0) ? -(p[N] / K[N - 1]) : 0.0);

        ts = tv = 1.0;

        if ((j) && (tFlag != 3)) {

            // Compute relative measures of convergence of s and v sequences

            if (vv != 0.0) tv = Math.abs((vv - ovv) / vv);
            if (ss != 0.0) ts = Math.abs((ss - oss) / ss);

            // If decreasing, multiply the two most recent convergence measures

            tvv = ((tv < otv) ? tv * otv : 1.0);
            tss = ((ts < ots) ? ts * ots : 1.0);

            // Compare with convergence criteria

            vpass = ((tvv < betav) ? 1 : 0);
            spass = ((tss < betas) ? 1 : 0);

            if ((spass) || (vpass)) {

                // At least one sequence has passed the convergence test.
                // Store variables before iterating

                for (i = 0; i < N; ++i) svk[i] = K[i];

                s = ss;

                // Choose iteration according to the fastest converging sequence

                stry = vtry = 0;
                fflag = 1;

                do {

                    iFlag = 1;     // Begin each loop by assuming RealIT will be called UNLESS iFlag changed below

                    if ((fflag && ((fflag = 0) == 0)) && ((spass) && (!vpass || (tss < tvv)))) {
                        ;		// Do nothing. Provides a quick "short circuit".
                    } // End if (fflag)

                    else { // else !fflag

                        QuadIT_ak1(DBL_EPSILON, N, iPar, ui, vi, qp, NN, sdPar, p, qk, calcPar, K);

                        a = sdPar.a;
                        b = sdPar.b;

                        if ((iPar.NZ) > 0) return;

                        // Quadratic iteration has failed. Flag that it has been tried and decrease the
                        // convergence criterion

                        vtry = 1;
                        betav *= 0.25;

                        // Try linear iteration if it has not been tried and the s sequence is converging
                        if (stry || (!spass)) iFlag = 0;
                        else for (i = 0; i < N; ++i) K[i] = svk[i];

                    } // End else !fflag

                    if (iFlag) {

                        // Use sdPar for passing in s instead of defining a brand-new variable.
                        // sdPar.a = s

                        sdPar.a = s;
                        iFlag = RealIT_ak1(DBL_EPSILON, iPar, sdPar, N, p, NN, qp, K, qk);
                        s = sdPar.a;

                        if ((iPar.NZ) > 0) return;

                        // Linear iteration has failed. Flag that it has been tried and decrease the
                        // convergence criterion

                        stry = 1;
                        betas *= 0.25;

                        if (iFlag) {

                            // If linear iteration signals an almost double real zero, attempt quadratic iteration

                            ui = -(s + s);
                            vi = s * s;
                            continue;

                        } // End if (iFlag)
                    } // End if (iFlag)

                    // Restore variables
                    for (i = 0; i < N; ++i) K[i] = svk[i];

                    // Try quadratic iteration if it has not been tried and the v sequence is converging

                } while (vpass && !vtry);  // End do-while loop

                // Re-compute qp and scalar values to continue the second stage

                QuadSD_ak1(NN, u, v, p, qp, sdPar);
                a = sdPar.a;
                b = sdPar.b;

                tFlag = calcSC_ak1(DBL_EPSILON, N, a, b, calcPar, K, u, v, qk);

            } // End if ((spass) || (vpass))

        } // End if ((j) && (tFlag != 3))

        ovv = vv;
        oss = ss;
        otv = tv;
        ots = ts;
    } // End for j

    return;
}  // End of Fxshfr_ak1

/**
 * This is the Jenkins-Traub Algorithm based on the port by 
 * This is based on Algorithm 493.
 * https://dl.acm.org/doi/pdf/10.1145/355637.355643
 * Previous attempts have failed to port this using Decimal.js as due to non-convergence. Some initial tests suggests that this
 * may be due to the higher precision provided by Decimal.js but that conclusion has not been confirmed.
 * 
 * @param {{Degree: number}} degPar An object containing a property degree which will have the degree of the polynomial
 * @param {number[]} p The array with the coefficients of each polynomial power in descending order e.g. 4x^3+5x-1 = [4, 0, 5, 1]
 * @param {number[]} zeror The array of the real components of the anticipated roots. 
 * If the degree of the polynomial is 3 then this will be 3 elements long
 * @param {number[]} zeroi The array of the imaginary components of the anticipated roots. 
 * If the degree of the polynomial is 3 then this will be 3 elements long
 * @returns 
 */
export function rpSolve(degPar: DegParType, p: number[], zeror: number[], zeroi: number[]) {
    var N = degPar.Degree;
    var RADFAC = 3.14159265358979323846 / 180;    // Degrees-to-radians conversion factor = PI/180
    var CPP_FLT_MIN = 1.17549435082229e-038;	    // Value of FLT_MIN from C++
    var CPP_FLT_MAX = 3.40282346638529e+038;	// Value of FLT_MAX from C++
    var LB2 = 1.4426950408889634073599;	            // 1.0 / ln(2)

    var MDP1 = degPar.Degree + 1;
    var K = new Array(MDP1);
    var pt = new Array(MDP1);
    var qp = new Array(MDP1);
    var temp = new Array(MDP1);

    // qPar is a dummy variable for passing parameters by reference: sr, si, lr, li
    var qPar = { sr: 0.0, si: 0.0, lr: 0.0, li: 0.0 };

    // Fxshfr_Par is a dummy variable for passing parameters by reference : NZ, lzi, lzr, szi, szr
    var Fxshfr_Par = { NZ: 0, lzi: 0.0, lzr: 0.0, szi: 0.0, szr: 0.0 };

    var bnd, DBL_EPSILON, df, dx, factor, ff, moduli_max, moduli_min, sc, x, xm;
    var aa, bb, cc, sr, t, xxx;

    //TODO: All of type number
    var j = 0, jj, l, NM1, NN;		// Integer variables 
    var zerok;                           // Boolean variable

    // Calculate the machine epsilon and store in the variable DBL_EPSILON.
    // To calculate this value, just use existing variables rather than create new ones that will be used only for this code block
    /**
     * // Calculate epsilon with Decimal.js
     * const epsilon = new Decimal(1).sub(new Decimal(1).minus(new Decimal(1).pow(-Decimal.precision + 1)));
     */
    // DBL_EPSILON = 2.220446049250313e-16
    // This can possibly be 1 ???
    aa = 1.0;
    do {
        DBL_EPSILON = aa;
        aa *= 0.5;
        bb = 1.0 + aa;
    } while (bb > 1.0);

    DBL_EPSILON = 0;

    // See: https://mathblog.com/polynomial-root-finding-with-the-jenkins-traub-algorithm/
    var LO = CPP_FLT_MIN / DBL_EPSILON;
    
    var cosr = Math.cos(94.0 * RADFAC); // cos(94 deg). This represents the shift
    var sinr = Math.sin(94.0 * RADFAC); // sin(94 deg)
    var xx = Math.sqrt(0.5);
    var yy = -xx;

    // Remove zeros at the origin, if any
    while (p[N] == 0) {
        zeror[j] = zeroi[j] = 0;
        --N;
        ++j;
    } // End while (p[N] == 0)

    NN = N + 1;

    // ======================= Begin Main Loop =============================

    while (N > 0) { // Main loop

        // Start the algorithm for one zero
        if (N <= 2) {
            // Calculate the final zero or pair of zeros
            if (N < 2) {
                zeror[degPar.Degree - 1] = -(p[1] / p[0]);
                zeroi[degPar.Degree - 1] = 0;
            } // End if (N < 2)
            else { // else N == 2
                Quad_ak1(p[0], p[1], p[2], qPar);
                zeror[degPar.Degree - 2] = qPar.sr;
                zeroi[degPar.Degree - 2] = qPar.si;
                zeror[degPar.Degree - 1] = qPar.lr;
                zeroi[degPar.Degree - 1] = qPar.li;
            } // End else N == 2
            break;
        } // End if (N <= 2)

        // Find the largest and smallest moduli of the coefficients
        moduli_max = 0.0;
        moduli_min = CPP_FLT_MAX;

        for (i = 0; i < NN; ++i) {
            x = Math.abs(p[i]);
            if (x > moduli_max) moduli_max = x;
            if ((x != 0) && (x < moduli_min)) moduli_min = x;
        } // End for i

        // Scale if there are large or very small coefficients
        // Computes a scale factor to multiply the coefficients of the polynomial. The scaling
        // is done to avoid overflow and to avoid undetected underflow interfering with the
        // convergence criterion.
        // The factor is a power of the base.

        sc = LO / moduli_min;

        if (((sc <= 1.0) && (moduli_max >= 10)) || ((sc > 1.0) && (CPP_FLT_MAX / sc >= moduli_max))) {
            if (sc == 0) sc = CPP_FLT_MIN;
            l = Math.floor(LB2 * Math.log(sc) + 0.5);
            factor = Math.pow(2.0, l);
            if (factor != 1.0) for (i = 0; i < NN; ++i) p[i] *= factor;
        } // End if (((sc <= 1.0) && (moduli_max >= 10)) || ((sc > 1.0) && (CPP_FLT_MAX/sc >= moduli_max)))

        // Compute lower bound on moduli of zeros

        for (var i = 0; i < NN; ++i) pt[i] = Math.abs(p[i]);

        NM1 = N - 1;

        // Compute upper estimate of bound

        xm = Math.exp((Math.log(pt[N]) - Math.log(pt[0])) / N);

        if (pt[NM1] != 0) {
            // If Newton step at the origin is better, use it
            x = pt[N] / pt[NM1];
            if (x < xm) xm = x;
        } // End if (pt[NM1] != 0)

        pt[N] = -(pt[N]);

        // Chop the interval (0, x) until ff <= 0

        do {
            x = xm;
            xm = 0.1 * x;
            ff = pt[0];
            for (var i = 1; i < NN; ++i) ff = ff * xm + pt[i];
        } while (ff > 0); // End do-while loop

        dx = x;

        // Do Newton iteration until x converges to two decimal places

        while (Math.abs(dx / x) > 0.005) {
            df = ff = pt[0];
            for (var i = 1; i < N; ++i) {
                ff = x * ff + pt[i];
                df = x * df + ff;
            } // End for i
            ff = x * ff + pt[N];
            dx = ff / df;
            x -= dx;
        }   // End while loop

        bnd = x;

        // Compute the derivative as the initial K polynomial and do 5 steps with no shift

        for (var i = 1; i < N; ++i) K[i] = (N - i) * p[i] / N;
        K[0] = p[0];

        aa = p[N];
        bb = p[NM1];
        zerok = ((K[NM1] == 0) ? 1 : 0);

        for (jj = 0; jj < 5; ++jj) {
            cc = K[NM1];
            if (zerok) {
                // Use unscaled form of recurrence
                for (var i = 0; i < NM1; ++i) {
                    j = NM1 - i;
                    K[j] = K[j - 1];
                } // End for i
                K[0] = 0;
                zerok = ((K[NM1] == 0) ? 1 : 0);
            } // End if (zerok)
            else { // else !zerok
                // Used scaled form of recurrence if value of K at 0 is nonzero
                t = -aa / cc;
                for (var i = 0; i < NM1; ++i) {
                    j = NM1 - i;
                    K[j] = t * K[j - 1] + p[j];
                } // End for i
                K[0] = p[0];
                zerok = ((Math.abs(K[NM1]) <= Math.abs(bb) * DBL_EPSILON * 10.0) ? 1 : 0);
            } // End else !zerok

        } // End for jj

        // Save K for restarts with new shifts
        for (var i = 0; i < N; ++i) temp[i] = K[i];

        // Loop to select the quadratic corresponding to each new shift

        for (jj = 1; jj <= 20; ++jj) {

            // Quadratic corresponds to a double shift to a non-real point and its
            // complex conjugate. The point has modulus BND and amplitude rotated
            // by 94 degrees from the previous shift.

            xxx = -(sinr * yy) + cosr * xx;
            yy = sinr * xx + cosr * yy;
            xx = xxx;
            sr = bnd * xx;

            // Second stage calculation, fixed quadratic
            Fxshfr_ak1(DBL_EPSILON, MDP1, 20 * jj, sr, bnd, K, N, p, NN, qp, Fxshfr_Par);

            if (Fxshfr_Par.NZ) {

                // The second stage jumps directly to one of the third stage iterations and
                // returns here if successful. Deflate the polynomial, store the zero or
                // zeros, and return to the main algorithm.

                j = degPar.Degree - N;
                zeror[j] = Fxshfr_Par.szr;
                zeroi[j] = Fxshfr_Par.szi;
                NN -= Fxshfr_Par.NZ;
                N = NN - 1;
                for (var i = 0; i < NN; ++i) p[i] = qp[i];
                if (Fxshfr_Par.NZ != 1) {
                    zeror[j + 1] = Fxshfr_Par.lzr;
                    zeroi[j + 1] = Fxshfr_Par.lzi;
                } // End if (NZ != 1)
                break;
            } // End if (NZ)
            else { // Else (!NZ)

                // If the iteration is unsuccessful, another quadratic is chosen after restoring K
                for (var i = 0; i < N; ++i) K[i] = temp[i];

            } // End else (!NZ)

        } // End for jj

        // Return with failure if no convergence with 20 shifts
        if (jj > 20) {
            degPar.Degree -= N;
            break;
        } // End if (jj > 20)

    } // End while (N > 0)

    // ======================== End Main Loop =============================

    return;
}
// End of rpSolve

// end of JavaScript-->
