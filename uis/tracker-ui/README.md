
# Tracker-UI
Tracker UI is the frontend for shipment tracking use case. This is used alongwith EventTokenizerVM and EventIndexer. This dApp is developed using Next.js framework.

## Environment requirements
Node (version 14 or later) and Yarn (version v1.22.* or above)

## Setup
### Clone the repository
```bash
git clone https://github.com/shri4net/ava-labs-reward-system.git
```


### Change to source directory
```bash
cd uis/tracker-ui
```

### Configuration update
The default configuration file is at /next.config.js. Update it accordingly.  
Sample:
```bash
{
    protocol: 'http',
    nodeIP: 'localhost',
    nodePort: '9650',
    blockchainID: 'Z1JY87yiUnBHGzuWsRFgPJfarhqinEqR6X8YkpBYsuZrKom1z',
    contractAddress: '0x11Fa7d827e18f28F4e3B2F4D4D8C5a62bCC8C5b3',
    compatibleContractAddressesCsv:'',
    eventIndexReaderUri: 'http://localhost:3001/api/reader',
    networkChainID: '0xa868',
}
```
'protocol' - Define the protocol as http or https.  
'nodeIP' - Define the Node IP to which event requests will be sent.  
'nodePort' - Define the port on which Avalanche node is hosted.  
'blockchainID' - Define the EventTokenizer blockchainID.  
'contractAddress' - Define the Contract address where the Codec is deployed on C-chain.  
'compatibleContractAddressesCsv' - Define the Csv list of Contract addresses in case of subsequent codec migrations, say '0x11Fa7d827e18f28F4e3B2F4D4D8C5a62bCC8C5b3,0xf606475e888A22d85b43DF58b0aB6b2EAf7ac1c1'.  
'eventIndexReaderUri' - Define the Event Indexer Url to which requests will be sent.  
'networkChainID' - Define the avalanche chain ID, 0xa868 for local, 0xa869 for FUJI testnet.   

### Install & start the service
```bash
yarn install
yarn dev
```

### dApp UI
Open [http://localhost:3000](http://localhost:3000) with your browser to explore the dApp.
