/**
 * sbtc - interact with Stacks Blockchain to read sbtc contract info
 */
import { cvToJSON, deserializeCV } from "@stacks/transactions";
import { getConfig } from "../../../lib/config";
import { poolStackerEventsCollection } from "../../../lib/data/db_models";
import util from "util";
import {
  DelegationAggregationIncrease,
  DelegationStackExtend,
  DelegationStackIncrease,
  DelegationStackStx,
  DelegationStx,
  HandleUnlock,
  PoolStackerEvent,
  PoxAddress,
  StackExtend,
  StackIncrease,
  StackStx,
} from "@mijoco/stx_helpers/dist/index";
import { RevokeDelegateStx } from "@mijoco/stx_helpers/dist/pox_types";
import { getAddressFromHashBytes } from "@mijoco/btc_helpers/dist/index";

export async function readPoolStackerEvents(poxContractName: string) {
  const poxContract = `${
    getConfig().poxContractId?.split(".")[0]
  }.${poxContractName}`;
  const url = `${
    getConfig().stacksApi
  }/extended/v1/contract/${poxContract}/events?limit=20`;
  let currentOffset = await countsPoolStackerEvents(poxContractName);
  if (!currentOffset) currentOffset = 0;
  let count = 0;
  let moreEvents = true;
  try {
    do {
      try {
        let urlOffset = url + "&offset=" + (currentOffset + count * 20);
        const response = await fetch(urlOffset);
        const val = await response.json();
        console.log("readPoolStackerEvents: reading more: " + urlOffset);
        moreEvents = await innerReadPoolStackerEvents(val, poxContractName);
        count++;
      } catch (err: any) {
        console.log("readPoolStackerEvents: " + url);
      }
    } while (moreEvents);
  } catch (err: any) {
    console.log("readPoolStackerEvents: ", err);
  }
}

