/**
 * Finds the value for the data with the given path in the given dictionnary or `undefined` if no data was
 * found.
 * 
 * Example given the following `from`:
 * ```
 * from = {
 *      user: {
 *          name: 'George'
 *      },
 *      event: {
 *          beginning: 64231684
 *      }
 *  }
 * ```
 * With `path = ["user", "name"]`, the result will be `'George'`.
 * 
 * With `path = ["event", "beginning"]`, the result will be `64231684`.
 * 
 * With `path = ["user", "age"]`, the result will be `undefined`.
 * 
 * @param from The dictionnary to find data in
 * @param path The path to the data in the given dictionnary
 * @returns the data associated with the given path, or undefined if no data was found
 */
function extractValue(from: {[key: string]: any}, path: string[]): any {
    let i = 0;

    while (i < path.length - 1 && typeof from === 'object') {
        from = from[path[i]];
        i++;
    }
    
    return i == path.length - 1 && typeof from === 'object' ? from[path[i]] : undefined;
}

function parsePath(path: string): string[] {
    path = path.trim();
    if (path.length === 0) {
        throw new Error("Provided path is empty");
    }
    const pathSteps = path.split('.');
    if (pathSteps.findIndex((value) => value.trim().length === 0) != -1) {
        throw new Error("Provided path contains empty parts.")
    }
    return pathSteps;
}

/**
 * Represents the state of the configuration for the value checker the user is currently creating.
 */
interface ValueConfig {
    /** The user specified value path (dot joined path) */
    fullPath: string,
    /** The computed path, splitted on dots, trimmed, without empty part */
    path: string[],
    /** true if the value is required, false if the value is optional */
    required: boolean;
    /** Minimum length for strings, minimum value for integers (optional) */
    min?: number;
    /** Maximum length for strings, maximum value for integers */
    max?: number;
    /** Required type for the value */
    kind?: 'string' | 'number'
    /** Regex to be matched if a value is a string (optional) */
    regex?: RegExp
}

/**
 * Builder class to create a value validator.
 */
export class ValidatorBuilder<T> implements TypeStep<T>, StringStep<T>, IntegerStep<T>, BuildStep<T> {

    /**
     * All checkers to run against and to satisfy to validate
     */
    private checkers: ValueChecker[] = [];
    /**
     * Configuration for the checker being currently builded
     */
    private currentState: ValueConfig | null = null;

    private constructor() {}

    /**
     * Creates a new ValidatorBuilder.
     */
    public static new<T>(): BuildStep<T> {
        return new ValidatorBuilder<T>();
    }

    toBeString(): StringStep<T> {
        this.currentState!.kind = 'string';
        return this;
    }

    withMinLength(length: number): StringStep<T> {
        if (length < 0) {
            throw new Error('String length can\'t be lower than 0');
        }
        this.currentState!.min = length;
        if (this.currentState!.max && this.currentState!.max < length) {
            throw new Error(`Specified a min length (${length}) greater than the previously specified max length (${this.currentState!.max})`);
        }
        return this;
    }

    withMaxLength(length: number): StringStep<T> {
        if (length < 0) {
            throw new Error('String length can\'t be lower than 0');
        }
        this.currentState!.max = length;
        if (this.currentState!.min && length < this.currentState!.min) {
            throw new Error(`Specified a max length (${length}) lower than the previously specified min length (${this.currentState!.min})`);
        }
        return this;
    }

    matching(regex: RegExp): StringStep<T> {
        this.currentState!.regex = regex;
        return this;
    }

    /**
     * Creates the checker function from the current configuration then add it to checkers array.
     */
    private finishCurrent(): void {
        if (this.currentState === null) {
            return;
        }

        const state = this.currentState;
        this.checkers.push((body: object | null) => {
            if (body === null) {
                if (state.required) {
                    throw new Error(`${state.fullPath} is required, but got an empty body.`);
                } else {
                    return;
                }
            }
            let value = extractValue(body, state.path);
            if (value === undefined) {
                if (state.required) {
                    throw new Error(`${state.fullPath} is required, but it can't be found in body.`);
                } else {
                    return;
                }
            }

            if (state.kind === 'string') {

                if (typeof value !== 'string') {
                    throw new Error(`Expected ${state.fullPath} to be a string, but got ${typeof value}.`);
                }

                value = value.trim();

                if (state.min !== undefined && value.length < state.min) {
                    throw new Error(`Expected ${state.fullPath} to be longer than or equal to ${state.min}, but got length of ${value.length}.`);
                }

                if (state.max !== undefined && value.length > state.max) {
                    throw new Error(`Expected ${state.fullPath} to be shorter than or equal to ${state.max}, but got length of ${value.length}.`);
                }

                if (state.regex && !state.regex.test(value)) {
                    throw new Error(`Expected ${state.fullPath} to match ${state.regex.source}, but got value ${value}.`);
                }

            } else {

                if (typeof value !== 'number') {
                    throw new Error(`Expected ${state.fullPath} to be an integer, but got ${typeof value}.`);
                }

                if (`${value}`.indexOf('.') !== -1) {
                    throw new Error(`Expected ${state.fullPath} to be an integer, but got floating number.`);
                }

                if (state.min !== undefined && value < state.min) {
                    throw new Error(`Expected ${state.fullPath} to be greater than or equal to ${state.min}, but got ${value}.`);
                }

                if (state.max !== undefined && value > state.max) {
                    throw new Error(`Expected ${state.fullPath} to be greater than or equal to ${state.max}, but got ${value}.`);
                }

            }
        });
        this.currentState = null;
    }

