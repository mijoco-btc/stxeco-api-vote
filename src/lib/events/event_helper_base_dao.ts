/**
 * sbtc - interact with Stacks Blockchain to read sbtc contract info
 */
import { cvToJSON, deserializeCV } from '@stacks/transactions';
import { DaoEventExecuteProposal, DaoEventEnableExtension, ExtensionType, callContractReadOnly } from '@mijoco/stx_helpers/dist/index';
import { getConfig } from '../config';
import { daoEventCollection } from '../data/db_models';
import { isExtension } from './extension';

export async function readDaoEvents(genesis:boolean, daoContractId:string) {
  const url = getConfig().stacksApi + '/extended/v1/contract/' + daoContractId + '/events?limit=20';
  const extensions: Array<ExtensionType> = [];
  let currentOffset = 0
  if (!genesis) {
    currentOffset = await countAllEvents();
  }
  let count = 0;
  let moreEvents = true
  try {
    do {
      try {
        moreEvents = await resolveExtensionEvents(url, currentOffset, count, daoContractId)
        count++;
      } catch (err:any) {
        console.log('readDaoEvents: ' + err.message)
      }
    }
    while (moreEvents)
  }
  catch (err) {
      console.log('readDaoEvents: error: ', err);
  }
  return extensions;
}

async function resolveExtensionEvents(url:string, currentOffset:number, total:number, daoContractId:string):Promise<any> {
  let urlOffset = url + '&offset=' + (currentOffset + (total * 20))
  const response = await fetch(urlOffset);
  const val = await response.json();
  if (val?.results?.length > 0) console.log('DaoEvents: processing ' + (val?.results?.length || 0) + ' events from ' + url)
  for (const event of val.results) {
    const pdb = await findBaseDaoEventByContractAndIndex(daoContractId, Number(event.event_index), event.tx_id)
    if (!pdb) {
      try {
        processEvent(event, daoContractId)
      } catch (err:any) {
        console.log('resolveExtensionEvents: ', err)
      }
    }
  }
  return val.results?.length > 0 || false
}

async function processEvent(event:any, daoContract:string) {
  const result = cvToJSON(deserializeCV(event.contract_log.value.hex));
  console.log('processEvent: new event: ' + result.value.event.value + ' contract=' + event.event_index+ ' / ' + event.tx_id)
  if (result.value.event.value === 'execute') {
    //console.log('resolveExtensionEvents: execute: ', util.inspect(event, false, null, true /* enable colors */))
    const daoEvent = {
      event: 'execute',
      event_index: Number(event.event_index),
      txId: event.tx_id,
      daoContract,
      proposal: result.value.proposal.value,
    } as DaoEventExecuteProposal
    await saveOrUpdateDaoEvent(daoEvent)
  } else if (result.value.event.value === 'extension') {
    //console.log('resolveExtensionEvents: extension: ', util.inspect(event, false, null, true /* enable colors */))
    const daoEvent = {
      event: 'extension',
      event_index: Number(event.event_index),
      txId: event.tx_id,
      daoContract,
      extension: result.value.extension.value,
      enabled: Boolean(result.value.enabled.value),
    } as DaoEventEnableExtension
    daoEvent.enabled = (await isExtension(daoContract.split('.')[0], daoContract.split('.')[1], result.value.extension.value)).result
    //console.log('resolveExtensionEvents: extension: enabled=' + daoEvent.enabled + ' contract=' + daoEvent.extension + ' contract=' + daoEvent.extension + ' event.event_index=' + event.event_index)
    await saveOrUpdateDaoEvent(daoEvent)
  }
}

// Mongo collection methods
async function saveOrUpdateDaoEvent(tp:DaoEventExecuteProposal|DaoEventEnableExtension) {
	try {
		const pdb = await findBaseDaoEventByContractAndIndex(tp.daoContract, tp.event_index, tp.txId)
		if (pdb) {
			console.log('saveOrUpdateDaoEvent: updating: ' + tp.event + ' / ' + tp.event_index + ' / ' + tp.txId);
			await updateDaoEvent(pdb, tp)
		} else {
			console.log('saveOrUpdateDaoEvent: saving: ' + tp.event + ' / ' + tp.event_index + ' / ' + tp.txId);
			await saveDaoEvent(tp)
		}
	} catch (err:any) {
		console.log('saveOrUpdateDaoEvent: error', err)
	}
}
async function saveDaoEvent(proposal:DaoEventExecuteProposal|DaoEventEnableExtension) {
	const result = await daoEventCollection.insertOne(proposal);
	return result;
}

async function updateDaoEvent(event:DaoEventExecuteProposal|DaoEventEnableExtension, changes: any) {
	const result = await daoEventCollection.updateOne({
		daoContract: event.daoContract,
		event_index: event.event_index
	},
    { $set: changes});
	return result;
}

export async function fetchBaseDaoEvents():Promise<any> {
	const result = await daoEventCollection.find({}).toArray();
	return result;
}
export async function fetchByBaseDaoEvent(daoContract:string, event:string):Promise<any> {
	const result = await daoEventCollection.find({daoContract, event}).toArray();
	return result;
}
async function deleteBaseDaoEvent(tp:DaoEventExecuteProposal|DaoEventEnableExtension):Promise<any> {
	const result = await daoEventCollection.deleteOne({txId: tp.txId});
	return result;
}
export async function findBaseDaoEventByTxId(txId:string):Promise<any> {
	const result = await daoEventCollection.findOne({"txId":txId});
	return result;
}
export async function findBaseDaoEventByContractAndIndex(daoContract:string, event_index:number, txId:string):Promise<any> {
	const result = await daoEventCollection.findOne({daoContract, event_index, txId});
	return result;
}


export async function countAllEvents():Promise<number> {
  try {
    const result = await daoEventCollection.countDocuments();
    return Number(result);
  } catch (err:any) {
    return 0
  }
}
