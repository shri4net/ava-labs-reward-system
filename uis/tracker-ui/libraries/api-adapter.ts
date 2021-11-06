import * as cChainApi from './c-chain-api';
import * as etChainApi from './et-chain-api';
import * as indexerApi from './indexer-api';

export {
  decode,
  getblock,
  getblocks,
  isTrackExists,
  newshipment,
  addevent,
  getshipments,
  getshipmentevents,
  getcounts,
}

export type {
  IBlock,
  IShipmentsView,
  IEventsView,
  ICountsView,
}

interface IBlock {
  id: string;
  contract: string;
  data: string; 
  time: string;
  creator: string;
}

const decode = async (etBlocks:{[id: string]:IBlock}):Promise<{[id: string]:cChainApi.BlockData}> => {
  var cBlocks:{[id: string] :cChainApi.BlockData} = {};

  var encDatas:string[] = [];
  for(const etBlock in etBlocks) {
    const encData:string = etBlocks[etBlock].data
    encDatas.push(encData)
  }

  var multidecodeddata:cChainApi.IMultiDecodedData = await cChainApi.multiDecodeRpc(encDatas);

  var idx:number = 0;
  for(const etBlock in etBlocks) {
    const id:string = etBlocks[etBlock].id
    cBlocks[id] = {id:id, status: multidecodeddata.statuses[idx], location: multidecodeddata.locations[idx]}
    idx++;
  }
  return cBlocks
}

const getblocks = async(blockids:string[]):Promise<{[id: string]:IBlock}> => {
  var blks:{[id: string]:IBlock} = {};
  
  var etBlocks = await etChainApi.getBlocks(etChainApi.makeGetBlocksBody(blockids));

  etBlocks.forEach(etBlock => {
    blks[etBlock.eventID] = {
      id:etBlock.eventID, 
      time:etBlock.timestamp, 
      contract:"0x"+etBlock.codecAddress,  
      data:"0x"+etBlock.encodedData, 
      creator: "0x"+etBlock.creatorAddress}
  });
  return blks
}

const getblock = async(blockid:string):Promise<IBlock> => {
  var etBlock = await etChainApi.getBlock(etChainApi.makeGetBlockBody(blockid));
  var blk = {
      id:etBlock.eventID, 
      time:etBlock.timestamp, 
      contract:"0x"+etBlock.codecAddress,  
      data:"0x"+etBlock.encodedData,
      creator: "0x"+etBlock.creatorAddress }
  return blk
}

const isTrackExists = async(trackid:string):Promise<boolean> => {
  // convert to Indexer-API specific
  var sequenceid = trackid

  var r = await indexerApi.isSequenceExists(sequenceid)
  if (r.exists)
    return true;
  else if (!r.exists && !r.hasError)
    return false;
  return false
}

const newshipment = async (status:string, location:string, creatoraddr:string, signedhash:string) => {
  var st: string = await cChainApi.customEncodeRpc(status, location)
  if(st == "" || st == "0x")
    return Error("Encode Error")

  // For New Shipment, SequenceID should be blank
  var sequenceid = ""
  var r = await etChainApi.proposeBlock(etChainApi.makeProposeBlockBody(sequenceid, st.substr(2), creatoraddr, signedhash))
  return r
}

const addevent = async (trackid:string, status:string, location:string, creatoraddr:string, signedhash:string) => {
  if(trackid === "")
    throw Error("TrackID can not be blank!")
    
  var st: string = await cChainApi.customEncodeRpc(status, location)
  if(st == "" || st == "0x")
    return Error("Encode Error")


  // convert
  var sequenceid = trackid
  var r = await etChainApi.proposeBlock(etChainApi.makeProposeBlockBody(sequenceid, st.substr(2), creatoraddr, signedhash))
  return r
}

interface IShipmentsView {
  trackid:string, 
  tracktime:string, 
  status:string, 
  location:string, 
  eventid:string, 
  eventtime:string,
  creator:string
}

