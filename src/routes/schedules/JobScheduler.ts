import cron from "node-cron";
import { getDaoConfig } from "../../lib/config_dao";
import { readDaoEvents } from "../../lib/events/event_helper_base_dao";
import { fetchProposeEvent, scanVoting } from "../../lib/events/event_helper_voting_contract";
import { readPoolStackerEvents } from "../voting/stacker-events/pool_stacker_events_helper";
import { reconcileVotes, saveStackerBitcoinTxs, saveStackerStacksTxs } from "../voting/stacker-voting/tally";
import { VotingEventProposeProposal } from "@mijoco/stx_helpers";

// 10 mins past every 12th hour: 10 */12 * * *'
export const initPoolStackerEvents = cron.schedule("10 */12  * * *", (fireDate) => {
  try {
    console.log("NOT Running: readPoolStackerEvents at: " + fireDate);
    readPoolStackerEvents("pox-4");
  } catch (err: any) {
    console.log("Error running: readPoolStackerEvents: ", err);
  }
});

export const readVotes = cron.schedule("5 */3  * * *", async (fireDate) => {
  try {
    console.log("NOT Running: readVotes at: " + fireDate);
    const proposal: VotingEventProposeProposal = await fetchProposeEvent("SP3JP0N1ZXGASRJ0F7QAHWFPGTVK9T2XNXDB908Z.sip029-preserving-economic-incentives");
    await saveStackerBitcoinTxs(proposal);
    await saveStackerStacksTxs(proposal);
    await reconcileVotes(proposal);
  } catch (err: any) {
    console.log("Error running: readVotes: ", err);
  }
});

// 10 mins past every fourth hour: 10 */4 * * *'
export const initPox4EventsJob = cron.schedule("10 */4 * * *", (fireDate) => {
  try {
    console.log("NOT Running: pox4EventsJob at: " + fireDate);
    //readPox4Events();
  } catch (err: any) {
    console.log("Error running: pox4EventsJob: ", err);
  }
});

// 30 mins past every second hour: 30 */2 * * *'
export const initScanDaoEventsJob = cron.schedule("30 */2 * * *", async (fireDate) => {
  console.log("Running: initScanDaoEventsJob at: " + fireDate);
  for (const dao of getDaoConfig().VITE_DOAS.split(",")) {
    try {
      await readDaoEvents(false, `${getDaoConfig().VITE_DOA_DEPLOYER}.${dao}`);
    } catch (err) {
      console.log("Error running: ecosystem-dao: ", err);
    }
  }
});

// runs at 01:01 AM every Sunday'
export const initScanVotingEventsJob = cron.schedule("* * * * *", async (fireDate) => {
  console.log("Running: initScanVotingEventsJob at: " + fireDate);
  try {
    await scanVoting(false);
  } catch (err) {
    console.log("Error running: ede007-snapshot-proposal-voting: ", err);
  }
});
