
export interface ManagedErrorOptions extends ErrorOptions {
    details?: any;
    code?: string;
}

export interface ManagedErrorObject {
    message: string;
    cause?: any;
    details?: any;
    code?: string;
}

export class ManagedError extends Error {
    details?: any;
    code?: string;

    constructor(message: string, options?: ManagedErrorOptions) {
        super(message, options);

        this.details = options?.details;
        this.code = options?.code;

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, ManagedError.prototype);
    }

    toObject(): ManagedErrorObject {
        const outCause = !this.cause ? undefined :
            this.cause instanceof ManagedError ?
                this.cause.toObject() :
                this.cause instanceof Error ?
                    new ManagedError(this.cause.message, {
                        cause: this.cause?.cause,
                    }).toObject() :
                    this.cause;

        return {
            message: this.message,
            code: this.code,
            details: this.details,
            cause: outCause,
        }
    }
}

export function Unwrap(err: any, matcher: (e: any) => boolean): Error | null {
    let e = err;
    let i = 0;
    while (true) {
        if (e === null || (typeof e) === 'undefined' || !(e instanceof Error)) {
            return null;
        }

        if (matcher(e)) {
            return e;
        }

        e = e?.cause;

        if (i++ >= 1000) {
            throw new Error('exceeded max depth in Unwrap chain - does the error cause wrap on itself?');
        }
    }
}

export function toManagedError(e: any): ManagedError {
    if (e === null || (typeof e) === 'undefined') {
        return new ManagedError('null error');
    }

    if (e instanceof ManagedError) {
        return e;
    }

    if (e instanceof Error) {
        return new ManagedError(e.message, {
            cause: e.cause ? toManagedError(e.cause) : undefined,
            code: (e as any)?.code,
            details: (e as any)?.details,
        });
    }

    if (e?.message) {
        return new ManagedError(e?.message, {
            cause: e.cause ? toManagedError(e.cause) : undefined,
            code: e?.code,
            details: e?.details,
        });
    }

    return new ManagedError('unknown error', {
        cause: e?.cause ? toManagedError(e.cause) : e,
        code: e?.code,
        details: e?.details,
    });
}

export function runWrapping<T>(task: () => T): T {
    try {
        return task();
    } catch (err) {
        throw toManagedError(err);
    }
}