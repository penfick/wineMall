import { Params } from 'nestjs-pino';

export function buildLoggerConfig(): Params {
  const isDev = process.env.NODE_ENV !== 'production';
  return {
    pinoHttp: {
      level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
      transport: isDev
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: true,
              translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
              ignore: 'pid,hostname,req,res,responseTime',
              messageFormat: '{msg} {req.method} {req.url} {res.statusCode} +{responseTime}ms',
            },
          }
        : undefined,
      autoLogging: {
        ignore: (req) => req.url === '/health' || req.url === '/favicon.ico',
      },
      customProps: () => ({ context: 'HTTP' }),
      serializers: {
        req: (req) => ({
          method: req.method,
          url: req.url,
          remoteAddress: req.headers?.['x-forwarded-for'] || req.remoteAddress,
        }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    },
  };
}
