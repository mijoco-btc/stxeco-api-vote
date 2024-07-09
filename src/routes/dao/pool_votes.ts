import { getConfig } from "../../lib/config"
import { poolStackerAddresses } from "./solo_pool_addresses"
import { getBurnBlockHeight } from "./dao_helper"
import { findPoolStackerEventsByStackerAndEvent } from "../pox3/pool_stacker_events_helper"
import { findVotesByProposalAndMethod, saveOrUpdateVote, updateVote } from "./vote_count_helper"
import { Stacker, VoteEvent, VotingEventProposeProposal, callContractReadOnly } from "@mijoco/stx_helpers/dist/index"
import { fetchProposeEvent } from "../../lib/events/event_helper_voting_contract"
import { getStackerInfoFromContract } from "../pox3/pox_contract_helper"
import { hex } from '@scure/base';
import { serializeCV, principalCV } from '@stacks/transactions';
import { getAddressFromHashBytes } from "../pox3/pox_helper"

const limit = 50 ;
const PRE_NAKAMOTO_REWARD_CYCLE = 88
const PRE_NAKAMOTO_STACKS_TIP_HEIGHT = 850850


export async function getPoolTransactions():Promise<{poolTxsYes:Array<VoteEvent> , poolTxsNo:Array<VoteEvent>}> {
  const addresses = poolStackerAddresses(getConfig().network)
  let poolTxsYes:Array<VoteEvent> = []
  let poolTxsNo:Array<VoteEvent> = []
  let offset = 0; //await countContractEvents();
  let events:any;
  do {
    events = await getPoolVotes(offset, addresses.yAddress);
    if (events && events.results.length > 0) poolTxsYes = poolTxsYes.concat(events.results)
    offset += limit;
  } while (events.results.length > 0);
  do {
    events = await getPoolVotes(offset, addresses.nAddress);
    if (events && events.results.length > 0) poolTxsNo = poolTxsNo.concat(events.results)
    offset += limit;
  } while (events.results.length > 0);
  return {poolTxsYes , poolTxsNo};
}


export async function getPoolTxs(proposal:VotingEventProposeProposal):Promise<{poolTxsYes:Array<VoteEvent> , poolTxsNo:Array<VoteEvent>}> {
  const addresses = poolStackerAddresses(getConfig().network)
  let poolTxsYes:Array<VoteEvent> = []
  let poolTxsNo:Array<VoteEvent> = []
  let offset = 0; //await countContractEvents();
  let events:any;
  do {
    events = await getPoolVotes(offset, addresses.yAddress);
    if (events && events.results.length > 0) poolTxsYes = poolTxsYes.concat(events.results)
    offset += limit;
  } while (events.results.length > 0);
  do {
    events = await getPoolVotes(offset, addresses.nAddress);
    if (events && events.results.length > 0) poolTxsNo = poolTxsNo.concat(events.results)
    offset += limit;
  } while (events.results.length > 0);
  addToMongoDB(proposal, poolTxsYes, true)
  addToMongoDB(proposal, poolTxsNo, false)

  return {poolTxsYes , poolTxsNo};
}



async function addToMongoDB(proposal:VotingEventProposeProposal, txs:Array<any>, vfor:boolean):Promise<Array<VoteEvent>> {
  let votes:Array<VoteEvent> = []
  console.log('addToMongoDB: transactions: ' + vfor + ' : ' + txs.length)
  for (const v of txs) {
    const burnBlockHeight = await getBurnBlockHeight(v.block_height)
    //const stackerInfo = await getStackerInfoAtTip(proposal.proposalData.startBlockHeight, v.sender_address)
    const stackerDel = await getCheckDelegationAtTip(proposal.proposalData.startBlockHeight, v.sender_address)
    console.log('getCheckDelegationAtTip: ', stackerDel)

    const potVote:any = {
      amount: (stackerDel && stackerDel.amount) ? stackerDel.amount : 0,
      for: vfor,
      proposalContractId: proposal.proposal,
      submitTxId: v.tx_id,
      event: 'pool-vote',
      votingContractId: proposal.votingContract,
      voter: v.sender_address,
      blockHeight: v.block_height,
      burnBlockHeight
    }
    console.log('setSoloVotes: potVote:' + potVote.amount)
    saveOrUpdateVote(potVote)
    votes.push(potVote)
  }
  return votes;
}

