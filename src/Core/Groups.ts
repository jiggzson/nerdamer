export enum Groups {
    //Add the groups. These have been reorganized as of v0.5.1 to make CP the highest group
    //The groups that help with organizing during parsing. Note that for FN is still a function even
    //when it's raised to a symbol, which typically results in an EX
    N = 1, // A number
    P = 2, // A number with a rational power e.g. 2^(3/5).
    S = 3, // A single variable e.g. x.
    EX = 4, // An exponential
    FN = 5, // A function
    PL = 6, // A symbol/expression having same name with different powers e.g. 1/x + x^2
    CB = 7, // A symbol/expression composed of one or more variables through multiplication e.g. x*y
    CP = 8 // A symbol/expression composed of one variable and any other symbol or number x+1 or x+y
}
