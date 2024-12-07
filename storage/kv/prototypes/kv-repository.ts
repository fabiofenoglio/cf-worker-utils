import {ManagedError, toManagedError} from "../../../errors";

export class KVRepository<T> {
    constructor(
        private bucket: KVNamespace,
        private prefix: string | null,
    ) {
    }

    protected buildKey(id: string): string {
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
        const k = this.buildKey(id);
        try {
            return this.bucket.get<T>(k, 'json')
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
        const k = this.buildKey(id);
        try {
            return this.bucket.getWithMetadata<T, M>(k, 'json')
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
        const k = this.buildKey(id);
        try {
            return this.bucket.put(k, JSON.stringify(value), options);
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
        const k = this.buildKey(id);
        try {
            return this.bucket.delete(k)
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

        try {
            return this.bucket.list<T>(options);
        } catch (err) {
            throw new ManagedError('error listing record from KV store', {
                cause: toManagedError(err),
                details: {
                    options,
                },
            });
        }
    }
}