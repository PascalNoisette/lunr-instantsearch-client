import { createMemoryCache, type Cache } from '@algolia/client-common';
export function withCache(target: any, propertyKey: any, descriptor: PropertyDescriptor & { cache?: Cache }): any {
    if (typeof descriptor == 'undefined') {
        console.info(`Please enable decorator in tsconfig.json.
        {
            "compilerOptions": {
                "experimentalDecorators": true,
                "emitDecoratorMetadata": true,
      `);
        return;
    }
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]): Promise<any> {
        const cacheKey = JSON.stringify(args);
        if (typeof this.cache == 'undefined') {
            this.cache = createMemoryCache();
        }
        const cacheValue = await this.cache.get(cacheKey, () => Promise.resolve(false));

        if (cacheValue) {
            return cacheValue;
        }
        const result = await originalMethod.apply(this, args);
        if (typeof this.cache != 'undefined') {
            await this.cache.set(cacheKey, result);
        }
        return result;
    };

    return descriptor;
}
