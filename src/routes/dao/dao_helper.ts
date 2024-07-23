/**
 * sbtc - interact with Stacks Blockchain to read sbtc contract info
 */
import { stringAsciiCV, cvToJSON, deserializeCV, contractPrincipalCV, serializeCV, principalCV, uintCV } from '@stacks/transactions';
import { hex } from '@scure/base';
import { getConfig } from '../../lib/config';
import { findProposalByContractId, saveOrUpdateProposal } from '../../lib/data/db_models';
import { getDaoConfig } from '../../lib/config_dao';
import { countsVotesByMethod, saveOrUpdateVote } from '../voting/stacker-voting/vote_count_helper';
import { FundingData, GovernanceData, NFTHolding, NFTHoldings, ProposalContract, ProposalData, ProposalEvent, ProposalStage, SignalData, SubmissionData, TentativeProposal, VoteEvent, VotingEventProposeProposal, callContractReadOnly, fetchDataVar } from '@mijoco/stx_helpers/dist/index';
import { fetchProposeEvent } from '../../lib/events/event_helper_voting_contract';
import { getFunding, getMetaData, getProposalContractSource, getProposalData } from '../../lib/events/proposal';

let uris:any = {};
const gateway = "https://hashone.mypinata.cloud/";
const gatewayAr = "https://arweave.net/";

async function getNftHoldingsByPage(stxAddress:string, limit:number, offset:number):Promise<any> {
  const url = getConfig().stacksApi + '/extended/v1/tokens/nft/holdings?principal=' + stxAddress + '&limit=' + limit + '&offset=' + offset;
  console.log('url: ', url)
  const response = await fetch(url)
  const val = await response.json();
  return val;
}

async function getNftHoldingsByAssetAndPage(stxAddress:string, assetId:string|undefined, limit:number, offset:number):Promise<any> {
  let url = getConfig().stacksApi + '/extended/v1/tokens/nft/holdings?principal=' + stxAddress + '&limit=' + limit + '&offset=' + offset;
  if (assetId) {
    url += '&asset_identifiers=' + assetId
  }
  console.log('url: ', url)
  const response = await fetch(url)
  const val = await response.json();
  return val;
}

export async function getAssetClasses(stxAddress:string):Promise<any> {
  let events:any;
  const assetClasses = [];
  const limit = 50
  let offset = 0
  do {
    events = await getNftHoldingsByPage(stxAddress, limit, offset);    
    if (events && events.total > 0) {
      for (const event of events.results) {
        const idx = assetClasses.findIndex((o) => o === event.asset_identifier)
        if (idx === -1) assetClasses.push(event.asset_identifier)
      }
    }
    offset += 50;
  } while (events.total > offset);
  return assetClasses;
}

export async function getNftHoldings(stxAddress:string, assetId:string|undefined, limit:number, offset:number):Promise<NFTHoldings> {
  let events:any;
  const holdings = {
    total: 0,
    offset: 0,
    limit: 0,
    results: []
  } as NFTHoldings;
  do {
    events = await getNftHoldingsByAssetAndPage(stxAddress, assetId, limit, offset);
    console.log('events.total: ', events.total)
    console.log('events.results.length: ', events.results.length)
    holdings.total = events.total
    if (events && events.total > 0) {
      for (const event of events.results) {
        const result = cvToJSON(deserializeCV(event.value.hex));
        let semiFungible = false
        let token;
        if (result.type === 'uint') {
          token = { id: Number(result.value) }
        } else {
          token = { id: Number(result.value['token-id'].value), owner: result.value.owner.value }
          semiFungible = true
        }
        //let token_uri = await getTokenUri(event.asset_identifier, token.id)
        //console.log('holding: ', holding)
        let holding = {
          asset_identifier: event.asset_identifier,
          block_height: event.block_height,
          semiFungible,
          tx_id: event.tx_id,
          //token_uri,
          token,
        } as NFTHolding;
        holdings.results.push(holding)
      }
    }
    offset += 50;
  } while (events.total > offset && limit === -1);
  for (const h of holdings.results) {
    let res = await getTokenUri(h.asset_identifier, h.token.id)
    if (res) {
      h.token_uri = stripDupIpfs(res.uri)
      h.metaData = res.meta
    }
  }
  return holdings;
}

function stripDupIpfs(uri:string) {
  let token_uri = uri
  if (token_uri.indexOf('ipfs/ipfs') > -1) {
    token_uri = token_uri.replace('ipfs/ipfs', 'ipfs')
  }
  return token_uri
}

async function getTokenUri(asset_identifier:string, tokenId:number) {
  if (asset_identifier.indexOf("bns::names") > -1) return
  if (uris[asset_identifier]) {
    const rawTokenUri:string = uris[asset_identifier]
    return await returnUri(rawTokenUri, tokenId)
  }
  const functionArgs = [`0x${hex.encode(serializeCV(uintCV(tokenId)))}`];
  const contractId = asset_identifier.split("::")[0]
  const data = {
    contractAddress: contractId.split('.')[0],
    contractName: contractId.split('.')[1],
    functionName: 'get-token-uri',
    functionArgs,
  }
  const result = await callContractReadOnly(getConfig().stacksApi, data);
  const rawTokenUri = result.value.value.value
  const uriMeta = await returnUri(rawTokenUri, tokenId)
  uris[asset_identifier] = rawTokenUri
  return uriMeta;
}

