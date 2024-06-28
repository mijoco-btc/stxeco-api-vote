import { ConfigI } from "../types/local_types";
import process from 'process'

let CONFIG= {} as ConfigI;
export let BASE_URL:string;

export function printConfig() {
  //console.log('== ' + process.env.NODE_ENV + ' ==========================================================')
  //console.log('CONFIG.mongoDbName = ' + CONFIG.mongoDbName)
  //console.log('host = ' + CONFIG.host + ':' + CONFIG.port)
  //console.log('stacks node = ' + CONFIG.stacksApi)
  //console.log('jsonl path = ' + CONFIG.jsonl_path_transactions)
}

export function setConfigOnStart() {
  
  const network = process.env.NODE_ENV

  CONFIG.host = process.env[network+'_host'] || '';
  CONFIG.port = Number(process.env[network + '_port']) || 6060;
  CONFIG.host = process.env[network+'_host'] || '';

  CONFIG.mongoDbUrl = process.env[network+'_mongoDbUrl'] || '';
  CONFIG.mongoDbName = process.env[network+'_mongoDbName'] || '';
  CONFIG.mongoUser = process.env[network+'_mongoUser'] || '';
  CONFIG.mongoPwd = process.env[network+'_mongoPwd'] || '';

  CONFIG.btcNode = process.env[network+'_btcNode'] || '';
  CONFIG.btcRpcUser = process.env[network+'_btcRpcUser'] || '';
  CONFIG.btcRpcPwd = process.env[network+'_btcRpcPwd'] || '';
  CONFIG.walletPath = process.env[network+'_walletPath'] || '';
  
  CONFIG.network = process.env[network+'_network'] || '';
  CONFIG.stacksApi = process.env[network+'_stacksApi'] || '';
  CONFIG.stacksExplorerUrl = process.env[network+'_stacksExplorerUrl'] || '';
  CONFIG.btcNode = process.env[network+'_btcNode'] || '';
  CONFIG.bitcoinExplorerUrl = process.env[network+'_bitcoinExplorerUrl'] || '';
  CONFIG.mempoolUrl = process.env[network+'_mempoolUrl'] || '';
  CONFIG.electrumUrl = process.env[network+'_electrumUrl'] || '';
  CONFIG.publicAppName = process.env[network+'_publicAppName'] || '';
  CONFIG.publicAppVersion = process.env[network+'_publicAppVersion'] || '';

  CONFIG.sbtcContractId = process.env[network+'_sbtcContractId'] || '';
  CONFIG.pox4ContractId = process.env[network+'_pox4ContractId'] || '';
  CONFIG.signersContractId = process.env[network+'_signersContractId'] || '';
  CONFIG.signerVotingContractId = process.env[network+'_signerVotingContractId'] || '';
  CONFIG.poxContractId = process.env[network+'_poxContractId'] || '';

  BASE_URL = `http://${getConfig().btcRpcUser}:${getConfig().btcRpcPwd}@${getConfig().btcNode}${getConfig().walletPath}`;

}

export function getConfig() {
	return CONFIG;
}

export function isDev() {
  const environ = process.env.NODE_ENV;
  return (!environ || environ === 'test' || environ === 'development' || environ === 'dev')
}

