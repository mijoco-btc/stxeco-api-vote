/**
 * sbtc - interact with Stacks Blockchain to read sbtc contract info
 */
import { cvToJSON, deserializeCV } from '@stacks/transactions';
import { VotingEventVoteOnProposal, VotingEventConcludeProposal, VotingEventProposeProposal, ExtensionType, SubmissionData, getTransaction, ProposalContract, StackerProposalData } from '@mijoco/stx_helpers/dist/index';
import { getConfig } from '../config';
import { votingContractEventCollection } from '../data/db_models';
import { getDaoConfig } from '../config_dao';
import { generateAddresses, getMetaData, getProposalContractSource, getProposalData } from './proposal';
import { ObjectId } from 'mongodb';

export async function updateStackerData(sip:boolean, proposalId:string) {
  const proposal:VotingEventProposeProposal = await fetchProposeEvent(proposalId)
  if (!proposal) throw new Error('Proposal ' + proposalId + ' not found')
  const addressInfo = await generateAddresses(proposal.proposalMeta.title)
  console.log('updateStackerData: ', addressInfo)
  if (!proposal.stackerData) {
    proposal.stackerData = {} as StackerProposalData
  }
  proposal.stackerData.sip = Boolean(sip)
  if (!proposal.stackerData.stacksAddressYes) proposal.stackerData.stacksAddressYes = addressInfo.yStxAddress
  if (!proposal.stackerData.stacksAddressNo) proposal.stackerData.stacksAddressNo = addressInfo.nStxAddress
  if (!proposal.stackerData.bitcoinAddressYes) proposal.stackerData.bitcoinAddressYes = addressInfo.yBtcAddress
  if (!proposal.stackerData.bitcoinAddressNo) proposal.stackerData.bitcoinAddressNo = addressInfo.nBtcAddress
  await updateDaoEvent(proposal._id, proposal)
  return proposal
}

export async function toggleSipStatus(proposalId:string) {
  const proposal:VotingEventProposeProposal = await fetchProposeEvent(proposalId)
  if (!proposal) throw new Error('Proposal ' + proposalId + ' not found')
  if (!proposal.stackerData) {
    proposal.stackerData = {} as StackerProposalData
  }
  proposal.stackerData.sip = !proposal.stackerData?.sip || true
  await updateDaoEvent(proposal._id, proposal)
  return proposal
}


export async function scanVoting(genesis:boolean)  {
  try {
    await readVotingEvents(genesis, `${getDaoConfig().VITE_DOA_DEPLOYER}.ecosystem-dao`, `${getDaoConfig().VITE_DOA_DEPLOYER}.ede007-snapshot-proposal-voting`)
  } catch (err) {
    console.log('Error running: ede007-snapshot-proposal-voting: ', err);
  }
  const vcs = getDaoConfig().VITE_DOA_VOTING_CONTRACTS.split(',')
  console.log('scanVoting: votingContracts ' + getDaoConfig().VITE_DOA_VOTING_CONTRACTS)
  for (const vc of vcs) {
    try {
      await readVotingEvents(genesis, `${getDaoConfig().VITE_DOA_DEPLOYER}.bitcoin-dao`, `${getDaoConfig().VITE_DOA_DEPLOYER}.${vc}`)
    } catch (err) {
      console.log('Error running: bde007-snapshot-proposal-voting: ', err);
    }
  }
}

export async function readVotingEvents(genesis:boolean, daoContract:string, votingContract:string) {
  console.log('VotingContractEvents: votingContract ' + votingContract)
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
        console.log('readVotingEvents: ' + err.message)
      }
    }
    while (moreEvents)
  }
  catch (err) {
      console.log('readVotingEvents: error: ', err);
  }
  return extensions;
}

