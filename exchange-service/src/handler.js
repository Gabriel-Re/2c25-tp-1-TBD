import { getRate } from "./rates.js";
import { recordMetrics } from "./metrics.js";

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
        // Metricas para las monedas
        // Venta de moneda (base)
        recordMetrics(request.baseCurrency, baseAmount, "sell");
        
        // Compra de moneda (destino) 
        recordMetrics(request.counterCurrency, counterAmount, "buy");
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


