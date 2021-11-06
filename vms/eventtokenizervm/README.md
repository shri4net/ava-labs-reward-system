# EventTokenizer Virtual Machine
EventTokenizerVM is built on TimestampVM. Please refer to following Avalanche documents for basic information on Virtual Machine, Blockchain, etc.  
https://docs.avax.network/build/tutorials/platform/create-a-virtual-machine-vm  
https://docs.avax.network/build/tutorials/platform/create-custom-blockchain  
https://github.com/ava-labs/timestampvm/  


## Environment requirements
Golang (version 1.16 or later)

## Build
### Clone the repository
```bash
git clone https://github.com/shri4net/ava-labs-reward-system.git
```

### Change to source directory
```bash
cd vms/eventtokenizervm
```

### Build the VM plugin
```bash
./scripts/build.sh <target_build_directory> eventtokenizervm
```
Copy the eventtokenizervm plugin binary to avalanche runtime plugins directory

## Runtime
### VM Alias (for all subnet validating nodes) 
Create a default VM ID alias file at : ~/.avalanchego/configs/vms/aliases.json  
Sample:
```bash
{
  "mgiwCXF97YtzTG42RfqxMJeUepg2Zg7qGNiXj5n6XqFFRz1d7": [
    "eventtokenizervm",
    "eventtokenizer"
  ]
}
```

### Configuration details
#### A. For Master Node only
Below configuration file is required only on the master node which distributes the reward.  
Create a runtime configuration file at ~/.avalanche/configs/chains/\<blockchainid\>/config.json  
Sample:
```bash
{
  "MasterNodeID" : "NodeID-FwxVbHjKPBxb4QCdKJ2S9MXyd4KnEhATZ",
  "RewarderUser" : "username",
  "RewarderPassword" : "password",
  "RewarderAddress" : "X-local1ehptpe9nt3xxytgnrpcvnvvdg4ltmduyyvjvd7",
  "RewardTokenID" : "2AJSf27vycKSLAU37WUTwR3xPsEQWKV8dFzo3wb9wQbas1rzvy",

  "LocalRpcUri"  : "http://localhost:9650",
  "EnableIndexer": true,
  "IndexerUri": "http://localhost:3001/api/source/newevent"
}
```
'MasterNodeID' - Define the node ID which will distribute the rewards for subnet validation.  
'RewarderUser' - Define the credentials(username) to control the Rewarder address.   
'RewarderPassword' - Define the credentials(password) to control the Rewarder address.   
'RewarderAddress' - Define the address which owns the Reward tokenID and has sufficient balance.    
'RewardTokenID' - Define the reward asset which will be distributed to the subnet validators.   
'LocalRpcUri' - Define the local node IP where avalanchego node is running.   
'EnableIndexer' - Define if Event Indexer is configured.  
'IndexerUri' - Define the Event Indexer Url to source the events.   

#### B. For Other Nodes
Below configuration file is required on other subnet validator nodes.  
Create a runtime configuration file at ~/.avalanche/configs/chains/\<blockchainid\>/config.json  
Sample:
```bash
{
  "LocalRpcUri"  : "http://localhost:9650",
  "EnableIndexer": true,
  "IndexerUri": "http://localhost:3001/api/source/newevent"
}
```
'LocalRpcUri' - Define the local node IP where avalanchego node is running.   
'EnableIndexer' - Define if Event Indexer is configured. [Optional]  
'IndexerUri' - Define the Event Indexer Url to source the events. [Optional]