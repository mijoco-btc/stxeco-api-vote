import { getHashBytesFromAddress } from "@mijoco/btc_helpers/dist/index";
import { Delegation, getBalanceAtHeight, getTransaction, StackerInfo, type VoteEvent, type VotingEventProposeProposal } from "@mijoco/stx_helpers/dist/index";
import { getBurnHeightToRewardCycle, getCheckDelegation, getStackerInfoFromContract } from "@mijoco/stx_helpers/dist/pox/pox";
import { getConfig } from "../../../lib/config";
import { findStackerVoteByProposalAndVoter, findStackerVotesByProposal, saveVote, updateVote, updateVoteId } from "./vote_count_helper";
import { findPoxEntriesByAddressAndCycle, findPoxEntryByCycleAndIndex } from "../pox-entries/pox_helper";
import { stackerVotes } from "../../../lib/data/db_models";

const limit = 20;
const PRE_NAKAMOTO_STACKS_TIP_HEIGHT = 850850;
const stxPrecision = 1000000;

const delay = (ms: number | undefined) => new Promise((resolve) => setTimeout(resolve, ms));

export async function reconcileVotes(proposal: VotingEventProposeProposal): Promise<any> {
  const burnStartHeight = proposal.stackerData?.heights?.burnStart || proposal.proposalData.burnStartHeight;
  const cycle1CV = proposal.stackerData ? await getBurnHeightToRewardCycle(getConfig().stacksApi, getConfig().poxContractId!, burnStartHeight + 200) : undefined;
  const cycle1 = Number(cycle1CV.cycle.value);

  const votes = await findStackerVotesByProposal(proposal.proposal);
  let counter1 = 0;
  let counter2 = 0;

  for (const vote of votes) {
    if (vote.amount === 0) {
      await delay(2000);
      if (vote.source === "stacks") {
        try {
          const res = await reconcileVoteViaStacks(proposal, vote);
          if (res) counter1++;
          else counter2++;
        } catch (err: any) {
          console.error("reconcileVotes: reconcileVoteViaStacks: error: " + err.message);
        }
      } else if (vote.source === "bitcoin") {
        try {
          await reconcileBitcoinVoteViaPoxEntries(proposal, cycle1, vote);
        } catch (err: any) {
          console.error("reconcileVotes: reconcileVoteViaStacks: error: " + err.message);
        }
      } else {
        console.log("reconcileVotes: unknown source", vote);
      }
    } else {
      //console.log("reconcileVotes: already reconciled voter: " + vote.voter + " amount: " + vote.amount);
    }
  }
  console.log("reconcileVotes: updated: " + counter1);
  console.log("reconcileVotes: skipped: " + counter2);
  //if (voteEvent.source === 'bitcoin') {
  //   const result = await determineTotalAverageUstx(voteEvent.voter)
  //}
}

export async function reconcileVotesPerStacker(proposal: VotingEventProposeProposal, voter: string): Promise<any> {}

export async function reconcileViaLocked(proposal: VotingEventProposeProposal, voter: string) {
  let counter = 0;
  let balanceAtHeight = await getBalanceAtHeight(getConfig().stacksApi, voter, proposal.proposalData.startBlockHeight + 2200);
  //console.log('reconcileViaLocked: ------>' + balanceAtHeight.stx?.locked || 0)
  const locked1 = Number(balanceAtHeight.stx?.locked || 0);
  if (locked1 > 0) counter++;
  balanceAtHeight = await getBalanceAtHeight(getConfig().stacksApi, voter, proposal.proposalData.startBlockHeight + 200);
  const locked2 = Number(balanceAtHeight.stx?.locked || 0);
  //console.log('reconcileViaLocked: ------>' + balanceAtHeight.stx?.locked || 0)
  if (locked2 > 0) counter++;
  const locked = counter > 0 ? (locked1 + locked2) / counter : 0;
  //console.log(locked)
  return locked;
}
export async function reconcileViaBalanceAtHeight(proposal: VotingEventProposeProposal, voter: string) {
  let counter = 0;
  const height = proposal.stackerData?.heights?.stacksStart || proposal.proposalData.startBlockHeight;
  let balanceAtHeight = await getBalanceAtHeight(getConfig().stacksApi, voter, height);
  const locked = Number(balanceAtHeight.stx?.locked || 0);
  const unlocked = Number(balanceAtHeight.stx?.balance || 0) - locked;
  console.log("voter: " + voter + " locked: " + locked + " unlocked: " + unlocked + " height: " + height);
  return { locked, unlocked, total: locked + unlocked };
}
export function fmtStxMicro(amountStx: number) {
  const formatted = parseFloat(amountStx.toFixed(6));
  // Multiply by 10^6 and convert to integer
  const integer = Math.round(formatted * 1000000);
  return integer;

  //return  (Math.round(amountStx) * stxPrecision *stxPrecision) / stxPrecision
}

