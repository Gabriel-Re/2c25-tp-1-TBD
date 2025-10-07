import express from "express";
import { connect as amqpConnect } from "amqp-connection-manager";

import {
  init as exchangeInit,
  getAccounts,
  setAccountBalance,
  getRates,
  setRate,
  getLog,
  exchange,
} from "./exchange.js";

await exchangeInit();

// RabbitMQ basic connection on startup (non-fatal if it fails)
const RABBIT_USER = process.env.RABBIT_USER || "guest";
const RABBIT_PASS = process.env.RABBIT_PASS || "guest";
const RABBIT_HOST = process.env.RABBIT_HOST || "rabbitmq";
const RABBIT_PORT = process.env.RABBIT_PORT || 5672;
const RABBIT_URL = process.env.RABBIT_URL || `amqp://${RABBIT_USER}:${RABBIT_PASS}@${RABBIT_HOST}:${RABBIT_PORT}`;

console.log(`Attempting to connect to RabbitMQ at ${RABBIT_URL}`);
const amqpConnection = amqpConnect([RABBIT_URL], {
  heartbeatIntervalInSeconds: 5,
  reconnectTimeInSeconds: 2,
});

amqpConnection.on("connect", () =>
  console.log(`RabbitMQ connected: ${RABBIT_URL}`)
);
amqpConnection.on("disconnect", (params) =>
  console.warn(
    `RabbitMQ disconnected: ${params?.err?.message || "unknown error"}`
  )
);

const channelWrapper = amqpConnection.createChannel({
  json: false,
  setup: async (channel) => {
    await channel.assertQueue("TransactionResponse", { durable: true });
    await channel.prefetch(10);
    await channel.consume(
      "TransactionResponse",
      (msg) => {
        if (!msg) return;
        try {
          const content = msg.content?.toString?.() ?? "";
          console.log(`TransactionResponse received: ${content}`);
          channel.ack(msg);
        } catch (e) {
          console.warn(`Error processing message: ${e?.message || e}`);
          channel.nack(msg, false, false);
        }
      },
      { noAck: false }
    );
  },
});

const app = express();
const port = 3000;

app.use(express.json());

// ACCOUNT endpoints

app.get("/accounts", (req, res) => {
  res.json(getAccounts());
});

app.put("/accounts/:id/balance", (req, res) => {
  const accountId = req.params.id;
  const { balance } = req.body;

  if (!accountId || !balance) {
    return res.status(400).json({ error: "Malformed request" });
  } else {
    setAccountBalance(accountId, balance);

    res.json(getAccounts());
  }
});

// RATE endpoints

app.get("/rates", (req, res) => {
  res.json(getRates());
});

app.put("/rates", (req, res) => {
  const { baseCurrency, counterCurrency, rate } = req.body;

  if (!baseCurrency || !counterCurrency || !rate) {
    return res.status(400).json({ error: "Malformed request" });
  }

  const newRateRequest = { ...req.body };
  setRate(newRateRequest);

  res.json(getRates());
});

// LOG endpoint

app.get("/log", (req, res) => {
  res.json(getLog());
});

// EXCHANGE endpoint

app.post("/exchange", async (req, res) => {
  const {
    baseCurrency,
    counterCurrency,
    baseAccountId,
    counterAccountId,
    baseAmount,
  } = req.body;

  if (
    !baseCurrency ||
    !counterCurrency ||
    !baseAccountId ||
    !counterAccountId ||
    !baseAmount
  ) {
    return res.status(400).json({ error: "Malformed request" });
  }

  const exchangeRequest = { ...req.body };
  const exchangeResult = await exchange(exchangeRequest);

  if (exchangeResult.ok) {
    res.status(200).json(exchangeResult);
  } else {
    res.status(500).json(exchangeResult);
  }
});

app.listen(port, () => {
  console.log(`Exchange API listening on port ${port}`);
});

export default app;
