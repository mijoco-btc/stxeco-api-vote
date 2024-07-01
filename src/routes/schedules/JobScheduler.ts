import cron from 'node-cron';
import { readPox4Events } from '../pox4/pox-events/pox4_events_helper';
import { getProposalFromContractId, getProposalsFromContractIds } from '../dao/dao_helper';
import { deleteTentativeProposal, fetchTentativeProposals } from '../../lib/data/db_models';
import { TentativeProposal } from '@mijoco/stx_helpers';

export const pox4EventsJob = cron.schedule('*/20 * * * *', (fireDate) => {
  try {
    console.log('NOT Running: readDaoVotesJob at: ' + fireDate);
    readPox4Events();
  } catch (err:any) {
    console.log('Error running: readDaoVotesJob: ', err);
  }
});


export const initDaoProposalsJob = cron.schedule('* * * * *', async (fireDate) =>  {
  console.log('Running: initDaoProposalsJob at: ' + fireDate);
  try {
    const tProps:Array<TentativeProposal> = await fetchTentativeProposals()
    if (!tProps || tProps.length === 0) return
    for (const tProp of tProps) {
      const res = await getProposalFromContractId(tProp);
      if (res) {
        await deleteTentativeProposal(tProp);
      }
    }
  } catch (err) {
    console.log('Error running: initDaoProposalsJob: ', err);
  }
});