    toBeInteger(): IntegerStep<T> {
        this.currentState!.kind = 'number';
        return this;
    }

    withMinValue(minValue: number): IntegerStep<T> {
        this.currentState!.min = minValue;
        if (this.currentState!.max && this.currentState!.max < minValue) {
            throw new Error(`Specified a min value (${minValue}) greater than the previously specified max value (${this.currentState!.max})`);
        }
        return this;
    }

    withMaxValue(maxValue: number) {
        this.currentState!.max = maxValue;
        if (this.currentState!.min && maxValue < this.currentState!.min) {
            throw new Error(`Specified a max value (${maxValue}) lower than the previously specified min value (${this.currentState!.min})`);
        }
        return this;
    }

    requires(path: string): TypeStep<T> {
        this.finishCurrent();
        this.currentState = {
            required: true,
            path: parsePath(path),
            fullPath: path,
        }
        return this;
    }

    optional(path: string): TypeStep<T> {
        this.finishCurrent();
        this.currentState = {
            required: false,
            path: parsePath(path),
            fullPath: path,
        }
        return this;
    }


    build(): Validator<T> {
        this.finishCurrent();
        const checkers = this.checkers;
        return {
            validate: (body: {[key: string]: any} | null): ValidationResult<T> => {
                try {
                    for (let i = 0; i < checkers.length; i++) {
                        checkers[i](body);
                    }
                    return {
                        valid: true,
                        value: <T><unknown>body,
                    }
                } catch (e) {
                    return {
                        valid: false,
                        error: e
                    }
                }
            }
        }
    }

}

interface ValueChecker {
    (value: object | null): void;
}

interface Validator<T> {

    /**
     * Validates the given object and returns a result.
     * 
     * @param body The object to validate, or null
     */
    validate(body: {[key: string]: any} | null): ValidationResult<T>

}

interface ValidationResult<T> {
    /** True if validation is a success, false otherwise */
    valid: boolean;
    /** The validated value. undefined is validation failed */
    value?: T;
    /** The validator error. undfined is validation is a success */
    error?: Error;
}

interface BuildStep<T> {

    /**
     * Builds the final validator with all provided configuraions.
     */
    build(): Validator<T>;

    /**
     * Indicates the value of associated to the given path is required.
     * 
     * Example: 
     * `user.name` represents a property `name` in an `user` object (see below)
     * 
     * ```
     *  { 
     *      user: { 
     *          name: 'the name' 
     *      }
     *  }
     * ```
     * 
     * @param path The path to the value in the checked object
     */
    requires(path: string): TypeStep<T>;

    /**
     * Indicates the value of associated to the given path is optional.
     * 
     * See BuildStep#requires documentation for path explanation.
     * 
     * @param path The path to the value in the checked object
     */
    optional(path: string): TypeStep<T>;
}

interface TypeStep<T> {

    /**
     * Indicates we expect the data to be a string.
     */
    toBeString(): StringStep<T>;

    /**
     * Indicates we expect the data to be an integer.
     */
    toBeInteger(): IntegerStep<T>;
}

interface StringStep<T> extends BuildStep<T> {

    /**
     * Indicates the minimum allowed string length (inclusive) for the string.
     * 
     * @param length The minimum length for the string
     */
    withMinLength(length: number): StringStep<T>;

    /**
     * Indicates the maximum allowed length (inclusive) for the string.
     * 
     * @param length The maximum length for the string
     */
    withMaxLength(length: number): StringStep<T>;

    /**
     * Indicates the regex the string must match.
     * 
     * @param regex The regex the string must match
     */
    matching(regex: RegExp): StringStep<T>;
}

interface IntegerStep<T> extends BuildStep<T> {

    /**
     * Indicates the minimum allowed value (inclusive) for the integer.
     * 
     * @param value The min value for the integer
     */
    withMinValue(value: number): IntegerStep<T>;

    /**
     * Indicates the maximum allowed value (inclusive) for the integer.
     * 
     * @param value The maximum value for the integer
     */
    withMaxValue(value: number): IntegerStep<T>;
}