async function resolveExtensionEvents(url:string, currentOffset:number, count:number, daoContract:string, votingContract:string):Promise<any> {
  let urlOffset = url + '&offset=' + (currentOffset + (count * 20))
  const response = await fetch(urlOffset);
  const val = await response.json();
  if (!val || !val.results || typeof (val.results) !== 'object' || val.results.length === 0) {
    console.log('VotingContractEvents: no results ', val + ' for url ' + urlOffset)
    return false
  } 
    
  console.log('VotingContractEvents: processing ' + (val?.results?.length || 0) + ' events from ' + urlOffset)
  //console.log('resolveExtensionEvents: val: ', val)
  for (const event of val.results) {
    const pdb = await findVotingContractEventByContractAndIndex(votingContract, Number(event.event_index), event.tx_id)
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
      _id: new ObjectId(),
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
    await updateStackerData(false, proposal)

  } else if (result.value.event.value === 'vote') {

    //console.log('resolveExtensionEvents: extension: ', util.inspect(event, false, null, true /* enable colors */))
    const votingContractEvent = {
      _id: new ObjectId(),
      event: 'vote',
      event_index: Number(event.event_index),
      txId: event.tx_id,
      daoContract,
      votingContract,
      proposal: result.value.proposal.value,
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
      _id: new ObjectId(),
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

export async function countVotes(proposal:string):Promise<number> {
  try {
    const result = await votingContractEventCollection.countDocuments({proposal, event:'vote'});
    return Number(result);
  } catch (err:any) {
    return 0
  }
}

async function getSubmissionContract(txId:string):Promise<string> {
  const fundingTx = await getTransaction(getConfig().stacksApi, txId)
  return fundingTx.contract_call.contract_id;
}


/**
 * Vote methods
 */
export async function getVotesByProposal(proposal:string):Promise<any> {
	const result = await votingContractEventCollection.find({proposal, event:'vote'}).toArray();
	return result;
}

export async function getVotesByVoter(voter:string):Promise<any> {
	const result = await votingContractEventCollection.find({voter, event:'vote'}).toArray();
	return result;
}
export async function getVotesByProposalAndVoter(proposal:string, voter:string):Promise<any> {
	const result = await votingContractEventCollection.find({proposal, voter, event:'vote'}).toArray();
	return result;
}



/**
 * Proposal methods
 */
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
export async function fetchConcludeEvent(proposal:string):Promise<any> {
	const result = await votingContractEventCollection.findOne({proposal, event: 'conclude'});
	return result;
}
export async function fetchAllProposeEvents():Promise<any> {
	const result = await votingContractEventCollection.find({event: 'propose'}).toArray();
	return result;
}
export async function fetchActiveProposeEvents():Promise<any> {
  const activePs = []
	const results = await votingContractEventCollection.find({event: 'propose'}).toArray();
  for (const res of results) {
    const cp = await fetchConcludeEvent(res.proposal);
    if (!cp) activePs.push(res)
  }
	return activePs;
}
export async function fetchAllConcludedEvents():Promise<any> {
	const result = await votingContractEventCollection.find({event: 'conclude'}).toArray();
	return result;
}
export async function fetchLatestProposal(proposalId:string):Promise<any> {
  const proposal:VotingEventProposeProposal = await fetchProposeEvent(proposalId)
  const pd = await getProposalData(proposal.votingContract, proposal.proposal)
  proposal.proposalData = pd;
  return proposal;
}
export async function findVotingContractEventByTxId(txId:string):Promise<any> {
	const result = await votingContractEventCollection.findOne({"txId":txId});
	return result;
}
export async function findVotingContractEventByContractAndIndex(votingContract:string, event_index:number, txId:string):Promise<any> {
	const result = await votingContractEventCollection.findOne({votingContract, event_index, txId});
	return result;
}
export async function findVotingContractEventById(id:string):Promise<any> {
	const result = await votingContractEventCollection.findOne({_id: new ObjectId(id)});
	return result;
}
async function deleteVotingContractEvent(tp:VotingEventVoteOnProposal|VotingEventConcludeProposal|VotingEventProposeProposal):Promise<any> {
	const result = await votingContractEventCollection.deleteOne({txId: tp.txId});
	return result;
}

export async function getProposals():Promise<Array<VotingEventProposeProposal>> {
	const results:Array<VotingEventProposeProposal> = (await votingContractEventCollection.find({ 'event':'propose' }).toArray()) as unknown as Array<VotingEventProposeProposal>;
  for (const proposal of results) {
    const conc = await fetchConcludeEvent(proposal.proposal)
    if (conc) proposal.proposalData.concluded = true
  }
	return results as unknown as Array<VotingEventProposeProposal>;
}

async function saveOrUpdateEvent(votingContractEvent:VotingEventVoteOnProposal|VotingEventConcludeProposal|VotingEventProposeProposal) {
	try {
		const pdb = await findVotingContractEventByContractAndIndex(votingContractEvent.votingContract, votingContractEvent.event_index, votingContractEvent.txId)
		console.log('saveOrUpdateEvent: pdb', pdb)
		if (pdb) {
			console.log('saveOrUpdateEvent: updating: ' + votingContractEvent.votingContract + ' / ' + votingContractEvent.event + ' / ' + votingContractEvent.event_index + ' / ' + votingContractEvent.txId);
			await updateDaoEvent(votingContractEvent._id, votingContractEvent)
		} else {
			console.log('saveOrUpdateEvent: saving: ' + votingContractEvent.votingContract + ' / ' + votingContractEvent.event + ' / ' + votingContractEvent.event_index + ' / ' + votingContractEvent.txId);
			await saveDaoEvent(votingContractEvent)
		}
	} catch (err:any) {
		console.log('saveOrUpdateEvent: error', err)
	}
}
async function saveDaoEvent(proposal:VotingEventVoteOnProposal|VotingEventConcludeProposal|VotingEventProposeProposal) {
  proposal._id = new ObjectId()
  const result = await votingContractEventCollection.insertOne(proposal);
	return result;
}

async function updateDaoEvent(_id:ObjectId, changes: VotingEventVoteOnProposal|VotingEventConcludeProposal|VotingEventProposeProposal) {
	const result = await votingContractEventCollection.updateOne({
		_id: new ObjectId(_id)
	},
  { $set: changes});
	return result;
}