async function returnUri(rawTokenUri:string, tokenId:number) {
  let uri = rawTokenUri
  if (uri.startsWith('ipfs://')) {
    uri = uri.replace('ipfs://', gateway)
    uri = uri.replace(gateway, gateway + 'ipfs/')
  } else if (uri.startsWith('ipfs/')) {
    uri = gateway + uri;
  } else if (uri.startsWith('ar://')) {
    uri = uri.replace('ar://', gatewayAr)
  }

  if (rawTokenUri.indexOf('{id}')) {
    uri = uri.replace('{id}', ''+tokenId)
  } else if (rawTokenUri.endsWith('/')) {
    uri = uri + tokenId + '.json'
  }
  uri = stripDupIpfs(uri)
  let meta:any;
  try {
    const response = await fetch(uri);
    meta = await response.json();
  } catch (err:any) {
    //
  }
  console.log('uri : ', uri)
  console.log('meta : ', meta)
  return { uri, meta }
}


const trait = "{\"maps\":[],\"functions\":[{\"args\":[{\"name\":\"sender\",\"type\":\"principal\"}],\"name\":\"execute\",\"access\":\"public\",\"outputs\":{\"type\":{\"response\":{\"ok\":\"bool\",\"error\":\"uint128\"}}}}],\"variables\":[],\"fungible_tokens\":[],\"non_fungible_tokens\":[]}";
export async function getProposalsByTrait() {
  const url = getConfig().stacksApi + '/extended/v1/contract/by_trait?trait_abi=' + trait;
  let edaoProposals: string|any[] = [];
  let val;
  let response;
  let count = 0;
  try {
    do {
      response = await fetch(url + '&offset=' + (count * 20));
      val = await response.json();
      const ourProps = val.results.filter((o:any) => o.contract_id.indexOf('.edp') > -1);
      if (ourProps && ourProps.length > 0) edaoProposals = edaoProposals.concat(ourProps)
      count++;
    }
    while (val.results.length > 0)
  }
  catch (err:any) {
      console.log('callContractReadOnly4: ', err);
  }
  return edaoProposals;
}

export async function getProposalFromContractId(contractId:string):Promise<ProposalEvent|undefined> {
  let proposal:ProposalEvent|undefined = undefined;
  try {
    const proposeEvent:VotingEventProposeProposal = await fetchProposeEvent(contractId)
    if (!proposeEvent) return;
    const proposalContractId = contractId
    let contract;
    try {
      contract = await getProposalContractSource(proposalContractId)
      if (!contract) return;
    } catch(err:any) {
      return;
    }
    let proposalMeta;
    let funding;
    let signals;
    let stage = ProposalStage.PARTIAL_FUNDING;
    try {
      funding = await getFunding(proposeEvent.submissionContract, proposalContractId);
      if (funding.funding === 0) stage = ProposalStage.UNFUNDED
      //signals = await getSignals(proposalContractId)
      proposalMeta = getMetaData(contract.source)
    } catch (err:any) {
      console.log('getProposalFromContractId: funding: ' + err.message)
    }
    let proposalData:ProposalData|undefined;
    try {
      proposalData = await getProposalData(proposalContractId, proposalContractId)
    } catch (err:any) { 
      console.log('getProposalFromContractId: proposalData1: ' + err.message)
    }
    const p = {
      contract,
      proposalMeta,
      contractId: proposalContractId,
      submissionData: { contractId: proposeEvent.submissionContract, transaction: undefined },
      signals,
      stage,
      funding
    } as ProposalEvent
    if (proposalData) p.proposalData = proposalData
    saveOrUpdateProposal(p)
    proposal = p
  } catch(err:any) {
    console.log('getProposalFromContractId: proposalData2: ' + err.message)
    return
  }
  return proposal
}

export async function getGovernanceData(principle:string):Promise<GovernanceData> {
  try {
    const result = await getEdgTotalSupply();
    const result1 = await getEdgBalance(principle);
    const result2 = await getEdgLocked(principle);
    return {
      totalSupply: Number(result.totalSupply),
      userBalance: Number(result1.balance),
      userLocked: Number(result2.locked),
    }
  } catch (err:any) {
    return {
      totalSupply: 0,
      userBalance: 0,
      userLocked: 0,
    }
  }
}

async function getExecutedAt(principle:string):Promise<number> {
  let result;
  try {
    const functionArgs = [`0x${hex.encode(serializeCV(contractPrincipalCV(principle.split('.')[0], principle.split('.')[1] )))}`];
    const data = {
      contractAddress: getDaoConfig().VITE_DOA_DEPLOYER,
      contractName: getDaoConfig().VITE_DOA,
      functionName: 'executed-at',
      functionArgs,
    }
    result = await callContractReadOnly(getConfig().stacksApi, data);
    return Number(result.value.value)
  } catch(err:any) {
    try {
      return Number(result.value)
    } catch(err:any) {
      return 0
    }
  }
}

