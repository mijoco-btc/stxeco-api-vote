/**
 * Pox entries per cycle provide the stacked stx per reward slot
 * per cycle and address.
 * 
 * e.g.
 * mongo: db.poxAddressInfo.find()
 *  index: 29,
    cycle: 77,
    poxAddr: {
      version: '0x01',
      hashBytes: '0x578b038a45f1a053088ac94590c9f5c4780dc6d5'
    },
    bitcoinAddr: '39fuF5mxBWGgsWgRuHKsudkScszg51MW9J',
    stacker: 'SP1A9QRJ9FABY975BECMEKTF7DWW9KAF4S67Z8VQY',
    totalUstx: 188000000000,
    delegations: 0
 */
import express from "express";
import {
  collateStackerInfo,
  extractAllPoxEntriesInCycle,
  findPoxEntriesByAddress,
  findPoxEntriesByCycle,
  getPoxBitcoinAddressInfo,
  readPoxEntriesFromContract,
  readSavePoxEntries,
} from "./pox-entries/pox_helper";
import { getConfig } from "../../lib/config";
import {
  getAllowanceContractCallers,
  getPoxCycleInfo,
  getStackerInfoFromContract,
} from "@mijoco/stx_helpers/dist/pox/pox";
import { getPoxInfo } from "@mijoco/stx_helpers/dist/index";
import {
  getAddressFromHashBytes,
  getHashBytesFromAddress,
} from "@mijoco/btc_helpers/dist/index";

const router = express.Router();

router.get("/sync/pox-entries/:cycle", async (req, res, next) => {
  try {
    const response = await readPoxEntriesFromContract(Number(req.params.cycle));
    return res.send(response);
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching sbtc data.");
  }
});
router.get("/sync/pox-entries/:cycle/:index", async (req, res, next) => {
  try {
    const cycle = Number(req.params.cycle);
    const index = Number(req.params.index);
    const response = await readSavePoxEntries(cycle, index + 1, index);
    return res.send(response);
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching pox-info.");
  }
});
router.get("/pox-entries/:cycle", async (req, res, next) => {
  try {
    const cycle = Number(req.params.cycle);
    const poxInfo = await getPoxInfo(getConfig().stacksApi);
    let response = await findPoxEntriesByCycle(cycle);
    if (response.length === 0 || cycle >= poxInfo.current_cycle.id) {
      try {
        await readPoxEntriesFromContract(cycle);
        response = await findPoxEntriesByCycle(cycle);
      } catch (err: any) {
        response = [];
        console.log("Error: /pox-entries/:cycle " + err.message);
      }
    }
    return res.send(response);
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching sbtc data.");
  }
});

router.get("/pox-entries/:bitcoinAddress", async (req, res, next) => {
  try {
    const response = await findPoxEntriesByAddress(req.params.bitcoinAddress);
    console.log(response);
    return res.send(response);
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching pox-info.");
  }
});

router.get("/pox-entries/:bitcoinAddress/:cycle", async (req, res, next) => {
  try {
    const response = await extractAllPoxEntriesInCycle(
      req.params.bitcoinAddress,
      Number(req.params.cycle)
    );
    console.log(response);
    return res.send(response);
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching pox-info.");
  }
});

router.get("/info/cycle/:cycle", async (req, res, next) => {
  try {
    const cycleInfo = await getPoxCycleInfo(
      getConfig().stacksApi,
      getConfig().poxContractId!,
      Number(req.params.cycle)
    );
    return res.send(cycleInfo);
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching pox-info.");
  }
});

router.get(
  "/get-allowance-contract-callers/:address/:contract",
  async (req, res, next) => {
    try {
      const response = await getAllowanceContractCallers(
        getConfig().stacksApi,
        getConfig().poxContractId!,
        req.params.address,
        req.params.contract
      );
      console.log(response);
      return res.send(response);
    } catch (error) {
      console.log("Error in routes: ", error);
      next("An error occurred fetching pox-info.");
    }
  }
);

router.get("/stacker-info/:address", async (req, res, next) => {
  try {
    const poxInfo = await getPoxInfo(getConfig().stacksApi);
    const response = await collateStackerInfo(
      req.params.address,
      poxInfo.current_cycle.id
    );
    return res.send(response);
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching pox-info.");
  }
});

router.get("/stacker-info/:address/:cycle", async (req, res, next) => {
  try {
    const response = await collateStackerInfo(
      req.params.address,
      Number(req.params.cycle)
    );
    return res.send(response);
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching pox-info.");
  }
});

router.get(
  "/solo-stacker/:btcAddress/:cycle/:sender",
  async (req, res, next) => {
    try {
      const btcAddress = req.params.btcAddress;
      let response: any = {};
      response = await getPoxBitcoinAddressInfo(
        btcAddress,
        Number(req.params.cycle),
        req.params.sender
      );
      console.log(response);
      return res.send(response);
    } catch (error) {
      console.log("Error in routes: ", error);
      next("An error occurred fetching pox-info.");
    }
  }
);

router.get("/stacker/:stxAddress/:cycle", async (req, res, next) => {
  try {
    const stxAddress = req.params.stxAddress;
    let response: any = {};
    response = await getStackerInfoFromContract(
      getConfig().stacksApi,
      getConfig().network,
      getConfig().poxContractId!,
      stxAddress,
      Number(req.params.cycle)
    );
    response.cycleInfo = await getPoxCycleInfo(
      getConfig().stacksApi,
      getConfig().poxContractId!,
      Number(req.params.cycle)
    );
    console.log(response);
    return res.send(response);
  } catch (error) {
    console.error("Error in routes: ", error);
    next("An error occurred fetching pox-info.");
  }
});

router.get("/decode/:address", async (req, res, next) => {
  try {
    const response = await getHashBytesFromAddress(
      getConfig().network,
      req.params.address
    );
    return res.send(response);
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching sbtc data.");
  }
});

router.get("/encode/:version/:hashBytes", async (req, res, next) => {
  try {
    const response = await getAddressFromHashBytes(
      getConfig().network,
      req.params.hashBytes,
      req.params.version
    );
    return res.send(response);
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching sbtc data.");
  }
});

export { router as poxRoutes };
