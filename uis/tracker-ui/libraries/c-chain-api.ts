import { ethers } from 'ethers'
import TrackerAbi from './abis/tracker-abi.json'

export {
  BlockData,
  cChainRpcUrl,
  customEncodeRpc,
  customDecodeRpc, 
  multiDecodeRpc
}
export type { 
  IMultiDecodedData 
}

class BlockData {
  id:string = ""
  status:string = ""
  location:string = ""
}

const cChainExt = 'ext/bc/C/rpc'

const cChainRpcUrl = () => {
  var cRpcUrl = process.env.protocol + '://' + process.env.nodeIP + ((process.env.nodePort==='')?'':':') + process.env.nodePort + '/' + cChainExt
  return cRpcUrl
}

/*
let cAddr:string = process.env.contractAddress || ""
if(cAddr === "")
  return Error("Config Error: contract address is not defined")

if(!(res.contract.toUpperCase() === cAddr.toUpperCase())) {
  alert(`Match Error: contract addresses ${res.contract},${cAddr} does not match`)
  return Error(`Match Error: contract addresses ${res.contract},${cAddr} does not match`)
}
*/

const customEncodeRpc = async (status: string, location: string) => {
  const provider = new ethers.providers.JsonRpcProvider(cChainRpcUrl())
  var contract = new ethers.Contract(process.env.contractAddress || "", TrackerAbi.abi, provider)
  var r = await contract.encode(status, location)
  //var bd:BlockData = {id: "", status: r[0], location:r[1]}
  return r
}

const customDecodeRpc = async (encStr: string ) => {
  const provider = new ethers.providers.JsonRpcProvider(cChainRpcUrl())
  var cAddr:string = ""
  if(process.env.contractAddress)
    cAddr = process.env.contractAddress

  var contract = new ethers.Contract(cAddr, TrackerAbi.abi, provider)
  var r = await contract.decode(encStr)
  var bd:BlockData = {id: "", status: r[0], location:r[1]}
  return bd
}

interface IDecodedData {
  status:string;
  location:string;
}

interface IMultiDecodedData {
  statuses: string[];
  locations: string[];
}

const multiDecodeRpc = async (encDatas: string[]):Promise<IMultiDecodedData> => {
  var multidecodeddata:IMultiDecodedData = {statuses:[], locations:[]}
  if(!process.env.contractAddress)
    return multidecodeddata

  const cAddr:string = process.env.contractAddress
  const provider = new ethers.providers.JsonRpcProvider(cChainRpcUrl())

  const contract = new ethers.Contract(cAddr, TrackerAbi.abi, provider)

  var encDatas10:string[]=[];
  for(var i=0;i<10;i++) {
    if(i<encDatas.length)
      encDatas10[i] = encDatas[i]
    else
      encDatas10[i] = "0x00"
  }

  var r:any[] = [];
  r = await contract.decodemultiple(encDatas.length, encDatas10)
  multidecodeddata.statuses = r[0]
  multidecodeddata.locations = r[1]
  return multidecodeddata
}