export async function reconcileVoteViaStacks(proposal: VotingEventProposeProposal, vote: VoteEvent) {
  //let locked = await reconcileViaLocked(proposal, vote.voter);
  const balanceObj = await reconcileViaBalanceAtHeight(proposal, vote.voter);
  let changes = {
    amount: balanceObj.total,
    amountUnlocked: balanceObj.unlocked,
    amountLocked: balanceObj.locked,
    event: "pool-vote",
  };
  /**
  let amountUstx = 0
  let stackerDel:Delegation = await getStackerInfoFromContract(getConfig().stacksApi,getConfig().poxContractId!, vote.voter, proposal.proposalData.startBlockHeight + 2200)
  let balanceAtHeight = await getBalanceAtHeight(getConfig().stacksApi, vote.voter, proposal.proposalData.startBlockHeight + 2200)
  if (stackerDel.amountUstx > 0) {
    amountUstx += stackerDel.amountUstx
    counter++
  }
  stackerDel = await getCheckDelegation(getConfig().stacksApi,getConfig().poxContractId!, vote.voter, proposal.proposalData.startBlockHeight + 200)
  if (stackerDel.amountUstx > 0) {
    amountUstx += stackerDel.amountUstx
    counter++
  }
  if (counter === 0) return

  console.log('reconcileVote: stacks stacker: vote: ' + vote.voter, stackerDel)
  changes.amount = amountUstx / counter
  if (stackerDel.delegatedTo) {
    changes.event = 'pool-vote'
    changes.delegateTo = stackerDel.delegatedTo
  } else {
    changes.event = 'solo-vote'
    changes.poxAddr = (stackerDel.poxAddr && stackerDel.poxAddr.version) ? stackerDel.poxAddr : undefined
  }
  */
  if (balanceObj?.total > 0) {
    vote = (await updateVote(vote, changes)) as unknown as VoteEvent;
    console.log("reconcileVote: updated stacks vote: amount: " + vote.amount + " voter: " + vote.voter);
    return true;
  } else {
    return false;
    //console.log("reconcileVote: NOT UPDATING WITH ZERO TOTAL: amount: " + vote.amount + " voter: " + vote.voter);
  }
}

export async function reconcileBitcoinVoteViaPoxEntries(proposal: VotingEventProposeProposal, cycle1: number, vote: VoteEvent) {
  let counter = 0;
  let amountUstx = 0;
  let changes = {} as any;
  console.log("reconcileBitcoinVoteViaPoxEntries: bitcoin vote: " + vote.amount + " voter: " + vote.voter);

  const totalUstxInCycle1 = (await getTotalStackedInCycle(vote.voter, cycle1)) || 0;
  const totalUstxInCycle2 = (await getTotalStackedInCycle(vote.voter, cycle1 + 1)) || 0;

  if (totalUstxInCycle1 > 0) {
    amountUstx += totalUstxInCycle1;
    counter++;
  }
  if (totalUstxInCycle2 > 0) {
    amountUstx += totalUstxInCycle2;
    counter++;
  }
  if (counter === 0) return;

  changes.amount = amountUstx / counter;
  changes.amountLocked = changes.amount;
  changes.event = "solo-vote";

  vote = (await updateVote(vote, changes)) as unknown as VoteEvent;
  console.log("reconcileVote: updated bitcoin vote: amount: " + vote.amount + " voter: " + vote.voter);
}

