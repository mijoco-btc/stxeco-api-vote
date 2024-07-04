import { hex } from '@scure/base';
import { contractPrincipalCV, serializeCV } from '@stacks/transactions';
import { getConfig } from '../config';
import { FundingData, ProposalContract, ProposalData, ProposalEvent, ProposalMeta, ProposalStage, SubmissionData, VotingEventProposeProposal, VotingEventVoteOnProposal, callContractReadOnly } from '@mijoco/stx_helpers/dist/index';
import { getDaoConfig } from '../config_dao';

export async function getProposalData(votingContract:string, principle:string):Promise<ProposalData> {
  try {
    //console.log('==============================================================')
    const functionArgs = [`0x${hex.encode(serializeCV(contractPrincipalCV(principle.split('.')[0], principle.split('.')[1] )))}`];
    const data = {
      contractAddress: getDaoConfig().VITE_DOA_DEPLOYER,
      contractName: votingContract.split('.')[1],
      functionName: 'get-proposal-data',
      functionArgs,
    }
    const result = await callContractReadOnly(getConfig().stacksApi, data);
    //console.log('processEvent: votingContractEvent: result', result)
    let start = 0
    let end = 0
    let startBlockHeight = 0
    if (result.value.value['start-burn-height']) {
      // post nakamoto
      start = Number(result.value.value['start-burn-height'].value)
      end = Number(result.value.value['end-burn-height'].value)
      startBlockHeight = Number(result.value.value['start-height-stacks'].value)
    } else {
      // pre nakamoto
      start = Number(result.value.value['start-block-height'].value)
      end = Number(result.value.value['end-block-height'].value)
      startBlockHeight = start //await getStacksHeightFromBurnBlockHeight(getConfig().stacksApi, start)
    }
    //console.log('result.value.value[custom-majority].value: ' + result.value.value['custom-majority'].value.value)
    const pd = {
      concluded:Boolean(result.value.value.concluded.value),
      passed:Boolean(result.value.value.passed.value), 
      proposer:result.value.value.proposer.value,
      customMajority:Number(result.value.value['custom-majority'].value.value),
      endBlockHeight: -1,
      startBlockHeight: startBlockHeight,
      votesAgainst:Number(result.value.value['votes-against'].value),
      votesFor:Number(result.value.value['votes-for'].value),
      burnStartHeight: start,
      burnEndHeight: end
    }
    //console.log('==============================================================')
    return pd;
  } catch (err:any) {
    console.log('getProposalFromContractId: proposalData1: ' + err.message)
    console.log('=== error ===================================================')
    return {} as ProposalData;
  }
}

export function getMetaData (source:string) {
  // const preamble:Array<string> = [];
  if (!source) return {} as ProposalMeta
  let lines = source.split('\n');
  lines = lines?.filter((l) => l.startsWith(';;')) || []
  const proposalMeta = { dao: '', title: '', author: '', synopsis: '', description: '', };
  lines.forEach((l) => {
    l = l.replace(/;;/, "");
    if (l.indexOf('DAO:') > -1) proposalMeta.dao = l.split('DAO:')[1];
    else if (l.indexOf('Title:') > -1) proposalMeta.title = l.split('Title:')[1];
    else if (l.indexOf('Author:') > -1) proposalMeta.author = l.split('Author:')[1];
    //else if (l.indexOf('Synopsis:') > -1) proposalMeta.synopsis = l.split('Synopsis:')[1];
    else if (l.indexOf('Description:') > -1) proposalMeta.description = l.split('Description:')[1];
    else {
      proposalMeta.description += ' ' + l;
    }
  })
  let alt = source.split('Synopsis:')[1] || '';
  let alt1 = alt.split('Description:')[0];
  proposalMeta.synopsis = alt1.replace(';;', '');
  if (source.indexOf('Author(s):') > -1) {
    alt = source.split('Author(s):')[1] || '';
    alt1 = alt.split('Synopsis:')[0];
    proposalMeta.author = alt1.replace(';;', '');
  }
  proposalMeta.description = proposalMeta.description.replace('The upgrade is designed', '<br/><br/>The upgrade is designed');
  proposalMeta.description = proposalMeta.description.replace('Should this upgrade pass', '<br/><br/>Should this upgrade pass');
  return proposalMeta;
}  

export async function getProposalContractSource(principle:string):Promise<ProposalContract> {
  try {
    const url = getConfig().stacksApi + '/v2/contracts/source/' + principle.split('.')[0] + '/' + principle.split('.')[1] + '?proof=0';
    const response = await fetch(url)
    const val = await response.json();
    return val;
  } catch (err:any) {
    console.log('getProposalFromContractId: proposalData1: ' + err.message)
    return {} as ProposalContract
  }
}

