import { nanoid } from "nanoid";
import dgram from "dgram";
import { connect as amqpConnect } from "amqp-connection-manager";

import { init as stateInit, getAccounts as stateAccounts, getRates as stateRates, getLog as stateLog } from "./state.js";

let accounts;
let rates;
let log;
let amqpConnection;
let publisherChannel;

// socket udp reutilizable para enviar metricas a statsd
let statsdSocket = null;
function getStatsdSocket() {
  try {
    if (!statsdSocket) {
      const socket = dgram.createSocket("udp4");
      if (typeof socket.unref === "function") {
        socket.unref();
      }
      statsdSocket = socket;
    }
  } catch (_) {
    statsdSocket = null;
  }
  return statsdSocket;
}

//call to initialize the exchange service
export async function init() {
  await stateInit();

  accounts = stateAccounts();
  rates = stateRates();
  log = stateLog();

  // Initialize RabbitMQ publisher (idempotent)
  if (!amqpConnection) {
    const RABBIT_USER = process.env.RABBIT_USER || "guest";
    const RABBIT_PASS = process.env.RABBIT_PASS || "guest";
    const RABBIT_HOST = process.env.RABBIT_HOST || "rabbitmq";
    const RABBIT_PORT = process.env.RABBIT_PORT || 5672;
    const RABBIT_URL = process.env.RABBIT_URL || `amqp://${RABBIT_USER}:${RABBIT_PASS}@${RABBIT_HOST}:${RABBIT_PORT}`;

    amqpConnection = amqpConnect([RABBIT_URL], {
      heartbeatIntervalInSeconds: 5,
      reconnectTimeInSeconds: 2,
    });

    amqpConnection.on("connect", () =>
      console.log(`RabbitMQ publisher connected: ${RABBIT_URL}`)
    );
    amqpConnection.on("disconnect", (params) =>
      console.warn(
        `RabbitMQ publisher disconnected: ${params?.err?.message || "unknown error"}`
      )
    );

    publisherChannel = amqpConnection.createChannel({
      json: false,
      setup: async (channel) => {
        await channel.assertQueue("TransactionRequest", { durable: true });
      },
    });
  }
}

//returns all internal accounts
export function getAccounts() {
  return accounts;
}

//sets balance for an account
export function setAccountBalance(accountId, balance) {
  const account = findAccountById(accountId);

  if (account != null) {
    account.balance = balance;
  }
}

//returns all current exchange rates
export function getRates() {
  return rates;
}

//returns the whole transaction log
export function getLog() {
  return log;
}

export function setRate(rateRequest) {
  const { baseCurrency, counterCurrency, rate } = rateRequest;

  rates[baseCurrency][counterCurrency] = rate;
  rates[counterCurrency][baseCurrency] = Number((1 / rate).toFixed(5));
}

export async function exchange(exchangeRequest) {
  const requestId = nanoid();
  console.log(`[API] Exchange request: ${exchangeRequest}`);
  const message = {
    id: requestId,
    ts: new Date().toISOString(),
    priority: 1,
    ...exchangeRequest,
  };

  try {
    await publisherChannel.sendToQueue(
      "TransactionRequest",
      Buffer.from(JSON.stringify(message)),
      { persistent: true, contentType: "application/json" }
    );

    const queuedResult = {
      id: requestId,
      ts: new Date(),
      ok: true,
      priority: 1,
      request: exchangeRequest,
      queued: true,
    };
    log.push(queuedResult);
    return queuedResult;
  } catch (e) {
    const errorResult = {
      id: requestId,
      ts: new Date(),
      ok: false,
      request: exchangeRequest,
      obs: `Failed to enqueue TransactionRequest: ${e?.message || e}`,
    };
    log.push(errorResult);
    return errorResult;
  }
}

// internal - call transfer service to execute transfer between accounts
async function transfer(fromAccountId, toAccountId, amount) {
  const min = 200;
  const max = 400;
  return new Promise((resolve) =>
    setTimeout(() => resolve(true), Math.random() * (max - min + 1) + min)
  );
}

function findAccountByCurrency(currency) {
  for (let account of accounts) {
    if (account.currency == currency) {
      return account;
    }
  }

  return null;
}

function findAccountById(id) {
  for (let account of accounts) {
    if (account.id == id) {
      return account;
    }
  }

  return null;
}

//Envio los datos de statsd a graphite
function emitVolumeMetric(currency, amount) {
  try {
    const statsdHost = "graphite";
    const statsdPort = 8125;

    // Formato del contador StatsD: <nombre_métrico>:<valor>
    const metricName = `exchange.volume.${currency}`;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    const message = Buffer.from(`${metricName}:${value}|c`);
    const socket = getStatsdSocket();
    if (!socket) return;
    socket.send(message, 0, message.length, statsdPort, statsdHost);
  } catch (err) {
    // Error en la metrica, ver como handlear esto
  }
}
