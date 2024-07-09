import express from "express";
import { fetchTentativeProposals, fetchTentativeProposalsActive, findTentativeProposalByContractId, stripNonSipResults } from "../../lib/data/db_models";
import { getProposalsFromContractIds } from "../dao/dao_helper";
import { FundingData, TentativeProposal, VotingEventProposeProposal } from "@mijoco/stx_helpers";
import { fetchByBaseDaoEvent } from "../../lib/events/event_helper_base_dao";
import { fetchAllProposeEvents, fetchLatestProposal } from "../../lib/events/event_helper_voting_contract";
import { getFunding } from "../../lib/events/proposal";

const router = express.Router();


router.get("/get-executed-proposals/:daoContract", async (req, res, next) => {
  try {
    const extensions = await fetchByBaseDaoEvent(req.params.daoContract, 'execute')
    return res.send(extensions);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});

router.get("/get-proposal/:proposalContractId", async (req, res, next) => {
  try {
    const proposal:VotingEventProposeProposal = await fetchLatestProposal(req.params.proposalContractId)
    if (!proposal) res.sendStatus(404);
    return res.send(proposal);
  } catch (error) {
    res.sendStatus(404);
  }
});

router.get("/get-funding/:submissionContract/:proposalContract", async (req, res, next) => {
  try {
    const funding:FundingData = await getFunding(req.params.submissionContract, req.params.proposalContract)
    if (!funding) res.sendStatus(404);
    return res.send(funding);
  } catch (error) {
    res.sendStatus(404);
  }
});

router.get("/sync/proposal/:contractIds", async (req, res, next) => {
  try {
    const props = await getProposalsFromContractIds(req.params.contractIds);
    return res.send(props);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching sbtc data.')
  }
});

router.get("/tentative-proposals/:contractId", async (req, res, next) => {
  let response:TentativeProposal = await findTentativeProposalByContractId(req.params.contractId);;
  if (!response) res.sendStatus(404);
  return res.send(response);
});

router.get("/tentative-proposals?:active", async (req, res, next) => {
  try {
    let response:Array<TentativeProposal>;
    if (req.query.active) {
      console.log('active=' + req.query.active)
      response = await fetchTentativeProposalsActive();
      console.log('active=' + response)
    } else {
      console.log('active=' + req.query.active)
      response = await fetchTentativeProposals();
    }
    return res.send(response);
  } catch (error) {
    return res.send([]);
  }
});

router.get("/all-proposals", async (req, res, next) => {
  try {
    const proposals = await fetchAllProposeEvents();
    return res.send(proposals);
  } catch (error) {
    return res.send([]);
  }
});


export { router as proposalRoutes }


