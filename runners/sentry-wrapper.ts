import { Toucan } from 'toucan-js';

export async function handleWithSentry<Env = unknown>(
    handler: () => Promise<unknown>,
    input: {
        sentryDSN: string;
        workerName: string;
        req?: Request<any, any>;
        env: Env;
        ctx: ExecutionContext;
        doReport?: (err: any) => Promise<boolean>,
    }
) {
    const sentry = new Toucan({
        dsn: input.sentryDSN,
        context: input.ctx,
        request: input.req,
        beforeSend: (event) => {
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
) {
    return handleWithSentry(async () => {
        await handler(input.req, input.env, input.ctx);
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