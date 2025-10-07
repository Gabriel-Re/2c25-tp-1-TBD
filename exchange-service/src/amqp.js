import { connect as amqpConnect } from "amqp-connection-manager";

export function createAmqpConnection(rabbitUrl) {
  const amqpConnection = amqpConnect([rabbitUrl], {
    heartbeatIntervalInSeconds: 5,
    reconnectTimeInSeconds: 2,
  });

  amqpConnection.on("connect", () =>
    console.log(`[exchange-service] RabbitMQ connected: ${rabbitUrl}`)
  );
  amqpConnection.on("disconnect", (params) =>
    console.warn(
      `[exchange-service] RabbitMQ disconnected: ${params?.err?.message || "unknown error"}`
    )
  );

  return amqpConnection;
}

export async function setupConsumerChannel(amqpConnection, queues, onMessage) {
  const channelWrapper = amqpConnection.createChannel({
    json: false,
    setup: async (channel) => {
      console.log("[exchange-service] Setting up channel...");
      await channel.assertQueue(queues.request, { durable: true });
      await channel.assertQueue(queues.response, { durable: true });
      await channel.prefetch(10);
      console.log("[exchange-service] Queues asserted and prefetch set. Starting consumer...");
      await channel.consume(
        queues.request,
        onMessage(channel),
        { noAck: false }
      );
      console.log(`[exchange-service] Consumer registered for ${queues.request}`);
    },
  });

  return channelWrapper;
}