async function getTotalStackedInCycle(voter: string, cycle1: number) {
  const poxEntries: Array<any> = await findPoxEntriesByAddressAndCycle(voter, cycle1);
  let totalUstx = 0;
  const soloStackers = [];
  for (const entry of poxEntries) {
    if (entry.delegations === 0) {
      // not a pool operator
      totalUstx += entry.totalUstx;
      //soloStackers.push(entry)
    }
  }
  return totalUstx;
}

export async function saveStackerBitcoinTxs(proposal: VotingEventProposeProposal): Promise<{
  bitcoinTxsYes: Array<VoteEvent>;
  bitcoinTxsNo: Array<VoteEvent>;
}> {
  const bitcoinTxsYes: Array<VoteEvent> = [];
  const bitcoinTxsNo: Array<VoteEvent> = [];
  if (!proposal.stackerData || !proposal.stackerData.heights) return { bitcoinTxsYes, bitcoinTxsNo };

  const allYesResults: Array<any> = await fetchAddressTransactions(getConfig().mempoolUrl, proposal.stackerData.bitcoinAddressYes);
  const allNoResults: Array<any> = await fetchAddressTransactions(getConfig().mempoolUrl, proposal.stackerData.bitcoinAddressNo);

  console.log("saveStackerBitcoinTxs: processing: " + (allYesResults?.length || 0) + " bitcoin yes votes");
  console.log("saveStackerBitcoinTxs: processing: " + (allNoResults?.length || 0) + " bitcoin no votes");

  if (allYesResults) {
    for (const tx of allYesResults) {
      await delay(2000);
      if (checkHeights(tx.status.block_height, proposal.stackerData.heights.burnStart, proposal.stackerData.heights.burnEnd)) {
        bitcoinTxsYes.push(tx);
      } else {
        console.log("saveStackerBitcoinTxs: Out of bounds yes tx: " + tx.txid);
      }
    }
  }

  try {
    if (allNoResults) {
      for (const tx of allNoResults) {
        await delay(2000);
        if (checkHeights(tx.status.block_height, proposal.stackerData.heights.burnStart, proposal.stackerData.heights.burnEnd)) {
          bitcoinTxsNo.push(tx);
        } else {
          console.log("saveStackerBitcoinTxs: Out of bounds yes tx: " + tx.txid);
        }
      }
    }
  } catch (err: any) {
    console.log("saveStackerBitcoinTxs: bitcoinTxsYes: ", err);
  }

  try {
    await convertBitcoinTxsToVotes(proposal, bitcoinTxsYes, true);
  } catch (err: any) {
    console.log("saveStackerBitcoinTxs: bitcoinTxsYes: " + err.message);
  }
  try {
    await convertBitcoinTxsToVotes(proposal, bitcoinTxsNo, false);
  } catch (err: any) {
    console.log("saveStackerBitcoinTxs: bitcoinTxsNo: " + err.message);
  }
  return { bitcoinTxsYes, bitcoinTxsNo };
}

