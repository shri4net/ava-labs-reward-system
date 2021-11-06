
# Tracker-Contract
Tracker contract has encoding and decoding functions for shipment tracking use-case.  

Reference:  
https://docs.avax.network/build/tutorials/smart-contracts/using-truffle-with-the-avalanche-c-chain  

## Environment requirements
Node (version 14 or later)  
Truffle

## Setup
### Clone the repository
```bash
git clone https://github.com/shri4net/ava-labs-reward-system.git
```

### Change to source directory
```bash
cd contracts/tracker-contract
```

### Configuration update
The configuration file is at truffle-config.js. Update it accordingly as per above refered avax document.  

### Install dependencies & deploy the contract
```bash
npm install
truffle compile
truffle migrate
```

### Post deployment
Note down the deployed contract address (Tracker).  
This contract address needs to be configured in Tracker UI. (next.config.js/contractAddress)