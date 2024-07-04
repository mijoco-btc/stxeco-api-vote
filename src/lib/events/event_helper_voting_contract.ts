/**
 * sbtc - interact with Stacks Blockchain to read sbtc contract info
 */
import { cvToJSON, deserializeCV } from '@stacks/transactions';
import { VotingEventVoteOnProposal, VotingEventConcludeProposal, VotingEventProposeProposal, ExtensionType, SubmissionData, getTransaction, ProposalContract } from '@mijoco/stx_helpers/dist/index';
import { getConfig } from '../config';
import { votingContractEventCollection } from '../data/db_models';
import { getDaoConfig } from '../config_dao';
import { getMetaData, getProposalContractSource, getProposalData } from './proposal';

export async function readVotingEvents(genesis:boolean, daoContract:string, votingContract:string) {
  const url = getConfig().stacksApi + '/extended/v1/contract/' + votingContract + '/events?limit=20';
  const extensions: Array<ExtensionType> = [];
  let currentOffset = 0
  if (!genesis) {
    currentOffset = await countEventsByVotingContract(daoContract, votingContract);
  }
  let count = 0;
  let moreEvents = true
  try {
    do {
      try {
        moreEvents = await resolveExtensionEvents(url, currentOffset, count, daoContract, votingContract)
        count++;
      } catch (err:any) {
        console.log('readDaoEvents: ' + err.message)
      }
    }
    while (moreEvents)
  }
  catch (err) {
      console.log('readDaoEvents: ', err);
  }
  return extensions;
}

async function resolveExtensionEvents(url:string, currentOffset:number, total:number, daoContract:string, votingContract:string):Promise<any> {
  let urlOffset = url + '&offset=' + (currentOffset + (total * 20))
  const response = await fetch(urlOffset);
  const val = await response.json();
  console.log('VotingContractEvents: processing ' + (val?.results?.length || 0) + ' events from ' + urlOffset)
  //console.log('resolveExtensionEvents: val: ', val)
  for (const event of val.results) {
    const pdb = await findVotingContractEventByContractAndIndex(daoContract, votingContract, Number(event.event_index), event.tx_id)
    if (!pdb) {
      try {
        processEvent(event, daoContract, votingContract)
      } catch (err:any) {
        console.log('resolveExtensionEvents: ', err)
      }
    }
  }
  return val.results?.length > 0 || false
}

async function processEvent(event:any, daoContract:string, votingContract:string) {
  
  const result = cvToJSON(deserializeCV(event.contract_log.value.hex));
  console.log('processEvent: new event: ' + result.value.event.value + ' contract=' + event.event_index+ ' / ' + event.tx_id)
  
  if (result.value.event.value === 'propose') {

    const proposal = result.value.proposal.value
    let contract:ProposalContract = await getProposalContractSource(proposal)
    //console.log('resolveExtensionEvents: execute: ', util.inspect(event, false, null, true /* enable colors */))
    const votingContractEvent = {
      event: 'propose',
      event_index: Number(event.event_index),
      txId: event.tx_id,
      daoContract,
      votingContract,
      submissionContract: await getSubmissionContract(event.tx_id),
      proposal,
      proposalMeta: getMetaData(contract.source), 
      contract, 
      proposalData: await getProposalData(votingContract, proposal),
      proposer: result.value.proposer.value,
    } as VotingEventProposeProposal
    console.log('processEvent: votingContractEvent', votingContractEvent)
    await saveOrUpdateEvent(votingContractEvent)

  } else if (result.value.event.value === 'vote') {

    //console.log('resolveExtensionEvents: extension: ', util.inspect(event, false, null, true /* enable colors */))
    const votingContractEvent = {
      event: 'vote',
      event_index: Number(event.event_index),
      txId: event.tx_id,
      daoContract,
      votingContract,
      proposal: result.value.extension.value,
      voter: result.value.voter.value,
      for: result.value.for.value,
      amount: Number(result.value.amount.value),
    } as VotingEventVoteOnProposal

    //console.log('resolveExtensionEvents: extension: enabled=' + votingContractEvent.enabled + ' contract=' + votingContractEvent.extension + ' contract=' + votingContractEvent.extension + ' event.event_index=' + event.event_index)
    await saveOrUpdateEvent(votingContractEvent)

  } else if (result.value.event.value === 'conclude') {

    const proposal = result.value.proposal.value
    let contract:ProposalContract = await getProposalContractSource(proposal)
    const votingContractEvent = {
      event: 'conclude',
      event_index: Number(event.event_index),
      txId: event.tx_id,
      daoContract,
      votingContract,
      proposal,
      passed: Boolean(result.value.passed.value),
      proposalMeta: getMetaData(contract.source), 
      contract, 
      proposalData: await getProposalData(votingContract, proposal),
    } as VotingEventConcludeProposal

    //console.log('resolveExtensionEvents: extension: enabled=' + votingContractEvent.enabled + ' contract=' + votingContractEvent.extension + ' contract=' + votingContractEvent.extension + ' event.event_index=' + event.event_index)
    await saveOrUpdateEvent(votingContractEvent)

  }
}

// Mongo collection methods
export async function countAllEvents():Promise<number> {
  try {
    const result = await votingContractEventCollection.countDocuments();
    return Number(result);
  } catch (err:any) {
    return 0
  }
}

