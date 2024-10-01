import express from "express";
import { FundingData, TentativeProposal, VotingEventProposeProposal, lookupContract } from "@mijoco/stx_helpers/dist/index";
import { fetchByBaseDaoEvent } from "../../lib/events/event_helper_base_dao";
import { fetchActiveProposeEvents, fetchAllConcludedEvents, fetchAllProposeEvents, fetchLatestProposal, fetchProposeEvent, toggleSipStatus, updateStackerData } from "../../lib/events/event_helper_voting_contract";
import { generateAddresses, getFunding, getMetaData } from "../../lib/events/proposal";
import { fetchTentativeProposals, findTentativeProposalByContractId, saveOrUpdateTentativeProposal } from "../../lib/data/db_models";
import { getConfig } from "../../lib/config";

const router = express.Router();


router.get("/generate-addresses/:proposalId", async (req, res, next) => {
  try {
    const extensions = await generateAddresses(req.params.proposalId)
    return res.send(extensions);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});

router.get("/generate-stacker-data/:sip/:proposalId", async (req, res, next) => {
  try {
    const proposal = await updateStackerData(Boolean(req.params.sip), req.params.proposalId)
    return res.send(proposal);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});

router.get("/toggle-sip-status/:proposalId", async (req, res, next) => {
  try {
    const proposal = await toggleSipStatus(req.params.proposalId)
    return res.send(proposal);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});

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

router.get("/all-proposals", async (req, res, next) => {
  try {
    const proposals = await fetchAllProposeEvents();
    return res.send(proposals);
  } catch (error) {
    return res.send([]);
  }
});

router.get("/tentative-proposals", async (req, res, next) => {
  try {
    const proposals = await fetchTentativeProposals();
    const tps = []
    for (const p of proposals) {
      // exclude proposed proposals
      const proposedProp = await fetchProposeEvent(p.proposal)
      if (!proposedProp) tps.push(p)
    }
    return res.send(tps);
  } catch (error) {
    return res.send([]);
  }
});

router.get("/get-tentative-proposal/:proposalId", async (req, res, next) => {
  try {
    const proposal = await findTentativeProposalByContractId(req.params.proposalId);
    return res.send(proposal);
  } catch (error) {
    return res.send([]);
  }
});

router.get("/create-tentative-proposal/:start/:end/:proposalId", async (req, res, next) => {
  try {
    const deployed = await lookupContract(getConfig().stacksApi, req.params.proposalId)
    console.log('deployed: ', deployed)
    if (!deployed)  res.sendStatus(404);
    const tentativeproposal = {
      tag: req.params.proposalId,
      visible: true,
      proposalMeta: getMetaData(deployed.source_code),
      expectedStart: Number(req.params.start),
      expectedEnd: Number(req.params.end),
      stacksDeployHeight: deployed.block_height,
      info: undefined,
      submissionData: {
        contractId: req.params.proposalId,
        transaction: deployed.tx_id
      },
      proposer: undefined,
      votingContract: undefined,
    }  as TentativeProposal
    await saveOrUpdateTentativeProposal(tentativeproposal)
    return res.send(tentativeproposal);
  } catch (error) {
    return res.send([]);
  }
});

router.get("/active-proposals", async (req, res, next) => {
  try {
    const proposals = await fetchActiveProposeEvents();
    return res.send(proposals);
  } catch (error) {
    return res.send([]);
  }
});

router.get("/concluded-proposals", async (req, res, next) => {
  try {
    const proposals = await fetchAllConcludedEvents();
    return res.send(proposals);
  } catch (error) {
    return res.send([]);
  }
});


export { router as proposalRoutes }


