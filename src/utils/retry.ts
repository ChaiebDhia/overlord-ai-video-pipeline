export async function withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            return await operation();
        } catch (error: any) {
            attempt++;
            
            // Don't retry on certain 4xx errors if it's an HTTP API error
            if (error?.status >= 400 && error?.status < 500 && error?.status !== 429) {
                throw error;
            }

            if (attempt >= maxRetries) {
                throw new Error(`Operation failed after ${maxRetries} attempts. Last error: ${error.message}`);
            }

            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.warn(`\t[Retry] Attempt ${attempt} failed, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error('Unreachable');
}