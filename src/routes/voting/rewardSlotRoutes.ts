/**
 * Reward slots do not contribute to vote counting.
 * They link slot/burn block/address data per cycle 
 * ie up to 4000 entries per stacking cycle
 * 
 * e.g. 
 * mongo: db.rewardSlotHolders.find()
 *  canonical: true,
    burn_block_hash: '0x000000000000000000022bde1686567fff9c27d392f0121ad75098f55c7285fe',
    burn_block_height: 852576,
    address: 'bc1qs0kkdpsrzh3ngqgth7mkavlwlzr7lms2zv3wxe',
    slot_index: 0,
    cycle: 88
 */
import express from "express";
import { readSoloVote } from "../dao/solo_votes";
import { fetchProposeEvent } from "../../lib/events/event_helper_voting_contract";
import { getPoxInfo, VoteEvent, VotingEventProposeProposal } from "@mijoco/stx_helpers/dist/index";
import { getSummary } from "../../lib/events/proposal";
import { saveStackerBitcoinTxs, saveStackerStacksTxs } from "../../lib/stacker-votes/tally";
import { findProposalVotesByProposalAndSource, findVoteByProposalAndVoter } from "../dao/vote_count_helper";
import { findRewardSlotByAddress, findRewardSlotByAddressMinHeight, findRewardSlotByCycle, getRewardsByAddress, readAllRewardSlots, readRewardSlots } from "./reward_slots/reward_slot_helper";
import { getConfig } from "../../lib/config";

const router = express.Router();

router.get("/reward-slot/:address/least-recent", async (req, res, next) => {
  try {
    const response = await findRewardSlotByAddressMinHeight(req.params.address);
    return res.send(response);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});

router.get("/reward-slot/:address", async (req, res, next) => {
  try {
    const response = await findRewardSlotByAddress(req.params.address);
    return res.send(response);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});
router.get("/reward-slots/:cycle", async (req, res, next) => {
  try {
    const response = await findRewardSlotByCycle(Number(req.params.cycle));
    return res.send(response);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching sbtc data.')
  }
});


router.get("/reward-slots/:address/:offset/:limit", async (req, res, next) => {
  try {
    const response = await getRewardsByAddress(Number(req.params.offset), Number(req.params.limit), req.params.address);
    return res.send(response);
  } catch (error) {
    console.error('Error in routes: ', error)
    next('An error occurred fetching sbtc data.') 
  }
});

router.get("/sync/reward-slots", async (req, res, next) => {
  try {
    const response = await readAllRewardSlots();
    return res.send(response);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});

router.get("/sync/reward-slots/:offset/:limit", async (req, res, next) => {
  try {
    const poxInfo = await getPoxInfo(getConfig().stacksApi)
    const response = await readRewardSlots(Number(req.params.offset), Number(req.params.limit), poxInfo);
    return res.send(response);
  } catch (error) {
    console.error('Error in routes: ', error)
    next('An error occurred fetching sbtc data.') 
  }
});



export { router as rewardSlotRoutes }