async function getCheckDelegationAtTip(tip:number, address:string) {
  const functionArgs = [`0x${hex.encode(serializeCV(principalCV(address)))}`];
  let contractName = 'pox-3'
  if (tip > PRE_NAKAMOTO_STACKS_TIP_HEIGHT) {
    contractName = 'pox-4'
  }
  const data = {
    contractAddress: getConfig().poxContractId!.split('.')[0],
    contractName,
    functionName: 'get-check-delegation',
    functionArgs,
    tip
  }
  try {
    const result = await callContractReadOnly(getConfig().stacksApi, data);
    if (result && result.value) {
      const props = result.value
      //console.log('getCheckDelegationAtTip: ', props)
      return {
        amount: Number(props.value['amount-ustx']?.value || 0),
        delegatedTo: props.value['delegated-to']?.value || undefined,
        untilBurnHt: props.value['until-burn-ht']?.value || undefined,
        poxAddr: { 
          version: props.value['pox-addr']?.value?.version?.value || undefined, 
          hashBytes: props.value['pox-addr']?.value?.hashbytes?.value || undefined
        },
        //bitcoinAddr: getAddressFromHashBytes(props.value['pox-addr']?.value.hashbytes.value, result.value['pox-addr'].value.version.value),
      }
    }
  } catch (e:any) { 
    console.log('getCheckDelegationAtTip: ' + e.message)
  }
  return
}

async function getStackerInfoAtTip(tip:number, address:string):Promise<Stacker|undefined> {
  const functionArgs = [`0x${hex.encode(serializeCV(principalCV(address)))}`];
  let contractName = 'pox-3'
  if (tip > PRE_NAKAMOTO_STACKS_TIP_HEIGHT) {
    contractName = 'pox-4'
  }
  const data = {
    contractAddress: getConfig().poxContractId!.split('.')[0],
    contractName,
    functionName: 'get-stacker-info',
    functionArgs,
    tip
  }
  try {
    const result = await callContractReadOnly(getConfig().stacksApi, data);
    console.log('addToMongoDB: stackerInfo: ', result)
    return (result.value) ? {
      rewardSetIndexes: result.value.value['reward-set-indexes'].value,
      lockPeriod: result.value.value['reward-set-indexes'].value,
      firstRewardCycle: result.value.value['first-reward-cycle'].value,
      poxAddr: { 
        version: result.value.value['pox-addr'].value.version.value, 
        hashBytes: result.value.value['pox-addr'].value.hashbytes.value
      },
      bitcoinAddr: getAddressFromHashBytes(result.value.value['pox-addr'].value.hashbytes.value, result.value.value['pox-addr'].value.version.value),
    } : undefined;
  } catch (e:any) { 
    console.log('getCheckDelegationAtTip: ' + e.message)
   }
  return
}

export async function reconcilePoolTxs(proposal:VotingEventProposeProposal):Promise<any> {
  try {
    const votesAll:Array<VoteEvent> = await findVotesByProposalAndMethod(proposal.proposal, 'pool-vote');
    let offset = 0; //await countContractEvents();
    for (const voteTx of votesAll) {
      //const voted = votes.filter((o) => o.voter === voteTx.sender_address)
      //console.log('reconcilePoolTxs: vote: ', voteTx)
      //if (!voted || voted.length === 0) {
      if (voteTx.voter && isVoteAllowed(voteTx, voteTx.voter, voteTx.burnBlockHeight)) {
        let updates:any;
        const stackerEvents = await findPoolStackerEventsByStackerAndEvent(voteTx.voter, 'delegate-stx');
        if (stackerEvents && stackerEvents.length > 0) {
          console.log('reconcilePoolTxs: stackerEvents: ' + stackerEvents.length)
          try {
            let event = stackerEvents.find((o:any) => o.burnchainUnlockHeight === 0)
            if (!event) event = stackerEvents[0]
            updates = {
              delegateTo: event.data.delegator,
              delegateTxId: event.submitTxId,
              amount: (event.data.amountUstx) ? event.data.amountUstx : 0,
            }
            await updateVote(voteTx, updates)
            console.log('reconcilePoolTxs: updated: ' + voteTx.event + ' : ' + voteTx.voter + ' : ' + voteTx.amount)
          } catch(err:any) {
            console.log('reconcilePoolTxs: error: getting first amount + ', stackerEvents)
          }
        } else {
          console.log('reconcilePoolTxs: stackerEvents: not found for ' + voteTx.voter + ' : delegate-stx')
        }
      } else {
        console.log('reconcilePoolTxs: rejected: vote: ' + voteTx.voter + ' offset: ' + offset)
      }
    }
    return;
  } catch (err:any) {
    console.log('err reconcilePoolTxs: ' + err);
    return [];
  }
}

function isVoteAllowed(v:any, principle:string, burnBlockHeight:number) {
    return v.voter === principle //&& burnBlockHeight >= NAKAMOTO_VOTE_START_HEIGHT && burnBlockHeight < NAKAMOTO_VOTE_STOPS_HEIGHT
  }

  async function getPoolVotes(offset:number, principle:string):Promise<any> {
    const url = getConfig().stacksApi + '/extended/v1/address/' + principle + '/transactions?limit=' + limit + '&offset=' + offset;
    let val;
    try {
        const response = await fetch(url)
        val = await response.json();
    } catch (err) {
        console.log('getPoolYesVotes: ', err);
    }
    return val;
  }