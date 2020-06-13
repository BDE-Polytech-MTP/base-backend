export function hide<T extends {[key: string]: any}>(obj: T, ... properties: string[]): T {
    let copy = { ... obj };
    for (let prop of properties) {
        let value = copy[prop];
        Object.defineProperty(copy, prop, {
            value,
            configurable: true,
            enumerable: false,
            writable: true,
        });
    }
    return copy;
}