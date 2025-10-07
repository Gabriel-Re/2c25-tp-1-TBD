import express from "express";

export function startHttpServer(port) {
  const app = express();
  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.listen(port, () => {
    console.log(`[exchange-service] HTTP listening on ${port}`);
  });

  return app;
}


