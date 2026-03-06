import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { env } from '../config/env';
import { logger } from './logger';

let sdk: NodeSDK | null = null;

if (env.OTEL_ENABLED) {
  if (env.NODE_ENV !== 'production') {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);
  }

  const traceExporter = env.OTEL_EXPORTER_OTLP_ENDPOINT
    ? new OTLPTraceExporter({ url: `${env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces` })
    : undefined;

  sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: env.OTEL_SERVICE_NAME,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: env.NODE_ENV,
    }),
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-http': { enabled: true },
        '@opentelemetry/instrumentation-express': { enabled: true },
        '@opentelemetry/instrumentation-pg': { enabled: true },
        '@opentelemetry/instrumentation-ioredis': { enabled: true },
      }),
    ],
  });

  try {
    sdk.start();
    logger.info({ service: env.OTEL_SERVICE_NAME }, 'OpenTelemetry started');
  } catch (error) {
    logger.error({ err: error }, 'OpenTelemetry start failed');
  }
}

export async function shutdownTracing(): Promise<void> {
  if (!sdk) return;
  try {
    await sdk.shutdown();
  } catch (error) {
    logger.error({ err: error }, 'OpenTelemetry shutdown failed');
  }
}
