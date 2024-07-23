import { getConfig } from "../../lib/config"
import { extractAllPoxEntriesInCycle, findPoxEntriesByAddressAndCycle } from "../voting/pox-entries/pox_helper";
import { getAddressFromHashBytes } from "@mijoco/btc_helpers/dist/index";
import { findStackerVotesByProposalAndMethod, findStackerVotesBySoloZeroAmounts, findStackerVotesByVoter, saveVote, updateVote } from "../voting/stacker-voting/vote_count_helper";
import * as btc from '@scure/btc-signer';
import { hex } from '@scure/base';
import { fetchAddressTransactions, getHashBytesFromAddress, fetchAddressTransactionsMin, fetchTransaction } from "@mijoco/btc_helpers/dist/index";
import { VoteEvent, VotingEventProposeProposal } from "@mijoco/stx_helpers/dist/index";
import assert from "assert";


export async function analyseMultisig(address:string) {
  const vote = await findStackerVotesByVoter(address)
  const tx = await fetchTransaction(getConfig().mempoolUrl, vote[0].submitTxId)
	//const tx1:btc.Transaction = btc.Transaction.fromRaw(hex.decode(tx.hex), {allowUnknowInput:true, allowUnknowOutput: true, allowUnknownOutputs: true, allowUnknownInputs: true})
  const scripts = tx.vin[0].inner_witnessscript_asm.split(' ')
  const pubKeys = [hex.decode(scripts[2]), hex.decode(scripts[4]), hex.decode(scripts[6])]
  const p2wsh1 = btc.p2wsh(btc.p2ms(2, pubKeys))
  const inner0Pkh = btc.p2pkh(pubKeys[0])
  const inner0Wpkh = btc.p2wpkh(pubKeys[0])
  const inner1Pkh = btc.p2pkh(pubKeys[1])
  const inner1Wpkh = btc.p2wpkh(pubKeys[1])
  const inner2Pkh = btc.p2pkh(pubKeys[2])
  const inner2Wpkh = btc.p2wpkh(pubKeys[2])

  const poxEntries = []
  poxEntries.push(await findPoxEntriesByAddressAndCycle(inner0Pkh.address!, 79))
  poxEntries.push(await findPoxEntriesByAddressAndCycle(inner1Pkh.address!, 79))
  poxEntries.push(await findPoxEntriesByAddressAndCycle(inner2Pkh.address!, 79))

  //const net = getNet(getConfig().network);
	//const outputScript = btc.OutScript.decode(tx.vin[0].inner_witnessscript_asm);

  //const addr1 = btc.Address().encode()
  return {inner0Wpkh, inner1Wpkh, inner2Wpkh}
}

export async function readSoloVotes(proposal:VotingEventProposeProposal) {
  assert(proposal.stackerData)
  const soloTxsYes = await fetchAddressTransactions(getConfig().mempoolUrl, proposal.stackerData.bitcoinAddressYes);
  const soloTxsNo = await fetchAddressTransactions(getConfig().mempoolUrl, proposal.stackerData.bitcoinAddressNo);
  await addToMongoDB(proposal, soloTxsYes, true)
  await addToMongoDB(proposal, soloTxsNo, false)
  return;
}

export async function readSoloVote(bitcoinAddress:string) {
  let events1 = await extractAllPoxEntriesInCycle(bitcoinAddress, 78);
  events1 = events1.concat(await extractAllPoxEntriesInCycle(bitcoinAddress, 79));

  let poxEntries:Array<any> = await findPoxEntriesByAddressAndCycle(bitcoinAddress, 78);
  console.log('readSoloVote: ', poxEntries)
  poxEntries = poxEntries.concat(await findPoxEntriesByAddressAndCycle(bitcoinAddress, 79));
  console.log('readSoloVote: ', poxEntries)
  return events1
}

export async function readSoloZeroVote() {
  //const myTx = '1f62qrQaNsFyohrgEya8oby4Y9ti3FnM8'
  const votes:Array<VoteEvent> = await findStackerVotesBySoloZeroAmounts();
  //const votes = votesAll.filter((o) => o.voter === myTx)
  //console.log('readSoloZeroVote: ', votes)
  const linkedVotes:Array<any> = []
  let addressTxs:Array<any> = []
  let feederTx:any
  let feederAddress:string
  let vcheck:number
  let result:{total: number, totalNested: number, poxStacker:string} //await determineTotalAverageUstx(feederAddress)
  for (const vote of votes) {
    try {
      if (vote.voter && vote.voter !== 'unknown') {
        vcheck = linkedVotes.findIndex((o) => o.voter === vote.voter)
        if (vcheck === -1) {
          addressTxs = await fetchAddressTransactionsMin(getConfig().mempoolUrl, vote.voter)
          if (addressTxs.length > 1) {
            feederTx = addressTxs[1]
            feederAddress = feederTx.vin[0].prevout.scriptpubkey_address;
            result = await determineTotalAverageUstx(feederAddress)
            if (result.total > 0) {
              vcheck = linkedVotes.findIndex((o) => o.voterProxy === feederAddress)
              // eg several votes sent from eg 33af7jGkctpsG3jGBiTxgavLBxFFN5NbS2
              // which all link back to bc1qmv2pxw5ahvwsu94kq5f520jgkmljs3af8ly6tr
              // and same pox entries..
              if (vcheck === -1) {

                const newVote = {
                  submitTxIdProxy: feederTx.txid,
                  voterProxy: feederAddress,
                  amount: result.total,
                  amountNested: result.totalNested,
                  poxStacker: result.poxStacker
                }
                await updateVote(vote, newVote)
                linkedVotes.push(newVote)
                console.log('readSoloZeroVote: feederAddress ' + feederAddress + ' vote.voter: ' + vote.voter + ' vote.voterProxy: ' + vote.voterProxy + ' amount: ' + result.total)
              }
            }
          }
        }
      }
    } catch(err:any) {
      console.log('readSoloZeroVote: error: ' + err.message)
    }
  }
  return linkedVotes
}