async function innerReadPoolStackerEvents(
  val: any,
  poxContractName: string
): Promise<any> {
  let stackerEvent: PoolStackerEvent;
  let result: any;
  if (!val || !val.results || val.results.length === 0) {
    console.log("innerReadPoolStackerEvents: all done.");
    return false;
  }
  for (const event of val.results) {
    try {
      //console.log('innerReadPoolStackerEvents: event.contract_log.value: ', event.contract_log.value)
      result = cvToJSON(deserializeCV(event.contract_log.value.hex)).value
        .value;
      const eventName = result.name.value;
      stackerEvent = {
        //submitTxId: event.tx_id,
        eventIndex: event.event_index,
        burnchainUnlockHeight: Number(result["burnchain-unlock-height"].value),
        event: eventName,
        locked: Number(result.locked.value),
        balance: Number(result.balance.value),
        stacker: result.stacker.value,
        poxContractName,
      } as any;

      let data:
        | DelegationStx
        | RevokeDelegateStx
        | DelegationAggregationIncrease
        | DelegationStackExtend
        | DelegationStackStx
        | DelegationStackIncrease
        | StackStx
        | StackIncrease
        | StackExtend
        | HandleUnlock = {} as DelegationStx;
      if (eventName === "stack-aggregation-increase") {
        data = {
          amountUstx: Number(result.data.value["amount-ustx"].value),
          delegator: result.data.value["delegator"].value,
          rewardCycle: Number(result.data.value["reward-cycle"].value),
          poxAddr: extractPoxAddress(result.data.value["pox-addr"]),
        };
        stackerEvent.bitcoinAddr = extractBitcoinAddress(
          result.data.value["pox-addr"]
        );
      } else if (eventName === "delegate-stack-extend") {
        data = {
          amountUstx: 0,
          delegator: result.data.value["delegator"].value,
          extendCount: Number(result.data.value["extend-count"].value),
          unlockBurnHeight: Number(
            result.data.value["unlock-burn-height"].value
          ),
          stacker: result.data.value["stacker"].value,
          poxAddr: extractPoxAddress(result.data.value["pox-addr"]),
        };
        stackerEvent.bitcoinAddr = extractBitcoinAddress(
          result.data.value["pox-addr"]
        );
      } else if (eventName === "delegate-stack-stx") {
        data = {
          amountUstx: 0,
          delegator: result.data.value["delegator"].value,
          lockAmount: Number(result.data.value["lock-amount"].value),
          lockPeriod: Number(result.data.value["lock-period"].value),
          unlockBurnHeight: Number(
            result.data.value["unlock-burn-height"].value
          ),
          startBurnHeight: Number(result.data.value["start-burn-height"].value),
          stacker: result.data.value["stacker"].value,
          poxAddr: extractPoxAddress(result.data.value["pox-addr"]),
        };
        stackerEvent.bitcoinAddr = extractBitcoinAddress(
          result.data.value["pox-addr"]
        );
      } else if (eventName === "delegate-stx") {
        data = {
          amountUstx: Number(result.data.value["amount-ustx"].value),
          delegator: result.data.value["delegate-to"].value,
          unlockBurnHeight: Number(
            result.data.value["unlock-burn-height"].value
          ),
          poxAddr: extractPoxAddress(result.data.value["pox-addr"]),
        };
        stackerEvent.bitcoinAddr = extractBitcoinAddress(
          result.data.value["pox-addr"]
        );
      } else if (eventName === "stack-aggregation-commit-indexed") {
        data = {
          amountUstx: Number(result.data.value["amount-ustx"].value),
          delegator: result.data.value["delegator"].value,
          rewardCycle: Number(result.data.value["reward-cycle"].value),
          poxAddr: extractPoxAddress(result.data.value["pox-addr"]),
        };
        stackerEvent.bitcoinAddr = extractBitcoinAddress(
          result.data.value["pox-addr"]
        );
      } else if (eventName === "stack-aggregation-commit") {
        data = {
          amountUstx: Number(result.data.value["amount-ustx"].value),
          delegator: result.data.value["delegator"].value,
          rewardCycle: Number(result.data.value["reward-cycle"].value),
          poxAddr: extractPoxAddress(result.data.value["pox-addr"]),
        };
        stackerEvent.bitcoinAddr = extractBitcoinAddress(
          result.data.value["pox-addr"]
        );
      } else if (eventName === "delegate-stack-increase") {
        data = {
          amountUstx: 0,
          delegator: result.data.value["delegator"].value,
          increaseBy: Number(result.data.value["increase-by"].value),
          totalLocked: Number(result.data.value["total-locked"].value),
          stacker: result.data.value["stacker"].value,
          poxAddr: extractPoxAddress(result.data.value["pox-addr"]),
        };
        stackerEvent.bitcoinAddr = extractBitcoinAddress(
          result.data.value["pox-addr"]
        );
      } else if (eventName === "stack-stx") {
        const poxAddr = extractPoxAddress(result.data.value["pox-addr"]);
        data = {
          amountUstx: 0,
          lockAmount: Number(result.data.value["lock-amount"].value),
          lockPeriod: Number(result.data.value["lock-period"].value),
          poxAddr: extractPoxAddress(result.data.value["pox-addr"]),
          unlockBurnHeight: Number(
            result.data.value["unlock-burn-height"].value
          ),
          startBurnHeight: Number(result.data.value["start-burn-height"].value),
        };
        stackerEvent.bitcoinAddr = extractBitcoinAddress(
          result.data.value["pox-addr"]
        );
      } else if (eventName === "stack-increase") {
        data = {
          amountUstx: 0,
          increaseBy: Number(result.data.value["increase-by"].value),
          totalLocked: Number(result.data.value["total-locked"].value),
          poxAddr: extractPoxAddress(result.data.value["pox-addr"]),
        };
        stackerEvent.bitcoinAddr = extractBitcoinAddress(
          result.data.value["pox-addr"]
        );
      } else if (eventName === "stack-extend") {
        data = {
          amountUstx: 0,
          extendCount: Number(result.data.value["extend-count"].value),
          poxAddr: extractPoxAddress(result.data.value["pox-addr"]),
          unlockBurnHeight: Number(
            result.data.value["unlock-burn-height"].value
          ),
        };
        stackerEvent.bitcoinAddr = extractBitcoinAddress(
          result.data.value["pox-addr"]
        );
      } else if (eventName === "handle-unlock") {
        data = {
          amountUstx: 0,
          firstCycleLocked: Number(
            result.data.value["first-cycle-locked"].value
          ),
          poxAddr: extractPoxAddress(result.data.value["pox-addr"]),
          firstUnlockedCycle: Number(
            result.data.value["first-unlocked-cycle"].value
          ),
        };
        stackerEvent.bitcoinAddr = extractBitcoinAddress(
          result.data.value["pox-addr"]
        );
      } else if (eventName === "revoke-delegate-stx") {
        data = {
          amountUstx: 0,
          delegator: result.data.value["delegate-to"].value,
          startCycleId: Number(
            result.data?.value["start-cycle-id"]?.value || 0
          ),
          endCycleId: Number(result.data?.value["end-cycle-id"]?.value || 0),
        };
      } else {
        console.log(
          "innerReadPoolStackerEvents: missed: ",
          util.inspect(result, false, null, true /* enable colors */)
        );
      }
      stackerEvent.data = data;
      //console.log('innerReadPoolStackerEvents: ', util.inspect(stackerEvent, false, null, true /* enable colors */));
      await savePoolStackerEvent(stackerEvent);
    } catch (err: any) {
      console.log(
        "innerReadPoolStackerEvents: error: ",
        util.inspect(result, false, null, true /* enable colors */)
      );
      console.log("innerReadPoolStackerEvents: error: " + err.message);
    }
  }
  return true;
}

function extractPoxAddress(result: any): PoxAddress {
  try {
    const version = result.value.version.value;
    const hashBytes = result.value.hashbytes.value;
    return { version, hashBytes };
  } catch (err: any) {
    return {} as PoxAddress;
  }
}

