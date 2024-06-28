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
db.tentativeProposalCollection.insert( { 'tag' : 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.proposal-sbtc','submissionExtension': 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.bde002-proposal-submission','expectedStart': 600,'expectedEnd': 650,'proposalMeta': {'dao': 'bitcoin-dao','title': 'SIP 025 sBTC Update','author': 'Andre','synopsis': 'sip for doing stuf with sbtc','description': 'sip for doing stuf with sbtc'}})

db.tentativeProposalCollection.insert( { 'tag' : 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.proposal-block-header','submissionExtension': 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.bde002-proposal-submission','expectedStart': 600,'expectedEnd': 650,'proposalMeta': {'dao': 'bitcoin-dao','title': 'SIP Block Headers','author': 'Brice, Friedger','synopsis': 'sip for block height changes','description': 'sip block header'}})

```