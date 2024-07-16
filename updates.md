# Setup Data

## Set Current Proposal

Nakamoto onwards voting addresses - note these are generic yes/no addresses and can
be reused for different ;

```mongo
db.votingContractEventCollection.findAndModify({query: {proposal: 'SP3JP0N1ZXGASRJ0F7QAHWFPGTVK9T2XNXDB908Z.bdp001-sip-021-nakamoto',event:'conclude'}, sort: {name: 1}, update: {$set: {stackerData: { stacksAddressYes:'SP00000000000003SCNSJTCSE62ZF4MSE', stacksAddressNo:'SP00000000000000DSQJTCSE63RMXHDP', bitcoinAddressYes:'11111111111111X6zHB1bPW6NJxw6', bitcoinAddressNo:'1111111111111117Crbcbt8W5dSU7', votingStart:829850, votingEnd:833950, customMajority:80, passed:true,votesAgainst:0,votesFor:0,},links: [{name: 'Nakamoto SIP', href: 'https://github.com/stacksgov/sips/blob/6d27e7cf706df5a367d8714e6037226d741630de/sips/sip-021/sip-021-nakamoto.md',display: 'sip-021-nakamoto', target: '_blank',} ]}}, upsert: false, new: true, fields: {proposal: 1, event: 1}})

 db.votingContractEventCollection.findAndModify({query: {proposal: 'SP3JP0N1ZXGASRJ0F7QAHWFPGTVK9T2XNXDB908Z.bdp-dao-config-test'}, sort: {name: 1}, update: {$set: {stackerData: { sip: false, stacksAddressYes: 'SPB59DGGB5K7PRG36P4WC5FR853BAG4GSMK0F5XS',stacksAddressNo: 'SP3Z77Z29VFKBP6KFSH81NNG8H0S6GC4432JPA25V',bitcoinAddressYes: '342Pj51KkZRka7ant3YNQ5FthnA5AyXfeg',bitcoinAddressNo: '32WinV2fuzeLzqywhHEHVttC6b7ZMX34Aj' },links: [{name: 'Nakamoto SIP', href: 'https://github.com/stacksgov/sips/blob/6d27e7cf706df5a367d8714e6037226d741630de/sips/sip-021/sip-021-nakamoto.md',display: 'sip-021-nakamoto', target: '_blank',} ]}}, upsert: false, new: true, fields: {proposal: 1, event: 1}})

// tentative - visibility
 db.tentativeProposalCollection.findAndModify({query: {tag: 'SP3JP0N1ZXGASRJ0F7QAHWFPGTVK9T2XNXDB908Z.bdp-multisig-transactions'}, sort: {name: 1}, update: {$set: {visible: false}}, upsert: false, new: true, fields: {tag: 1, visible: 1}})
```

SIP 2.1 voting addresses

```mongo
db.votingContractEventCollection.findAndModify({ query: {proposal: 'SP3JP0N1ZXGASRJ0F7QAHWFPGTVK9T2XNXDB908Z.edp015-sip-activation', event:'propose'},  sort: {name: 1}, update: {$set: { stackerData: { stacksAddressYes:'SP00000000000003SCNSJTCHE66N2PXHX',stacksAddressNo:'SP00000000000000DSQJTCHE66XE1NHQ',bitcoinAddressYes:'11111111111111X6zHB1ZC2FmtnqJ',bitcoinAddressNo:'1111111111111117CrbcZgemVNFx8', sip:true },links: [ { name: 'Stacks Upgrade of Proof-of-Transfer and Clarity',  href: 'https://github.com/stacksgov/sips/blob/main/sips/sip-015/sip-015-network-upgrade.md', display: 'sip-015-network-upgrade',  target: '_blank', }]}}, upsert: false, new: true, fields: {proposal: 1, event: 1}})
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

```
/read-events-base-dao/:daoContractId
```

where dao contract is

- SP3JP0N1ZXGASRJ0F7QAHWFPGTVK9T2XNXDB908Z.bitcoin-dao (nakamoto)
- SP3JP0N1ZXGASRJ0F7QAHWFPGTVK9T2XNXDB908Z.ecosystem-dao (2.1 upgrade)


