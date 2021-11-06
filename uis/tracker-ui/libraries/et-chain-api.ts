// Event Tracker Chain API

export {
  blockchainUrl,
  makeProposeBlockBody,
  proposeBlock,
  makeGetBlockBody,
  getBlock,
  makeGetBlocksBody,
  getBlocks
}

export type { 
  IETBlock 
}

const blockchainExt = 'ext/bc/'

const blockchainUrl = ():string => {
  var bcUrl = process.env.protocol + '://' + process.env.nodeIP + ((process.env.nodePort==='')?'':':') + process.env.nodePort + '/' + blockchainExt + process.env.blockchainID
  if(bcUrl === "")
    throw Error("Config Error: blockchain url is not defined")
  return bcUrl
}

const makeProposeBlockBody = (trackID:string = "", eed: string, creatoraddr:string, signedhash:string) => {
  var b = {
    "jsonrpc": "2.0",
    "method": "eventtokenizervm.proposeBlock",
    "params":{
        "sequenceID":"",
        "codecAddress":"",
        "encodedData": "",
        "refID":"",
        "refTime":"",
        "creatorAddress": "0000000000000000000000000000000000000000",
        "signedHash": ""
    },
    "id": 1
  }

  //
  // TO DO: Use RegEx
  var caddr = process.env.contractAddress || ""
  if(!(caddr.length===42||caddr.length===40))
    throw Error(`Invalid Event Contract Address: ${caddr}`)
  if ((caddr.length === 42) && (caddr.substr(0,2).toLowerCase() === "0x"))
    caddr = caddr.substr(2)
  b.params.codecAddress = caddr
  //b.params.eventTime = (Date.now()/1000).toString()
  b.params.encodedData = eed
  b.params.sequenceID = trackID

  if(!(creatoraddr.length===42||creatoraddr.length===40))
    throw Error(`Invalid Creator Address: ${creatoraddr}`)
  if ((creatoraddr.length === 42) && (creatoraddr.substr(0,2).toLowerCase() === "0x"))
    creatoraddr = creatoraddr.substr(2)
  b.params.creatorAddress = creatoraddr

  b.params.signedHash = signedhash

  return b
}

const proposeBlock = async (jobj: any) => {
  var bcUrl:string = blockchainUrl()
  if(bcUrl === "")
    return Error("Config Error: blockchain url is not defined")

  const response = await fetch(bcUrl, {method: 'POST', mode: 'cors', headers:{'Content-Type': 'application/json'}, body: JSON.stringify(jobj)})
  const jres = await response.json();
  if(jres.result === undefined)
    return Error(JSON.stringify(jres))
  if(jres.result.Success != true)
    return Error("ProposeBlock Error")

  return jres.result.Success
}

const makeGetBlockBody = (id:string = "") => {
  var b = {
    "jsonrpc": "2.0",
    "method": "eventtokenizervm.getBlock",
    "params":{
        "id":""
    },
    "id": 1
  };

  // when id is "", it would request the latest block
  b.params.id = id;
  return b
}

interface IGetBlockResponse {
  result: {
    APIBlock: IETBlock
  }
}

const getBlock = async (jobj: any): Promise<IETBlock> => {
  var bcUrl:string = blockchainUrl();

  const response = await fetch(bcUrl, {method: 'POST', mode: 'cors', headers:{'Content-Type': 'application/json'}, body: JSON.stringify(jobj)})
  const jres:IGetBlockResponse = await response.json();
  var etBlock = jres.result.APIBlock;
  return(etBlock);
}

const makeGetBlocksBody = (ids:string[]) => {
  var b = {
    "jsonrpc": "2.0",
    "method": "eventtokenizervm.getBlocks",
    "params":{
        "ids":[""]
    },
    "id": 1
  };

  b.params.ids = ids;
  return b
}

interface IETBlock {
  eventID: string;
  timestamp: string;
  sequenceID: string;
  codecAddress: string;
  encodedData: string;
  parentID: string;
  refID: string;
  refTime: string;
  creatorAddress: string;
}

interface IGetBlocksResponse {
  result: {
    APIBlocks: IETBlock[]
  }
}

const getBlocks = async (jobj: any):Promise<IETBlock[]> => {
  var bcUrl:string = blockchainUrl()

  const response = await fetch(bcUrl, {method: 'POST', mode: 'cors', headers:{'Content-Type': 'application/json'}, body: JSON.stringify(jobj)})
  const jres:IGetBlocksResponse = await response.json();
  var etBlocks = jres.result.APIBlocks;
  //alert(JSON.stringify(etBlocks))
  return etBlocks;
}
