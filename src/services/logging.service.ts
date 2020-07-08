export interface LoggingService {

    /**
     * Logs an informative message.
     * 
     * @param message The message to log
     * @param data Complementary data to log
     */
    info(message: string, data?: any): void;

    /**
     * Logs a warning message.
     * 
     * @param message The message to log
     * @param data Complementary data to log
     */
    warning(message: any, data?: any): void;

    /**
     * Logs an error message.
     * 
     * @param message The message to log
     * @param data Complementary data to log
     */
    error(message: any, data?: any): void;

}