export async function getSignals(principle:string):Promise<SignalData> {
  const functionArgs = [`0x${hex.encode(serializeCV(contractPrincipalCV(principle.split('.')[0], principle.split('.')[1] )))}`];
  const data = {
    contractAddress: getDaoConfig().VITE_DOA_DEPLOYER,
    contractName: getDaoConfig().VITE_DOA_EMERGENCY_EXECUTE_EXTENSION,
    functionName: 'get-signals',
    functionArgs,
  }
  const result = (await callContractReadOnly(getConfig().stacksApi, data)).value;
  return {
    signals: Number(result),
    parameters: await getEmergencyExecuteParams()
  }
}

async function getEmergencyExecuteParams():Promise<any> {
  return {
    executiveSignalsRequired: Number(await fetchDataVar(getConfig().stacksApi, getDaoConfig().VITE_DOA_DEPLOYER,getDaoConfig().VITE_DOA_EMERGENCY_EXECUTE_EXTENSION, 'executive-signals-required') || 0),
    executiveTeamSunsetHeight: Number(await fetchDataVar(getConfig().stacksApi, getDaoConfig().VITE_DOA_DEPLOYER,getDaoConfig().VITE_DOA_EMERGENCY_EXECUTE_EXTENSION, 'executive-team-sunset-height') || 0),
  }
}

async function getSubmissionData(txId:string):Promise<SubmissionData> {
  const fundingTx = await getTransaction(txId)
  const pd = {
    contractId:fundingTx.contract_call.contract_id,
    transaction: fundingTx.tx_id
  }
  return pd;
}

export async function getBurnBlockHeight(height:number):Promise<number> {
  let url = getConfig().stacksApi + '/extended/v1/block/by_height/' + height;
  let response = await fetch(url)
  let val = await response.json();
  //console.log('getBurnBlockHeight: ' + url, val)
  if (response.status !== 200) { 
    url = getConfig().stacksApi + '/extended/v2/burn-blocks/' + height;
    response = await fetch(url)
    val = await response.json();
  }
  return val.burn_block_height;
}

export async function getBurnBlockHeightFromHash(hash:string):Promise<number> {
  let url = getConfig().mempoolUrl + '/block/' + hash;
  let response = await fetch(url)
  let val = await response.json();
  return val.height;
}

export async function isExecutiveTeamMember(stxAddress:string):Promise<{executiveTeamMember:boolean}> {
  if (!stxAddress || stxAddress === 'undefined') return {executiveTeamMember:false}
  const functionArgs = [`0x${hex.encode(serializeCV(principalCV(stxAddress)))}`];
  const data = {
    contractAddress: getDaoConfig().VITE_DOA_DEPLOYER,
    contractName: getDaoConfig().VITE_DOA_EMERGENCY_EXECUTE_EXTENSION,
    functionName: 'is-executive-team-member',
    functionArgs,
  }
  try {
    const result = (await callContractReadOnly(getConfig().stacksApi, data)).value;
    return {
      executiveTeamMember: Boolean(result),
    }
  } catch(err:any) {
    return {executiveTeamMember:false}
  }
}

export async function getEdgTotalSupply():Promise<{totalSupply:boolean}> {
  const functionArgs:Array<any> = [];
  const data = {
    contractAddress: getDaoConfig().VITE_DOA_DEPLOYER,
    contractName: 'ede000-governance-token',
    functionName: 'get-total-supply',
    functionArgs,
  }
  const result = (await callContractReadOnly(getConfig().stacksApi, data)).value;
  return {
    totalSupply: Boolean(result),
  }
}

export async function getEdgBalance(stxAddress:string):Promise<{balance:boolean}> {
  const functionArgs = [`0x${hex.encode(serializeCV(principalCV(stxAddress)))}`];
  const data = {
    contractAddress: getDaoConfig().VITE_DOA_DEPLOYER,
    contractName: 'ede000-governance-token',
    functionName: 'edg-get-balance',
    functionArgs,
  }
  const result = (await callContractReadOnly(getConfig().stacksApi, data)).value;
  return {
    balance: Boolean(result),
  }
}

export async function getEdgLocked(stxAddress:string):Promise<{locked:boolean}> {
  const functionArgs = [`0x${hex.encode(serializeCV(principalCV(stxAddress)))}`];
  const data = {
    contractAddress: getDaoConfig().VITE_DOA_DEPLOYER,
    contractName: 'ede000-governance-token',
    functionName: 'edg-get-locked',
    functionArgs,
  }
  const result = (await callContractReadOnly(getConfig().stacksApi, data)).value;
  return {
    locked: Boolean(result),
  }
}

export async function getTransaction(tx:string):Promise<any> {
  const url = getConfig().stacksApi + '/extended/v1/tx/' + tx
  let val;
  try {
      const response = await fetch(url)
      val = await response.json();
  }
  catch (err:any) {
      console.log('getTransaction: ', err);
  }
  return val;
}
