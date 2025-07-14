# Setup Data

## Set Current Proposal

Nakamoto onwards voting addresses - note these are generic yes/no addresses and can
be reused for different ;

## sip031-five-year-stacks-growth-plan

db.votingContractEventCollection.findAndModify({query: {proposal: 'SP3JP0N1ZXGASRJ0F7QAHWFPGTVK9T2XNXDB908Z.sip031-five-year-stacks-growth-plan', event:'propose'}, sort: {name: 1}, update: {$set: {stackerData: { sip: true, nodao: true, heights:{burnStart:902677, burnEnd:905449, stacksStart:1850321, stacksEnd:2175436 }, stacksAddressYes: 'SP00000000001WPAWSDEDMQ0B9K6781ESE6',stacksAddressNo: 'SP000000000006WVSDEDMQ0B9K673FGT7V',bitcoinAddressYes: '11111111111mdWK2VXcrA1ebnetG5Y',bitcoinAddressNo: '111111111111ACW5wa4RwyeogEk2ay' },links: [{name: 'SIP-031: Five-Year Stacks Growth Emissions', href: 'https://github.com/stacksgov/sips/blob/52da2c4c92f5f325f5c82e6a54c7d2adbf576e52/sips/sip-031/sip-031.md',display: 'sip031-stacks-growth-emissions', target: '_blank',} ]}}, upsert: false, new: true, fields: {proposal: 1, event: 1}})

## sip029-stx-halving-schedule-alignment

db.votingContractEventCollection.findAndModify({query: {proposal: 'SP3JP0N1ZXGASRJ0F7QAHWFPGTVK9T2XNXDB908Z.sip029-preserving-economic-incentives', event:'conclude'}, sort: {name: 1}, update: {$set: {stackerData: { sip: true, nodao: true, heights:{burnStart:870750, burnEnd:872750, stacksStart:232570, stacksEnd:0 }, stacksAddressYes: 'SP00000000001WPAWSDEDMQ0B9J76GZNR3T',stacksAddressNo: 'SP000000000006WVSDEDMQ0B9J76NCZPNZ',bitcoinAddressYes: '11111111111mdWK2VXcrA1e7in77Ux',bitcoinAddressNo: '111111111111ACW5wa4RwyeKgtEJz3' },links: [{name: 'Preserving Economic Incentives During Stacks Network Upgrades', href: 'https://github.com/stacksgov/sips/blob/38e687411804a8a527e4628e3ecbb6d18f423b5d/sips/sip-029/sip-029-halving-alignment.md',display: 'Preserving Economic Incentives During Stacks Network Upgrades', target: '_blank',} ]}}, upsert: false, new: true, fields: {proposal: 1, event: 1}})

db.votingContractEventCollection.findAndModify({query: {proposal: 'SP3JP0N1ZXGASRJ0F7QAHWFPGTVK9T2XNXDB908Z.sip029-stx-halving-schedule-alignment', event:'propose'}, sort: {name: 1}, update: {$set: {stackerData: { sip: false, nodao: true, removed: true, heights:{burnStart:870750, burnEnd:872750, stacksStart:232570, stacksEnd:0 }, stacksAddressYes: 'SP00000000001WPAWSDEDMQ0B9J76GZNR3T',stacksAddressNo: 'SP000000000006WVSDEDMQ0B9J76NCZPNZ',bitcoinAddressYes: '11111111111mdWK2VXcrA1e7in77Ux',bitcoinAddressNo: '111111111111ACW5wa4RwyeKgtEJz3' },links: [{name: 'Preserving Economic Incentives During Stacks Network Upgrades', href: 'https://github.com/stacksgov/sips/blob/38e687411804a8a527e4628e3ecbb6d18f423b5d/sips/sip-029/sip-029-halving-alignment.md',display: 'Preserving Economic Incentives During Stacks Network Upgrades', target: '_blank',} ]}}, upsert: false, new: true, fields: {proposal: 1, event: 1}})

---

db.votingContractEventCollection.findAndModify({query: {proposal: 'SP3JP0N1ZXGASRJ0F7QAHWFPGTVK9T2XNXDB908Z.sip028-signer-criteria-for-sbtc', event:'conclude'}, sort: {name: 1}, update: {$set: {stackerData: { sip: true, nodao: true, heights:{burnStart:868000, burnEnd:869749, stacksStart:175166, stacksEnd:0 }, stacksAddressYes: 'SP00000000001WPAWSDEDMQ0B9J72P0KAK2',stacksAddressNo: 'SP000000000006WVSDEDMQ0B9J73E2TN78',bitcoinAddressYes: '11111111111mdWK2VXcrA1e7dnvidC',bitcoinAddressNo: '111111111111ACW5wa4RwyeKYEAzMD' },links: [{name: 'Signer Criteria for sBTC', href: 'https://github.com/stacksgov/sips/blob/919514d64a8605b50bab992e7350df770dde2bb7/sips/sip-028/sip-028-sbtc_peg.md',display: 'sip028-sbtc-signer-criteria', target: '_blank',} ]}}, upsert: false, new: true, fields: {proposal: 1, event: 1}})

