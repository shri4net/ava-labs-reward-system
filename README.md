# EventTokenizer & RewardManager

This repository contains code for the Hackathon event sponsored by Ava-labs under the "Subnet and Virtual Machine" Track

The repo consists of
1. Virtual Machine code for plugin  
2. Sample Solidity code for C-chain deployment (Tracker contract)  
3. Sample UI code for interacting with the VM & C Blockchain (Tracker UI)  
4. Event Indexer  

### Presentation links
[Concept](https://youtu.be/LSr8BzuY0eU)  
[Tracker UI walkthrough](https://youtu.be/zbNHBFeU-tA)  


### Sample Shipment Tracker UI
https://apps4demo.com/trackerui


### Design documentations
1. [Eventtokenizer design document](https://github.com/shri4net/ava-labs-reward-system/blob/main/eventtokenizer-design-document.pdf)  
2. [Reward design document](https://github.com/shri4net/ava-labs-reward-system/blob/main/reward-design-document.pdf)  


### Diagram
![Architecture](/arch-diagram.jpeg)

## Deployments
### The code is deployed on the Fuji network of Ava-labs, with below details

```bash
Subnet-id : ER1mFqjFxQiCb12QFjAfVfAmTTua3xAaA9MKXSDjio796eRfG
Blockchain : 2k174xuViE2gwKHjD8R35dKqLpZL15zg2Ky4DEZgqoScvRM1oY
VM-id : mgiwCXF97YtzTG42RfqxMJeUepg2Zg7qGNiXj5n6XqFFRz1d7
Plugin name : eventtokenizervm
```

The plugin binary is also available in this vms/binaries folder : eventtokenizervm

### Instructions for adding subnet validators to this VM.

 Follow the standard instructions given by Ava-labs, and use the above details to fill in. [Link](https://docs.avax.network/build/tutorials/nodes-and-staking/add-a-validator)

The Reward system for validating the above subnet is configured for disbursal of Custom Asset Token at regular interval of 24 hours.
The Reward token Asset ID is : NPHxwugngk9Ru3biuvcZGBZvwcZo5FzMCggawXhtVoX8fRokH

The contract on C-chain is hosted in below address
```bash
0xD0F100f59080C1F4D5706a1FCc98d5AEB73fe94C
```
https://cchain.explorer.avax-test.network/address/0xD0F100f59080C1F4D5706a1FCc98d5AEB73fe94C/contracts

