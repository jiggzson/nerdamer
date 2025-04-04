export function bm(callback: ()=>void, label='benchmark', max=1e3) {
    const start = performance.now();

    for(let i=0; i<max; i++) {
        callback();
    }

    const result = performance.now()-start;

    if(label) {
        console.log(`${label}: ${result}`);
    }
    
    return result;
}

export function avgBm(callback: ()=>void, n=5, max=1e3, label='') {
    const benchmarks: number[] = [];

    const avg = array => array.reduce((a, b) => a + b) / array.length;

    for(let i=0; i<n; i++) {
        benchmarks.push(bm(callback, label, max));
    }

    console.log(`Average of ${n} runs: ${avg(benchmarks)}`);
}