## sip-027-multisig-transactions

db.votingContractEventCollection.findAndModify({query: {proposal: 'SP3JP0N1ZXGASRJ0F7QAHWFPGTVK9T2XNXDB908Z.sip-027-multisig-transactions', event:'conclude'}, sort: {name: 1}, update: {$set: {stackerData: { sip: false, stacksAddressYes: 'SPA17ZSXKXS4D8FC51H1KWQDFS31NM29SKZRTCF8',stacksAddressNo: 'SP39DK8BWFM2SA0E3F6NA72104EYG9XB8NXZ91NBE',bitcoinAddressYes: '399iMhKN9fjpPJLYHzieZA1PfHsFxijyVY',bitcoinAddressNo: '31ssu69FmpxS6bAxjNrX1DfApD8RekK7kp' },links: [{name: 'Nakamoto SIP', href: 'https://github.com/stacksgov/sips/blob/174504cc5132473d0f74910ef7f8ba2c17af8068/sips/sip-027/sip-027-non-sequential-multisig-transactions.md',display: 'sip-multisig-transactions', target: '_blank',} ]}}, upsert: false, new: true, fields: {proposal: 1, event: 1}})

## sip-026-sbtc-v1

db.votingContractEventCollection.findAndModify({query: {proposal: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sip028-signer-criteria-for-sbtc', event:'propose'}, sort: {name: 1}, update: {$set: {stackerData: { sip: true, nodao: true, stacksAddressYes: 'SP36GHEPEZPGD53G2F29P5NEY884DXQR7TX90QE3T',stacksAddressNo: 'SP3YAKFMGWSSATYNCKXKJHE2Z5JJ6DH88E4T8XJPK',bitcoinAddressYes: '3Jq9UT81fnT2t24XjNVY7wijpsSmNSivbK',bitcoinAddressNo: '3QGZ1fDa97yZCXpAnXQd6JHF4CBC6bk1r4' },links: [{name: 'Signer Criteria for sBTC', href: 'https://github.com/stacksgov/sips/blob/919514d64a8605b50bab992e7350df770dde2bb7/sips/sip-028/sip-028-sbtc_peg.md',display: 'sip028-sbtc-signer-criteria', target: '_blank',} ]}}, upsert: false, new: true, fields: {proposal: 1, event: 1}})

## bdp-dao-config-test

db.votingContractEventCollection.findAndModify({query: {proposal: 'SP3JP0N1ZXGASRJ0F7QAHWFPGTVK9T2XNXDB908Z.bdp-dao-config-test', event:'conclude'}, sort: {name: 1}, update: {$set: {stackerData: { sip: false, stacksAddressYes: 'SPB59DGGB5K7PRG36P4WC5FR853BAG4GSMK0F5XS',stacksAddressNo: 'SP3Z77Z29VFKBP6KFSH81NNG8H0S6GC4432JPA25V',bitcoinAddressYes: '342Pj51KkZRka7ant3YNQ5FthnA5AyXfeg',bitcoinAddressNo: '32WinV2fuzeLzqywhHEHVttC6b7ZMX34Aj' },links: [{name: 'Nakamoto SIP', href: 'https://github.com/stacksgov/sips/blob/6d27e7cf706df5a367d8714e6037226d741630de/sips/sip-021/sip-021-nakamoto.md',display: 'sip-021-nakamoto', target: '_blank',} ]}}, upsert: false, new: true, fields: {proposal: 1, event: 1}})

## bdp001-sip-021-nakamoto

db.votingContractEventCollection.findAndModify({query: {proposal: 'SP3JP0N1ZXGASRJ0F7QAHWFPGTVK9T2XNXDB908Z.bdp001-sip-021-nakamoto',event:'conclude'}, sort: {name: 1}, update: {$set: {stackerData: { stacksAddressYes:'SP00000000000003SCNSJTCSE62ZF4MSE', stacksAddressNo:'SP00000000000000DSQJTCSE63RMXHDP', bitcoinAddressYes:'11111111111111X6zHB1bPW6NJxw6', bitcoinAddressNo:'1111111111111117Crbcbt8W5dSU7', sip:true, heights:{burnStart:829850, burnEnd:834049, stacksStart:138938, stacksEnd:142300 },reportedResults: {soloFor: 159087747,soloAgainst: 0,poolFor: 16524829,poolAgainst: 0,soloAddresses: 28,poolAddresses: 370 }},links: [{name: 'Nakamoto SIP', href: 'https://github.com/stacksgov/sips/blob/6d27e7cf706df5a367d8714e6037226d741630de/sips/sip-021/sip-021-nakamoto.md',display: 'sip-021-nakamoto', target: '_blank',} ]}}, upsert: false, new: true, fields: {proposal: 1, event: 1}})

, votingStart:829850, votingEnd:833950, customMajority:80, passed:true,votesAgainst:0,votesFor:0,

## edp015-sip-activation

db.votingContractEventCollection.findAndModify({ query: {proposal: 'SP3JP0N1ZXGASRJ0F7QAHWFPGTVK9T2XNXDB908Z.edp015-sip-activation', event:'conclude'}, sort: {name: 1}, update: {$set: { stackerData: { stacksAddressYes:'SP00000000000003SCNSJTCHE66N2PXHX',stacksAddressNo:'SP00000000000000DSQJTCHE66XE1NHQ',bitcoinAddressYes:'11111111111111X6zHB1ZC2FmtnqJ',bitcoinAddressNo:'1111111111111117CrbcZgemVNFx8', sip:true, heights:{burnStart:762650, burnEnd:764749, stacksStart:82991, stacksEnd:84797 }},links: [ { name: 'Stacks Upgrade of Proof-of-Transfer and Clarity', href: 'https://github.com/stacksgov/sips/blob/main/sips/sip-015/sip-015-network-upgrade.md', display: 'sip-015-network-upgrade', target: '_blank', }]}}, upsert: false, new: true, fields: {proposal: 1, event: 1}})

## update stacker events for pox contract awareness

```mongo
db.poolStackerEventsCollection.updateMany( {}, {$set: { poxContractName: 'pox-3' } } );
```

for testing..

```mongo
db.votingContractEventCollection.findAndModify({query: {proposal: 'SP3JP0N1ZXGASRJ0F7QAHWFPGTVK9T2XNXDB908Z.bdp001-sip-021-nakamoto',event:'conclude'}, sort: {name: 1}, update: {$set: {stackerData: { stacksAddressYes:'SP00000000000003SCNSJTCSE62ZF4MSE', stacksAddressNo:'SP00000000000000DSQJTCSE63RMXHDP', bitcoinAddressYes:'11111111111111X6zHB1bPW6NJxw6', bitcoinAddressNo:'1111111111111117Crbcbt8W5dSU7', sip: true, heights:{burnStart:829750, burnEnd:833950, stacksStart:833950, stacksEnd:833950}, reportedResults: {soloFor:159087747, soloAgainst:0, poolFor: 16524829, poolAgainst:0, soloAddresses: 28, poolAddresses: 370} }, links: [{name: 'Nakamoto SIP', href: 'https://github.com/stacksgov/sips/blob/6d27e7cf706df5a367d8714e6037226d741630de/sips/sip-021/sip-021-nakamoto.md',display: 'sip-021-nakamoto', target: '_blank',} ]}}, upsert: false, new: true, fields: {proposal: 1, event: 1}})
```

## Insert new tentative proposal

```
db.tentativeProposalCollection.insert( { visible: false, 'tag' : 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.proposal-sbtc','expectedStart': 600,'expectedEnd': 650,'proposalMeta': {'dao': 'bitcoin-dao','title': 'SIP: sBTC Bootstrap','author': '@andrerserrano','synopsis': 'A Decentralized Two-Way Bitcoin Peg','description': 'sBTC is a novel digital asset that lets you move Bitcoin in and out of the Stacks blockchain. With sBTC, users can interact with Clarity smart contracts, which enable Bitcoin applications such as payments, decentralized lending, decentralized exchanges, and BTC-backed stablecoins.'}, votingContract: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.bde001-proposal-voting', submissionData: {contractId: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.bde002-proposal-submission'}})

db.tentativeProposalCollection.insert( { visible: true, 'tag' : 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.bdp-multisig','expectedStart': 600,'expectedEnd': 650,'proposalMeta': {'dao': 'bitcoin-dao','title': 'Sip 02x non sequential multisig transactions','author': 'Brice, Friedger','synopsis': 'sip for block height changes','description': 'While implementing Stacks multisig in the Ledger app (Zondax/ledger-stacks#152), I found the current multisig format confusing and hard to work with. Other developers that have tried to work with multisig seem feel the same way (example: PR #139), and as far as I know there is currently no Stacks wallet with full multisig support. So wrote up this SIP which makes slight modifications to SIP-005 to add a new multisig transaction type which is a bit simpler and allows participants to sign in any order.'}, votingContract: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.bde001-proposal-voting', submissionData: {contractId: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.bde002-proposal-submission'}})
```

## Read DAO Events

1. Read Base DAO Events

```rest
/read-events-base-dao/:daoContractId
```

where dao contract is

- SP3JP0N1ZXGASRJ0F7QAHWFPGTVK9T2XNXDB908Z.bitcoin-dao (nakamoto)
- SP3JP0N1ZXGASRJ0F7QAHWFPGTVK9T2XNXDB908Z.ecosystem-dao (2.1 upgrade)

db.stackerVotes.aggregate([{$match: {proposalContractId: "SP3JP0N1ZXGASRJ0F7QAHWFPGTVK9T2XNXDB908Z.sip031-five-year-stacks-growth-plan"}},{$group: {_id: "$voter",count: { $sum: 1 }}},{$match: {count: { $gt: 1 }}},{$sort: { count: -1 }}]);
