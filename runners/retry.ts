export type BackoffStrategy = (attempt: number) => number;

export type RetryOptions = {
    retries?: number;
    backoff?: BackoffStrategy;
}

/**
 * A retry helper function with customizable retries and backoff strategy.
 * @param task - A function that returns a promise of type T.
 * @param options - Customize the retry options.
 * @param options.retries - The maximum number of retry attempts.
 * @param options.backoff - A backoff strategy function that takes the attempt number and returns the delay in milliseconds.
 * @returns A promise that resolves with the task result or rejects with the last error.
 */
export async function withRetry<T>(
    task: () => Promise<T>,
    options: RetryOptions | undefined,
): Promise<T> {
    const effectiveRetries = options?.retries ?? 3;
    const effectiveBackoff: BackoffStrategy = options?.backoff ??  ((a) => a * 100);

    if (!effectiveRetries) {
        return await task();
    }

    let attempt = 0;

    while (attempt <= effectiveRetries) {
        try {
            return await task();
        } catch (error) {
            if (attempt >= effectiveRetries) {
                throw error;
            }
            const delay = effectiveBackoff(attempt + 1);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
        attempt++;
    }

    throw new Error('retry attempts exhausted');
}