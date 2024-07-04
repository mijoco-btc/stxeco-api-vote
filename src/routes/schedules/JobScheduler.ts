import cron from 'node-cron';
import { readPox4Events } from '../pox4/pox-events/pox4_events_helper';
import { getProposalFromContractId, getProposalsFromContractIds } from '../dao/dao_helper';
import { deleteTentativeProposal, fetchTentativeProposals } from '../../lib/data/db_models';
import { TentativeProposal } from '@mijoco/stx_helpers/dist/index';
import { getDaoConfig } from '../../lib/config_dao';
import { readDaoEvents } from '../../lib/events/event_helper_base_dao';
import { readVotingEvents } from '../../lib/events/event_helper_voting_contract';
import { getConfig } from '../../lib/config';

export const pox4EventsJob = cron.schedule('*/20 * * * *', (fireDate) => {
  try {
    console.log('Running: pox4EventsJob at: ' + fireDate);
    readPox4Events();
  } catch (err:any) {
    console.log('Error running: pox4EventsJob: ', err);
  }
});


export const initScanDaoEventsJob = cron.schedule('* * * * *', async (fireDate) =>  {
  console.log('Running: initScanDaoEventsJob at: ' + fireDate);
  for (const dao of getDaoConfig().VITE_DOAS.split(',')) {
    try {
      await readDaoEvents(true, `${getDaoConfig().VITE_DOA_DEPLOYER}.${dao}`)
    } catch (err) {
      console.log('Error running: ecosystem-dao: ', err);
    }
  }
});


export const initScanVotingEventsJob = cron.schedule('* * * * *', async (fireDate) =>  {
  console.log('Running: initScanVotingEventsJob at: ' + fireDate);
  try {
    await readVotingEvents(true, `${getDaoConfig().VITE_DOA_DEPLOYER}.ecosystem-dao`, `${getDaoConfig().VITE_DOA_DEPLOYER}.ede007-snapshot-proposal-voting`)
  } catch (err) {
    console.log('Error running: ede007-snapshot-proposal-voting: ', err);
  }
  for (const vc of getDaoConfig().VITE_DOA_VOTING_CONTRACTS.split(',')) {
    try {
      await readVotingEvents(true, `${getDaoConfig().VITE_DOA_DEPLOYER}.bitcoin-dao`, `${getDaoConfig().VITE_DOA_DEPLOYER}.${vc}`)
    } catch (err) {
      console.log('Error running: bde007-snapshot-proposal-voting: ', err);
    }
  }
});


export const initScanTentativeProposalsJob = cron.schedule('* * * * *', async (fireDate) =>  {
  console.log('Running: initScanTentativeProposalsJob at: ' + fireDate);
  try {
    const tProps:Array<TentativeProposal> = await fetchTentativeProposals()
    if (!tProps || tProps.length === 0) return
    for (const tProp of tProps) {
      const res = await getProposalFromContractId(tProp.tag);
      if (res) {
        await deleteTentativeProposal(tProp);
      }
    }
  } catch (err) {
    console.log('Error running: initDaoProposalsJob: ', err);
  }
});


