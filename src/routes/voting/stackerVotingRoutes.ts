import express from "express";
import { readSoloVote, readSoloVotes, readSoloZeroVote, reconcileSoloTxs } from "../dao/solo_votes";
import { getPoolTxs, reconcilePoolTxs } from "../dao/pool_votes";
import { fetchProposeEvent } from "../../lib/events/event_helper_voting_contract";
import { VotingEventProposeProposal } from "@mijoco/stx_helpers/dist/index";
import { findVotesByProposalAndMethod } from "../dao/vote_count_helper";
import { getSummary } from "../../lib/events/proposal";

const router = express.Router();

async function readAllStackerVotes(proposal:VotingEventProposeProposal) {
  await readSoloVotes(proposal);
  await readSoloZeroVote();
  await reconcileSoloTxs(proposal);
}

router.get("/read-solo-votes/:proposalContract", async (req, res, next) => {
  try {
    const proposal:VotingEventProposeProposal = await fetchProposeEvent(req.params.proposalContract)
    console.log('/read-votes/:proposalContract: proposal: ', proposal)
    if (!proposal) {
      res.sendStatus(404);
    } else if (!proposal.stackerData) {
      res.sendStatus(500);
    } else {
      console.log('/read-votes/:proposalContract: ' + readAllStackerVotes)
      readAllStackerVotes(proposal)
      return res.send({message: 'all voting events being recorded for contract ' + req.params.proposalContract});
    }
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching sbtc data.')
  }
});

router.get("/read-pool-votes/:proposalContract", async (req, res, next) => {
  try {
    const proposal:VotingEventProposeProposal = await fetchProposeEvent(req.params.proposalContract)
    console.log('/read-votes/:proposalContract: proposal: ' +  proposal.proposal)
    console.log('/read-votes/:proposalContract: proposal: ',  proposal.proposalData)
    if (!proposal) {
      res.sendStatus(404);
    } else if (!proposal.stackerData) {
      res.sendStatus(500);
    } else {
      await getPoolTxs(proposal);
      //await reconcilePoolTxs(proposal);
      return res.send({message: 'all voting events being recorded for contract ' + req.params.proposalContract});
    }
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching sbtc data.')
  }
});

router.get("/sync/results/solo-stackers/:proposalId", async (req, res, next) => {
  try {
    console.log('== READING SOLO VOTES ==================================')
    //readSoloVotes(req.params.proposalId);
    console.log('========================================================')
    //await readSoloZeroVote();
    const currentProposal = await fetchProposeEvent(req.params.proposalId)
    const soloVotes = await findVotesByProposalAndMethod(currentProposal.proposal, 'solo-vote');
    return res.send('running /sync/results/solo-stackers');
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});

router.get("/sync/results/solo-zeroes", async (req, res, next) => {
  try {
    console.log('== READING SOLO ZERO VOTE ==============================')
    await readSoloZeroVote();
    console.log('========================================================')
    return res.send('running /sync/results/solo-zeroes');
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});

/**
router.get("/sync/results/pool-stackers/raw/:proposalId", async (req, res, next) => {
  try {
    const poolTxs = await getPoolTxs(req.params.proposalId);
    return res.send(poolTxs);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});
 */
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
