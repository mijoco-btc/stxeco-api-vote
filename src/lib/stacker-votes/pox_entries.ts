import { getConfig } from "../config";
import { hex } from '@scure/base';
import { getDaoConfig } from "../config_dao";
import { serializeCV, uintCV } from "@stacks/transactions";
import { callContractReadOnly, PoxAddress } from "@mijoco/stx_helpers/dist/index";
import { PoxEntry } from "@mijoco/stx_helpers/dist/pox_types";
import { poxAddressInfo } from "../data/db_models";
import { getAddressFromHashBytes } from "@mijoco/btc_helpers/dist/index";


export async function readPoxEntriesFromContract(cycle:number):Promise<any> {
  const len = await getNumbEntriesRewardCyclePoxList(cycle)
  let offset = 0
  try {
    const o = await findLastPoxEntryByCycle(cycle)
    if (o && o.length > 0) offset = o[0].index + 1
  } catch(e) {}

  if (len > 0) {
    console.log('readSavePoxEntries: cycle=' + cycle + ' number entries=' + len + ' from offset=', offset)
    readSavePoxEntries(cycle, len, offset);
    return { entries: len }
  }
  return []
}

export async function readSavePoxEntries(cycle:number, len:number, offset:number):Promise<any> {
    const entries = []
    let poxEntry:PoxEntry;
    for (let i = offset; i < len; i++) {
      //if (i > 2) {
      //  i = len;
      //  break;
      //}
      let poxAddr:PoxAddress = {} as PoxAddress;
      try {
        const entry = await getRewardSetPoxAddress(cycle, i)
        if (entry) {
          poxAddr = {
            version: entry['pox-addr'].value.version.value, 
            hashBytes: entry['pox-addr'].value.hashbytes.value
          }
    
          poxEntry = {
            index: i,
            cycle,
            poxAddr,
            bitcoinAddr: getAddressFromHashBytes(getConfig().network, poxAddr.hashBytes, poxAddr.version),
            stacker: (entry.stacker.value) ? entry.stacker.value.value : undefined,
            totalUstx: Number(entry['total-ustx'].value),
            delegations: 0
          } as PoxEntry
          if (poxEntry.stacker) {
            const result = await readDelegates(poxEntry.stacker)
            //console.log('readDelegates: ', result)
            poxEntry.delegations = result?.total || 0
          }
          await saveOrUpdatePoxEntry(poxEntry)
          entries.push(poxEntry)
        }
      } catch (err:any) {
        console.error('readSavePoxEntries: saving: ' + poxAddr + '/' + cycle + '/' + i)
        console.error('readSavePoxEntries: ' + err.message)
      }
    }
    return entries
  }
  
  async function readDelegates(delegate:string) {
    const url = getConfig().stacksApi + '/extended/beta/stacking/' + delegate + '/delegations?offset=0&limit=1';
    try {
      const response = await fetch(url);
      const val = await response.json();
      return val;
    } catch (err:any) {
       console.log('callContractReadOnly4: ', err);
    }
  }
  
  // -- mongo: reward slots -------------
  export async function findLastPoxEntryByCycle(cycle:number):Promise<any> {
    const result = await poxAddressInfo.find({cycle}).sort({index: -1}).limit(1).toArray();
    return result;
  }
  
  export async function findPoxEntryByCycleAndIndex(cycle:number, index:number):Promise<any> {
    const result = await poxAddressInfo.find({cycle, index}).limit(1).toArray();
    return result;
  }
  
  export async function findPoxEntryByPoxAddr(poxAddr:PoxAddress):Promise<any> {
    const result = await poxAddressInfo.findOne({poxAddr});
    return result;
  }
  
  export async function findPoxEntriesByAddress(address:string):Promise<any> {
    const result = await poxAddressInfo.find({"bitcoinAddr":address}).toArray();
    return result;
  }
  
  export async function findPoxEntriesByAddressAndCycle(address:string, cycle:number):Promise<any> {
    const result = await poxAddressInfo.find({"bitcoinAddr":address, cycle}).toArray();
    return result;
  }
  
  export async function findPoxEntriesByStacker(stacker:string):Promise<any> {
    const result = await poxAddressInfo.find({stacker}).toArray();
    return result;
  }
  
  export async function findPoxEntriesByStackerAndCycle(stacker:string, cycle:number):Promise<any> {
    const result = await poxAddressInfo.find({stacker, cycle}).toArray();
    return result;
  }
  
  export async function findPoxEntriesByCycle(cycle:number):Promise<any> {
    const result = await poxAddressInfo.find({cycle}).toArray();
    return result;
  }
  
  export async function saveOrUpdatePoxEntry(poxEntry:PoxEntry) {
	try {
    console.log('saveOrUpdatePoxEntry: saving: ' + poxEntry.bitcoinAddr + '/' + poxEntry.stacker + '/' + poxEntry.cycle + '/' + poxEntry.index)
    await savePoxEntryInfo(poxEntry)
  } catch (err:any) {
		console.log('saveOrUpdatePoxEntry: unable to save or update' + poxEntry.bitcoinAddr)
	}
}

export async function savePoxEntryInfo(vote:any) {
	const result = await poxAddressInfo.insertOne(vote);
	return result;
}