export async function saveStackerStacksTxs(proposal: VotingEventProposeProposal): Promise<{
  stackerTxsYes: Array<VoteEvent>;
  stackerTxsNo: Array<VoteEvent>;
}> {
  const stackerTxsYes: Array<VoteEvent> = [];
  const stackerTxsNo: Array<VoteEvent> = [];
  if (!proposal.stackerData || !proposal.stackerData.heights) return { stackerTxsYes, stackerTxsNo };
  let offset = 0; //await countContractEvents();
  let events: any;

  try {
    do {
      await delay(2000);
      const newEvents = await getStacksTransactionsByAddress(offset, proposal.stackerData.stacksAddressNo);
      events = newEvents || { results: [] }; // ensure fallback
      console.log("stacks address [no]: " + proposal.stackerData.stacksAddressNo);
      if (events?.results?.length > 0) {
        console.log("no stacks events: " + (events?.results?.length || 0));
        for (const obj of events.results) {
          if (checkHeights(obj.tx.burn_block_height, proposal.proposalData.burnStartHeight, proposal.proposalData.burnEndHeight)) {
            if (obj.tx) stackerTxsNo.push(obj.tx);
          } else {
            console.log("getStacksTransactionsByAddress: Out of bounds no tx: " + obj.tx.tx_id);
          }
        }
      }
      offset += limit;
    } while (events?.results?.length > 0);
  } catch (err: any) {
    console.log("saveStackerBitcoinTxs: getStacksTransactionsByAddress: " + err.message);
  }

  offset = 0;
  try {
    do {
      await delay(2000);
      const newEvents = await getStacksTransactionsByAddress(offset, proposal.stackerData.stacksAddressYes);
      events = newEvents || { results: [] }; // ensure fallback
      console.log("stacks address [yes]: " + proposal.stackerData.stacksAddressYes);
      if (events?.results?.length > 0) {
        for (const obj of events.results) {
          if (checkHeights(obj.tx.burn_block_height, proposal.proposalData.burnStartHeight, proposal.proposalData.burnEndHeight)) {
            if (obj.tx) stackerTxsYes.push(obj.tx);
          } else {
            console.log("getStacksTransactionsByAddress: Out of bounds yes tx: " + obj.tx.tx_id);
          }
        }
      }
      offset += limit;
      await delay(500);
    } while (events?.results?.length > 0);
  } catch (err: any) {
    console.log("saveStackerBitcoinTxs: getStacksTransactionsByAddress: " + err.message);
  }

  console.log("saveStackerStacksTxs: processing " + (stackerTxsYes?.length || 0) + " yes stacks txs");

  console.log("saveStackerStacksTxs: processing " + stackerTxsNo?.length + " no stacks txs");

  try {
    console.log("number of no stacks txs: " + stackerTxsNo?.length || 0);
    await convertStacksTxsToVotes(proposal, stackerTxsNo, false);
    //await fetchNonces(proposal, stackerTxsNo, true);
  } catch (err: any) {
    console.log("saveStackerBitcoinTxs: stackerTxsNo: ", err);
  }

  try {
    console.log("number of yes stacks txs: " + stackerTxsYes?.length || 0);
    await convertStacksTxsToVotes(proposal, stackerTxsYes, true);
    //await fetchNonces(proposal, stackerTxsYes, true);
  } catch (err: any) {
    console.log("saveStackerBitcoinTxs: stackerTxsYes: ", err);
  }

  return { stackerTxsYes, stackerTxsNo };
}

function checkHeights(height: number, minBurnHeight: number, maxBurnHeight: number): boolean {
  const result = height >= minBurnHeight && height <= maxBurnHeight;
  if (!result) console.log("Failed block height check: " + height + " minBurnHeight: " + minBurnHeight + " maxBurnHeight: " + maxBurnHeight);
  return result;
}

async function getStacksTransactionsByAddress(offset: number, principle: string): Promise<any> {
  const url = `${getConfig().stacksApi}/extended/v2/addresses/${principle}/transactions?limit=${limit}&offset=${offset}`;
  let val;
  try {
    console.log("getStacksTransactionsByAddress: url: " + url);
    const response = await fetch(url);
    val = await response.json();
  } catch (err) {
    console.log("getPoolYesVotes: ", err);
  }
  return val;
}

// async function convertStacksTxsToVotes(proposal: VotingEventProposeProposal, txs: Array<any>, vfor: boolean): Promise<Array<VoteEvent>> {
//   const votes: Array<VoteEvent> = [];
//   console.log("addToMongoDB: transactions: " + vfor + " : " + txs?.length || 0);
//   for (const v of txs) {
//     //const stackerInfo = await getStackerInfoAtTip(proposal.proposalData.startBlockHeight, v.sender_address)
//     //const stackerDel = await getCheckDelegationAtTip(proposal.proposalData.startBlockHeight, v.sender_address)
//     //console.log('getCheckDelegationAtTip: ', stackerDel)

