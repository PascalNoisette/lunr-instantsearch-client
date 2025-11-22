export function measureTime<T, U>(fn: (t: T) => Promise<U>): (t: T) => Promise<U & { processingTimeMS: number }> {
    return async function (t: T): Promise<U & { processingTimeMS: number }> {
        const start = performance.now();
        const result = await fn(t);
        const end = performance.now();
        console.info(`Query time: ${end - start} milliseconds`);
        return { ...result, processingTimeMS: end - start };
    };
}
