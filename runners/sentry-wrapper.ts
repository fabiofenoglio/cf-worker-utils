import { Toucan } from 'toucan-js';
import { ErrorEvent, EventHint, Event } from '@sentry/types'

export async function handleWithSentry<T, Env = unknown>(
    handler: () => Promise<T>,
    input: {
        sentryDSN: string;
        workerName: string;
        req?: Request<any, any>;
        env: Env;
        ctx: ExecutionContext;
        doReport?: (err: any) => Promise<boolean>,
        beforeSend?: ((event: ErrorEvent, hint: EventHint) => Event | PromiseLike<Event | null> | null) | undefined
    }
) {
    const sentry = new Toucan({
        dsn: input.sentryDSN,
        context: input.ctx,
        request: input.req,
        beforeSend: async (event, hint) => {
            event.tags = {
                ...(event.tags || {}),
                'worker': input.workerName,
            };
            event.contexts = {
                ...(event.contexts || {}),
                'worker': {
                    'name': input.workerName,
                }
            };
            event.fingerprint = [
                'worker:' + input.workerName,
                ...(event.fingerprint || ['{{ default }}']),
            ];
            if (input.beforeSend) {
                return await input.beforeSend(event, hint);
            }
            return event;
        },
    });

    try {
        return await handler();
    } catch (err) {
        if (!input.doReport || await input.doReport(err)) {
            sentry.captureException(err);
        }

        throw err;
    }
}

export async function handleFetchWithSentry<Env = unknown, CfHostMetadata = unknown>(
    handler: ExportedHandlerFetchHandler<Env, CfHostMetadata>,
    input: {
        sentryDSN: string;
        workerName: string;
        req: Request<any, any>;
        env: Env;
        ctx: ExecutionContext;
    }
): Promise<Response> {
    return handleWithSentry<Response>(async () => {
        return await handler(input.req, input.env, input.ctx);
    }, {
        doReport: async (err: any) => {
            if ((err as any)?.status === 401) {
                return false;
            }
            return true;
        },
        ...input,
    });
}