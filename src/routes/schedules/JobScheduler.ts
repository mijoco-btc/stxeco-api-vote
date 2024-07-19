import cron from 'node-cron';
import { getDaoConfig } from '../../lib/config_dao';
import { readDaoEvents } from '../../lib/events/event_helper_base_dao';
import { scanVoting } from '../../lib/events/event_helper_voting_contract';

// 10 mins past every fourth hour: 10 */4 * * *' 
export const pox4EventsJob = cron.schedule('10 */4 * * *', (fireDate) => {
  try {
    console.log('NOT Running: pox4EventsJob at: ' + fireDate);
    //readPox4Events();
  } catch (err:any) {
    console.log('Error running: pox4EventsJob: ', err);
  }
});


// 30 mins past every second hour: 30 */2 * * *' 
export const initScanDaoEventsJob = cron.schedule('30 */2 * * *', async (fireDate) =>  {
  console.log('Running: initScanDaoEventsJob at: ' + fireDate);
  for (const dao of getDaoConfig().VITE_DOAS.split(',')) {
    try {
      await readDaoEvents(true, `${getDaoConfig().VITE_DOA_DEPLOYER}.${dao}`)
    } catch (err) {
      console.log('Error running: ecosystem-dao: ', err);
    }
  }
});


// every 10 mins: */10 * * * *' 
export const initScanVotingEventsJob = cron.schedule('*/30 * * * *', async (fireDate) =>  {
  console.log('Running: initScanVotingEventsJob at: ' + fireDate);
  try {
    await scanVoting(true)
  } catch (err) {
    console.log('Error running: ede007-snapshot-proposal-voting: ', err);
  }
});