const getshipments = async() => {
  let shipmentsView: IShipmentsView[] = []
  var ts:indexerApi.ISequence[] = await indexerApi.getSequences()
        
  let trackids: string[] = []
  for (var i=0; i<ts.length; i++) { 
    const t = ts[i];
    trackids.push(t.id);
    shipmentsView.push({trackid:t.id, tracktime:t.time, status:"", location:"", eventid:"", eventtime:"", creator:""})
  }

  let eventids: string[] = []
  let trackevents:{[trackid:string]:{eventid:string, eventtime:string}} = {}

  var respEvts:indexerApi.ISequenceEvent[] = await indexerApi.getSequenceEvents(trackids,indexerApi.EventSortType.DESC,1)
  for (const track of respEvts) {
    const trackid = track.id
    var eventid = ""
    var eventtime = ""
    if(track.events.length>0) {
      eventid = track.events[0].id
      eventtime = track.events[0].time
    }
    eventids.push(eventid)
    trackevents[trackid] = {eventid:eventid, eventtime:eventtime};
  }

  if(eventids.length == 0) {
    return shipmentsView;
  }

  var eventblocks = await getblocks(eventids);
  var cBlocks = await decode(eventblocks)

  for (var i=0; i<ts.length; i++) { 
    const trackid = ts[i].id;
    const eventid = trackevents[trackid].eventid;
    //shipmentsView[i].tracktime = ""
    shipmentsView[i].eventid = eventid
    shipmentsView[i].eventtime = trackevents[trackid].eventtime
    shipmentsView[i].status = cBlocks[eventid].status
    shipmentsView[i].location = cBlocks[eventid].location
    shipmentsView[i].creator = eventblocks[eventid].creator
    //alert(eventblocks[eventid].time)
  }

  return shipmentsView
}


interface IEventsView {
  id:string, 
  time:string, 
  status:string, 
  location:string,
  creator:string
}

const getshipmentevents = async(id:string) => {
  var eventsView: IEventsView[] = [];

  var eventsResponse = await indexerApi.getSequenceEvents([id],indexerApi.EventSortType.DESC,10)
  var trackEvents = eventsResponse;

  if(trackEvents.length!=1)
    throw Error ("Length is not 1, but is " + trackEvents.length)

  var trackEvent = trackEvents[0];

  let blockids: string[] = [];

  for (var i=0; i<trackEvent.events.length; i++) { 
    const blockid = trackEvent.events[i] .id;
    blockids.push(blockid);
    eventsView.push({id:blockid, time:trackEvent.events[i].time, status:"", location:"", creator:""})
  }

  var blocks = await getblocks(blockids);

  var cBlocks = await decode(blocks)

  for (var i=0; i<eventsView.length; i++) {
    const blockid = eventsView[i].id;
    eventsView[i].status = cBlocks[blockid].status;
    eventsView[i].location = cBlocks[blockid].location;
    eventsView[i].creator = blocks[blockid].creator;
  }

  return eventsView
}

interface ICountsView {
  of: string;
  count: number;
}

const getcounts = async():Promise<ICountsView[]> => {
  var countsview:ICountsView[] = [];
  var counts = await indexerApi.getCounts();
  counts.forEach(count => {
    countsview.push({of:count.of, count:count.count})
  });

  return countsview;
}

/*
let cAddr:string = process.env.contractAddress || ""
if(cAddr === "")
  return Error("Config Error: contract address is not defined")

//alert(res.contract.toUpperCase() === cAddr.toUpperCase())

let compatiblecAddresses:string[] = []
if(process.env.compatibleContractAddressesCsv) {
  compatiblecAddresses = process.env.compatibleContractAddressesCsv.split(",")
}

var cfound = false;
compatiblecAddresses.forEach(compatiblecAddress => {
  if(res.contract.toUpperCase() === compatiblecAddress.toUpperCase()) {
    cfound = true;
  }
  //alert(cfound)
});

if(!(res.contract.toUpperCase() === cAddr.toUpperCase()) && !cfound) {
  alert(`Match Error: contract addresses ${res.contract},${cAddr} does not match`)
  return Error(`Match Error: contract addresses ${res.contract},${cAddr} does not match`)
}
*/