import { getRate } from "./rates.js";
import { recordUsdMetrics, recordEurMetrics, recordArsMetrics, recordBrlMetrics } from "./metrics.js";

export async function handleTransactionRequest(request, rates) {
  const clientBaseAccountId = Number(request?.baseAccountId);
  const clientCounterAccountId = Number(request?.counterAccountId);
  const baseAmount = Number(request?.baseAmount || 0);

  const exchangeRate = getRate(
    rates,
    request?.baseCurrency,
    request?.counterCurrency
  );
  const counterAmount = baseAmount * exchangeRate;

  const baseAccount = findAccountByCurrency(request?.baseCurrency);
  const counterAccount = findAccountByCurrency(request?.counterCurrency);

  const exchangeResult = {
    id: request?.id,
    ts: request?.ts,
    ok: false,
    request: request,
    exchangeRate: exchangeRate,
    counterAmount: counterAmount,
    obs: null,
  };

  if (counterAccount.balance >= counterAmount) {
    if (await transfer(clientBaseAccountId, baseAccount.id, baseAmount)) {
      if (
        await transfer(counterAccount.id, clientCounterAccountId, counterAmount)
      ) {
        baseAccount.balance += baseAmount;
        counterAccount.balance -= counterAmount;
        exchangeResult.ok = true;
        exchangeResult.counterAmount = counterAmount;
        // Registramos las métricas de USD, EUR, ARS y BRL
        if (request.baseCurrency === "USD") {
          // Venta de USD, el volumen en USD es baseAmount
          recordUsdMetrics(baseAmount, "sell");
        }
        if (request.counterCurrency === "USD") {
          // Compra de USD, el volumen en USD es counterAmount
          recordUsdMetrics(counterAmount, "buy");
        }
        if (request.baseCurrency === "EUR") {
          // Venta de EUR, el volumen en EUR es baseAmount
          recordEurMetrics(baseAmount, "sell");
        }
        if (request.counterCurrency === "EUR") {
          // Compra de EUR, el volumen en EUR es counterAmount
          recordEurMetrics(counterAmount, "buy");
        }
        if (request.baseCurrency === "ARS") {
          // Venta de ARS, el volumen en ARS es baseAmount
          recordArsMetrics(baseAmount, "sell");
        }
        if (request.counterCurrency === "ARS") {
          // Compra de ARS, el volumen en ARS es counterAmount
          recordArsMetrics(counterAmount, "buy");
        }
        if (request.baseCurrency === "BRL") {
          // Venta de BRL, el volumen en BRL es baseAmount
          recordBrlMetrics(baseAmount, "sell");
        }
        if (request.counterCurrency === "BRL") {
          // Compra de BRL, el volumen en BRL es counterAmount
          recordBrlMetrics(counterAmount, "buy");
        }
      } else {
        await transfer(baseAccount.id, clientBaseAccountId, baseAmount);
        exchangeResult.obs = "Could not transfer to clients' account";
      }
    } else {
      exchangeResult.obs = "Could not withdraw from clients' account";
    }
  } else {
    exchangeResult.obs = "Not enough funds on counter currency account";
  }

  return exchangeResult;
}

function findAccountByCurrency(currency) {
  return {
    id: 1,
    currency: currency,
    balance: 1000000,
  };
}

async function transfer(fromAccountId, toAccountId, amount) {
  const min = 200;
  const max = 400;
  return new Promise((resolve) =>
    setTimeout(() => resolve(true), Math.random() * (max - min + 1) + min)
  );
}


