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
	VITE_DOAS: string;
	VITE_DOA_VOTING_CONTRACTS: string;
	VITE_DOA_SIP_VOTES: string;
	VITE_DOA_DEPLOYER: string;
	VITE_DOA_EMERGENCY_EXECUTE_EXTENSION: string;
	VITE_DOA_POX: string;
};

