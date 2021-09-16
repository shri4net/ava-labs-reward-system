# EventTokenizerVM

This repository contains code for the Hackathon event sponsored by Ava-labs under the "Subnet and Virtual Machine" Track

The repo consists of
1. Virtual Machine code for plugin
2. Solidity code for C-chain deployment
3. Sample UI code for interacting with the VM & C Blockchain

### Presentation link regarding the concept
https://youtu.be/LSr8BzuY0eU

### The code is deployed on the Fuji network of Ava-labs, with below details

```bash
Subnet-id : ER1mFqjFxQiCb12QFjAfVfAmTTua3xAaA9MKXSDjio796eRfG
Blockchain : 2Y9U8vzGmVGw3s9sazotQbDxb8D5cHmeMijDiPnYRZHDMGS6jy
VM-id : mgiwCXF97YtzTG42Rfqunvf6dsoW2w8r5YrE6xzkJRDx157tT
Plugin name : eventtokenizervm
```

The plugin binary is also available in this vms/binaries folder : eventtokenizervm

### Instructions for adding subnet validators to this VM.

 Follow the standard instructions given by Ava-labs, and use the above details to fill in.
   https://docs.avax.network/build/tutorials/nodes-and-staking/add-a-validator

The Reward system for validating the above subnet is configured for disbursal of Custom Asset Token at regular interval of 1 hour.
The Reward token Asset ID is : NPHxwugngk9Ru3biuvcZGBZvwcZo5FzMCggawXhtVoX8fRokH

The contract on C-chain is hosted in below address
```bash
0x295935f234f762a19963b306c1E4248D1C2d032d
```
https://cchain.explorer.avax-test.network/address/0x295935f234f762a19963b306c1E4248D1C2d032d/contracts
