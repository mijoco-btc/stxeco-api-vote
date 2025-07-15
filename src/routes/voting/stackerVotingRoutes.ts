import express from "express";
import { readSoloVote } from "../dao/solo_votes";
import { fetchProposeEvent } from "../../lib/events/event_helper_voting_contract";
import { VoteEvent, VotingEventProposeProposal } from "@mijoco/stx_helpers/dist/index";
import { getSummary, getSummaryNodao } from "../../lib/events/proposal";
import { findStackerVotesByProposalAndSource } from "./stacker-voting/vote_count_helper";
import { reconcileVotes, saveStackerBitcoinTxs, saveStackerStacksTxs } from "./stacker-voting/tally";

const router = express.Router();

router.get("/read-stacker-votes/:proposal", async (req, res, next) => {
  try {
    const proposal: VotingEventProposeProposal = await fetchProposeEvent(req.params.proposal);
    if (!proposal) {
      res.sendStatus(404);
    } else if (!proposal.stackerData || !proposal.stackerData.heights) {
      res.sendStatus(500);
    } else {
      console.log("/read-stacker-votes/:proposalContract: " + proposal.proposal);
      await saveStackerBitcoinTxs(proposal);
      saveStackerStacksTxs(proposal);
      return res.send({
        message: "all voting events being read into mongodb collection stackerVotes for contract " + req.params.proposal,
      });
    }
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching sbtc data.");
  }
});

router.get("/reconcile-stacker-votes/:proposal", async (req, res, next) => {
  try {
    const proposal: VotingEventProposeProposal = await fetchProposeEvent(req.params.proposal);
    reconcileVotes(proposal);
    return res.send({
      message: "Reconciling the voting (into db.stackerVotes) for " + req.params.proposal,
    });
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching sbtc data.");
  }
});

router.get("/reconcile-stacker-votes/:proposal/:voter", async (req, res, next) => {
  try {
    // tbd
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching sbtc data.");
  }
});

router.get("/get-stacker-votes/:proposal", async (req, res, next) => {
  try {
    const votesBitcoin: Array<VoteEvent> = await findStackerVotesByProposalAndSource(req.params.proposal, "bitcoin");
    const votesStacks: Array<VoteEvent> = await findStackerVotesByProposalAndSource(req.params.proposal, "stacks");
    res.send({ votesBitcoin, votesStacks });
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching sbtc data.");
  }
});

router.get("/results/solo-stackers/:address", async (req, res, next) => {
  try {
    const soloTx = await readSoloVote(req.params.address);
    return res.send(soloTx);
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching pox-info.");
  }
});

router.get("/results/summary/:proposal", async (req, res, next) => {
  try {
    const summary = await getSummary(req.params.proposal);
    return res.send(summary);
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching pox-info.");
  }
});

router.get("/results/summary-nodao/:proposal", async (req, res, next) => {
  try {
    const summary = await getSummaryNodao(req.params.proposal);
    return res.send(summary);
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching pox-info.");
  }
});

export { router as stackerVotingRoutes };
