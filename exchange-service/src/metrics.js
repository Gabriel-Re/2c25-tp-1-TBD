import StatsD from "hot-shots";

const STATSD_HOST = "graphite";
const STATSD_PORT = 8125;
const METRICS_PREFIX = "arvault.";

// Cliente StatsD compartido (hot-shots)
const statsdClient = new StatsD({ host: STATSD_HOST, port: STATSD_PORT, prefix: METRICS_PREFIX, errorHandler: () => {} });

export function recordUsdMetrics(amountUsd, type) {
  // compra o venta de USD
  // alias(keepLastValue(sumSeries(stats_counts.arvault.usd.volume.total)), 'USD Total')
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return;
  const totalMetric = "usd.volume.total";
  const netMetric = "usd.volume.net";
  const netDelta = type === "buy" ? amountUsd : -amountUsd;

  // Los contadores 
  statsdClient.increment(totalMetric, amountUsd);
  statsdClient.increment(netMetric, netDelta);
}

export function recordEurMetrics(amountEur, type) {
  // compra o venta de EUR
  if (!Number.isFinite(amountEur) || amountEur <= 0) return;
  const totalMetric = "eur.volume.total";
  const netMetric = "eur.volume.net";
  const netDelta = type === "buy" ? amountEur : -amountEur;

  // Los contadores 
  statsdClient.increment(totalMetric, amountEur);
  statsdClient.increment(netMetric, netDelta);
}

export function recordArsMetrics(amountArs, type) {
  // compra o venta de ARS
  if (!Number.isFinite(amountArs) || amountArs <= 0) return;
  const totalMetric = "ars.volume.total";
  const netMetric = "ars.volume.net";
  const netDelta = type === "buy" ? amountArs : -amountArs;

  // Los contadores 
  statsdClient.increment(totalMetric, amountArs);
  statsdClient.increment(netMetric, netDelta);
}

export function recordBrlMetrics(amountBrl, type) {
  // compra o venta de BRL
  if (!Number.isFinite(amountBrl) || amountBrl <= 0) return;
  const totalMetric = "brl.volume.total";
  const netMetric = "brl.volume.net";
  const netDelta = type === "buy" ? amountBrl : -amountBrl;

  // Los contadores 
  statsdClient.increment(totalMetric, amountBrl);
  statsdClient.increment(netMetric, netDelta);
}

export function closeMetrics() {
  try {
    statsdClient.close();
  } catch (_) {}
}


