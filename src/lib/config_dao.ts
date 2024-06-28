import { ConfigDaoI } from "../types/local_types";
import process from 'process'

let CONFIG = {} as ConfigDaoI;

export function setDaoConfigOnStart() {
  
  const network = process.env.NODE_ENV

  CONFIG.VITE_DOA = process.env[network+'_' + 'VITE_DOA'] || '';
  CONFIG.VITE_DOA_DEPLOYER = process.env[network+'_' + 'VITE_DOA_DEPLOYER'] || '';
  CONFIG.VITE_DOA_PROPOSAL = process.env[network+'_' + 'VITE_DOA_PROPOSAL'] || '';
  CONFIG.VITE_DOA_PROPOSALS = process.env[network+'_' + 'VITE_DOA_PROPOSALS'] || '';
  CONFIG.VITE_DOA_SNAPSHOT_VOTING_EXTENSION = process.env[network+'_' + 'VITE_DOA_SNAPSHOT_VOTING_EXTENSION'] || '';
  CONFIG.VITE_DOA_PROPOSAL_VOTING_EXTENSION = process.env[network+'_' + 'VITE_DOA_PROPOSAL_VOTING_EXTENSION'] || '';
  CONFIG.VITE_DOA_FUNDED_SUBMISSION_EXTENSION = process.env[network+'_' + 'VITE_DOA_FUNDED_SUBMISSION_EXTENSION'] || '';
  CONFIG.VITE_DOA_EMERGENCY_EXECUTE_EXTENSION = process.env[network+'_' + 'VITE_DOA_EMERGENCY_EXECUTE_EXTENSION'] || '';
  CONFIG.VITE_DOA_POX = process.env[network+'_' + 'VITE_DOA_POX'] || '';
  
}

export function getDaoConfig() {
	return CONFIG;
}
