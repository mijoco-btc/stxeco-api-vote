import express from "express";
import { getConfig } from "../../lib/config";
import { exchangeRatesCollection } from "../../lib/data/db_models";
import { currencies } from "./utils_currencies";
import { ExchangeRate } from "@mijoco/stx_helpers/dist/index";

const router = express.Router();

router.get("/tx/rates", async (req, res, next) => {
  try {
    const response = await getExchangeRates();
    return res.send(response);
  } catch (error) { 
    console.log('Error in routes: ', error)
    next('An error occurred fetching sbtc data.')
  }
});

router.get("/tx/rates/force", async (req, res, next) => {
  try {
    await updateExchangeRates();
    const response = await getExchangeRates();
    return res.send(response);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching sbtc data.') 
  }
});


export { router as rateRoutes }




// Exchange Rates 
export async function delExchangeRates () {
	await exchangeRatesCollection.deleteMany();
	return;
}
export async function setExchangeRates (ratesObj:any) {
	return await exchangeRatesCollection.insertMany(ratesObj);
}
export async function getExchangeRates () {
	const result = await exchangeRatesCollection.find({}).sort({'currency': -1}).toArray();
	return result;
}
export async function findExchangeRateByCurrency(currency:string):Promise<any> {
	const result = await exchangeRatesCollection.findOne({currency});
	return result;
}
export async function saveNewExchangeRate (exchangeRate:any) {
	const result = await exchangeRatesCollection.insertOne(exchangeRate);
	return result;
}
export async function updateExchangeRate (exchangeRate:any, changes: any) {
	const result = await exchangeRatesCollection.updateOne({
		_id: exchangeRate._id
	}, 
    { $set: changes});
	return result;
}

export async function updateExchangeRates() {
  try {
    const url = 'https://blockchain.info/ticker';
    const response = await fetch(url);
    const info = await response.json();
    for (var key in info) {
      const dbRate:ExchangeRate = await findExchangeRateByCurrency(key)
      if (!dbRate) {
        const newRate = {
          currency: key,
          fifteen: info[key]['15m'],
          last: info[key].last,
          buy: info[key].buy,
          sell: info[key].sell,
          symbol: currencies[key].symbol,
          name: currencies[key].name
        }
        saveNewExchangeRate(newRate)
      } else {
        updateExchangeRate(dbRate, {
          currency: key,
          fifteen: info[key]['15m'],
          last: info[key].last,
          buy: info[key].buy,
          sell: info[key].sell,
          symbol: currencies[key].symbol,
          name: currencies[key].name
        })
      }
    }
    return getExchangeRates();
  } catch (err) {
    console.log(err);
  }
}

export async function fetchCurrentFeeRates() {
  try {
    if (getConfig().network === 'devnet') {
      const url = getConfig().mempoolUrl + '/v1/mining/blocks/fee-rates/1m';
      const response = await fetch(url);
      const info = await response.json();
      return { feeInfo: { low_fee_per_kb:info[0].avgFee_100, medium_fee_per_kb:info[1].avgFee_100, high_fee_per_kb:info[2].avgFee_100 }};
    } else {
      const url = getConfig().blockCypherUrl;
      const response = await fetch(url);
      const info = await response.json();
      return { feeInfo: { low_fee_per_kb:info.low_fee_per_kb, medium_fee_per_kb:info.medium_fee_per_kb, high_fee_per_kb:info.high_fee_per_kb }};
    }
  } catch (err:any) {
    console.log('fetchCurrentFeeRates: ' + err.message);
    return { feeInfo: { low_fee_per_kb:2000, medium_fee_per_kb:3000, high_fee_per_kb:4000 }};
  }
}

