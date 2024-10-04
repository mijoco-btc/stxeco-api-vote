import cron from 'node-cron';
import { getDaoConfig } from '../../lib/config_dao';
import { readDaoEvents } from '../../lib/events/event_helper_base_dao';
import { scanVoting } from '../../lib/events/event_helper_voting_contract';
import { readPoolStackerEvents } from '../voting/stacker-events/pool_stacker_events_helper';

// 10 mins past every 12th hour: 10 */12 * * *' 
export const initPoolStackerEvents = cron.schedule('10 */12  * * *', (fireDate) => {
  try {
    console.log('NOT Running: readPoolStackerEvents at: ' + fireDate);
    readPoolStackerEvents('pox-4');
  } catch (err:any) {
    console.log('Error running: readPoolStackerEvents: ', err);
  }
});


// 10 mins past every fourth hour: 10 */4 * * *' 
export const initPox4EventsJob = cron.schedule('10 */4 * * *', (fireDate) => {
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


// runs at 01:01 AM every Sunday' 
export const initScanVotingEventsJob = cron.schedule('1 1 * * 0', async (fireDate) =>  {
  console.log('Running: initScanVotingEventsJob at: ' + fireDate);
  try {
    await scanVoting(true)
  } catch (err) {
    console.log('Error running: ede007-snapshot-proposal-voting: ', err);
  }
});


