import express from "express";
import { getAssetClasses, getBalanceAtHeight, getGovernanceData, getNftHoldings, getProposalsForActiveVotingExt, getStacksInfo, isExecutiveTeamMember } from "./dao_helper";
import { poolStackerAddresses, soloStackerAddresses } from "./solo_pool_addresses";
import { findVotesByProposalAndMethod  } from "./vote_count_helper";
import { analyseMultisig } from "./solo_votes";
import { getPoolTransactions } from "./pool_votes";
import { fetchAddressTransactions } from "@mijoco/btc_helpers/dist/index";
import { getConfig } from "../../lib/config";
import { getDaoConfig } from "../../lib/config_dao";
import { fetchBaseDaoEvents, fetchByBaseDaoEvent, readDaoEvents } from "../../lib/events/event_helper_base_dao";
import { isExtension } from "../../lib/events/extension";

const router = express.Router();

router.get("/read-events-base-dao/:daoContractId", async (req, res, next) => {
  try {
    await readDaoEvents(true, req.params.daoContractId)
    console.log('processEvent: all events: ' + req.params.daoContractId)
    return await fetchBaseDaoEvents()
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});
/**
router.get("/read-events-voting-extension/:votingExtension", async (req, res, next) => {
  try {
    getProposalsForActiveVotingExt(req.params.votingExtension);
    return res.send({result: 'syncing dao data'});
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching sbtc data.')
  }
});
 */

router.get("/get-extensions/:daoContract", async (req, res, next) => {
  try {
    const extensions = await fetchByBaseDaoEvent(req.params.daoContract, 'extension')
    return res.send(extensions);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});

router.get("/is-executive-team-member/:stacksAddress", async (req, res, next) => {
  return false
  try {
    const result = isExecutiveTeamMember(req.params.stacksAddress);
    return res.send(result);
  } catch (error:any) {
    console.log('Error in routes: ', error.message)
    next('An error occurred fetching executive-team-member.')
  }
});

router.get("/get-governance-data/:stacksAddress", async (req, res, next) => {
  try {
    const result = getGovernanceData(req.params.stacksAddress);
    return res.send(result);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});

router.get("/is-extension/:extensionCid", async (req, res, next) => {
  try {
    const contractAddress = getDaoConfig().VITE_DOA_DEPLOYER
    const contractName = getDaoConfig().VITE_DOA

    const result = await isExtension(contractAddress, contractName, req.params.extensionCid);
    console.log('isExtension:', result)
    return res.send(result);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});

router.get("/get-signals/:principle", async (req, res, next) => {
  try {
    const result = getGovernanceData(req.params.principle);
    return res.send(result);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});

/**
 * votes for solo and pool stackers and addresses - for the configured proposal.
 */
router.get("/votes-solo", async (req, res, next) => {
  try {
    const addresses = soloStackerAddresses(getConfig().network)
    const soloFor = await fetchAddressTransactions(getConfig().mempoolUrl, addresses.yAddress);
    const soloAgainst = await fetchAddressTransactions(getConfig().mempoolUrl, addresses.nAddress);
    return res.send({soloFor, soloAgainst});
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});
router.get("/votes-pool", async (req, res, next) => {
  try {
    const poolTxs = await getPoolTransactions();
    return res.send(poolTxs);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});
/**
 * votes for solo and pool stackers and addresses - for the configured proposal.
 */
router.get("/votes/:proposalId", async (req, res, next) => {
  try {
    const soloVotes = await findVotesByProposalAndMethod(req.params.proposalId, 'solo-vote');
    const poolVotes = await findVotesByProposalAndMethod(req.params.proposalId, 'pool-vote');
    const soloAddresses = soloStackerAddresses(getConfig().network);
    const poolAddresses = poolStackerAddresses(getConfig().network);
    return res.send({soloVotes, poolVotes, soloAddresses, poolAddresses});
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});
/**
 * addresses for solo and pool stackers to send txs to express their votes.
 */
router.get("/addresses", async (req, res, next) => {
  try {
    const soloAddresses = soloStackerAddresses(getConfig().network);
    const poolAddresses = poolStackerAddresses(getConfig().network);
    return res.send({soloAddresses, poolAddresses, soloVotes:[], poolVotes: []});
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});

router.get("/results/pool-stackers/:proposalId", async (req, res, next) => {
  try {
    const poolVotes = await findVotesByProposalAndMethod(req.params.proposalId, 'pool-vote');
    const poolAddresses = poolStackerAddresses(getConfig().network);
    return res.send({poolVotes, poolAddresses});
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});

router.get("/results/solo-stackers/:proposalId", async (req, res, next) => {
  try {
    const soloVotes = await findVotesByProposalAndMethod(req.params.proposalId, 'solo-vote');
    const soloAddresses = soloStackerAddresses(getConfig().network);
    return res.send({soloVotes, soloAddresses});
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});

router.get("/results/solo-multisig/:address", async (req, res, next) => {
  try {
    const vote = await analyseMultisig(req.params.address);
    return res.send(vote);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});

/**
 * votes for solo and pool stackers and addresses - for the given proposal.
 */
router.get("/votes/:proposalCid", async (req, res, next) => {
  try {
    const soloVotes = await findVotesByProposalAndMethod(req.params.proposalCid, 'solo-vote');
    const poolVotes = await findVotesByProposalAndMethod(req.params.proposalCid, 'pool-vote');
    const soloAddresses = soloStackerAddresses(getConfig().network);
    const poolAddresses = poolStackerAddresses(getConfig().network);
    return res.send({soloVotes, poolVotes, soloAddresses, poolAddresses});
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});

router.get("/balance/:stxAddress/:height", async (req, res, next) => {
  try {
    const response = await getBalanceAtHeight(req.params.stxAddress, Number(req.params.height || 0));
    return res.send(response);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching sbtc data.')
  }
});

router.get("/nft/assets-classes/:stxAddress", async (req, res, next) => {
  try {
    const response = await getAssetClasses(req.params.stxAddress);
    return res.send(response);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching sbtc data.')
  }
});

router.get("/nft/assets/:stxAddress/:limit/:offset", async (req, res, next) => {
  try {
    const response = await getNftHoldings(req.params.stxAddress, undefined, Number(req.params.limit), Number(req.params.offset));
    return res.send(response);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching sbtc data.')
  }
});

router.get("/nft/assets/:stxAddress/:assetId/:limit/:offset", async (req, res, next) => {
  try {
    const response = await getNftHoldings(req.params.stxAddress, req.params.assetId, Number(req.params.limit), Number(req.params.offset));
    return res.send(response);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching sbtc data.')
  }
});

router.get("/dao-config", async (req, res, next) => {
  try {
    const response = await getDaoConfig();
    return res.send(response);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching sbtc data.')
  }
});

/**
router.get("/sync/results/solo-stackers/:proposalId", async (req, res, next) => {
  try {
    console.log('== READING SOLO VOTES ==================================')
    readSoloVotes(req.params.proposalId);
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

router.get("/results/solo-stackers/:address", async (req, res, next) => {
  try {
    const soloTx = await readSoloVote(req.params.address);
    return res.send(soloTx);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});

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
/**
router.get("/sync/results/solo-stacker-amounts/:proposalId", async (req, res, next) => {
  try {
    reconcileSoloTxs(req.params.proposalId);
    return res.send({result: 'syncing data'});
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});
router.get("/sync/results/pool-stacker-amounts/:proposalId", async (req, res, next) => {
  try {
    reconcilePoolTxs(req.params.proposalId);
    return res.send({result: 'syncing data'});
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});
 */

/**
router.get("/sync/results/non-stackers", async (req, res, next) => {
  try {
    getProposalsForActiveVotingExt(getDaoConfig().VITE_DOA_DEPLOYER + '.' + getDaoConfig().VITE_DOA_SNAPSHOT_VOTING_EXTENSION);
    return res.send({result: 'syncing dao data'});
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching sbtc data.')
  }
});
 */

export { router as daoRoutes }


