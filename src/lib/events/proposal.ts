import { base58, hex } from "@scure/base";
import {
  contractPrincipalCV,
  serializeCV,
  stringAsciiCV,
} from "@stacks/transactions";
import { getConfig } from "../config";
import {
  FundingData,
  ProposalContract,
  ProposalData,
  ProposalMeta,
  ProposalStage,
  SubmissionData,
  VotingEventProposeProposal,
  VotingEventVoteOnProposal,
  callContractReadOnly,
} from "@mijoco/stx_helpers/dist/index";
import { getDaoConfig } from "../config_dao";
import {
  countVotes,
  fetchLatestProposal,
} from "./event_helper_voting_contract";
import { stackerVotes, votingContractEventCollection } from "../data/db_models";
import { getNet } from "@mijoco/stx_helpers/dist/index";
import { sha256 } from "@noble/hashes/sha256";
import { ripemd160 } from "@noble/hashes/ripemd160";
import * as btc from "@scure/btc-signer";
import { c32address } from "c32check";

export async function getSummary(proposalId: string): Promise<any> {
  const proposal = await fetchLatestProposal(proposalId);
  if (!proposal) return;

  console.log("getSummary: " + proposal.proposal);
  //const soloFor = countsVotesByFilter({proposalContractId, for: true, event: 'solo-vote', amount: {$sum:1} })
  //const soloFor = stackerVotes.aggregate([{proposalContractId, for: true, event: 'solo-vote', $group: {sum_val:{$sum:"$amount"}}}]).toArray()
  const summaryWithZeros = await stackerVotes
    .aggregate([
      { $match: { proposalContractId: proposalId } },
      {
        $group: {
          _id: { event: "$event", for: "$for" },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  // db.stackerVotes.aggregate([{$match: {proposalContractId: 'SP3JP0N1ZXGASRJ0F7QAHWFPGTVK9T2XNXDB908Z.edp015-sip-activation', amount: { $gt: 0 }}}, { $group: {_id:{"event":"$event", "for":"$for"}, "total": {$sum: "$amount" }, "totalNested": {$sum: "$amountNested" }, count: {$sum:1} } } ])
  // db.stackerVotes.aggregate([{$match: {proposalContractId: 'SP3JP0N1ZXGASRJ0F7QAHWFPGTVK9T2XNXDB908Z.bdp001-sip-021-nakamoto', amount: { $gt: 0 }}}, { $group: {_id:{"event":"$event", "for":"$for"}, "total": {$sum: "$amount" }, "totalNested": {$sum: "$amountNested" }, count: {$sum:1} } } ])
  const summary = await stackerVotes
    .aggregate([
      { $match: { proposalContractId: proposalId, amount: { $gt: 0 } } },
      {
        $group: {
          _id: { event: "$event", for: "$for" },
          total: { $sum: "$amount" },
          totalNested: { $sum: "$amountNested" },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();
  //const poolSummary = await stackerVotes.aggregate([ { $group: {_id:{"event":"pool-event", "for":"$for"}, "total": {$avg: "$stackerEvent.data.amountUstx" }, count: {$avg:1} } } ]).toArray();
  //[ { $group: {_id:{"event":"$event", "for":"$for"}, "total": {$sum: "$amount" }, count: {$sum:1} } } ]
  //const uniqueVoters = await stackerVotes.aggregate([ { $group: {_id:{"event":"$event", "for":"$for"}, "total": {$sum: "$amount" }, count: {$sum:1} } } ]).toArray();

  //const uv = await stackerVotes.aggregate([{$match: {amount: { $gt: 0 }}},{$group: {_id: {"voter": '$voter', "event":"$event"}, count: { $sum: 1 }}}]).toArray();
  const uv = await stackerVotes
    .aggregate([
      { $match: { proposalContractId: proposalId } },
      {
        $group: {
          _id: { voter: "$voter", event: "$event" },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  //console.log('getSummary: uv solo: ', uv.filter((o) => o._id.event === 'solo-vote'))
  //console.log('getSummary: uv pool: ', uv.filter((o) => o._id.event === 'pool-vote'))
  //const soloFor = stackerVotes.aggregate([{$group : { _id: "$proposalContractId", count: {$sum: 1}, total_amount: {$sum: "$amount" }}}]);
  return {
    proposalData: proposal.proposalData,
    summary,
    summaryWithZeros,
    uniquePoolVoters: uv.filter((o) => o._id.event === "pool-vote").length,
    uniqueSoloVoters: uv.filter((o) => o._id.event === "solo-vote").length,
  };
}

export async function getDaoVotingSummary(proposalId: string): Promise<any> {
  const proposal = await fetchLatestProposal(proposalId);
  if (!proposal) return;

  const summary = await votingContractEventCollection
    .aggregate([
      { $match: { proposal: proposalId } },
      {
        $group: {
          _id: { event: "$event", for: "$for" },
          total: { $sum: "$amount" },
          totalNested: { $sum: "$amountNested" },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  return {
    proposalData: proposal.proposalData,
    summary,
  };
}

export async function getProposalData(
  votingContract: string,
  principle: string
): Promise<ProposalData> {
  try {
    //console.log('==============================================================')
    const functionArgs = [
      `0x${hex.encode(
        serializeCV(
          contractPrincipalCV(principle.split(".")[0], principle.split(".")[1])
        )
      )}`,
    ];
    const data = {
      contractAddress: getDaoConfig().VITE_DOA_DEPLOYER,
      contractName: votingContract.split(".")[1],
      functionName: "get-proposal-data",
      functionArgs,
    };
    const result = await callContractReadOnly(getConfig().stacksApi, data);
    let start = 0;
    let end = 0;
    let startBlockHeight = 0;
    if (result.value.value["start-burn-height"]) {
      // post nakamoto
      start = Number(result.value.value["start-burn-height"].value);
      end = Number(result.value.value["end-burn-height"].value);
      startBlockHeight = Number(
        result.value.value["start-height-stacks"].value
      );
    } else {
      // pre nakamoto
      start = Number(result.value.value["start-block-height"].value);
      end = Number(result.value.value["end-block-height"].value);
      startBlockHeight = start; //await getStacksHeightFromBurnBlockHeight(getConfig().stacksApi, start)
    }
    //console.log('result.value.value[custom-majority].value: ' + result.value.value['custom-majority'].value.value)
    const pd = {
      concluded: Boolean(result.value.value.concluded.value),
      passed: Boolean(result.value.value.passed.value),
      proposer: result.value.value.proposer.value,
      customMajority: Number(result.value.value["custom-majority"].value.value),
      endBlockHeight: -1,
      startBlockHeight: startBlockHeight,
      votesAgainst: Number(result.value.value["votes-against"].value),
      votesFor: Number(result.value.value["votes-for"].value),
      burnStartHeight: start,
      burnEndHeight: end,
    };
    //console.log('==============================================================')
    return pd;
  } catch (err: any) {
    console.log("getProposalFromContractId: proposalData1: " + err.message);
    console.log(
      "=== error ==================================================="
    );
    return {} as ProposalData;
  }
}

export function getMetaData(source: string) {
  // const preamble:Array<string> = [];
  if (!source) return {} as ProposalMeta;
  let lines = source.split("\n");
  lines = lines?.filter((l) => l.startsWith(";;")) || [];
  const proposalMeta = {
    dao: "",
    title: "",
    author: "",
    synopsis: "",
    description: "",
  };
  lines.forEach((l) => {
    if (l === ";;" || l === ";; ") l = "<br/><br/>";
    l = l.replace(/;;/g, "");
    if (l.indexOf("DAO:") > -1) proposalMeta.dao = l.split("DAO:")[1];
    else if (l.indexOf("Title:") > -1)
      proposalMeta.title = l.split("Title:")[1];
    else if (l.indexOf("Title:") > -1)
      proposalMeta.title = l.split("Title:")[1];
    else if (l.indexOf("Author:") > -1)
      proposalMeta.author = l.split("Author:")[1];
    //else if (l.indexOf('Synopsis:') > -1) proposalMeta.synopsis = l.split('Synopsis:')[1];
    else if (l.indexOf("Description:") > -1)
      proposalMeta.description = l.split("Description:")[1];
    else {
      proposalMeta.description += " " + l;
    }
  });
  let alt = source.split("Synopsis:")[1] || "";
  let alt1 = alt.split("Description:")[0];
  proposalMeta.synopsis = alt1.replace(/;;/g, "");
  if (source.indexOf("Author(s):") > -1) {
    alt = source.split("Author(s):")[1] || "";
    alt1 = alt.split("Synopsis:")[0];
    proposalMeta.author = alt1.replace(/;;/g, "");
  }
  proposalMeta.description = proposalMeta.description.replace(
    "The upgrade is designed",
    "<br/><br/>The upgrade is designed"
  );
  proposalMeta.description = proposalMeta.description.replace(
    "Should this upgrade pass",
    "<br/><br/>Should this upgrade pass"
  );
  return proposalMeta;
}

export async function getProposalContractSource(
  principle: string
): Promise<ProposalContract> {
  try {
    const url =
      getConfig().stacksApi +
      "/v2/contracts/source/" +
      principle.split(".")[0] +
      "/" +
      principle.split(".")[1] +
      "?proof=0";
    const response = await fetch(url);
    const val = await response.json();
    return val;
  } catch (err: any) {
    console.log("getProposalFromContractId: proposalData1: " + err.message);
    return {} as ProposalContract;
  }
}

export async function getFunding(
  extensionCid: string,
  proposalCid: string
): Promise<FundingData> {
  const functionArgs = [
    `0x${hex.encode(
      serializeCV(
        contractPrincipalCV(
          proposalCid.split(".")[0],
          proposalCid.split(".")[1]
        )
      )
    )}`,
  ];
  const data = {
    contractAddress: extensionCid.split(".")[0],
    contractName: extensionCid.split(".")[1],
    functionName: "get-proposal-funding",
    functionArgs,
  };
  let funding: string;
  try {
    funding = (await callContractReadOnly(getConfig().stacksApi, data)).value;
  } catch (e) {
    funding = "0";
  }
  return {
    funding: Number(funding),
    parameters: await getFundingParams(extensionCid),
  };
}

export async function getFundingParams(extensionCid: string): Promise<any> {
  const functionArgs = [
    `0x${hex.encode(serializeCV(stringAsciiCV("funding-cost")))}`,
  ];
  const data = {
    contractAddress: extensionCid.split(".")[0],
    contractName: extensionCid.split(".")[1],
    functionName: "get-parameter",
    functionArgs,
  };
  const param1 =
    extensionCid.split(".")[1] === "ede008-flexible-funded-submission"
      ? "minimum-proposal-start-delay"
      : "proposal-start-delay";
  const param2 =
    extensionCid.split(".")[1] === "ede008-flexible-funded-submission"
      ? "minimum-proposal-duration"
      : "proposal-duration";
  //console.log('Running: getFundingParams: ', data);
  const fundingCost = (await callContractReadOnly(getConfig().stacksApi, data))
    .value.value;
  data.functionArgs = [`0x${hex.encode(serializeCV(stringAsciiCV(param1)))}`];
  const proposalStartDelay = (
    await callContractReadOnly(getConfig().stacksApi, data)
  ).value.value;
  data.functionArgs = [`0x${hex.encode(serializeCV(stringAsciiCV(param2)))}`];
  const proposalDuration = (
    await callContractReadOnly(getConfig().stacksApi, data)
  ).value.value;
  return {
    fundingCost: Number(fundingCost),
    proposalDuration: Number(proposalDuration),
    proposalStartDelay: Number(proposalStartDelay),
  };
}

export async function generateAddresses(proposalId: string) {
  console.log("generateAddresses: " + proposalId);

  let encoder = new TextEncoder();
  let encoded = encoder.encode(`Yes to ${proposalId}`);
  let hash256 = sha256(encoded);
  const hash160Y = ripemd160(hash256);

  encoder = new TextEncoder();
  encoded = encoder.encode(`No to ${proposalId}`);
  hash256 = sha256(encoded);
  const hash160N = ripemd160(hash256);

  const net = getNet(getConfig().network);

  const p2shObjY = btc.p2sh(
    {
      type: "sh",
      script: btc.Script.encode([
        "DUP",
        "HASH160",
        hash160Y,
        "EQUALVERIFY",
        "CHECKSIG",
      ]),
    },
    net
  );
  const p2shObjN = btc.p2sh(
    {
      type: "sh",
      script: btc.Script.encode([
        "DUP",
        "HASH160",
        hash160N,
        "EQUALVERIFY",
        "CHECKSIG",
      ]),
    },
    net
  );

  console.log(p2shObjY.address);
  console.log(p2shObjN.address);

  const netPrefix = getConfig().network === "testnet" ? 26 : 22;
  const yStxAddress = c32address(netPrefix, hex.encode(hash160Y));
  const nStxAddress = c32address(netPrefix, hex.encode(hash160N));

  const votingAddresses = {
    yBtcAddress: p2shObjY.address as string,
    nBtcAddress: p2shObjN.address as string,
    yStxAddress,
    nStxAddress,
  };
  console.log("generateAddresses: ", votingAddresses);
  return votingAddresses;
}

export function encodeMessageToUint8Array(message: string): Uint8Array {
  const input = Array.from(message).map((char) => char.charCodeAt(0));

  const paddedArray = new Uint8Array(20);
  paddedArray.set(input, 20 - input.length);

  return paddedArray;
}

export function encodeMessageWithZeroPadding(message: string): string {
  return message
    .split("")
    .map((char) => char.charCodeAt(0))
    .map((code) => code.toString(2).padStart(8, "0"))
    .join("");
}

export function getPubKeyHash(hexEncodedMessage: string) {
  return `OP_DUP OP_HASH160 ${hexEncodedMessage} OP_EQUALVERIFY OP_CHECKSIG`;
}

function generateBitcoinAddress(
  script: Uint8Array,
  versionByte = 0x00
): string {
  const paddedScript = padOrTrim(script, 20);

  // Step 2: Add version byte to the front
  const addressWithVersion = new Uint8Array([versionByte, ...paddedScript]);

  // Step 3: Calculate checksum (first 4 bytes of SHA-256 on the address with version)
  const checksum = sha256(sha256(addressWithVersion)).slice(0, 4);

  // Step 4: Concatenate the versioned address and checksum, then encode in Base58
  const fullAddress = new Uint8Array([...addressWithVersion, ...checksum]);
  return base58.encode(Buffer.from(fullAddress));
}

function padOrTrim(array: Uint8Array, targetLength: number): Uint8Array {
  if (array.length > targetLength) {
    return array.slice(0, targetLength); // Trim if too long
  } else if (array.length < targetLength) {
    const padded = new Uint8Array(targetLength);
    padded.set(array, targetLength - array.length); // Right-align the padding
    return padded;
  }
  return array;
}

export function generateBitcoinAddressV2(msg: string) {
  const encodedMessage = encodeMessageToUint8Array(msg);
  console.log(hex.encode(encodedMessage));
  return generateBitcoinAddress(encodedMessage, 0x00);
}

export function generateStacksAddressV2(msg: string) {
  const netPrefix = getConfig().network === "testnet" ? 26 : 22;
  const encodedMessage = encodeMessageToUint8Array(msg);
  return c32address(netPrefix, hex.encode(encodedMessage));
}

export function generateAddressesV2(sip: string) {
  const msgYes = "yes-" + sip;
  const msgNo = "no-" + sip;
  const votingAddresses = {
    msgYes,
    msgNo,
    yBtcAddress: generateBitcoinAddressV2(msgYes),
    nBtcAddress: generateBitcoinAddressV2(msgNo),
    yStxAddress: generateStacksAddressV2(msgYes),
    nStxAddress: generateStacksAddressV2(msgNo),
  };
  console.log("generateAddresses: ", votingAddresses);
  return votingAddresses;
}
