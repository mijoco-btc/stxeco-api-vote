import cron from 'node-cron';
import { readPox4Events } from '../pox4/pox-events/pox4_events_helper';

export const pox4EventsJob = cron.schedule('*/20 * * * *', (fireDate) => {
  try {
    console.log('NOT Running: readDaoVotesJob at: ' + fireDate);
    readPox4Events();
  } catch (err:any) {
    console.log('Error running: readDaoVotesJob: ', err);
  }
});
