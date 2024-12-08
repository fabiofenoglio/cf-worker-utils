import {ManagedError, toManagedError} from "../../../errors";
import {RetryOptions, withRetry} from "../../../runners/retry";

export class KVRepository<T> {
    private readonly bucket: KVNamespace;
    private readonly prefix: string | null;
    protected retryOptions: RetryOptions;

    constructor(
        private input: {
            bucket: KVNamespace;
            prefix: string | null | undefined;
            retryOptions?: RetryOptions;
        },
    ) {
        if (!input.bucket) {
            throw new Error('missing required input bucket');
        }

        this.bucket = input.bucket;
        this.prefix = input.prefix?.trim() || null;

        this.retryOptions = input.retryOptions ?? {
            retries: 3,
            backoff: n => {
                // 10, 100, 200, ...
                if (n <= 1) {
                    return 10;
                }
                return (n-1) * 100;
            }
        }
    }

    protected buildKey(id: string): string {
        if (!id?.length) {
            throw new Error('invalid empty ID');
        }
        if (!this.prefix?.length) {
            return id;
        }
        let prefix = this.prefix;
        while (prefix.endsWith('/')) {
            prefix = prefix.substring(0, prefix.length - 1);
        }
        while (id.startsWith('/')) {
            id = id.substring(1);
        }
        return prefix + '/' + id;
    }

    public async get(id: string): Promise<T | null> {
        if (!id?.length) {
            throw new Error('invalid empty ID');
        }
        const k = this.buildKey(id);
        try {
            return await withRetry(
                () => this.bucket.get<T>(k, 'json'),
                this.retryOptions,
            );
        } catch (err) {
            throw new ManagedError('error getting record from KV store', {
                cause: toManagedError(err),
                details: {
                    key: k,
                },
            });
        }
    }

    public async getWithMetadata<M>(id: string): Promise<KVNamespaceGetWithMetadataResult<T, M> | null> {
        if (!id?.length) {
            throw new Error('invalid empty ID');
        }
        const k = this.buildKey(id);
        try {
            return await withRetry(
                () => this.bucket.getWithMetadata<T, M>(k, 'json'),
                this.retryOptions,
            );
        } catch (err) {
            throw new ManagedError('error getting record from KV store with metadata', {
                cause: toManagedError(err),
                details: {
                    key: k,
                },
            });
        }
    }

    public async put(id: string, value: T, options?: KVNamespacePutOptions | undefined): Promise<void> {
        if (!id?.length) {
            throw new Error('invalid empty ID');
        }
        const k = this.buildKey(id);
        try {
            return await withRetry(
                () => this.bucket.put(k, JSON.stringify(value), options),
                this.retryOptions,
            );
        } catch (err) {
            throw new ManagedError('error writing record in KV store', {
                cause: toManagedError(err),
                details: {
                    key: k,
                    value: value,
                    options,
                },
            });
        }
    }

    public async delete(id: string): Promise<void> {
        if (!id?.length) {
            throw new Error('invalid empty ID');
        }
        const k = this.buildKey(id);
        try {
            return await withRetry(
                () => this.bucket.delete(k),
                this.retryOptions,
            );
        } catch (err) {
            throw new ManagedError('error deleting record from KV store', {
                cause: toManagedError(err),
                details: {
                    key: k,
                },
            });
        }
    }

    public async list(options?: KVNamespaceListOptions | undefined): Promise<KVNamespaceListResult<T, string>> {
        if (this.prefix?.length) {
            if (options?.prefix?.length) {
                options = {
                    prefix: this.buildKey(options.prefix),
                }
            } else {
                options = {
                    prefix: this.prefix + '/',
                }
            }
        }

        let r: KVNamespaceListResult<T, string>;

        try {
            r = await withRetry(
                () => this.bucket.list<T>(options),
                this.retryOptions,
            );
        } catch (err) {
            throw new ManagedError('error listing record from KV store', {
                cause: toManagedError(err),
                details: {
                    options,
                },
            });
        }

        if (this.prefix?.length) {
            for (let i = 0; i < r.keys.length; i ++) {
                let newKey = r.keys[i].name;
                const expectedPrefix = this.prefix + '/';
                if (!newKey.startsWith(expectedPrefix)) {
                    throw new Error(`listed key "${newKey}" was expected to start with "${expectedPrefix}" but did not`);
                }
                newKey = newKey.substring(expectedPrefix.length);
                r.keys[i].name = newKey;
            }
        }

        return r
    }

    public async getOrPut(id: string, getter: () => Promise<T>, putOptions?: KVNamespacePutOptions | undefined): Promise<T> {
        if (!id?.length) {
            throw new Error('invalid empty ID');
        }

        const present = await this.get(id);
        if (present) {
            return present;
        }

        const fetched = await getter();

        await this.put(id, fetched, putOptions);

        return fetched;
    }
}