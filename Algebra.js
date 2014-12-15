/*
* Author : Martin Donk
* Website : http://www.nerdamer.com
* Email : martin.r.donk@gmail.com
* Source : https://github.com/jiggzson/nerdamer
*/

(function() {
    /*imports*/
    var core = nerdamer.getCore(),
        _ = core.PARSER,
        keys = core.Utils.keys,
        build = core.Utils.build,
        Symbol = core.Symbol,
        S = core.groups.S,
        round = core.Utils.round,
        isInt = core.Utils.isInt,
        Math2 = core.Math2,
        variables = core.Utils.variables,
        isComposite = core.Utils.isComposite,
        isSymbol = core.Utils.isSymbol,
        isVector = core.Utils.isVector,
        N = core.groups.N,
        EX = core.groups.EX,
        FN = core.groups.FN,
        PL = core.groups.PL,
        CP = core.groups.CP,
        CB = core.groups.CB,
        Vector = core.Vector;
    
    var __ = core.Algebra = {
        /*
        * proots is Mr. David Binner's javascript port of the Jenkins-Traub algorithm.
        * The original source code can be found here http://www.akiti.ca/PolyRootRe.html.
        */  
        version: '1.1.0',
        proots: function(symbol, decp) { 
            //the roots will be rounded up to 7 decimal places.
            //if this causes trouble you can explicitly pass in a different number of places
            decp = decp || 7;
            var zeros = 0;
            if(symbol instanceof Symbol && symbol.isPoly(true)) { 
                if(symbol.group === core.groups.S) { 
                    return [0];
                }
                else if(symbol.group === core.groups.PL) { 
                    var powers = keys(symbol.symbols),
                        minpower = core.Utils.arrayMin(powers),
                        factor = core.PARSER.parse(symbol.value+'^'+minpower);
                    zeros = minpower;
                    symbol = core.PARSER.divide(symbol, core.PARSER.parse(symbol.value+'^'+minpower));
                }

                var roots = calcroots();
                for(var i=0;i<zeros;i++) roots.unshift(0);

                return roots;
            }
            else {
                throw new Error('Cannot calculate roots. Symbol must be a polynomial!');
            }

            function calcroots(){	
                var MAXDEGREE = 100, // Degree of largest polynomial accepted by this script.
                    variable = keys( symbol.symbols ).sort().pop(), 
                    sym = symbol.group === core.groups.PL ? symbol.symbols : symbol.symbols[variable], 
                    g = sym.group,
                    powers = g === S ? [sym.power] : keys( sym.symbols ),
                    rarr = [],
                    max = core.Utils.arrayMax(powers); //maximum power and degree of polynomial to be solved
                // Prepare the data
                for(var i=1; i<=max; i++) { 
                    var c = 0; //if there is no power then the hole must be filled with a zero
                    if(powers.indexOf(i+'') !== -1) { 
                        if(g === S) { 
                            c = sym.multiplier; 
                        }
                        else {
                            c = sym.symbols[i].multiplier;
                        }
                    }
                    // Insert the coeffient but from the front
                    rarr.unshift(c);
                }

                rarr.push(symbol.symbols['#'].multiplier);
                
                if(sym.group === S) rarr[0] = sym.multiplier;//the symbol maybe of group CP with one variable

                // Make a copy of the coefficients before appending the max power
                var p = rarr.slice(0);

                // Divide the string up into its individual entries, which--presumably--are separated by whitespace
                rarr.unshift(max);


                if (max > MAXDEGREE){
                    throw new Error("This utility accepts polynomials of degree up to " + MAXDEGREE + ". ");
                }

                var zeroi = [],   // Vector of imaginary components of roots
                    degreePar = {};    // degreePar is a dummy variable for passing the parameter POLYDEGREE by reference
                degreePar.Degree = max; 

                for (i = 0; i < max; i++) {
                    zeroi.push(0);
                }
                var zeror = zeroi.slice(0); // Vector of real components of roots

                // Find the roots
                //--> Begin Jenkins-Traub

                /*
                 * A verbatim copy of Mr. David Binner's Jenkins-Traub port
                */
               function QuadSD_ak1(NN, u, v, p, q, iPar){
                   // Divides p by the quadratic 1, u, v placing the quotient in q and the remainder in a, b
                   // iPar is a dummy variable for passing in the two parameters--a and b--by reference
                   q[0] = iPar.b = p[0];
                   q[1] = iPar.a = -(u*iPar.b) + p[1];

                   for (var i = 2; i < NN; i++){
                       q[i] = -(u*iPar.a + v*iPar.b) + p[i];
                       iPar.b = iPar.a;
                       iPar.a = q[i];
                   } 
                   return;
               } 

               function calcSC_ak1(DBL_EPSILON, N, a, b, iPar, K, u, v, qk){
                   // This routine calculates scalar quantities used to compute the next K polynomial and
                   // new estimates of the quadratic coefficients.
                   // calcSC -	integer variable set here indicating how the calculations are normalized
                   // to avoid overflow.
                   // iPar is a dummy variable for passing in the nine parameters--a1, a3, a7, c, d, e, f, g, and h --by reference

                   // sdPar is a dummy variable for passing the two parameters--c and d--into QuadSD_ak1 by reference
                   var sdPar = new Object(),    
                   // TYPE = 3 indicates the quadratic is almost a factor of K
                       dumFlag = 3;	

                   // Synthetic division of K by the quadratic 1, u, v
                   sdPar.b =  sdPar.a = 0.0;
                   QuadSD_ak1(N, u, v, K, qk, sdPar);
                   iPar.c = sdPar.a;
                   iPar.d = sdPar.b;

                   if (Math.abs(iPar.c) <= (100.0*DBL_EPSILON*Math.abs(K[N - 1]))) {
                       if (Math.abs(iPar.d) <= (100.0*DBL_EPSILON*Math.abs(K[N - 2])))  return dumFlag;
                   } 

                   iPar.h = v*b;
                   if (Math.abs(iPar.d) >= Math.abs(iPar.c)){
                         // TYPE = 2 indicates that all formulas are divided by d
                       dumFlag = 2;		
                       iPar.e = a/(iPar.d);
                       iPar.f = (iPar.c)/(iPar.d);
                       iPar.g = u*b;
                       iPar.a3 = (iPar.e)*((iPar.g) + a) + (iPar.h)*(b/(iPar.d));
                       iPar.a1 = -a + (iPar.f)*b;
                       iPar.a7 = (iPar.h) + ((iPar.f) + u)*a;
                   } 
                   else {
                       // TYPE = 1 indicates that all formulas are divided by c;
                       dumFlag = 1;		
                       iPar.e = a/(iPar.c);
                       iPar.f = (iPar.d)/(iPar.c);
                       iPar.g = (iPar.e)*u;
                       iPar.a3 = (iPar.e)*a + ((iPar.g) + (iPar.h)/(iPar.c))*b;
                       iPar.a1 = -(a*((iPar.d)/(iPar.c))) + b;
                       iPar.a7 = (iPar.g)*(iPar.d) + (iPar.h)*(iPar.f) + a;
                   } 
                   return dumFlag;
               } 

               function nextK_ak1(DBL_EPSILON, N, tFlag, a, b, iPar, K, qk, qp){
                   // Computes the next K polynomials using the scalars computed in calcSC_ak1
                   // iPar is a dummy variable for passing in three parameters--a1, a3, and a7
                   var temp;
                   if (tFlag == 3){	// Use unscaled form of the recurrence
                       K[1] = K[0] = 0.0;
                       for (var i = 2; i < N; i++)	 { K[i] = qk[i - 2]; }
                       return;
                   } 

                   temp = ((tFlag == 1) ? b : a);
                   if (Math.abs(iPar.a1) > (10.0*DBL_EPSILON*Math.abs(temp))){
                       // Use scaled form of the recurrence
                       iPar.a7 /= iPar.a1;
                       iPar.a3 /= iPar.a1;
                       K[0] = qp[0];
                       K[1] = -(qp[0]*iPar.a7) + qp[1];
                       for (var i = 2; i < N; i++)	 K[i] = -(qp[i - 1]*iPar.a7) + qk[i - 2]*iPar.a3 + qp[i];
                   } 
                   else {
                       // If a1 is nearly zero, then use a special form of the recurrence
                       K[0] = 0.0;
                       K[1] = -(qp[0]*iPar.a7);
                       for (var i = 2; i < N; i++) { K[i] = -(qp[i - 1]*iPar.a7) + qk[i - 2]*iPar.a3; }
                   } 
                   return;
               }

               function newest_ak1(tFlag, iPar, a, a1, a3, a7, b, c, d, f, g, h, u, v, K, N, p){
                   // Compute new estimates of the quadratic coefficients using the scalars computed in calcSC_ak1
                   // iPar is a dummy variable for passing in the two parameters--uu and vv--by reference
                   // iPar.a = uu, iPar.b = vv

                   var a4, a5, b1, b2, c1, c2, c3, c4, temp;
                   iPar.b = iPar.a = 0.0;// The quadratic is zeroed

                   if (tFlag != 3){
                       if (tFlag != 2){
                           a4 = a + u*b + h*f;
                           a5 = c + (u + v*f)*d;
                       } 
                       else { 
                           a4 = (a + g)*f + h;
                           a5 = (f + u)*c + v*d;
                       } 

                       // Evaluate new quadratic coefficients
                       b1 = -(K[N - 1]/p[N]);
                       b2 = -(K[N - 2] + b1*p[N - 1])/p[N];
                       c1 = v*b2*a1;
                       c2 = b1*a7;
                       c3 = b1*b1*a3;
                       c4 = -(c2 + c3) + c1;
                       temp = -c4 + a5 + b1*a4;
                       if (temp != 0.0) {
                           iPar.a = -((u*(c3 + c2) + v*(b1*a1 + b2*a7))/temp) + u;
                           iPar.b = v*(1.0 + c4/temp);
                       } 
                   } 
                   return;
               } 

               function Quad_ak1(a, b1, c, iPar){
                   // Calculates the zeros of the quadratic a*Z^2 + b1*Z + c
                   // The quadratic formula, modified to avoid overflow, is used to find the larger zero if the
                   // zeros are real and both zeros are complex. The smaller real zero is found directly from
                   // the product of the zeros c/a.

                   // iPar is a dummy variable for passing in the four parameters--sr, si, lr, and li--by reference

                   var b, d, e;
                   iPar.sr = iPar.si = iPar.lr = iPar.li = 0.0;

                   if (a == 0) {
                       iPar.sr = ((b1 != 0) ? -(c/b1) : iPar.sr);
                       return;
                   } 
                   if (c == 0){
                       iPar.lr = -(b1/a);
                       return;
                   } 

                   // Compute discriminant avoiding overflow
                   b = b1/2.0;
                   if (Math.abs(b) < Math.abs(c)){
                       e = ((c >= 0) ? a : -a);
                       e = -e + b*(b/Math.abs(c));
                       d = Math.sqrt(Math.abs(e))*Math.sqrt(Math.abs(c));
                   } 
                   else { 
                       e = -((a/b)*(c/b)) + 1.0;
                       d = Math.sqrt(Math.abs(e))*(Math.abs(b));
                   } 

                   if (e >= 0) {
                       // Real zeros
                       d = ((b >= 0) ? -d : d);
                       iPar.lr = (-b + d)/a;
                       iPar.sr = ((iPar.lr != 0) ? (c/(iPar.lr))/a : iPar.sr);
                   }
                   else { 
                       // Complex conjugate zeros
                       iPar.lr = iPar.sr = -(b/a);
                       iPar.si = Math.abs(d/a);
                       iPar.li = -(iPar.si);
                   } 
                   return;
               }  

               function QuadIT_ak1(DBL_EPSILON, N, iPar, uu, vv, qp, NN, sdPar, p, qk, calcPar, K){
                   // Variable-shift K-polynomial iteration for a quadratic factor converges only if the
                   // zeros are equimodular or nearly so.
                   // iPar is a dummy variable for passing in the five parameters--NZ, lzi, lzr, szi, and szr--by reference
                   // sdPar is a dummy variable for passing the two parameters--a and b--in by reference
                   // calcPar is a dummy variable for passing the nine parameters--a1, a3, a7, c, d, e, f, g, and h --in by reference

                   // qPar is a dummy variable for passing the four parameters--szr, szi, lzr, and lzi--into Quad_ak1 by reference
                   var qPar = new Object(),    
                       ee, mp, omp, relstp, t, u, ui, v, vi, zm,
                       i, j = 0, tFlag, triedFlag = 0;   // Integer variables

                   iPar.NZ = 0;// Number of zeros found
                   u = uu; // uu and vv are coefficients of the starting quadratic
                   v = vv;

                   do {
                       qPar.li = qPar.lr =  qPar.si = qPar.sr = 0.0;
                       Quad_ak1(1.0, u, v, qPar);
                       iPar.szr = qPar.sr;
                       iPar.szi = qPar.si;
                       iPar.lzr = qPar.lr;
                       iPar.lzi = qPar.li;

                       // Return if roots of the quadratic are real and not close to multiple or nearly
                       // equal and of opposite sign.
                       if (Math.abs(Math.abs(iPar.szr) - Math.abs(iPar.lzr)) > 0.01*Math.abs(iPar.lzr))  break;

                       // Evaluate polynomial by quadratic synthetic division

                       QuadSD_ak1(NN, u, v, p, qp, sdPar);

                       mp = Math.abs(-((iPar.szr)*(sdPar.b)) + (sdPar.a)) + Math.abs((iPar.szi)*(sdPar.b));

                       // Compute a rigorous bound on the rounding error in evaluating p

                       zm = Math.sqrt(Math.abs(v));
                       ee = 2.0*Math.abs(qp[0]);
                       t = -((iPar.szr)*(sdPar.b));

                       for (i = 1; i < N; i++)  { ee = ee*zm + Math.abs(qp[i]); }

                       ee = ee*zm + Math.abs(t + sdPar.a);
                       ee = (9.0*ee + 2.0*Math.abs(t) - 7.0*(Math.abs((sdPar.a) + t) + zm*Math.abs((sdPar.b))))*DBL_EPSILON;

                       // Iteration has converged sufficiently if the polynomial value is less than 20 times this bound
                       if (mp <= 20.0*ee){
                           iPar.NZ = 2;
                           break;
                       } 

                       j++;
                       // Stop iteration after 20 steps
                       if (j > 20)  break;
                       if (j >= 2){
                           if ((relstp <= 0.01) && (mp >= omp) && (!triedFlag)){
                               // A cluster appears to be stalling the convergence. Five fixed shift
                               // steps are taken with a u, v close to the cluster.
                               relstp = ((relstp < DBL_EPSILON) ? Math.sqrt(DBL_EPSILON) : Math.sqrt(relstp));
                               u -= u*relstp;
                               v += v*relstp;

                               QuadSD_ak1(NN, u, v, p, qp, sdPar);
                               for (i = 0; i < 5; i++){
                                   tFlag = calcSC_ak1(DBL_EPSILON, N, sdPar.a, sdPar.b, calcPar, K, u, v, qk);
                                   nextK_ak1(DBL_EPSILON, N, tFlag, sdPar.a, sdPar.b, calcPar, K, qk, qp);
                               } 

                               triedFlag = 1;
                               j = 0;

                           } 
                       }
                       omp = mp;

                       // Calculate next K polynomial and new u and v
                       tFlag = calcSC_ak1(DBL_EPSILON, N, sdPar.a, sdPar.b, calcPar, K, u, v, qk);
                       nextK_ak1(DBL_EPSILON, N, tFlag, sdPar.a, sdPar.b, calcPar, K, qk, qp);
                       tFlag = calcSC_ak1(DBL_EPSILON, N, sdPar.a, sdPar.b, calcPar, K, u, v, qk);
                       newest_ak1(tFlag, sdPar, sdPar.a, calcPar.a1, calcPar.a3, calcPar.a7, sdPar.b, calcPar.c, calcPar.d, calcPar.f, calcPar.g, calcPar.h, u, v, K, N, p);
                       ui = sdPar.a;
                       vi = sdPar.b;

                       // If vi is zero, the iteration is not converging
                       if (vi != 0){
                           relstp = Math.abs((-v + vi)/vi);
                           u = ui;
                           v = vi;
                       } 
                   } while (vi != 0); 
                   return;
               } 

               function RealIT_ak1(DBL_EPSILON, iPar, sdPar, N, p, NN, qp, K, qk){
                   // Variable-shift H-polynomial iteration for a real zero
                   // sss	- starting iterate = sdPar.a
                   // NZ		- number of zeros found = iPar.NZ
                   // dumFlag	- flag to indicate a pair of zeros near real axis, returned to iFlag

                   var ee, kv, mp, ms, omp, pv, s, t,
                       dumFlag, i, j, nm1 = N - 1;   // Integer variables

                   iPar.NZ = j = dumFlag = 0;
                   s = sdPar.a;

                   for ( ; ; ) {
                       pv = p[0];

                       // Evaluate p at s
                       qp[0] = pv;
                       for (i = 1; i < NN; i++)  { qp[i] = pv = pv*s + p[i]; }
                       mp = Math.abs(pv);

                       // Compute a rigorous bound on the error in evaluating p
                       ms = Math.abs(s);
                       ee = 0.5*Math.abs(qp[0]);
                       for (i = 1; i < NN; i++)  { ee = ee*ms + Math.abs(qp[i]); }

                       // Iteration has converged sufficiently if the polynomial value is less than
                       // 20 times this bound
                       if (mp <= 20.0*DBL_EPSILON*(2.0*ee - mp)){
                           iPar.NZ = 1;
                           iPar.szr = s;
                           iPar.szi = 0.0;
                           break;
                       } 
                       j++;
                       // Stop iteration after 10 steps
                       if (j > 10)  break;

                       if (j >= 2){
                           if ((Math.abs(t) <= 0.001*Math.abs(-t + s)) && (mp > omp)){
                               // A cluster of zeros near the real axis has been encountered.
                               // Return with iFlag set to initiate a quadratic iteration.
                               dumFlag = 1;
                               iPar.a = s;
                               break;
                           } // End if ((fabs(t) <= 0.001*fabs(s - t)) && (mp > omp))
                       } //End if (j >= 2)

                       // Return if the polynomial value has increased significantly
                       omp = mp;

                       // Compute t, the next polynomial and the new iterate
                       qk[0] = kv = K[0];
                       for (i = 1; i < N; i++)	 { qk[i] = kv = kv*s + K[i]; }

                       if (Math.abs(kv) > Math.abs(K[nm1])*10.0*DBL_EPSILON){
                           // Use the scaled form of the recurrence if the value of K at s is non-zero
                           t = -(pv/kv);
                           K[0] = qp[0];
                           for (i = 1; i < N; i++) { K[i] = t*qk[i - 1] + qp[i]; }
                       }
                       else { 
                           // Use unscaled form
                           K[0] = 0.0;
                           for (i = 1; i < N; i++)	 K[i] = qk[i - 1];
                       }

                       kv = K[0];
                       for (i = 1; i < N; i++) { kv = kv*s + K[i]; }
                       t = ((Math.abs(kv) > (Math.abs(K[nm1])*10.0*DBL_EPSILON)) ? -(pv/kv) : 0.0);
                       s += t;
                   } 
                   return dumFlag;
               } 

               function Fxshfr_ak1(DBL_EPSILON, MDP1, L2, sr, v, K, N, p, NN, qp, u, iPar){

                   // Computes up to L2 fixed shift K-polynomials, testing for convergence in the linear or
                   // quadratic case. Initiates one of the variable shift iterations and returns with the
                   // number of zeros found.
                   // L2	limit of fixed shift steps
                   // iPar is a dummy variable for passing in the five parameters--NZ, lzi, lzr, szi, and szr--by reference
                   // NZ	number of zeros found
                   var sdPar = new Object(),    // sdPar is a dummy variable for passing the two parameters--a and b--into QuadSD_ak1 by reference
                       calcPar = new Object(),
                       // calcPar is a dummy variable for passing the nine parameters--a1, a3, a7, c, d, e, f, g, and h --into calcSC_ak1 by reference

                       qk = new Array(MDP1),
                       svk = new Array(MDP1),
                       a, b, betas, betav, oss, ots, otv, ovv, s, ss, ts, tss, tv, tvv, ui, vi, vv,
                       fflag, i, iFlag = 1, j, spass, stry, tFlag, vpass, vtry;     // Integer variables

                   iPar.NZ = 0;
                   betav = betas = 0.25;
                   oss = sr;
                   ovv = v;

                   //Evaluate polynomial by synthetic division
                   sdPar.b =  sdPar.a = 0.0;
                   QuadSD_ak1(NN, u, v, p, qp, sdPar);
                   a = sdPar.a;
                   b = sdPar.b;
                   calcPar.h = calcPar.g = calcPar.f = calcPar.e = calcPar.d = calcPar.c = calcPar.a7 = calcPar.a3 = calcPar.a1 = 0.0;
                   tFlag = calcSC_ak1(DBL_EPSILON, N, a, b, calcPar, K, u, v, qk);

                   for (j = 0; j < L2; j++){
                       fflag = 1;

                       // Calculate next K polynomial and estimate v
                       nextK_ak1(DBL_EPSILON, N, tFlag, a, b, calcPar, K, qk, qp);
                       tFlag = calcSC_ak1(DBL_EPSILON, N, a, b, calcPar, K, u, v, qk);

                       // Use sdPar for passing in uu and vv instead of defining a brand-new variable.
                       // sdPar.a = ui, sdPar.b = vi
                       newest_ak1(tFlag, sdPar, a, calcPar.a1, calcPar.a3, calcPar.a7, b, calcPar.c, calcPar.d, calcPar.f, calcPar.g, calcPar.h, u, v, K, N, p);
                       ui = sdPar.a;
                       vv = vi = sdPar.b;

                       // Estimate s
                       ss = ((K[N - 1] != 0.0) ? -(p[N]/K[N - 1]) : 0.0);
                       ts = tv = 1.0;

                       if ((j != 0) && (tFlag != 3)){
                           // Compute relative measures of convergence of s and v sequences
                           tv = ((vv != 0.0) ? Math.abs((vv - ovv)/vv) : tv);
                           ts = ((ss != 0.0) ? Math.abs((ss - oss)/ss) : ts);

                           // If decreasing, multiply the two most recent convergence measures
                           tvv = ((tv < otv) ? tv*otv : 1.0);
                           tss = ((ts < ots) ? ts*ots : 1.0);

                           // Compare with convergence criteria
                           vpass = ((tvv < betav) ? 1 : 0);
                           spass = ((tss < betas) ? 1 : 0);

                           if ((spass) || (vpass)){

                               // At least one sequence has passed the convergence test.
                               // Store variables before iterating

                               for (i = 0; i < N; i++) { svk[i] = K[i]; }
                               s = ss;

                               // Choose iteration according to the fastest converging sequence

                                 stry = vtry = 0;

                               for ( ; ; ) {
                                   if ((fflag && ((fflag = 0) == 0)) && ((spass) && (!vpass || (tss < tvv)))){
                                       ;// Do nothing. Provides a quick "short circuit".
                                   } 
                                   else { 
                                       QuadIT_ak1(DBL_EPSILON, N, iPar, ui, vi, qp, NN, sdPar, p, qk, calcPar, K);
                                       a = sdPar.a;
                                       b = sdPar.b;

                                       if ((iPar.NZ) > 0) return;

                                       // Quadratic iteration has failed. Flag that it has been tried and decrease the
                                       // convergence criterion
                                       iFlag = vtry = 1;
                                       betav *= 0.25;

                                       // Try linear iteration if it has not been tried and the s sequence is converging
                                       if (stry || (!spass)){
                                           iFlag = 0;
                                       }
                                       else {
                                           for (i = 0; i < N; i++) K[i] = svk[i];
                                       } 
                                   }
                                   //fflag = 0;
                                   if (iFlag != 0){
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

                                       if (iFlag != 0){
                                           // If linear iteration signals an almost double real zero, attempt quadratic iteration
                                           ui = -(s + s);
                                           vi = s*s;
                                           continue;

                                       } 
                                   } 

                                   // Restore variables
                                   for (i = 0; i < N; i++) K[i] = svk[i];

                                   // Try quadratic iteration if it has not been tried and the v sequence is converging
                                   if (!vpass || vtry) break;		// Break out of infinite for loop

                               } 

                               // Re-compute qp and scalar values to continue the second stage

                               QuadSD_ak1(NN, u, v, p, qp, sdPar);
                               a = sdPar.a;
                               b = sdPar.b;

                               tFlag = calcSC_ak1(DBL_EPSILON, N, a, b, calcPar, K, u, v, qk);
                           } 
                       } 
                       ovv = vv;
                       oss = ss;
                       otv = tv;
                       ots = ts;
                   } 
                   return;
               }  

               function rpSolve(degPar, p, zeror, zeroi){ 
                   var N = degPar.Degree,
                       RADFAC = 3.14159265358979323846/180,  // Degrees-to-radians conversion factor = PI/180
                       LB2 = Math.LN2,// Dummy variable to avoid re-calculating this value in loop below
                       MDP1 = degPar.Degree + 1,
                       K = new Array(MDP1),
                       pt = new Array(MDP1),
                       qp = new Array(MDP1),
                       temp = new Array(MDP1),
                       // qPar is a dummy variable for passing the four parameters--sr, si, lr, and li--by reference
                       qPar = new Object(),
                       // Fxshfr_Par is a dummy variable for passing parameters by reference : NZ, lzi, lzr, szi, szr);
                       Fxshfr_Par = new Object(),
                       bnd, DBL_EPSILON, df, dx, factor, ff, moduli_max, moduli_min, sc, x, xm,
                       aa, bb, cc, sr, t, u, xxx,
                       j, jj, l, NM1, NN, zerok;// Integer variables

                   // Calculate the machine epsilon and store in the variable DBL_EPSILON.
                   // To calculate this value, just use existing variables rather than create new ones that will be used only for this code block
                   aa = 1.0;
                   do {
                       DBL_EPSILON = aa;
                       aa /= 2;
                       bb = 1.0 + aa;
                   } while (bb > 1.0);

                   var LO = Number.MIN_VALUE/DBL_EPSILON,
                       cosr = Math.cos(94.0*RADFAC),// = -0.069756474
                       sinr = Math.sin(94.0*RADFAC),// = 0.99756405
                       xx = Math.sqrt(0.5),// = 0.70710678
                       yy = -xx;

                   Fxshfr_Par.NZ = j = 0;
                   Fxshfr_Par.szr = Fxshfr_Par.szi =  Fxshfr_Par.lzr = Fxshfr_Par.lzi = 0.0;

                   // Remove zeros at the origin, if any
                   while (p[N] == 0){
                       zeror[j] = zeroi[j] = 0;
                       N--;
                       j++;
                   }
                   NN = N + 1;

                   // >>>>> Begin Main Loop <<<<<
                   while (N >= 1){ // Main loop
                       // Start the algorithm for one zero
                       if (N <= 2){
                           // Calculate the final zero or pair of zeros
                           if (N < 2){
                               zeror[degPar.Degree - 1] = -(p[1]/p[0]);
                               zeroi[degPar.Degree - 1] = 0;
                           } 
                           else { 
                               qPar.li = qPar.lr =  qPar.si = qPar.sr = 0.0;
                               Quad_ak1(p[0], p[1], p[2], qPar);
                               zeror[degPar.Degree - 2] = qPar.sr;
                               zeroi[degPar.Degree - 2] = qPar.si;
                               zeror[degPar.Degree - 1] = qPar.lr;
                               zeroi[degPar.Degree - 1] = qPar.li;
                           } 
                             break;
                       } 

                       // Find the largest and smallest moduli of the coefficients
                       moduli_max = 0.0;
                       moduli_min = Number.MAX_VALUE;

                       for (i = 0; i < NN; i++){
                           x = Math.abs(p[i]);
                           if (x > moduli_max) moduli_max = x;
                           if ((x != 0) && (x < moduli_min)) moduli_min = x;
                       }

                       // Scale if there are large or very small coefficients
                       // Computes a scale factor to multiply the coefficients of the polynomial. The scaling
                       // is done to avoid overflow and to avoid undetected underflow interfering with the
                       // convergence criterion.
                       // The factor is a power of the base.
                       sc = LO/moduli_min;

                       if (((sc <= 1.0) && (moduli_max >= 10)) || ((sc > 1.0) && (Number.MAX_VALUE/sc >= moduli_max))){
                           sc = ((sc == 0) ? Number.MIN_VALUE : sc);
                           l = Math.floor(Math.log(sc)/LB2 + 0.5);
                           factor = Math.pow(2.0, l);
                           if (factor != 1.0){
                               for (i = 0; i < NN; i++) p[i] *= factor;
                           } 
                       } 

                       // Compute lower bound on moduli of zeros
                       for (var i = 0; i < NN; i++) pt[i] = Math.abs(p[i]);
                       pt[N] = -(pt[N]);
                       NM1 = N - 1;

                       // Compute upper estimate of bound
                       x = Math.exp((Math.log(-pt[N]) - Math.log(pt[0]))/N);

                       if (pt[NM1] != 0) {
                           // If Newton step at the origin is better, use it
                           xm = -pt[N]/pt[NM1];
                           x = ((xm < x) ? xm : x);
                       } 

                       // Chop the interval (0, x) until ff <= 0
                       xm = x;
                       do {
                           x = xm;
                           xm = 0.1*x;
                           ff = pt[0];
                           for (var i = 1; i < NN; i++) { ff = ff *xm + pt[i]; }
                       } while (ff > 0); // End do-while loop

                       dx = x;
                       // Do Newton iteration until x converges to two decimal places

                       do {
                           df = ff = pt[0];
                           for (var i = 1; i < N; i++){
                               ff = x*ff + pt[i];
                               df = x*df + ff;
                           } // End for i
                           ff = x*ff + pt[N];
                           dx = ff/df;
                           x -= dx;
                       } while (Math.abs(dx/x) > 0.005); // End do-while loop

                       bnd = x;

                       // Compute the derivative as the initial K polynomial and do 5 steps with no shift
                       for (var i = 1; i < N; i++) K[i] = (N - i)*p[i]/N;
                       K[0] = p[0];
                       aa = p[N];
                       bb = p[NM1];
                       zerok = ((K[NM1] == 0) ? 1 : 0);

                       for (jj = 0; jj < 5; jj++) {
                           cc = K[NM1];
                               if (zerok){
                                   // Use unscaled form of recurrence
                                   for (var i = 0; i < NM1; i++){
                                       j = NM1 - i;
                                       K[j] = K[j - 1];
                                   } // End for i
                                   K[0] = 0;
                                   zerok = ((K[NM1] == 0) ? 1 : 0);
                               } 
                               else { 
                                   // Used scaled form of recurrence if value of K at 0 is nonzero
                                   t = -aa/cc;
                                   for (var i = 0; i < NM1; i++){
                                       j = NM1 - i;
                                       K[j] = t*K[j - 1] + p[j];
                                   } // End for i
                                   K[0] = p[0];
                                   zerok = ((Math.abs(K[NM1]) <= Math.abs(bb)*DBL_EPSILON*10.0) ? 1 : 0);
                               } 
                       } 

                       // Save K for restarts with new shifts
                       for (var i = 0; i < N; i++) temp[i] = K[i];

                       // Loop to select the quadratic corresponding to each new shift
                       for (jj = 1; jj <= 20; jj++){

                           // Quadratic corresponds to a double shift to a non-real point and its
                           // complex conjugate. The point has modulus BND and amplitude rotated
                           // by 94 degrees from the previous shift.

                           xxx = -(sinr*yy) + cosr*xx;
                           yy = sinr*xx + cosr*yy;
                           xx = xxx;
                           sr = bnd*xx;
                           u = -(2.0*sr);

                           // Second stage calculation, fixed quadratic
                           Fxshfr_ak1(DBL_EPSILON, MDP1, 20*jj, sr, bnd, K, N, p, NN, qp, u, Fxshfr_Par);

                           if (Fxshfr_Par.NZ != 0){
                               // The second stage jumps directly to one of the third stage iterations and
                               // returns here if successful. Deflate the polynomial, store the zero or
                               // zeros, and return to the main algorithm.
                               j = degPar.Degree - N;
                               zeror[j] = Fxshfr_Par.szr;
                               zeroi[j] = Fxshfr_Par.szi;
                               NN = NN - Fxshfr_Par.NZ;
                               N = NN - 1;
                               for (var i = 0; i < NN; i++) p[i] = qp[i];
                               if (Fxshfr_Par.NZ != 1){
                                   zeror[j + 1] = Fxshfr_Par.lzr;
                                   zeroi[j + 1] = Fxshfr_Par.lzi;
                               }
                               break;
                           } 
                           else { 
                             // If the iteration is unsuccessful, another quadratic is chosen after restoring K
                             for (var i = 0; i < N; i++) { K[i] = temp[i]; }
                           } 
                       } 
                       // Return with failure if no convergence with 20 shifts
                       if (jj > 20) {
                           degPar.Degree -= N;
                           break;
                       } 
                   }
                   // >>>>> End Main Loop <<<<<
                   return;
               }
                //--> End Jenkins-Traub
                rpSolve(degreePar, p, zeror, zeroi);

                var l = zeroi.length;
                //format the output
                for( i=0; i<l; i++ ) {
                    // We round the imaginary part to avoid having something crazy like 5.67e-16.
                    var img = round( zeroi[i], decp+8 ),
                        real = round( zeror[i], decp );
                    // Did the rounding pay off? If the rounding did nothing more than chop off a few digits then no.
                    // If the rounding results in a a number at least 3 digits shorter we'll keep it else we'll keep 
                    // the original otherwise the rounding was worth it.
                    real = decp - String( real ).length > 2 ? real : zeror[i];
                    var sign = img < 0 ? '-' : '';

                    // Remove the zeroes
                    if( real === 0 ) { real = ''; }
                    if( img === 0 ) { img = ''; }

                    // Remove 1 as the multiplier and discard imaginary part if there isn't one.
                    img = Math.abs( img ) === 1 ? sign+'i' : ( img ? img+'*i' : '' );

                    var num = ( real && img ) ? real + '+' + img : real+img;
                    zeror[i] = num.replace(/\+\-/g, '-');
                }
                return zeror;
            } 
         },
        froot: function(f, guess, dx) { 
            var newtonraph = function(xn) {
                var mesh = 1e-12,
                    // If the derivative was already provided then don't recalculate.
                    df = dx ? dx : build(core.Calculus.diff(f.copy())),
                    
                    // If the function was passed in as a function then don't recalculate.
                    fn = f instanceof Function ? f : build(f),
                    max = 10000,
                    done = false, 
                    safety = 0;
                while( !done ) { 
                    var x = xn-(fn(xn)/df(xn));
                    //absolute values for both x & xn ensures that we indeed have the radius    
                    var r = Math.abs(x) - Math.abs(xn),
                        delta = Math.abs(r);
                    xn = x; 

                    if( delta < mesh ) done = true;
                    else if( safety > max ) {
                        xn = null;
                        done = true;
                    }
                    
                    safety++;
                }
                return xn;
            };
            return newtonraph( Number( guess ) );
        },
        factor: function(symbol) {
            var retval = symbol,
                group = symbol.group,
                isCompositionGroup = function(group) {
                    return (group === PL || group === CP);
                };

            if(isCompositionGroup(group)) {
                //distribute the multiplier in sub-symbols
                for(var x in symbol.symbols) symbol.symbols[x].distributeMultiplier(); 
                //factor the multiplier
                var gcf = Math2.GCD.apply(undefined, symbol.coeffs()),
                        
                    factorize = function(symbol) { 
                        for(var x in symbol.symbols) {
                            var sub = symbol.symbols[x]; 
                            if(isCompositionGroup(sub.group)) {
                                factorize(sub);
                            }
                            else {
                                sub.multiplier /= gcf;
                            }
                        }
                    };
                
                if(symbol.power <= 1) {
                    factorize(symbol);
                    symbol.multiplier *= Math.pow(gcf, symbol.power);

                    if(group === PL) {
                        var powers = keys(symbol.symbols),
                            lowest_power = core.Utils.arrayMin(powers),
                            factor = _.parse(symbol.value+'^'+lowest_power);
                        var factored = new core.Symbol(0);
                        for(var x in symbol.symbols) {
                            factored = _.add(factored, _.divide(symbol.symbols[x], factor.copy()));
                        }

                        factored = _.symfunction(core.PARENTHESIS, [factored]);//place it parenthesis
                        factored.power *= symbol.power;
                        factored.multiplier *= symbol.multiplier;
                        factor.power *= symbol.power;

                        retval = _.multiply(factor, factored);
                    }
                    else if(group === CP) { 
                        try{
                            var p = symbol.power,
                                roots = core.Utils.arrayUnique(core.Algebra.proots(symbol)),
                                all_ints = true; 
                            for(var i=0; i<roots.length; i++) {
                                if(!isInt(roots[i])) all_ints = false;
                            }
                            var result = new Symbol(1);
                            if(all_ints)  {
                                roots.map(function(root) {
                                    result = _.multiply(result, 
                                        _.symfunction(core.PARENTHESIS, 
                                        [_.subtract(new Symbol(variables(symbol)[0]), new Symbol(root))]));
                                });
                                result.multiplier *= symbol.multiplier;
                                retval = result; 
                                retval.power = p;
                            }
                        }
                        catch(e) {
                            try {
                                //not a polynomial. No biggie. Let's see if we can extract a few variables
                                var symbols = symbol.collectSymbols(),
                                    num_symbols = symbol.length,
                                    hash_table = {};
                                for(var i=0; i<num_symbols; i++) {
                                    var cur_symbol = symbols[i], //collect all the variables contained in the symbol
                                        num_vars = vars.length;
                                    for(var j=0; j<num_vars; j++) {
                                        var var_name = vars[j],
                                            variable = cur_symbol.value === var_name ? cur_symbol : cur_symbol.symbols[var_name],
                                            var_record = hash_table[var_name];
                                        if(isSymbol(variable.power)) throw new Error('Cannot factor symbol. Exiting');
                                        if(!var_record) hash_table[var_name] = [1, variable.power];
                                        else {
                                            var_record[0]++;
                                            var p = variable.power;
                                            if(p < var_record[1]) var_record[1] = p;
                                        }
                                    }
                                }
                                var factor = [];
                                //we now know which variables we have and to which power so we can start reducing
                                for(var x in hash_table) {
                                    var_record = hash_table[x];
                                    //if we have as many recorded as there were sub-symbols then we can divide all of them
                                    //by that symbol
                                    if(var_record[0] === num_symbols) { 
                                        factor.push(x+'^'+var_record[1]);
                                    }
                                };

                                //we can now divide each one by that factor
                                factor = _.parse(factor.join('*'));//make it a Symbol
                                for(x in symbol.symbols) {
                                    symbol.symbols[x] = _.divide(symbol.symbols[x], factor.copy());
                                }

                                retval = _.multiply(_.parse(symbol.text()), factor);
                            }
                            catch(e){;}
                        }
                    }
                }     
            }
            
            if(retval.group === core.groups.FN) retval.updateHash();
            
            return retval;
        },
        expand: function (symbol) { 
            var is_composite = isComposite(symbol);

            function powerExpand(symbol) {
                if(!isComposite(symbol)) return symbol; //nothing to do here

                var p = symbol.power,
                    n = Math.abs(p); //store the power
                if(isInt(p) && n !== 1) { 
                    var sign = p / n,
                        multiplier = symbol.multiplier;//store the multiplier
                    n--; //iterations should be n-1 times
                    symbol.power = 1;
                    symbol.multiplier = 1;
                    var result = symbol.copy();
                    for(var i=0; i<n; i++) { 
                        result = polyExpand(result, i === n ? symbol : symbol.copy());
                    }
                    result.multiplier = multiplier;
                    if(result.power) result.power *= sign;
                    symbol = result;
               }

               return symbol;  
            }

            function polyExpand(symbol1, symbol2) { 
                var result = new Symbol(0),
                    s1_is_comp = isComposite(symbol1),
                    s2_is_comp = isComposite(symbol2);

                if(!s1_is_comp && s2_is_comp || symbol1.power < 0 && !(symbol2.power < 0)) { 
                    var t = symbol2; symbol2 = symbol1; symbol1 = t; //swap
                    //reuse t and also swap bools
                    t = s2_is_comp; s2_is_comp = s1_is_comp; s1_is_comp = t;
                }
                var result = new Symbol(0),
                    //make sure that their both positive or both negative
                    same_sign = core.Utils.sameSign(symbol1.power, symbol2.power);
                if(s1_is_comp) {
                    for(var x in symbol1.symbols) {
                        var symbolx = symbol1.symbols[x];
                        if(s2_is_comp  && same_sign) {
                            for(var y in symbol2.symbols) {
                                var symboly = symbol2.symbols[y],
                                    expanded;
                                if(isComposite(symbolx) || isComposite(symboly)) {
                                    expanded = polyExpand(symbolx.copy(), symboly.copy());
                                }
                                else {
                                    expanded = _.multiply(symbolx.copy(), symboly.copy());
                                }
                                result = _.add(result, expanded);
                            }
                        }
                        else {
                            result = _.add(result, _.multiply(symbolx.copy(), symbol2.copy()));
                        }
                    }
                }
                else {
                    result = _.multiply(symbol1, symbol2);
                }
                
                return result;
            }
            symbol = powerExpand(symbol); 

            if(symbol.symbols && symbol.group !== core.groups.EX) { 
                //there is no way to know if one of the symbols contained within
                //the CB is a composite so unfortunately we have to loop over each one of them.
                var symbols = symbol.collectSymbols(),
                    l = symbols.length;
                for(var i=0; i<l-1; i++) { 
                    var symbol1 = powerExpand(symbols.pop()),
                        symbol2 = powerExpand(symbols.pop());
                    var expanded = !is_composite ? polyExpand(symbol1, symbol2) : _.add(symbol1, symbol2.copy());
                    symbols.push(expanded);
                }

                var expanded_symbol = symbols[0];
                if(expanded_symbol) {
                    expanded_symbol.multiplier *= symbol.multiplier;
                    if(expanded_symbol.group !== core.groups.N) {
                        expanded_symbol.distributeMultiplier();
                        expanded.power *= symbol.power;
                    }
                        
                    symbol = expanded_symbol;
                    //put back the sign
                }
            }
            else if(symbol.args) {
                symbol.args[0] = __.expand(symbol.args[0]);
                if(symbol.group === core.groups.FN) symbol.updateHash();
            }
            else if(symbol.group === core.groups.EX) {
                symbol.power = __.expand(symbol.power);
            }
            
            return symbol;
        },
        poly2Arrays: function(symbol, sort) {
            var self = this; 
            if(!symbol.isPoly()) throw new Error('Polynomial Expected! Received '+core.Utils.text(symbol));
            var c = [];
                if(Math.abs(symbol.power) !== 1) symbol = core.Algebra.expand(symbol);

                if(symbol.group === core.groups.N) {c.push([symbol.multiplier, 0]); }
                else if(symbol.group === core.groups.S) { c.push([symbol.multiplier, symbol.power]); }
                else {
                    for(var x in symbol.symbols) {
                        if(core.Utils.isSymbol(p)) throw new Error('power cannot be a Symbol');
                        var sub = symbol.symbols[x],
                            p = sub.power; 
                        if(sub.symbols){
                            c.push.apply(c, self.poly2Arrays(sub));
                        }
                        else {
                            c.push([sub.multiplier, p||0]);
                        }
                    }
                }

                if(sort) { 
                    c = c.sort(function(a, b) { return (a[1] > b[1]); }); 
                }

                return c;
        },
        zeroPolynomial: function(a) {
            return (a[0] === 0 && a[1] === 0);
        },
        polyArrayCopy: function(poly_array) {
            return poly_array.map(function(x) {
                return x.slice(0);
            });
        },
        polyfill: function(arr) {
            //if the first power isn't zero make it so
            if(arr[0][1] !== 0) arr.unshift([0,0]);
            var n = arr.length-1,
                o = [],
                last;
            for(var i=0; i<n; i++) {
                last = arr.pop();
                o.push(last);
                var last_pow = last[1],
                    next_pow = arr[n-(i+1)][1],
                    gap = (last_pow-next_pow)-1;
                for(var j=0; j<gap; j++) { 
                    o.push([0,last_pow-(j+1)]);
                }
            }
            o.push(arr[0]);
            return o;
        },
        polyArrayDiv: function(dividend, divisor) { 
            var max_pow_div = divisor[0][1],//the maximum divisor power
                coeff_div = divisor[0][0],
                dl = divisor.length,
                curpos = 0, //the walker along the numerator;
                top = [];
            //while the difference of the powers is greater than zero
            do {
                var max_pow_num = dividend[curpos][1], //the current maximum power
                    //the ratio of the first coefficients which will be used to adjust out the divisor
                    mratio = dividend[curpos][0]/coeff_div, 
                    pow_difference = max_pow_num-max_pow_div;//the difference in maximum powers
                if(pow_difference < 0) break; //out of bounds check <<<
                //place the symbol on the top
                top.push([mratio, pow_difference]);
                //start at the current cursor position
                for(var i=0; i<dl; i++) {
                    var div_i = curpos+i,
                        cur_sym_den = divisor[i]; //current working symbol in denominator
                    //adjust the dividend coeff
                    dividend[div_i][0] -= cur_sym_den[0]*mratio;
                }
                curpos++;
            }
            while(pow_difference > 0);

            //filter the results
            var remainder = [],
                rl = dividend.length;
            for(i=0; i<rl; i++) {
                var p = dividend[i];
                if(p[0] !== 0) remainder.push(p);
            };
            if(top[0] === undefined) top.push([0,0]);
            if(remainder[0] === undefined) remainder.push([0,0]);
            return [top, remainder];
        },
        polyArrayCoeffs: function(a, all) { 
            var c = [],
                l = a.length;
            for(var i=0; i<l; i++) {
                var coeff = a[i][0];
                if(coeff !== 0 || all) c.push(coeff);
            }
            return c;
        },
        polydiv: function(symbol, asArray) { 
            //A numerator and a denominator is expected. The symbol must therefore be of group CB
            if(symbol.group === CB) {
                var symbols = symbol.collectSymbols(),
                    n = symbols.length,
                    variable = core.Utils.variables(symbol)[0],   
                    num, denom;
                for(var i=0; i<n; i++) { 
                    if(symbols[i].power < 0) {
                        denom = core.Utils.remove(symbols, i);
                        break;
                    }
                }
                //A try catch block is used since if either the denominator or the numerator is not a polynomial
                //or if the symbol does not contain a denominator the an error is thrown and the symbol is 
                //returned;
                try{
                    //if there's no denominator then an error is thrown and goodbye.
                    if(n-- > 2) {
                        for(i=0; i<n; i++) {
                            symbols[i] = '('+symbols[i].text()+')';
                        }
                        //it's easier just to parse it back to symbol than to salvage the existing symbols
                        num = _.parse(symbols.join('*')); 
                    }
                    else {
                        num = symbols[0];
                    }

                    //collect the coefficients and powers and sort them by powers, ascending
                    var divisor;
                    if(denom.group === core.groups.S && denom.value === variable) {
                        divisor = [[symbol.multiplier, symbol.power]];
                    }
                    else {
                        divisor = core.Algebra.poly2Arrays(denom, true);
                    }
                    var dividend = core.Algebra.poly2Arrays(num, true);
                    //fill the gaps
                    dividend = core.Algebra.polyfill(dividend);
                    divisor = core.Algebra.polyfill(divisor);

                    var result = core.Algebra.polyArrayDiv(dividend, divisor),
                        top = result[0],
                        remainder = result[1];

                    if(!asArray) {
                        var stringify = function(a) {
                                return a.map(function(item){
                                    return item[0]+'*'+variable+'^'+item[1];
                                }).join('+');
                            };
                        remainder = _.parse(stringify(remainder));
                        top = _.parse(stringify(top));
                    }
                    return [top, remainder];
                }
                catch(e) {;}  
            }
            return symbol;
        },
        polyArrayGCD: function(parr1, parr2) {
            var max_pow_arr1 = parr1[0][1],
                max_pow_arr2 = parr2[0][1];

            if(max_pow_arr1 === max_pow_arr2 && parr1.length === 1 && parr2.length === 1) {
                return [[core.Math2.GCD(parr1[0][0], parr2[0][0]), max_pow_arr1]];
            }

            //get a common gcd amongst the coefficients
            var gcd = core.Math2.GCD.apply(undefined, __.polyArrayCoeffs(parr1).concat(__.polyArrayCoeffs(parr2)));
            if(gcd !== 1) {
                var gcd_divide = function(a) {
                    a[0] = a[0]/gcd;
                    return a;
                };
                parr1 = parr1.map(gcd_divide);
                parr2 = parr2.map(gcd_divide);
            };

            if(max_pow_arr2 > max_pow_arr1) {
                var t = parr2; parr2 = parr1; parr1 = t; //swap it all
            }
            var dividend = parr1,
                divisor = parr2,
                remainder,result;
            do {
                result = __.polyArrayDiv(__.polyArrayCopy(dividend), __.polyArrayCopy(divisor));
                remainder = result[1];
                dividend = divisor;
                divisor = remainder;
            }
            while(!(remainder[0][0] === 0 && remainder[0][1] === 0));
            //factor
            var retval = dividend,
                l = retval.length;

            var coeff_gcd = core.Math2.GCD.apply(undefined, __.polyArrayCoeffs(retval))/gcd;

            if(coeff_gcd !== 1) {
                for(var i=0; i<l; i++) { retval[i][0] /= coeff_gcd; }
            }

            return retval;
        },
        polyGCD: function() { 
            var polyArrayGCD = core.Algebra.polyArrayGCD,
                n = arguments.length,
                curpos = 0,
                p1 = __.poly2Arrays(arguments[curpos]);
            while(n > ++curpos) { 
                //send in the smallest possible value
                var p2 = __.poly2Arrays(arguments[curpos]);
                p1 = polyArrayGCD(__.polyfill(p1),p2 = __.polyfill(p2));
            }
            return p1;
        },
        //assumes you've already verified that it's a polynomial
        polyPowers: function(e, for_variable, powers) { 
            powers = powers || [];
            var g = g = e.group; 
            if(g ===  PL && for_variable === e.value) {
                powers = powers.concat(keys(e.symbols)); 
            }
            else if(g === CP) { 
                for(var s in e.symbols) {
                    var symbol = e.symbols[s]; 
                    var g = symbol.group, v = symbol.value; 
                    if(g === S && for_variable === v) powers.push(symbol.power);
                    else if(g === PL || g === CP) powers = __.polyPowers(symbol, for_variable, powers);
                    else if(g === CB && symbol.contains(for_variable)) {
                        var t = symbol.symbols[for_variable];
                        if(t) powers.push((t.power));
                    }
                    else if(g === N || for_variable !== v) powers.push(0);
                }
            }
            return core.Utils.arrayUnique(powers).sort();
        },
        allLinear: function(set) {
            var l = set.length;
            for(var i=0; i<l; i++) if(!__.isLinear(set[i])) return false;
            return true;
        },
        isLinear: function(e) {
            var status = false, g = e.group;
            if(g === PL || g === CP) {
                status = true;
                for(var s in e.symbols) {
                    var symbol = e.symbols[s], sg = symbol.group;
                    if(sg === FN || sg === EX || sg === CB) { status = false;}
                    else {
                        if(sg === PL || sg === CP) status = __.isLinear(symbol);
                        else {
                            if(symbol.group !== N && symbol.power !== 1) { status = false; break; }
                        }
                    }
                }
            }
            else if(g === S && e.power === 1) status = true;
            return status;
        }
    };

    nerdamer.register([
        {
            /*
            * Other than the preparation of the coefficients, 
            * this function is Mr. David Binner's javascript port of the Jenkins-Traub algorithm.
            * The original source code can be found here http://www.akiti.ca/PolyRootRe.html.
            */    
            name: 'proots',
            visible: true,
            numargs: [1,2],
            build: function() { return __.proots; }
        },
        {
            name: 'factor',
            visible: true,
            numargs: 1,
            build: function() { return __.factor; }
        },
        {
            name: 'expand',
            visible: true,
            numargs: 1,
            build: function() { return __.expand; }
        },
        {
            name: 'polyGCD',
            visible: true,
            numargs: -1,
            build: function() { return __.polyGCD; }
        }
    ]);
})();
