import { stackerVotes } from "../../lib/data/db_models"
import { VoteEvent } from "@mijoco/stx_helpers/dist/index"

const NAKAMOTO_VOTE_START_HEIGHT = 829750 + 100
const NAKAMOTO_VOTE_STOPS_HEIGHT = 833950

/**
 * Strategy is..
 * 1. read votes from bitcoin (via mempool) and store in proposal-votes mongo collection 
 * 2. read rewardSlotHolders from hiro api ad store in mongo (note there are 37k ish not sure we need all of them)
 * 3. for given reward cycle iterate over get-reward-set-pox-address and store pox address, stacks address and ustx
 * 4. cross check the votes with the pox addresses
 */


export async function countsVotesByProposalAndMethod(proposalContractId:string, method: string):Promise<any> {
    try {
      const result = await stackerVotes.countDocuments({"proposalContractId":proposalContractId, event: method});
      return Number(result);
    } catch (err:any) {
      return 0
    }
  }
  
  export async function countsVotesByFilter(filter:any):Promise<number> {
    try {
      const result = await stackerVotes.countDocuments(filter);
      return Number(result);
    } catch (err:any) {
      return 0
    }
  }
  
  export async function countsVotesByMethod(method: string):Promise<number> {
    try {
      const result = await stackerVotes.countDocuments({event: method});
      return Number(result);
    } catch (err:any) {
      return 0
    }
  }
  
  export async function findProposalVotesByProposal(proposalContractId:string):Promise<any> {
    const result = await stackerVotes.find({"proposalContractId":proposalContractId}).toArray();
    return result;
  }
  
  export async function findVotesByProposalAndMethod(proposal:string, method:string):Promise<any> {
    const result = await stackerVotes.find({"proposalContractId":proposal, "event":method}).toArray();
    return result;
  }
  
  export async function findVotesBySoloZeroAmounts():Promise<any> {
    const result = await stackerVotes.find({"amount":0, "event":'solo-vote'}).toArray();
    return result;
  }
  
  export async function findVoteByProposalAndVoter(proposalContractId:string, voter:string):Promise<VoteEvent|undefined> {
    const result = await stackerVotes.findOne({"proposalContractId":proposalContractId, "voter":voter})
    return result as unknown as VoteEvent;
  }
  
  export async function findVotesByVoter(voter:string):Promise<any> {
    const result = await stackerVotes.find({"voter":voter}).toArray();
    return result;
  }
  
  export async function findVoteBySubmitTxId(submitTxId:string):Promise<any> {
    const result = await stackerVotes.findOne({"submitTxId":submitTxId});
    return result;
  }
  
  export async function saveOrUpdateVote(v:VoteEvent) {
    try {
      const pdb = await findVoteBySubmitTxId(v.submitTxId)
      if (pdb) {
        console.log('saveOrUpdateVote: updating: amount: ' + v.amount + ' for: ' + v.for);
        await updateVote(pdb, v)
      } else {
        console.log('saveOrUpdateVote: saving: amount: ' + v.amount + ' for: ' + v.for);
        await saveVote(v)
      }
    } catch (err:any) {
      console.log('saveOrUpdateVote: unable to save or update: ' + err.message)
    }
  }
  
  export async function saveVote(vote:any) {
    const result = await stackerVotes.insertOne(vote);
    return result;
  }
  
  export async function updateVote(vote:any, changes: any) {
    const result = await stackerVotes.updateOne({
      _id: vote._id
    },
      { $set: changes});
    return result;
  }
  

  
  
  