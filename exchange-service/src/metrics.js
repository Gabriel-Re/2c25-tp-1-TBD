import StatsD from "hot-shots";

const STATSD_HOST = "graphite";
const STATSD_PORT = 8125;
const METRICS_PREFIX = "arvault.";

// Cliente StatsD compartido (hot-shots)
const statsdClient = new StatsD({ host: STATSD_HOST, port: STATSD_PORT, prefix: METRICS_PREFIX, errorHandler: () => {} });

// Registramos métricas de volumen de cualquier moneda
export function recordMetrics(currency, amount, type) {
  if (!currency || !Number.isFinite(amount) || amount <= 0) return;
  
  const currencyLower = currency.toLowerCase();
  const totalMetric = `${currencyLower}.volume.total`;
  const netMetric = `${currencyLower}.volume.net`;
  const netDelta = type === "buy" ? amount : -amount;

  // Los contadores 
  statsdClient.increment(totalMetric, amount);
  statsdClient.increment(netMetric, netDelta);
}

export function closeMetrics() {
  try {
    statsdClient.close();
  } catch (_) {}
}
