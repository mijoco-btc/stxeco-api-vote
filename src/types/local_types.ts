export type ConfigI = {
	mongoDbUrl: string; 
	mongoUser: string; 
	mongoPwd: string; 
	mongoDbName: string; 
	btcNode: string; 
	btcRpcUser: string; 
	btcRpcPwd: string; 
	host: string; 
	port: number; 
	walletPath: string; 
	network: string; 
	stacksApi: string; 
    stacksExplorerUrl: string;
	bitcoinExplorerUrl: string; 
	mempoolUrl: string;
	electrumUrl: string,
	blockCypherUrl: string;
	publicAppName: string;
	publicAppVersion: string; 
	sbtcContractId?: string;
	poxContractId?: string;
	pox4ContractId?: string;
	signerVotingContractId?: string;
	signersContractId?: string;
};

export type ConfigDaoI = {
	VITE_DOA: string;
	VITE_DOA_DEPLOYER: string;
	VITE_DOA_PROPOSAL: string;
	VITE_DOA_PROPOSALS: string;
	VITE_DOA_SNAPSHOT_VOTING_EXTENSION: string;
	VITE_DOA_PROPOSAL_VOTING_EXTENSION: string;
	VITE_DOA_FUNDED_SUBMISSION_EXTENSION: string;
	VITE_DOA_EMERGENCY_EXECUTE_EXTENSION: string;
	VITE_DOA_POX: string;
};

