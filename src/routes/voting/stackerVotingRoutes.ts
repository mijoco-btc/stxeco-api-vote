import express from "express";
import { readSoloVote } from "../dao/solo_votes";
import { fetchProposeEvent } from "../../lib/events/event_helper_voting_contract";
import { VoteEvent, VotingEventProposeProposal } from "@mijoco/stx_helpers/dist/index";
import { getSummary } from "../../lib/events/proposal";
import { saveStackerBitcoinTxs, saveStackerStacksTxs } from "../../lib/stacker-votes/tally";
import { findVoteByProposalAndVoter } from "../dao/vote_count_helper";

const router = express.Router();

router.get("/read-stacker-votes/:proposalContract", async (req, res, next) => {
  try {
    const proposal:VotingEventProposeProposal = await fetchProposeEvent(req.params.proposalContract)
    //console.log('/read-stacker-votes/:proposalContract: proposal: ', proposal)
    if (!proposal) {
      res.sendStatus(404);
    } else if (!proposal.stackerData || !proposal.stackerData.heights) {
      res.sendStatus(500);
    } else {
      console.log('/read-stacker-votes/:proposalContract: ' + proposal.proposal)
      await saveStackerBitcoinTxs(proposal)
      saveStackerStacksTxs(proposal)
      return res.send({message: 'all voting events being read into mongodb collection stackerVotes for contract ' + req.params.proposalContract});
    }
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching sbtc data.')
  }
});

router.get("/reconcile-stacker-votes/:proposal/:voter", async (req, res, next) => {
  try {
    const proposal:VotingEventProposeProposal = await fetchProposeEvent(req.params.proposal)
    const voteEvent:VoteEvent|undefined = await findVoteByProposalAndVoter(req.params.proposal, req.params.voter)
    if (!proposal || !voteEvent) {
      res.sendStatus(404);
    } else if (!proposal.stackerData || !proposal.stackerData.heights) {
      res.sendStatus(500);
    } else {
      console.log('/read-stacker-votes/:proposalContract: ' + proposal.proposal)
      await saveStackerBitcoinTxs(proposal)
      saveStackerStacksTxs(proposal)
      return res.send({message: 'all voting events being read into mongodb collection stackerVotes for contract ' + req.params.proposal});
    }
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching sbtc data.')
  }
});

router.get("/results/solo-stackers/:address", async (req, res, next) => {
  try {
    const soloTx = await readSoloVote(req.params.address);
    return res.send(soloTx);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});

router.get("/results/summary/:proposal", async (req, res, next) => {
  try {
    const summary = await getSummary(req.params.proposal);
    return res.send(summary);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});


export { router as stackerVotingRoutes }
