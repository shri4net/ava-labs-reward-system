const Web3 = require("web3");
const HDWalletProvider = require("@truffle/hdwallet-provider");

const protocol = "https";
const ip = "api.avax-test.network";
const port = 0;
const provider = new Web3.providers.HttpProvider(
  `${protocol}://${ip}/ext/bc/C/rpc`
);

const privateKeys = [
  "fuji-c-chain-private-key",
];

module.exports = {
  networks: {
    fuji: {
      provider: () => {
        return new HDWalletProvider({
          privateKeys: privateKeys,
          providerOrUrl: provider,
        });
      },
      network_id: "*",
      gas: 3000000,
      gasPrice: 225000000000,
    },
  },
};