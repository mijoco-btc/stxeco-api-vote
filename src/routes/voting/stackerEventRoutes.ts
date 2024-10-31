/**
 * Stacker events are the history of stacking calls.
 * 
 * The stacker events need to be read back to a few cycles before the
 * first (sip 2.1 upgrade) vote.
 * 
 * e.g. Structure of delegate-stack-extend:
 * mongo: db.poolStackerEventsCollection.find()
 *  eventIndex: 63,
    burnchainUnlockHeight: 831950,
    event: 'delegate-stack-extend',
    locked: 7499000000,
    balance: 155877897,
    stacker: 'SPFH6SNXA9F26V1M09XR7DA29TDCD2TBQVTVFS86',
    data: {
      amountUstx: 0,
      delegator: 'SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP.pox-fast-pool-v2',
      extendCount: 1,
      unlockBurnHeight: 834050,
      stacker: 'SPFH6SNXA9F26V1M09XR7DA29TDCD2TBQVTVFS86',
      poxAddr: {
        version: '0x04',
        hashBytes: '0x83ed66860315e334010bbfb76eb3eef887efee0a'
      }
    }
  
 *  There are 11 distinct event types;
    mongo: db.poolStackerEventsCollection.distinct('event')
      'delegate-stack-extend',
      'delegate-stack-increase',
      'delegate-stack-stx',
      'delegate-stx',
      'handle-unlock',
      'stack-aggregation-commit',
      'stack-aggregation-commit-indexed',
      'stack-aggregation-increase',
      'stack-extend',
      'stack-increase',
      'stack-stx'
 */
import express from "express";
import {
  countsPoolStackerEvents,
  findPoolStackerEventsByDelegator,
  findPoolStackerEventsByHashBytes,
  findPoolStackerEventsByHashBytesAndEvent,
  findPoolStackerEventsByStacker,
  findPoolStackerEventsByStackerAndEvent,
  readPoolStackerEvents,
} from "./stacker-events/pool_stacker_events_helper";
import {
  aggregateDelegationData,
  countsPoolStackerEventsByEvent,
  findPoolStackerEvents,
  findPoolStackerEventsByEvent,
} from "../pox4/pox-events/pox4_events_helper";
import { getHashBytesFromAddress } from "@mijoco/btc_helpers/dist/index";
import { getConfig } from "../../lib/config";

const router = express.Router();

router.get("/sync/stacker-events/pox", async (req, res, next) => {
  try {
    readPoolStackerEvents("pox");
    return res.send("syncing data");
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching sbtc data.");
  }
});

router.get("/sync/stacker-events/pox-2", async (req, res, next) => {
  try {
    readPoolStackerEvents("pox-2");
    return res.send("syncing data");
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching sbtc data.");
  }
});

router.get("/sync/stacker-events/pox-3", async (req, res, next) => {
  try {
    readPoolStackerEvents("pox-3");
    return res.send("syncing data");
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching sbtc data.");
  }
});

router.get("/sync/stacker-events/pox-4", async (req, res, next) => {
  try {
    readPoolStackerEvents("pox-4");
    return res.send("syncing data");
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching sbtc data.");
  }
});

router.get(
  "/sync/delegation-events/:poolPrincipal/:offset/:limit",
  async (req, res, next) => {
    try {
      //const response = await readDelegationEvents(getConfig().stacksApi,getConfig().poxContractId!, req.params.poolPrincipal, Number(req.params.offset), Number(req.params.limit));
      return res.send("readDelegationEvents?");
    } catch (error) {
      console.log("Error in routes: ", error);
      next("An error occurred fetching pox-info.");
    }
  }
);

router.get(
  "/stacker-events-by-hashbytes/:hashBytes/:page/:limit",
  async (req, res, next) => {
    try {
      const response = await findPoolStackerEventsByHashBytes(
        req.params.hashBytes,
        Number(req.params.page),
        Number(req.params.limit)
      );
      return res.send(response);
    } catch (error) {
      console.log("Error in routes: ", error);
      next("An error occurred fetching sbtc data.");
    }
  }
);

router.get(
  "/stacker-events-by-stacker-event/:event/:address",
  async (req, res, next) => {
    try {
      let response;
      const address = req.params.address;
      const event = req.params.event;
      if (address.toUpperCase().startsWith("S")) {
        response = await findPoolStackerEventsByStackerAndEvent(address, event);
      } else {
        const addrInfo = getHashBytesFromAddress(getConfig().network, address);
        if (addrInfo?.hashBytes)
          response = await findPoolStackerEventsByHashBytesAndEvent(
            addrInfo?.hashBytes,
            event
          );
      }
      return res.send(response);
    } catch (error) {
      console.log("Error in routes: ", error);
      next("An error occurred fetching sbtc data.");
    }
  }
);

router.get("/stacker-events-by-stacker/:address", async (req, res, next) => {
  try {
    let response;
    const address = req.params.address;
    if (address.toUpperCase().startsWith("S")) {
      response = await findPoolStackerEventsByStacker(address);
    } else {
      const addrInfo = getHashBytesFromAddress(getConfig().network, address);
      if (addrInfo?.hashBytes)
        response = await findPoolStackerEventsByHashBytes(
          addrInfo?.hashBytes,
          0,
          100
        );
    }
    return res.send(response);
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching sbtc data.");
  }
});

router.get("/stacker-events-by-delegator/:address", async (req, res, next) => {
  try {
    const response = await findPoolStackerEventsByDelegator(req.params.address);
    return res.send(response);
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching sbtc data.");
  }
});

router.get("/pool-stacker-events/:stacker", async (req, res, next) => {
  try {
    const response = await findPoolStackerEventsByStacker(req.params.stacker);
    return res.send(response);
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching sbtc data.");
  }
});

router.get("/pool-stacker-events/:stacker/:event", async (req, res, next) => {
  try {
    const response = await findPoolStackerEventsByStackerAndEvent(
      req.params.stacker,
      req.params.event
    );
    return res.send(response);
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching sbtc data.");
  }
});

router.get("/stacker-events/:page/:limit", async (req, res, next) => {
  try {
    const response = await findPoolStackerEvents(
      Number(req.params.page),
      Number(req.params.limit)
    );
    let total = await countsPoolStackerEvents("pox-4");
    total = total + (await countsPoolStackerEvents("pox-3"));
    return res.send({ events: response, total });
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching sbtc data.");
  }
});

router.get("/aggregate-delegation-data", async (req, res, next) => {
  try {
    const response = await aggregateDelegationData();
    return res.send(response);
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching sbtc data.");
  }
});

router.get(
  "/stacker-events-by-event/:event/:page/:limit",
  async (req, res, next) => {
    try {
      const response = await findPoolStackerEventsByEvent(
        req.params.event,
        Number(req.params.page),
        Number(req.params.limit)
      );
      const total = await countsPoolStackerEventsByEvent(req.params.event);
      return res.send({ events: response, total });
    } catch (error) {
      console.log("Error in routes: ", error);
      next("An error occurred fetching sbtc data.");
    }
  }
);

export { router as stackerEventRoutes };
