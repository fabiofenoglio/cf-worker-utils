import { Toucan } from 'toucan-js';

export async function handleFetchWithSentry<Env = unknown, CfHostMetadata = unknown>(
    input: {
        sentryDSN: string;
        workerName: string;
    }, 
    handler: ExportedHandlerFetchHandler<Env, CfHostMetadata>,
    args: {
        req: Request<any, any>;
        env: Env;
        ctx: ExecutionContext;
    },
) {
    const sentry = new Toucan({
        dsn: input.sentryDSN,
        context: args.ctx,
        request: args.req,
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
        return await handler(args.req, args.env, args.ctx);
    } catch (err) {
        sentry.captureException(err);

        throw err;
    }
}