import { poxAddressInfo, stackerVotes } from "../../../lib/data/db_models";
import { getConfig } from "../../../lib/config";
import { getRewardsByAddress } from "../reward-slots/reward_slot_helper";
import { findPoolStackerEventsByHashBytesAndVersion, findPoolStackerEventsByStacker } from '../stacker-events/pool_stacker_events_helper';
import { type PoolStackerEvent, type PoxAddress, type PoxEntry, type StackerInfo, type StackerStats, type VoteEvent } from '@mijoco/stx_helpers/dist/index';
import { getNumbEntriesRewardCyclePoxList, getPartialStackedByCycle, getPoxCycleInfo, getRewardSetPoxAddress, getStackerInfoFromContract } from '@mijoco/stx_helpers/dist/pox/index';
import { getAddressFromHashBytes, getHashBytesFromAddress } from '@mijoco/btc_helpers/dist/index';
import { findStackerVotesByVoter } from "../stacker-voting/vote_count_helper";

export async function getPoxBitcoinAddressInfo(address:string, cycle:number, sender:string):Promise<any> {
  return {
    partialStackedByCycle: await getPartialStackedByCycle(getConfig().stacksApi, getConfig().network, getConfig().poxContractId!, address, cycle, sender),
  };
}

export async function readPoxEntriesFromContract(cycle:number):Promise<any> {
  const len = await getNumbEntriesRewardCyclePoxList(getConfig().stacksApi, getConfig().poxContractId!, cycle)
  let offset = 0
  try {
    const o = await findLastPoxEntryByCycle(cycle)
    if (o && o.length > 0) offset = o[0].index + 1
  } catch(e) {}

  if (len > 0) {
    console.log('readSavePoxEntries: cycle=' + cycle + ' number entries=' + len + ' from offset=', offset)
    const entries = readSavePoxEntries(cycle, len, offset);
    return entries
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
      let bitcoinAddr:string|undefined;
      try {
        const entry = await getRewardSetPoxAddress(getConfig().stacksApi, getConfig().poxContractId!, cycle, i)
        console.log('readSavePoxEntries: ', entry)
        if (entry) {
          try {
            poxAddr = {
              version: entry['pox-addr'].value.version.value, 
              hashBytes: entry['pox-addr'].value.hashbytes.value
            }
            bitcoinAddr = getAddressFromHashBytes(getConfig().network, poxAddr.hashBytes, poxAddr.version)
          } catch(err:any) {}
    
          poxEntry = {
            index: i,
            cycle,
            poxAddr,
            bitcoinAddr,
            stacker: entry.stacker?.value?.value || undefined,
            totalUstx: Number(entry['total-ustx']?.value) || 0,
            delegations: 0
          } as PoxEntry
          //if (poxEntry.stacker) {
            //const result = await readDelegates(poxEntry.stacker)
            //console.log('readDelegates: ', result)
            //poxEntry.delegations = result?.total || 0
          //}
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
  

export async function collatePoolStackerInfo(address:string, cycle:number):Promise<StackerStats> {
  const addressType = 'stacks'
  const votes = await findStackerVotesByVoter(address)
  console.log('collatePoolStackerInfo: votes: ' + votes.length)
  const rewardSlots:Array<any> = [];
  const poxEntries:Array<any> = await findPoxEntriesByStacker(address);
  const stackerEvents:Array<PoolStackerEvent> = await findPoolStackerEventsByStacker(address)
  const stackerEventsAsDelegator:Array<PoolStackerEvent> = await findPoolStackerEventsByStacker(address)
  const stackerInfo:Array<StackerInfo> = [];

  const stackerInfoPerCycle = (await getStackerInfoFromContract(getConfig().stacksApi, getConfig().network, getConfig().poxContractId!, address, cycle)) as StackerInfo;
  stackerInfoPerCycle.cycleInfo = await getPoxCycleInfo(getConfig().stacksApi, getConfig().poxContractId!, cycle);
  countEntries(cycle, stackerInfoPerCycle)
  stackerInfo.push(stackerInfoPerCycle)

  return {
    address,
    addressType,
    cycle,
    votes,
    stackerInfo,
    poxEntries,
    rewardSlots,
    stackerEvents,
    stackerEventsAsDelegator,
    
  }
}
async function countEntries(cycle:number, stackerInfo:StackerInfo) {
  let entries:Array<any> = [];
  let totalStacked = 0
  if (!stackerInfo || !stackerInfo.stacker || !stackerInfo.stacker.rewardSetIndexes) {
    return {entries, totalStacked};
  }

  for (const entry of stackerInfo.stacker.rewardSetIndexes) {
    try {
      const result = await findPoxEntryByCycleAndIndex(cycle, Number(entry.value))
      //console.log('countEntries: poxEntry: ', result)
      if (result && result.length > 0) {
        entries.push({
          amount: result[0].totalUstx,
          cycle: result[0].cycle,
          index: result[0].index,
          bitcoinAddress: result[0].bitcoinAddr
        })
        totalStacked += result[0].totalUstx
      }
    } catch(err:any) {
      console.log('countEntries: ' + err.message)
    }
  }
  return {entries, totalStacked}
}

export async function extractAllPoxEntriesInCycle(address:string, cycle:number) {
  const poxEntries:Array<any> = await findPoxEntriesByAddressAndCycle(address, cycle);
  //console.log('extractAllPoxEntriesInCycle: poxEntries: address: ' + address + ' cycle: ' + cycle, poxEntries)
  let newEntries = [];
  try {
    for (const entry of poxEntries) {
      const idx = newEntries.findIndex((o) => o.index === entry.index)
      if (idx === -1) newEntries.push(entry)
    }
  } catch(err:any) {
    newEntries = poxEntries;
    console.error('extractAllPoxEntriesInCycle: error1: ' + err.message)
  }
  //console.log('extractAllPoxEntriesInCycle: ' + newEntries.length)

  for (const entry of newEntries) {
    try {
      if (entry.stacker) {
        const stackerInfoPerCycle = (await getStackerInfoFromContract(getConfig().stacksApi, getConfig().network, getConfig().poxContractId!, entry.stacker, entry.cycle));
        if (stackerInfoPerCycle?.stacker?.rewardSetIndexes) {
          entry.poxStackerInfo = await countEntries(entry.cycle, stackerInfoPerCycle)
        }
      } else {
        entry.poxStackerInfo = []
      }
    } catch (err:any) {
      console.error('extractAllPoxEntriesInCycle: error2: ' + err.message)
    }
  }
  return newEntries
}

export async function collateSoloStackerInfo(address:string, cycle:number):Promise<StackerStats> {

  const addressType = 'bitcoin'
  const votes = await findStackerVotesByVoter(address)

  let vote:VoteEvent = {} as VoteEvent
  if (votes && votes.length > 0) vote = votes[0]

  let voterProxy = address
  if (vote && vote.voterProxy) voterProxy = vote.voterProxy
  console.log('collateSoloStackerInfo: address: ' + address + ' proxy: ' + voterProxy)

  //const rewardSlots:Array<any> = await findRewardSlotByAddress(address);
  const rewardSlots:Array<any> = await getRewardsByAddress(0, 30, voterProxy);
  let poxEntries:Array<any> = await extractAllPoxEntriesInCycle(voterProxy, cycle);
  const poxEntries1:Array<any> = await extractAllPoxEntriesInCycle(voterProxy, cycle + 1);
  poxEntries = poxEntries.concat(poxEntries1)
  let stackerEvents:Array<PoolStackerEvent> = []
  let stackerEventsAsDelegator:Array<PoolStackerEvent> = [];
  if (vote && vote.poxStacker) {
    stackerEvents = await findPoolStackerEventsByStacker(vote.poxStacker)
    stackerEventsAsDelegator = await findPoolStackerEventsByStacker(vote.poxStacker);
  }
  const hashBytes = getHashBytesFromAddress(getConfig().network, voterProxy)
  let stackerEventsAsPoxAddress:Array<PoolStackerEvent> = []
  if (hashBytes) stackerEventsAsPoxAddress = await findPoolStackerEventsByHashBytesAndVersion(hashBytes.version, hashBytes.hashBytes, 0, 100);
  
  const stackerInfo:Array<StackerInfo> = [];

  return {
    address,
    addressType,
    cycle,
    votes,
    stackerInfo,
    poxEntries,
    rewardSlots,
    stackerEvents,
    stackerEventsAsDelegator,
    stackerEventsAsPoxAddress,
  }
}

export async function collateStackerInfo(address:string, cycle:number):Promise<StackerStats> {
    if (address.toUpperCase().startsWith('S')) {
      console.log('collateStackerInfo: stacks address: ' + address)
      return await collatePoolStackerInfo(address, cycle)
    } else {
      console.log('collateStackerInfo: bitcoin address: ' + address)
      return await collateSoloStackerInfo(address, cycle)
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

async function updatePoxEntryInfo(vote:any, changes: any) {
	const result = await poxAddressInfo.updateOne({
		_id: vote._id
	},
    { $set: changes});
	return result;
}

