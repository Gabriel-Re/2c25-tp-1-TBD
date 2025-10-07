import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

let cachedRates = null;

export async function loadRates() {
  if (cachedRates) return cachedRates;
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const ratesFilePath = path.join(__dirname, "../state/rates.json");
  const raw = await fs.readFile(ratesFilePath, "utf8");
  cachedRates = JSON.parse(raw);
  return cachedRates;
}

export function getRate(rates, baseCurrency, counterCurrency) {
  return rates?.[baseCurrency]?.[counterCurrency];
}


