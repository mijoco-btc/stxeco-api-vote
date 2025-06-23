import express from "express";
import { getAssetClasses, getGovernanceData, getNftHoldings, isExecutiveTeamMember } from "./dao_helper";
import { poolStackerAddresses, soloStackerAddresses } from "./solo_pool_addresses";
import { findStackerVotesByProposalAndMethod } from "../voting/stacker-voting/vote_count_helper";
import { analyseMultisig } from "./solo_votes";
import { getPoolTransactions } from "./pool_votes";
import { fetchAddressTransactions } from "@mijoco/btc_helpers/dist/index";
import { getConfig } from "../../lib/config";
import { getDaoConfig } from "../../lib/config_dao";
import { fetchBaseDaoEvents, fetchByBaseDaoEvent, readDaoEvents } from "../../lib/events/event_helper_base_dao";
import { isExtension } from "../../lib/events/extension";
import { getBalanceAtHeight } from "@mijoco/stx_helpers/dist/index";

const router = express.Router();

router.get("/read-events-base-dao/:genesis/:daoContractId", async (req, res, next) => {
  try {
    await readDaoEvents(Boolean(req.params.genesis), req.params.daoContractId);
    console.log("processEvent: all events: " + req.params.daoContractId);
    return await fetchBaseDaoEvents();
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching pox-info.");
  }
});

router.get("/read-events-base-dao/:daoContractId", async (req, res, next) => {
  try {
    await readDaoEvents(true, req.params.daoContractId);
    console.log("processEvent: all events: " + req.params.daoContractId);
    return await fetchBaseDaoEvents();
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching pox-info.");
  }
});

router.get("/get-extensions/:daoContract", async (req, res, next) => {
  try {
    const extensions = await fetchByBaseDaoEvent(req.params.daoContract, "extension");
    return res.send(extensions);
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching pox-info.");
  }
});

router.get("/is-executive-team-member/:stacksAddress", async (req, res, next) => {
  return false;
  try {
    const result = isExecutiveTeamMember(req.params.stacksAddress);
    return res.send(result);
  } catch (error: any) {
    console.log("Error in routes: ", error.message);
    next("An error occurred fetching executive-team-member.");
  }
});

router.get("/get-governance-data/:stacksAddress", async (req, res, next) => {
  try {
    const result = getGovernanceData(req.params.stacksAddress);
    return res.send(result);
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching pox-info.");
  }
});

router.get("/is-extension/:extensionCid", async (req, res, next) => {
  try {
    const contractAddress = getDaoConfig().VITE_DOA_DEPLOYER;
    const contractName = getDaoConfig().VITE_DOA;

    const result = await isExtension(contractAddress, contractName, req.params.extensionCid);
    console.log("isExtension:", result);
    return res.send(result);
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching pox-info.");
  }
});

router.get("/get-signals/:principle", async (req, res, next) => {
  try {
    const result = getGovernanceData(req.params.principle);
    return res.send(result);
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching pox-info.");
  }
});

/**
 * votes for solo and pool stackers and addresses - for the configured proposal.
 */
router.get("/votes-solo", async (req, res, next) => {
  try {
    const addresses = soloStackerAddresses(getConfig().network);
    const soloFor = await fetchAddressTransactions(getConfig().mempoolUrl, addresses.yAddress);
    const soloAgainst = await fetchAddressTransactions(getConfig().mempoolUrl, addresses.nAddress);
    return res.send({ soloFor, soloAgainst });
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching pox-info.");
  }
});
router.get("/votes-pool", async (req, res, next) => {
  try {
    const poolTxs = await getPoolTransactions();
    return res.send(poolTxs);
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching pox-info.");
  }
});
/**
 * votes for solo and pool stackers and addresses - for the configured proposal.
 */
router.get("/votes/:proposalId", async (req, res, next) => {
  try {
    const soloVotes = await findStackerVotesByProposalAndMethod(req.params.proposalId, "solo-vote");
    const poolVotes = await findStackerVotesByProposalAndMethod(req.params.proposalId, "pool-vote");
    const soloAddresses = soloStackerAddresses(getConfig().network);
    const poolAddresses = poolStackerAddresses(getConfig().network);
    return res.send({ soloVotes, poolVotes, soloAddresses, poolAddresses });
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching pox-info.");
  }
});
/**
 * addresses for solo and pool stackers to send txs to express their votes.
 */
router.get("/addresses", async (req, res, next) => {
  try {
    const soloAddresses = soloStackerAddresses(getConfig().network);
    const poolAddresses = poolStackerAddresses(getConfig().network);
    return res.send({ soloAddresses, poolAddresses, soloVotes: [], poolVotes: [] });
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching pox-info.");
  }
});

router.get("/results/pool-stackers/:proposalId", async (req, res, next) => {
  try {
    const poolVotes = await findStackerVotesByProposalAndMethod(req.params.proposalId, "pool-vote");
    const poolAddresses = poolStackerAddresses(getConfig().network);
    return res.send({ poolVotes, poolAddresses });
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching pox-info.");
  }
});

router.get("/results/solo-stackers/:proposalId", async (req, res, next) => {
  try {
    const soloVotes = await findStackerVotesByProposalAndMethod(req.params.proposalId, "solo-vote");
    const soloAddresses = soloStackerAddresses(getConfig().network);
    return res.send({ soloVotes, soloAddresses });
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching pox-info.");
  }
});

router.get("/results/solo-multisig/:address", async (req, res, next) => {
  try {
    const vote = await analyseMultisig(req.params.address);
    return res.send(vote);
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching pox-info.");
  }
});

/**
 * votes for solo and pool stackers and addresses - for the given proposal.
 */
router.get("/votes/:proposalCid", async (req, res, next) => {
  try {
    const soloVotes = await findStackerVotesByProposalAndMethod(req.params.proposalCid, "solo-vote");
    const poolVotes = await findStackerVotesByProposalAndMethod(req.params.proposalCid, "pool-vote");
    const soloAddresses = soloStackerAddresses(getConfig().network);
    const poolAddresses = poolStackerAddresses(getConfig().network);
    return res.send({ soloVotes, poolVotes, soloAddresses, poolAddresses });
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching pox-info.");
  }
});

router.get("/balance/:stxAddress/:height", async (req, res, next) => {
  try {
    const response = await getBalanceAtHeight(getConfig().stacksApi, req.params.stxAddress, Number(req.params.height || 0));
    return res.send(response);
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching sbtc data.");
  }
});

router.get("/nft/assets-classes/:stxAddress", async (req, res, next) => {
  try {
    const response = await getAssetClasses(req.params.stxAddress);
    return res.send(response);
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching sbtc data.");
  }
});

router.get("/nft/assets/:stxAddress/:limit/:offset", async (req, res, next) => {
  try {
    const response = await getNftHoldings(req.params.stxAddress, undefined, Number(req.params.limit), Number(req.params.offset));
    return res.send(response);
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching sbtc data.");
  }
});

router.get("/nft/assets/:stxAddress/:assetId/:limit/:offset", async (req, res, next) => {
  try {
    const response = await getNftHoldings(req.params.stxAddress, req.params.assetId, Number(req.params.limit), Number(req.params.offset));
    return res.send(response);
  } catch (error) {
    console.log("Error in routes: ", error);
    next("An error occurred fetching sbtc data.");
  }
});

export { router as daoRoutes };