//     const existingVote = await findStackerVoteByProposalAndVoter(proposal.proposal, v.sender_address);
//     if (!existingVote || existingVote.amount === 0) {
//       const potVote: any = {
//         //amount: (stackerDel && stackerDel.amount) ? stackerDel.amount : 0,
//         amount: 0,
//         for: vfor,
//         proposalContractId: proposal.proposal,
//         submitTxId: v.tx_id,
//         event: "pool-or-solo-vote",
//         source: "stacks",
//         votingContractId: proposal.votingContract,
//         voter: v.sender_address,
//         blockHeight: v.block_height,
//         burnBlockHeight: v.burn_block_height,
//         reconciled: false,
//       };
//       try {
//         await saveVote(potVote);
//         console.log("convertStacksTxsToVotes: saved vote from voter:" + potVote.voter);
//         votes.push(potVote);
//       } catch (err: any) {
//         // duplicate bids from same bidder are counted as first bid
//         console.log("convertStacksTxsToVotes: ignored subsequent vote by:" + potVote.voter);
//       }
//     } else {
//       console.log("convertStacksTxsToVotes: already recorded vote by:" + v.voter);
//     }
//   }
//   return votes;
// }

async function convertStacksTxsToVotes(proposal: VotingEventProposeProposal, txs: Array<any>, vfor: boolean): Promise<Array<VoteEvent>> {
  const votes: Array<VoteEvent> = [];
  console.log("convertStacksTxsToVotes: transactions: " + vfor + " : " + txs?.length || 0);
  let counter1 = 0;
  let counter2 = 0;
  let counter3 = 0;
  for (const v of txs) {
    await delay(500);

    const existingVote = await findStackerVoteByProposalAndVoter(proposal.proposal, v.sender_address);
    if (!existingVote || existingVote.amount === 0) {
      const potVote: any = {
        amount: 0,
        for: vfor,
        proposalContractId: proposal.proposal,
        submitTxId: v.tx_id,
        event: "pool-or-solo-vote",
        source: "stacks",
        votingContractId: proposal.votingContract,
        voter: v.sender_address,
        blockHeight: v.block_height,
        burnBlockHeight: v.burn_block_height,
        reconciled: false,
      };
      try {
        await saveVote(potVote);
        counter1++;
        //console.log("convertStacksTxsToVotes: saved vote from voter:" + potVote.voter);
        votes.push(potVote);
      } catch (err: any) {
        counter2++;
        console.log("subsequent vote," + potVote.voter + "," + potVote.for + "," + potVote.submitTxId, err);
      }
    } else {
      counter3++;
      console.log("convertStacksTxsToVotes: already counted: ," + existingVote.amount + "," + existingVote.voter + "," + existingVote.submitTxId);
    }
  }
  console.log("convertStacksTxsToVotes: saved votes: " + vfor + " : " + counter1);
  console.log("convertStacksTxsToVotes: ignored subsequent votes: " + counter2);
  console.log("convertStacksTxsToVotes: already counted: " + counter3);
  return votes;
}

async function fetchNonces(proposal: VotingEventProposeProposal, txs: Array<any>, vfor: boolean) {
  console.log("fetchNonces: transactions: " + vfor + " : " + txs?.length || 0);
  let counter1 = 0;
  let counter2 = 0;
  const dupes = await findDuplicateVoters(proposal.proposal);
  for (const dupe of dupes) {
    await delay(500);
    const tx = await getTransaction(getConfig().stacksApi, dupe.submitTxId);
    const potVote: any = {
      submitTxIdProxy: tx.nonce,
      delegateTo: true,
    };
    try {
      await updateVoteId(dupe._id, potVote);
      counter1++;
      //console.log("fetchNonces: saved vote from voter:" + potVote.voter);
    } catch (err: any) {
      counter2++;
      console.log("subsequent vote," + potVote.voter + "," + potVote.for + "," + potVote.submitTxId, err);
    }
  }
  console.log("fetchNonces: nonce: " + vfor + " : " + counter1);
  console.log("fetchNonces: nonce: " + counter2);
  return;
}

