import express from "express";
import { getVotesByProposal, getVotesByProposalAndVoter, getVotesByVoter, readVotingEvents } from "../../lib/events/event_helper_voting_contract";
import { getDaoVotingSummary } from "../../lib/events/proposal";

const router = express.Router();

router.get("/read-votes/:genesis/:daoContract/:votingContract", async (req, res, next) => {
  try {
    readVotingEvents(Boolean(req.params.genesis), req.params.daoContract, req.params.votingContract);
    return res.send({message: 'all voting events being recorded for contract ' + req.params.votingContract});
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching sbtc data.')
  }
});

router.get("/votes/:proposal/:voter", async (req, res, next) => {
  try {
    const response = await getVotesByProposalAndVoter(req.params.proposal, req.params.voter);
    return res.send(response);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching sbtc data.')
  }
});

router.get("/summary/:proposal", async (req, res, next) => {
  try {
    const response = await getDaoVotingSummary(req.params.proposal);
    return res.send(response);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching sbtc data.')
  }
});

router.get("/proposal/votes/:proposalContractId", async (req, res, next) => {
    try {
      const response = await getVotesByProposal(req.params.proposalContractId);
      return res.send(response);
    } catch (error) {
      return res.send([]);
    }
  });
  
  router.get("/votes/:voter", async (req, res, next) => {
    try {
      const response = await getVotesByVoter(req.params.voter);
      return res.send(response);
    } catch (error) {
      console.log('Error in routes: ', error)
      next('An error occurred fetching sbtc data.')
    }
  });
  
  export { router as daoVotingRoutes }
