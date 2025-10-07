export function loadConfig() {
  const PORT = Number(process.env.PORT || 3001);
  const RABBIT_USER = process.env.RABBIT_USER || "guest";
  const RABBIT_PASS = process.env.RABBIT_PASS || "guest";
  const RABBIT_HOST = process.env.RABBIT_HOST || "rabbitmq";
  const RABBIT_PORT = process.env.RABBIT_PORT || 5672;
  const RABBIT_URL = process.env.RABBIT_URL || `amqp://${RABBIT_USER}:${RABBIT_PASS}@${RABBIT_HOST}:${RABBIT_PORT}`;

  return {
    PORT,
    RABBIT_URL,
    queues: {
      request: "TransactionRequest",
      response: "TransactionResponse",
    },
  };
}