function extractBitcoinAddress(result: any): string | undefined {
  try {
    const version = result.value.version.value;
    const hashBytes = result.value.hashbytes.value;
    return getAddressFromHashBytes(getConfig().network, hashBytes, version);
  } catch (err: any) {
    return;
  }
}

export async function countsPoolStackerEvents(
  poxContractName: string
): Promise<number> {
  try {
    const result = await poolStackerEventsCollection.countDocuments({
      poxContractName,
    });
    return Number(result);
  } catch (err: any) {
    return 0;
  }
}

export async function findPoolStackerEventsByHashBytes(
  poxContract: string,
  hashBytes: string,
  page: number,
  limit: number
): Promise<Array<PoolStackerEvent>> {
  if (!hashBytes.startsWith("0x")) hashBytes = "0x" + hashBytes;
  const result = await poolStackerEventsCollection
    .find({ "data.poxAddr.hashBytes": hashBytes, poxContractName: poxContract })
    .skip(page * limit)
    .limit(limit)
    .toArray();
  return result as unknown as Array<PoolStackerEvent>;
}

export async function findPoolStackerEventsByHashBytesAndEvent(
  poxContract: string,
  hashBytes: string,
  event: string
): Promise<Array<PoolStackerEvent>> {
  if (!hashBytes.startsWith("0x")) hashBytes = "0x" + hashBytes;
  const result = await poolStackerEventsCollection
    .find({
      "data.poxAddr.hashBytes": hashBytes,
      event,
      poxContractName: poxContract,
    })
    .toArray();
  return result as unknown as Array<PoolStackerEvent>;
}

export async function findPoolStackerEventsByHashBytesAndVersion(
  version: string,
  hashBytes: string,
  page: number,
  limit: number
): Promise<Array<PoolStackerEvent>> {
  if (!hashBytes.startsWith("0x")) hashBytes = "0x" + hashBytes;
  if (!version.startsWith("0x")) version = "0x" + version;
  const result = await poolStackerEventsCollection
    .find({
      "data.poxAddr.hashBytes": hashBytes,
      "data.poxAddr.version": version,
    })
    .skip(page * limit)
    .limit(limit)
    .toArray();
  return result as unknown as Array<PoolStackerEvent>;
}

export async function findPoolStackerEventsByStacker(
  poxContract: string,
  stacker: string
): Promise<Array<PoolStackerEvent>> {
  const result = await poolStackerEventsCollection
    .find({ stacker: stacker, poxContractName: poxContract })
    .toArray();
  return result as unknown as Array<PoolStackerEvent>;
}

export async function findPoolStackerEventsByDelegator(
  stacker: string
): Promise<Array<PoolStackerEvent>> {
  const result = await poolStackerEventsCollection
    .find({ "data.delegator": stacker })
    .toArray();
  return result as unknown as Array<PoolStackerEvent>;
}

export async function findPoolStackerEventsByStackerAndEvent(
  poxContract: string,
  stacker: string,
  event: string
): Promise<Array<PoolStackerEvent>> {
  const result = await poolStackerEventsCollection
    .find({ stacker: stacker, event: event, poxContractName: poxContract })
    .toArray();
  return result as unknown as Array<PoolStackerEvent>;
}

export async function findPoolStackerEventsBySubmitTxId(
  criteria: any
): Promise<PoolStackerEvent> {
  const result = await poolStackerEventsCollection.findOne(criteria);
  return result as unknown as PoolStackerEvent;
}

export async function saveOrUpdatePoolStackerEvent(v: PoolStackerEvent) {
  try {
    const pdb = await findPoolStackerEventsBySubmitTxId(v);
    if (pdb) {
      console.log(
        "saveOrUpdatePoolStackerEvent: updating:  event: " +
          v.event +
          " stacker: " +
          v.stacker +
          " amountUstx: " +
          " unlockHeight: " +
          v.burnchainUnlockHeight
      );
      await updatePoolStackerEvent(pdb, v);
    } else {
      const amt = v.data?.amountUstx || 0;
      console.log(
        "saveOrUpdatePoolStackerEvent: saving: event: " +
          v.event +
          " stacker: " +
          v.stacker +
          " amountUstx: " +
          amt +
          " unlockHeight: " +
          v.burnchainUnlockHeight
      );
      await savePoolStackerEvent(v);
    }
  } catch (err: any) {
    console.log(
      "saveOrUpdatePoolStackerEvent: unable to save or update: " + err.message
    );
  }
}

async function savePoolStackerEvent(v: any) {
  //console.log('saveOrUpdatePoolStackerEvent: saving: event: ' + v.event + ' amountUstx: ' + v.data.amountUstx + ' unlockHeight: ' + v.burnchainUnlockHeight);
  const result = await poolStackerEventsCollection.insertOne(v);
  return result;
}

async function updatePoolStackerEvent(vote: any, changes: any) {
  const result = await poolStackerEventsCollection.updateOne(
    {
      _id: vote._id,
    },
    { $set: changes }
  );
  return result;
}
