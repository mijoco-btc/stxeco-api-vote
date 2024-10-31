import { getConfig } from "../../lib/config";
import { poolStackerAddresses } from "./solo_pool_addresses";
import { getBurnBlockHeight } from "./dao_helper";
import { findPoolStackerEventsByStackerAndEvent } from "../voting/stacker-events/pool_stacker_events_helper";
import {
  findStackerVotesByProposalAndMethod,
  saveOrUpdateVote,
  updateVote,
} from "../voting/stacker-voting/vote_count_helper";
import {
  VoteEvent,
  VotingEventProposeProposal,
} from "@mijoco/stx_helpers/dist/index";
import { getCheckDelegation } from "@mijoco/stx_helpers/dist/pox/pox";
import { Delegation } from "@mijoco/stx_helpers/dist/pox_types";

const limit = 50;
const PRE_NAKAMOTO_REWARD_CYCLE = 88;
const PRE_NAKAMOTO_STACKS_TIP_HEIGHT = 850850;

export async function getPoolTransactions(): Promise<{
  poolTxsYes: Array<VoteEvent>;
  poolTxsNo: Array<VoteEvent>;
}> {
  const addresses = poolStackerAddresses(getConfig().network);
  let poolTxsYes: Array<VoteEvent> = [];
  let poolTxsNo: Array<VoteEvent> = [];
  let offset = 0; //await countContractEvents();
  let events: any;
  do {
    events = await getPoolVotes(offset, addresses.yAddress);
    if (events && events.results.length > 0)
      poolTxsYes = poolTxsYes.concat(events.results);
    offset += limit;
  } while (events.results.length > 0);
  do {
    events = await getPoolVotes(offset, addresses.nAddress);
    if (events && events.results.length > 0)
      poolTxsNo = poolTxsNo.concat(events.results);
    offset += limit;
  } while (events.results.length > 0);
  return { poolTxsYes, poolTxsNo };
}

export async function getPoolTxs(
  proposal: VotingEventProposeProposal
): Promise<{ poolTxsYes: Array<VoteEvent>; poolTxsNo: Array<VoteEvent> }> {
  const addresses = poolStackerAddresses(getConfig().network);
  let poolTxsYes: Array<VoteEvent> = [];
  let poolTxsNo: Array<VoteEvent> = [];
  let offset = 0; //await countContractEvents();
  let events: any;
  do {
    events = await getPoolVotes(offset, addresses.yAddress);
    if (events && events.results.length > 0)
      poolTxsYes = poolTxsYes.concat(events.results);
    offset += limit;
  } while (events.results.length > 0);
  do {
    events = await getPoolVotes(offset, addresses.nAddress);
    if (events && events.results.length > 0)
      poolTxsNo = poolTxsNo.concat(events.results);
    offset += limit;
  } while (events.results.length > 0);
  addToMongoDB(proposal, poolTxsYes, true);
  addToMongoDB(proposal, poolTxsNo, false);

  return { poolTxsYes, poolTxsNo };
}

async function addToMongoDB(
  proposal: VotingEventProposeProposal,
  txs: Array<any>,
  vfor: boolean
): Promise<Array<VoteEvent>> {
  let votes: Array<VoteEvent> = [];
  console.log("addToMongoDB: transactions: " + vfor + " : " + txs.length);
  for (const v of txs) {
    const burnBlockHeight = await getBurnBlockHeight(v.block_height);
    //const stackerInfo = await getStackerInfoAtTip(proposal.proposalData.startBlockHeight, v.sender_address)
    const stackerDel: Delegation = await getCheckDelegation(
      getConfig().stacksApi,
      getConfig().poxContractId!,
      v.sender_address
    );
    console.log("getCheckDelegationAtTip: ", stackerDel);

    const potVote: any = {
      amount: stackerDel && stackerDel.amountUstx ? stackerDel.amountUstx : 0,
      for: vfor,
      proposalContractId: proposal.proposal,
      submitTxId: v.tx_id,
      event: "pool-vote",
      votingContractId: proposal.votingContract,
      voter: v.sender_address,
      blockHeight: v.block_height,
      burnBlockHeight,
    };
    console.log("setSoloVotes: potVote:" + potVote.amount);
    saveOrUpdateVote(potVote);
    votes.push(potVote);
  }
  return votes;
}

export async function reconcilePoolTxs(
  proposal: VotingEventProposeProposal
): Promise<any> {
  try {
    const votesAll: Array<VoteEvent> =
      await findStackerVotesByProposalAndMethod(proposal.proposal, "pool-vote");
    let offset = 0; //await countContractEvents();
    for (const voteTx of votesAll) {
      //const voted = votes.filter((o) => o.voter === voteTx.sender_address)
      //console.log('reconcilePoolTxs: vote: ', voteTx)
      //if (!voted || voted.length === 0) {
      if (
        voteTx.voter &&
        isVoteAllowed(voteTx, voteTx.voter, voteTx.burnBlockHeight)
      ) {
        let updates: any;
        const stackerEvents = await findPoolStackerEventsByStackerAndEvent(
          "pox-4",
          voteTx.voter,
          "delegate-stx"
        );
        if (stackerEvents && stackerEvents.length > 0) {
          console.log(
            "reconcilePoolTxs: stackerEvents: " + stackerEvents.length
          );
          try {
            let event = stackerEvents.find(
              (o: any) => o.burnchainUnlockHeight === 0
            );
            if (!event) event = stackerEvents[0];
            updates = {
              //delegateTo: event.data.delegator,
              //delegateTxId: event.submitTxId,
              amount: event.data.amountUstx ? event.data.amountUstx : 0,
            };
            await updateVote(voteTx, updates);
            console.log(
              "reconcilePoolTxs: updated: " +
                voteTx.event +
                " : " +
                voteTx.voter +
                " : " +
                voteTx.amount
            );
          } catch (err: any) {
            console.log(
              "reconcilePoolTxs: error: getting first amount + ",
              stackerEvents
            );
          }
        } else {
          console.log(
            "reconcilePoolTxs: stackerEvents: not found for " +
              voteTx.voter +
              " : delegate-stx"
          );
        }
      } else {
        console.log(
          "reconcilePoolTxs: rejected: vote: " +
            voteTx.voter +
            " offset: " +
            offset
        );
      }
    }
    return;
  } catch (err: any) {
    console.log("err reconcilePoolTxs: " + err);
    return [];
  }
}

function isVoteAllowed(v: any, principle: string, burnBlockHeight: number) {
  return v.voter === principle; //&& burnBlockHeight >= NAKAMOTO_VOTE_START_HEIGHT && burnBlockHeight < NAKAMOTO_VOTE_STOPS_HEIGHT
}

async function getPoolVotes(offset: number, principle: string): Promise<any> {
  const url =
    getConfig().stacksApi +
    "/extended/v1/address/" +
    principle +
    "/transactions?limit=" +
    limit +
    "&offset=" +
    offset;
  let val;
  try {
    const response = await fetch(url);
    val = await response.json();
  } catch (err) {
    console.log("getPoolYesVotes: ", err);
  }
  return val;
}
