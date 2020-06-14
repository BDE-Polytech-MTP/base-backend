export interface Validator<T> {

    /**
     * Validates the given object and returns a result.
     * 
     * @param body The object to validate, or null
     */
    validate(body: {[key: string]: any} | null): ValidationResult<T>

}

export type ValidationResult<T> = { valid: true, value: T} | { valid: false, error: Error};

export interface BuildStep<T> {

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

export interface TypeStep<T> {

    /**
     * Indicates we expect the data to be a string.
     */
    toBeString(): StringStep<T>;

    /**
     * Indicates we expect the data to be an integer.
     */
    toBeInteger(): IntegerStep<T>;

    /**
     * Indicates we expect the data to be an array.
     */
    toBeArray(): ArrayStep<T>;

    /**
     * Indicates we expect the data to be a datetime. (this checks the value is a string with a proper ISO datetime format)
     */
    toBeDateTime(): BuildStep<T>;

    /**
     * Indicates we expect the data to be a boolean.
     */
    toBeBoolean(): BuildStep<T>;

}

export interface StringStep<T> extends BuildStep<T> {

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

export interface IntegerStep<T> extends BuildStep<T> {

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

export interface ArrayStep<T> {

    withMinLength(length: number): ArrayStep<T>;

    withMaxLength(length: number): ArrayStep<T>;

    withEachElement(): TypeStep<T>;

}