/**
 * Step 2: match votes to pox data
 */
export async function reconcileSoloTxs(proposal:VotingEventProposeProposal):Promise<any> {
  const votesAll:Array<VoteEvent> = await findStackerVotesByProposalAndMethod(proposal.proposal, 'solo-vote');
  console.log('setSoloVotes: pe1:', votesAll.length)
  for (const v of votesAll) {
    if (v && v.poxAddr) {
      const bitcoinAddress = getAddressFromHashBytes(getConfig().network, v.poxAddr.hashBytes, v.poxAddr.version)
      if (v.voter === bitcoinAddress) {
        const result = await determineTotalAverageUstx(bitcoinAddress)
        try {
          updateVote(v, {amount: result.total, amountNested: result.totalNested, poxStacker: result.poxStacker })
        } catch(err:any) {
          console.error('reconcileSoloTxs: error saving: ' + err.message)
        }
      } else {
        console.log('reconcileSoloTxs: address ' + v.voter + ' not pox address: ' + bitcoinAddress)
      }
    }
  }
  return votesAll;
}

async function determineTotalAverageUstx(bitcoinAddress:string) {
  const poxEntries1 = await extractAllPoxEntriesInCycle(bitcoinAddress, 78)
  const poxEntries2 = await extractAllPoxEntriesInCycle(bitcoinAddress, 79)
  //const poxEntries1:Array<any> = await findPoxEntriesByAddressAndCycle(bitcoinAddress, 78);
  //const poxEntries2:Array<any> = await findPoxEntriesByAddressAndCycle(bitcoinAddress, 79);

  //console.log('determineTotalAverageUstx: poxEntries1: ', poxEntries1)
  //console.log('determineTotalAverageUstx: poxEntries2: ', poxEntries2)
  let total = 0
  let totalNested = 0
  let poxStacker:string = '';
  let amount1 = 0
  let amount2 = 0
  let amountNested1 = 0
  let amountNested2 = 0

  if (poxEntries1) {
    for (const entry of poxEntries1) {
      if (entry.poxStackerInfo) {
        amount1 += entry.totalUstx
        amountNested1 += (entry.poxStackerInfo?.totalStacked || 0)
      } else {
        amount1 += entry.totalUstx
      }
    }
  }
  if (poxEntries2) {
    for (const entry of poxEntries2) {
      if (entry.stacker) {
        amount2 += entry.totalUstx
        amountNested2 += (entry.poxStackerInfo?.totalStacked || 0)
      } else {
        amount2 += entry.totalUstx
      }
    }
  }
    //total = Math.max(amount1, amount2)
    total = Math.floor((amount1 + amount2) / 2)
    totalNested = total + Math.floor((amountNested1 + amountNested2) / 2)
    //console.log('setSoloVotes: poxEntries: ' + total + ' for address: ' + bitcoinAddress)
  return { total, totalNested, poxStacker }
}

async function addToMongoDB(proposal:VotingEventProposeProposal, txs:Array<any>, vfor:boolean):Promise<Array<VoteEvent>> {
  let votes:Array<VoteEvent> = []
  for (const v of txs) {
    try {
      const bitcoinAddress = v.vin[0].prevout.scriptpubkey_address;
      const vcheck = votes.findIndex((o) => o.voter === bitcoinAddress)
      if (vcheck === -1) {
        const poxAddr = getHashBytesFromAddress(getConfig().network, bitcoinAddress)
        const result = await determineTotalAverageUstx(bitcoinAddress)
  
        const potVote:any = {
          for: vfor,
          submitTxId: v.txid,
          event: 'solo-vote',
          proposalContractId: proposal.proposal,
          votingContractId: proposal.votingContract,
          poxAddr,
          voter: bitcoinAddress,
          burnBlockHeight: v.status.block_height,
          amount: result.total,
          amountNested: result.totalNested,
          poxStacker: result.poxStacker
          //await getBurnBlockHeight(v.block_height),
        }
        await saveVote(potVote)
        votes.push(potVote)
        console.log('setSoloVotes: solo vote: ' + potVote.voter + ' for: ' + potVote.for + ' amount: ' + potVote.amount)
      }
    } catch (err:any) {
      console.log('addToMongoDB: solo vote: ' + err.message)
    }
  }
  return votes;
}