async function markDuplicates(proposal: VotingEventProposeProposal, txs: Array<any>, vfor: boolean): Promise<Array<VoteEvent>> {
  const votes: Array<VoteEvent> = [];
  console.log("convertStacksTxsToVotes: transactions: " + vfor + " : " + txs?.length || 0);
  let counter1 = 0;
  let counter2 = 0;
  for (const v of txs) {
    await delay(500);
    const existingVote = await findStackerVoteByProposalAndVoter(proposal.proposal, v.sender_address);
    const tx = await getTransaction(getConfig().stacksApi, existingVote.submitTxId);
    const potVote: any = {
      submitTxIdProxy: tx.nonce,
      delegateTo: true,
    };
    try {
      await updateVote(existingVote, potVote);
      counter1++;
      //console.log("convertStacksTxsToVotes: saved vote from voter:" + potVote.voter);
      votes.push(potVote);
    } catch (err: any) {
      counter2++;
      console.log("subsequent vote," + potVote.voter + "," + potVote.for + "," + potVote.submitTxId, err);
    }
  }
  console.log("convertStacksTxsToVotes: saved votes: " + vfor + " : " + counter1);
  console.log("convertStacksTxsToVotes: ignored subsequent votes: " + counter2);
  return votes;
}

async function convertBitcoinTxsToVotes(proposal: VotingEventProposeProposal, txs: Array<any>, vfor: boolean): Promise<Array<VoteEvent>> {
  const votes: Array<VoteEvent> = [];
  for (const v of txs) {
    try {
      const bitcoinAddress = v.vin[0].prevout.scriptpubkey_address;
      const alreadyCountedCheck = votes.findIndex((o) => o.voter === bitcoinAddress);
      if (alreadyCountedCheck === -1) {
        const poxAddr = getHashBytesFromAddress(getConfig().network, bitcoinAddress);
        //const result = await determineTotalAverageUstx(bitcoinAddress)

        const potVote: any = {
          for: vfor,
          submitTxId: v.txid,
          event: "solo-vote",
          source: "bitcoin",
          proposalContractId: proposal.proposal,
          votingContractId: proposal.votingContract,
          poxAddr,
          voter: bitcoinAddress,
          burnBlockHeight: v.status.block_height,
          amount: 0, //result.total,
          reconciled: false,
          //amountNested: result.totalNested,
          //poxStacker: result.poxStacker
          //await getBurnBlockHeight(v.block_height),
        };
        try {
          await saveVote(potVote);
          console.log("convertBitcoinTxsToVotes: saved vote from voter:" + potVote.voter);
          votes.push(potVote);
        } catch (err: any) {
          // duplicate bids from same bidder are counted as first bid
          console.log("convertBitcoinTxsToVotes: ignored subsequent vote by:" + potVote.voter);
        }
        console.log("convertBitcoinTxsToVotes: saved vote from voter:" + potVote.voter);
      }
    } catch (err: any) {
      console.log("convertBitcoinTxsToVotes: error solo vote: " + err.message);
    }
  }
  return votes;
}

