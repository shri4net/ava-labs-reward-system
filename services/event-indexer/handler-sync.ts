import express, { Request, Response, NextFunction } from 'express';
import { addEVOrderedByEVTM, addEVOrderedByTMSP, addSQOrderedByEVTM, addSQOrderedByTMSP, addEVUniqueID, addSQUniqueID} from './db-sync'
import config from 'config';

export {
  handlerSyncPrivatePing,
  handlerNewEvent
}

interface IEventInput {
  eventid:string;
  timestamp:string;
  sequenceid:string;
  refid:string;
  reftime:string;
  creator:string;
}

const isAccessible = (request: Request):boolean => {
  if(config.get('source-node-ip')!="*" && request.ip.indexOf(config.get('source-node-ip'))===-1)
    return false;
  return true;
}

const colors:string[] = ["white","silver","gray","black","red","maroon","yellow","olive","lime","green","aqua","teal","blue","navy","fuchsia","purple"]

const handlerSyncPrivatePing = async (request: Request, response: Response, next: NextFunction) => {
  if(!isAccessible(request)) {
    response.status(401).json({statusCode: 401, message: `resource not accessible`});
    console.log(`Sync PrivatePing request blocked from IP ${request.ip}, ${request.headers.origin}`)
    return;
  }

  //console.log(request.ip)
  //console.log(request.headers.origin)
  var i1 = Math.floor(Math.random() * (colors.length));
  var i2 = Math.floor(Math.random() * (colors.length));
  response.status(200).json({message:`the water is ${colors[i1]}-ish ${colors[i2]}, at ${new Date(Date.now()).toISOString()}, from ${request.ip}`})
}

const handlerNewEvent = async (request: Request, response: Response, next: NextFunction) => {
  if(!isAccessible(request)) {
    response.status(401).json({statusCode: 401, message: `resource not accessible`});
    console.log(`Sync NewEvent request blocked from IP ${request.ip}, ${request.headers.origin}`)
    return;
  }

  try {
    var ei:IEventInput = request.body;
    //console.log(`handlerNewEvent - ${ei.eventid},${ei.sequenceid}`)

    await newEvent(ei);

    response.setHeader('Access-Control-Allow-Origin', '*');
    response.status(200).json({ statusCode: 200, message: "success"})
  } catch (err) {
    response.status(500).json({ statusCode: 500, message: err.message })
  }
}

const newEvent = async (ei: IEventInput) => {
  var sqid = ei.sequenceid;
  var evid = ei.eventid;
  var tmsp = parseInt(ei.timestamp);
  var evtm = parseInt(ei.reftime);

  if(sqid === "" || sqid === "11111111111111111111111111111111LpoYY")
    sqid = evid

  if(sqid === evid) {
    await addSQUniqueID(sqid, tmsp);
    await addSQOrderedByTMSP(sqid, tmsp);
    await addSQOrderedByEVTM(sqid, evtm);
  }

  await addEVUniqueID(sqid, evid, tmsp);
  await addEVOrderedByTMSP(sqid, tmsp, evid);
  await addEVOrderedByEVTM(sqid, evtm, evid);
}

