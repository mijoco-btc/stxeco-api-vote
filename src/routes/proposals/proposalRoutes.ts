import express from "express";
import { fetchTentativeProposals, findTentativeProposalByContractId, getDaoMongoConfig, saveOrUpdateDaoMongoConfig } from "../../lib/data/db_models";
import { getProposalFromContractId, getProposalsFromContractIds } from "../dao/dao_helper";
import { TentativeProposal, VotingEventProposeProposal } from "@mijoco/stx_helpers";
import { fetchByBaseDaoEvent } from "../../lib/events/event_helper_base_dao";
import { fetchProposeEvent, getActiveProposals, getInactiveProposals, getProposals } from "../../lib/events/event_helper_voting_contract";
import { getProposalData } from "../../lib/events/proposal";

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
    const proposal:VotingEventProposeProposal = await fetchProposeEvent(req.params.proposalContractId)
    if (!proposal) res.sendStatus(404);
    const pd = await getProposalData(proposal.votingContract, proposal.proposal)
    proposal.proposalData = pd;
    return res.send(proposal);
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

router.get("/tentative-proposals", async (req, res, next) => {
  try {
    const response = await fetchTentativeProposals();
    return res.send(response);
  } catch (error) {
    return res.send([]);
  }
});
router.get("/active-proposals", async (req, res, next) => {
  try {
    const proposals = await getActiveProposals();
    return res.send(proposals);
  } catch (error) {
    return res.send([]);
  }
});
router.get("/inactive-proposals", async (req, res, next) => {
  try {
    const response = await getInactiveProposals();
    return res.send(response);
  } catch (error) {
    return res.send([]);
  }
});
router.get("/proposals", async (req, res, next) => {
  try {
    const response = await getProposals();
    return res.send(response);
  } catch (error) {
    return res.send([]);
  }
});

router.get("/get-current-proposal", async (req, res, next) => {
  try {
    const response = await getDaoMongoConfig();
    return res.send(response);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching sbtc data.')
  }
});

router.get("/set-current-proposal/:contractId", async (req, res, next) => {
  try {
    let config = await getDaoMongoConfig();
    console.log('config in routes: ', config)
    if (!config) {
      config = {
        configId: 1,
        contractId: req.params.contractId
      }
    } else {
      config.contractId = req.params.contractId
    }
    config = await saveOrUpdateDaoMongoConfig(config)
    return res.send(config);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching sbtc data.')
  }
});

export { router as proposalRoutes }


