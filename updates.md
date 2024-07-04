# Setup Data

## Set Current Proposal

```
db.daoMongoConfig.findAndModify({
    query: {configId: 1}, 
    sort: {name: 1}, 
    update: {$set: {
        linkName: "Next SIP is sBTC", 
        linkAddress:"https://github.com/stacksgov/sips/blob/6d27e7cf706df5a367d8714e6037226d741630de/sips/sip-021/sip-021-nakamoto.md"}}, 
    upsert: false, 
    new: true, 
    fields: {tokenId: 1, name: 1}})
```

## Insert new tentative proposal

```
db.tentativeProposalCollection.insert( { 'tag' : 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.proposal-sbtc','expectedStart': 600,'expectedEnd': 650,'proposalMeta': {'dao': 'bitcoin-dao','title': 'SIP: sBTC Bootstrap','author': '@andrerserrano','synopsis': 'A Decentralized Two-Way Bitcoin Peg','description': 'sBTC is a novel digital asset that lets you move Bitcoin in and out of the Stacks blockchain. With sBTC, users can interact with Clarity smart contracts, which enable Bitcoin applications such as payments, decentralized lending, decentralized exchanges, and BTC-backed stablecoins.'}, votingContract: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.bde001-proposal-voting', submissionData: {contractId: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.bde002-proposal-submission'}})

db.tentativeProposalCollection.insert( { 'tag' : 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.proposal-block-header','expectedStart': 600,'expectedEnd': 650,'proposalMeta': {'dao': 'bitcoin-dao','title': 'Sip 02x non sequential multisig transactions','author': 'Brice, Friedger','synopsis': 'sip for block height changes','description': 'While implementing Stacks multisig in the Ledger app (Zondax/ledger-stacks#152), I found the current multisig format confusing and hard to work with. Other developers that have tried to work with multisig seem feel the same way (example: PR #139), and as far as I know there is currently no Stacks wallet with full multisig support. So wrote up this SIP which makes slight modifications to SIP-005 to add a new multisig transaction type which is a bit simpler and allows participants to sign in any order.'}, votingContract: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.bde001-proposal-voting', submissionData: {contractId: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.bde002-proposal-submission'}})
```

## Read DAO Events

1. Read Base DAO Events

```
/read-events-base-dao/:daoContractId
```

where dao contract is

- SP3JP0N1ZXGASRJ0F7QAHWFPGTVK9T2XNXDB908Z.bitcoin-dao (nakamoto)
- SP3JP0N1ZXGASRJ0F7QAHWFPGTVK9T2XNXDB908Z.ecosystem-dao (2.1 upgrade)