export async function countEventsByVotingContract(daoContract:string, votingContract:string):Promise<number> {
  try {
    const result = await votingContractEventCollection.countDocuments({daoContract, votingContract});
    return Number(result);
  } catch (err:any) {
    return 0
  }
}

async function getSubmissionContract(txId:string):Promise<string> {
  const fundingTx = await getTransaction(getConfig().stacksApi, txId)
  return fundingTx.contract_call.contract_id;
}


export async function fetchVotingContractEvents():Promise<any> {
	const result = await votingContractEventCollection.find({}).toArray();
	return result;
}
export async function fetchByVotingContractEvent(daoContract:string, event:string):Promise<any> {
	const result = await votingContractEventCollection.find({daoContract, event}).toArray();
	return result;
}
export async function fetchProposeEvent(proposal:string):Promise<any> {
	const result = await votingContractEventCollection.findOne({proposal, event: 'propose'});
	return result;
}
export async function findVotingContractEventByTxId(txId:string):Promise<any> {
	const result = await votingContractEventCollection.findOne({"txId":txId});
	return result;
}
export async function findVotingContractEventByContractAndIndex(daoContract:string, votingContract:string, event_index:number, txId:string):Promise<any> {
	const result = await votingContractEventCollection.findOne({daoContract, votingContract, event_index, txId});
	return result;
}
async function deleteVotingContractEvent(tp:VotingEventVoteOnProposal|VotingEventConcludeProposal|VotingEventProposeProposal):Promise<any> {
	const result = await votingContractEventCollection.deleteOne({txId: tp.txId});
	return result;
}

export async function getActiveProposals():Promise<Array<VotingEventProposeProposal>> {
  let results:Array<any> = []
  const vcs = getDaoConfig().VITE_DOA_VOTING_CONTRACTS.split(',')
  for (const vc of vcs) {
    const activeForVC = await getActiveProposalsInt(`${getDaoConfig().VITE_DOA_DEPLOYER}.${vc}`)
    results = results.concat(activeForVC)
  }
	return results;
}

export async function getInactiveProposals():Promise<Array<VotingEventProposeProposal>> {
  let results:Array<any> = []
  const vcs = getDaoConfig().VITE_DOA_VOTING_CONTRACTS.split(',')
  for (const vc of vcs) {
    results = results.concat(await getInactiveProposalsInt(`${getDaoConfig().VITE_DOA_DEPLOYER}.${vc}`))
  }
	return results as unknown as Array<VotingEventProposeProposal>;
}

export async function getProposals():Promise<Array<VotingEventProposeProposal>> {
  let results:Array<any> = []
  const vcs = getDaoConfig().VITE_DOA_VOTING_CONTRACTS.split(',')
  for (const vc of vcs) {
    results = results.concat(await getProposalsInt(`${getDaoConfig().VITE_DOA_DEPLOYER}.${vc}`))
  }
	return results;
}

async function getActiveProposalsInt(votingContract:string):Promise<Array<VotingEventProposeProposal>> {
	const set1 = await votingContractEventCollection.find({ votingContract, 'event':'propose' }).toArray();
	const set2 = await getInactiveProposalsInt(votingContract);
  const results = []
  for (const p of set1) {
    const idx = set2.findIndex((o:VotingEventConcludeProposal) => o.proposal === p.proposal)
    if (idx === -1) {
      results.push(p)
    }
  }
	return results as unknown as Array<VotingEventProposeProposal>;
}

async function getInactiveProposalsInt(votingContract:string):Promise<any> {
	const set1 = await votingContractEventCollection.find({ votingContract, 'event':'conclude' }).toArray();
	return set1;
}
async function getProposalsInt(votingContract:string):Promise<any> {
	const set1 = await votingContractEventCollection.find({ votingContract, 'event':'propose' }).toArray();
	return set1;
}


async function saveOrUpdateEvent(votingContractEvent:VotingEventVoteOnProposal|VotingEventConcludeProposal|VotingEventProposeProposal) {
	try {
		const pdb = await findVotingContractEventByContractAndIndex(votingContractEvent.daoContract, votingContractEvent.votingContract, votingContractEvent.event_index, votingContractEvent.txId)
		console.log('saveOrUpdateEvent: pdb', pdb)
		if (pdb) {
			console.log('saveOrUpdateEvent: updating: ' + votingContractEvent.votingContract + ' / ' + votingContractEvent.event + ' / ' + votingContractEvent.event_index + ' / ' + votingContractEvent.txId);
			await updateDaoEvent(pdb, votingContractEvent)
		} else {
			console.log('saveOrUpdateEvent: saving: ' + votingContractEvent.votingContract + ' / ' + votingContractEvent.event + ' / ' + votingContractEvent.event_index + ' / ' + votingContractEvent.txId);
			await saveDaoEvent(votingContractEvent)
		}
	} catch (err:any) {
		console.log('saveOrUpdateEvent: error', err)
	}
}
async function saveDaoEvent(proposal:VotingEventVoteOnProposal|VotingEventConcludeProposal|VotingEventProposeProposal) {
	const result = await votingContractEventCollection.insertOne(proposal);
	return result;
}

async function updateDaoEvent(event:VotingEventVoteOnProposal|VotingEventConcludeProposal|VotingEventProposeProposal, changes: any) {
	const result = await votingContractEventCollection.updateOne({
		daoContract: event.daoContract,
		event_index: event.event_index
	},
  { $set: changes});
	return result;
}


