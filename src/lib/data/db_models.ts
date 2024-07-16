import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import type { Collection } from 'mongodb';
import { getConfig, isDev } from '../config';
import { ProposalEvent, TentativeProposal } from '@mijoco/stx_helpers/dist/index';
import { getDaoConfig } from '../config_dao';

export let exchangeRatesCollection:Collection;
let proposals:Collection;
export let votingContractEventCollection:Collection;
export let daoEventCollection:Collection;
let tentativeProposalCollection:Collection;
export let stackerVotes:Collection;
export let delegationEvents:Collection; 
export let rewardSlotHolders:Collection;
export let poxAddressInfo:Collection;
//export let daoMongoConfig:Collection;
export let poolStackerEventsCollection:Collection;
export let pox4EventsCollection:Collection;
export let pox4RewardSlotHolders:Collection;
export let pox4AddressInfoCollection:Collection;
export let pox4BitcoinStacksTxCollection:Collection;

export async function connect() {
	let uriPrefix:string = 'mongodb+srv'
	if (isDev()) {
	  // SRV URIs have the additional security requirements on hostnames.
	  // A FQDN is not required for development.
	  uriPrefix = 'mongodb'
	}
	const uri = `${uriPrefix}://${getConfig().mongoUser}:${getConfig().mongoPwd}@${getConfig().mongoDbUrl}/?retryWrites=true&w=majority`;
	// console.log("Mongo: " + uri);

	// The MongoClient is the object that references the connection to our
	// datastore (Atlas, for example)
	const client = new MongoClient(uri, {
		serverApi: {
		  version: ServerApiVersion.v1,
		  strict: true,
		  deprecationErrors: true,
		}
	});
	
	// The connect() method does not attempt a connection; instead it instructs
	// the driver to connect using the settings provided when a connection
	// is required.
    //console.log("Pinging");
	await client.connect();
	await client.db("admin").command({ ping: 1 });
	
	// Create references to the database and collection in order to run
	// operations on them.
	const database = client.db(getConfig().mongoDbName);
	exchangeRatesCollection = database.collection('exchangeRatesCollection');
	await exchangeRatesCollection.createIndex({currency: 1}, { unique: true })
	
	//proposals = database.collection('proposals');
	//await proposals.createIndex({contractId: 1}, { unique: true })
	
	tentativeProposalCollection = database.collection('tentativeProposalCollection');
	await tentativeProposalCollection.createIndex({contractId: 1}, { unique: true })
	
	daoEventCollection = database.collection('daoEventCollection');
	await daoEventCollection.createIndex({daoContract: 1, event_index: 1, txId: 1}, { unique: true })
	
	votingContractEventCollection = database.collection('votingContractEventCollection');
	await votingContractEventCollection.createIndex({votingContract: 1, event_index: 1, txId: 1}, { unique: true })
	
	stackerVotes = database.collection('stackerVotes');
	await stackerVotes.createIndex({submitTxId: 1}, { unique: true })
	await stackerVotes.createIndex({proposalContractId: 1, voter: 1}, { unique: true })
	
	//daoMongoConfig = database.collection('daoMongoConfig');
	//await daoMongoConfig.createIndex({configId: 1}, { unique: true })
	
	rewardSlotHolders = database.collection('rewardSlotHolders');
	await rewardSlotHolders.createIndex({address: 1, slot_index: 1, burn_block_height: 1}, { unique: true })
	poxAddressInfo = database.collection('poxAddressInfo');
	//await poxAddressInfo.createIndex({hashBytes: 1, version: 1, totalUstx: 1, cycle: 1, stacker: 1}, { unique: true })
	delegationEvents = database.collection('delegationEvents');
	poolStackerEventsCollection = database.collection('poolStackerEventsCollection');

	//pox4EventsCollection = database.collection('pox4EventsCollection');
	//await pox4EventsCollection.createIndex({eventIndex: 1, event: 1}, { unique: true })

	//pox4RewardSlotHolders = database.collection('pox4RewardSlotHolders');
	//await pox4RewardSlotHolders.createIndex({txId: 1}, { unique: true })

	//pox4AddressInfoCollection = database.collection('pox4AddressInfoCollection');
	//pox4BitcoinStacksTxCollection = database.collection('pox4BitcoinStacksTxCollection');
	//await pox4BitcoinStacksTxCollection.createIndex({txId: 1}, { unique: true })

	//const rates = await getExchangeRates(); // test connections
	//console.log(rates)
}



export function stripNonSipResults(response:Array<any>) {
	for (const cId of getDaoConfig().VITE_DOA_SIP_VOTES.split(',')) {
		const index = response.findIndex((o:any) => o.tag === cId.trim());
		if (index > -1) {
			response.splice(index, 1);
		}
	}
	return response;
}


// Compile model from schema
export async function saveOrUpdateTentativeProposal(tp:TentativeProposal) {
	try {
		const pdb = await findTentativeProposalByContractId(tp.tag)
		if (pdb) {
			await updateTentativeProposal(pdb, tp)
		} else {
			console.log('saveOrUpdateTentativeProposal: saving: ', tp);
			await saveTentativeProposal(tp)
		}
	} catch (err:any) {
		console.log('saveOrUpdateTentativeProposal: error', err)
	}
}
export async function saveTentativeProposal(proposal:any) {
	const result = await tentativeProposalCollection.insertOne(proposal);
	return result;
}

export async function updateTentativeProposal(proposal:any, changes: any) {
	const result = await tentativeProposalCollection.updateOne({
		_id: proposal._id
	},
    { $set: changes});
	return result;
}

export async function fetchTentativeProposals():Promise<any> {
	const result = await tentativeProposalCollection.find({}).toArray();
	return result;
}
export async function fetchTentativeProposalsActive():Promise<any> {
	const result = await tentativeProposalCollection.find({visible: true}).toArray();
	return result;
}
export async function deleteTentativeProposal(tp:TentativeProposal):Promise<any> {
	const result = await tentativeProposalCollection.deleteOne({tag: tp.tag});
	return result;
}
export async function findTentativeProposalByContractId(contractId:string):Promise<any> {
	const result = await tentativeProposalCollection.findOne({"tag":contractId});
	return result;
}

export async function saveOrUpdateProposal(p:ProposalEvent) {
	try {
		const pdb = await findProposalByContractId(p.contractId)
		if (pdb) {
			await updateProposal(pdb, p)
		} else {
			console.log('saveOrUpdateProposal: saving: ', p);
			await saveProposal(p)
		}
	} catch (err:any) {
		console.log('saveOrUpdateProposal: error', err)
	}
}

export async function saveProposal(proposal:any) {
	const result = await proposals.insertOne(proposal);
	return result;
}

export async function updateProposal(proposal:any, changes: any) {
	const result = await proposals.updateOne({
		_id: proposal._id
	},
    { $set: changes});
	return result;
}

export async function findProposalByContractId(contractId:string):Promise<any> {
	const result = await proposals.findOne({"contractId":contractId});
	return result;
}

export async function findProposalByContractIdConcluded(contractId:string):Promise<any> {
	const result = await proposals.findOne({"contractId":contractId});
	return result;
}