async function determineTotalAverageUstx(bitcoinAddress: string) {
  const poxEntries1 = await extractAllPoxEntriesInCycle(bitcoinAddress, 78);
  const poxEntries2 = await extractAllPoxEntriesInCycle(bitcoinAddress, 79);

  let total = 0;
  let totalNested = 0;
  let poxStacker: string = "";
  let amount1 = 0;
  let amount2 = 0;
  let amountNested1 = 0;
  let amountNested2 = 0;

  if (poxEntries1) {
    for (const entry of poxEntries1) {
      if (entry.poxStackerInfo) {
        amount1 += entry.totalUstx;
        amountNested1 += entry.poxStackerInfo?.totalStacked || 0;
      } else {
        amount1 += entry.totalUstx;
      }
    }
  }
  if (poxEntries2) {
    for (const entry of poxEntries2) {
      if (entry.stacker) {
        amount2 += entry.totalUstx;
        amountNested2 += entry.poxStackerInfo?.totalStacked || 0;
      } else {
        amount2 += entry.totalUstx;
      }
    }
  }
  //total = Math.max(amount1, amount2)
  total = Math.floor((amount1 + amount2) / 2);
  totalNested = total + Math.floor((amountNested1 + amountNested2) / 2);
  //console.log('setSoloVotes: poxEntries: ' + total + ' for address: ' + bitcoinAddress)
  return { total, totalNested, poxStacker };
}
async function extractAllPoxEntriesInCycle(address: string, cycle: number) {
  const poxEntries: Array<any> = await findPoxEntriesByAddressAndCycle(address, cycle);
  let newEntries = [];
  try {
    for (const entry of poxEntries) {
      const idx = newEntries.findIndex((o) => o.index === entry.index);
      if (idx === -1) newEntries.push(entry);
    }
  } catch (err: any) {
    newEntries = poxEntries;
    console.error("extractAllPoxEntriesInCycle: error1: " + err.message);
  }

  for (const entry of newEntries) {
    try {
      if (entry.stacker) {
        const stackerInfoPerCycle = await getStackerInfoFromContract(getConfig().stacksApi, getConfig().network, getConfig().poxContractId!, entry.stacker, entry.cycle);
        if (stackerInfoPerCycle?.stacker?.rewardSetIndexes) {
          entry.poxStackerInfo = await countEntries(entry.cycle, stackerInfoPerCycle);
        }
      } else {
        entry.poxStackerInfo = [];
      }
    } catch (err: any) {
      console.error("extractAllPoxEntriesInCycle: error2: " + err.message);
    }
  }
  return newEntries;
}
async function countEntries(cycle: number, stackerInfo: StackerInfo) {
  let entries: Array<any> = [];
  let totalStacked = 0;
  if (!stackerInfo || !stackerInfo.stacker || !stackerInfo.stacker.rewardSetIndexes) {
    return { entries, totalStacked };
  }

  for (const entry of stackerInfo.stacker.rewardSetIndexes) {
    try {
      const result = await findPoxEntryByCycleAndIndex(cycle, Number(entry.value));
      //console.log('countEntries: poxEntry: ', result)
      if (result && result.length > 0) {
        entries.push({
          amount: result[0].totalUstx,
          cycle: result[0].cycle,
          index: result[0].index,
          bitcoinAddress: result[0].bitcoinAddr,
        });
        totalStacked += result[0].totalUstx;
      }
    } catch (err: any) {
      console.log("countEntries: " + err.message);
    }
  }
  return { entries, totalStacked };
}

export async function fetchAddressTransactions(mempoolUrl: string, address: string, txId?: string) {
  const urlBase = mempoolUrl + "/address/" + address + "/txs";
  let url = urlBase;
  if (txId) {
    url = urlBase + "/chain/" + txId;
  }
  console.log("fetchAddressTransactions: url: " + url);
  let response: any;
  let allResults: Array<any> = [];
  let results: Array<any>;
  let fetchMore = true;
  do {
    try {
      await delay(2000);
      response = await fetch(url);
      results = await response.json();
      if (results && results.length > 0) {
        console.log("fetchAddressTransactions: " + results.length + " found at " + results[results.length - 1].status.block_height);
        url = urlBase + "/chain/" + results[results.length - 1].txid;
        allResults = allResults.concat(results);
      } else {
        fetchMore = false;
      }
    } catch (err: any) {
      console.error("fetchAddressTransactions" + err.message);
      fetchMore = false;
    }
  } while (fetchMore);
  console.log("fetchAddressTransactions: total of " + allResults.length + " found at " + address);
  return allResults;
}

export async function findDuplicateVoters(proposalContractId: string): Promise<{ _id: string; voter: string; submitTxId: string; count: number }[]> {
  const pipeline = [
    {
      $match: { proposalContractId },
    },
    {
      $group: {
        _id: "$_id",
        voter: "$voter",
        count: { $sum: 1 },
      },
    },
    {
      $match: { count: { $gt: 1 } },
    },
    {
      $sort: { count: -1 },
    },
  ];

  const results = await stackerVotes.aggregate(pipeline).toArray();

  // Format result for clarity
  return results.map(({ _id, voter, submitTxId, count }) => ({
    _id: _id,
    submitTxId: submitTxId,
    voter: voter,
    count,
  }));
}
