import { loadConfig } from "./config.js";
import { loadRates } from "./rates.js";
import { createAmqpConnection, setupConsumerChannel } from "./amqp.js";
import { handleTransactionRequest } from "./handler.js";
import { startHttpServer } from "./server.js";

const { PORT, RABBIT_URL, queues } = loadConfig();
console.log(`[exchange-service] Starting. RabbitMQ: ${RABBIT_URL}`);
console.log(`[exchange-service] PORT: ${PORT}`);

const rates = await loadRates();
console.log("[exchange-service] Rates loaded:", Object.keys(rates));

const amqpConnection = createAmqpConnection(RABBIT_URL);

await setupConsumerChannel(amqpConnection, queues, (channel) => async (msg) => {
  if (!msg) return;
  try {
    const body = msg.content?.toString?.() ?? "";
    let request;
    try {
      request = JSON.parse(body);
    } catch (parseErr) {
      console.error(`[exchange-service] Failed to parse message: ${body}`);
      channel.nack(msg, false, false);
      return;
    }
    console.log("[exchange-service] TransactionRequest received:", {
      id: request?.id,
      object: JSON.stringify(request),
    });

    const startTime = Date.now();
    const exchangeResult = await handleTransactionRequest(request, rates);
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log("[exchange-service] TransactionRequest processed in", duration, "ms");
    console.log("[exchange-service] TransactionResult:", {
      id: exchangeResult?.id,
      object: exchangeResult,
    });
    const published = channel.sendToQueue(
      queues.response,
      Buffer.from(JSON.stringify(exchangeResult)),
      { persistent: true, contentType: "application/json" }
    );
    if (!published) {
      console.warn("[exchange-service] sendToQueue returned false (write buffer full)");
    }
    channel.ack(msg);
    console.log("[exchange-service] TransactionResponse published and message acked", {
      id: exchangeResult.id,
    });
  } catch (e) {
    console.error(`[exchange-service] Error handling message: ${e?.message || e}`);
    channel.nack(msg, false, false);
  }
});

startHttpServer(PORT);

process.on("unhandledRejection", (reason) => {
  console.error("[exchange-service] Unhandled rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[exchange-service] Uncaught exception:", err);
});


