/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  env: {
    protocol: 'http',
    nodeIP: 'localhost',
    nodePort: '9650',
    blockchainID: 'Z1JY87yiUnBHGzuWsRFgPJfarhqinEqR6X8YkpBYsuZrKom1z',
    contractAddress: '0x11Fa7d827e18f28F4e3B2F4D4D8C5a62bCC8C5b3',
    compatibleContractAddressesCsv:'0x11Fa7d827e18f28F4e3B2F4D4D8C5a62bCC8C5b3',
    eventIndexReaderUri: 'http://localhost:3001/api/reader',
    networkChainID: '0xa868',
  }
}
