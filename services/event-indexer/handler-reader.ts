import express, { Request, Response, NextFunction } from 'express';
import { getEVCount, getSQCount, getSQUniqueID, readOrderedEvents, readOrderedSequences } from './db-reader'
import { ICountValue, IGetResult, IOrderedValue } from './db-data'

export {
  handlerReaderPing,
  handlerSequenceEvents,
  handlerCounts,
  handlerSequences,
  handlerSequenceExists
}

const colors:string[] = ["white","silver","gray","black","red","maroon","yellow","olive","lime","green","aqua","teal","blue","navy","fuchsia","purple"]

const handlerReaderPing = async (request: Request, response: Response, next: NextFunction) => {
  var i1 = Math.floor(Math.random() * (colors.length));
  var i2 = Math.floor(Math.random() * (colors.length));
  //response.status(200).json({time:Date.now().toString()})
  response.status(200).json({message:`the sky is ${colors[i1]}-ish ${colors[i2]}, at ${new Date(Date.now()).toISOString()}, from ${request.ip}`})
};

interface ISequenceEventsInput {
  sequenceids:string[];
}

interface ISequenceEventsResponse {
  sequenceevents: {id:string, events: {id:string, time:string}[]}[]
}

const handlerSequenceEvents = async (request: Request, response: Response<ISequenceEventsResponse | IErrorResponse>, next: NextFunction) => {
  try {

    let {isreverse, keytime, limit} = validateRequest(request)
    var sequenceeventsinput:ISequenceEventsInput = request.body;

    var sequenceevents:{id:string, events: {id:string, time:string}[]}[] = []
    for (var sequenceid of sequenceeventsinput.sequenceids) {
      var events = await readOrderedEvents(sequenceid, isreverse, keytime, limit)
      sequenceevents.push({id: sequenceid, events: events})
    }

    var res:ISequenceEventsResponse = {sequenceevents:sequenceevents}

    //console.log(JSON.stringify(res))

    response.status(200).json(res)
  } catch (err) {
    console.log(`ERROR _handlerSequenceEvents_ ${err}`)
    response.status(500).json(standard500ErrorResponse(err))
  }
}

interface ICountsResponse {
  counts: {
    of: string,
    count: number
  }[]
}

const handlerCounts = async (request: Request, response: Response<ICountsResponse | IErrorResponse>, next: NextFunction) => {
  try {
    var res:ICountsResponse = {counts:[]};

    var result:IGetResult<ICountValue>;
    result = await getSQCount();
    if(result.found)
      res.counts.push({of:"sequences", count:result.value.CT});

    result = await getEVCount();
    if(result.found)
      res.counts.push({of:"events", count:result.value.CT});

    response.status(200).json(res)
  } catch (err) {
    console.log(`ERROR _handlerCounts_ ${err}`)
    response.status(500).json(standard500ErrorResponse(err))
  }
};


interface ISequenceExistsResponse {
  exists: boolean;
  hasError: boolean;
}

const handlerSequenceExists = async (request: Request, response: Response<ISequenceExistsResponse | IErrorResponse>, next: NextFunction) => {
  var res:ISequenceExistsResponse = {exists:false, hasError:false};
  try {
    if(!request.query["sequenceid"]) {
      throw Error("Validation Error: sequenceid not provided")
    }

    var sequenceid:string = request.query["sequenceid"].toString()

    var r = await getSQUniqueID(sequenceid);

    if(r.found) {
      res.exists = true;
    } else if (r.hasError) {
      res.hasError = true;
    }

    response.status(200).json(res)
  } catch (err) {
    console.log(`ERROR _handlerSequenceExists_ ${err}`)
    response.status(500).json(standard500ErrorResponse(err));
  }
}

interface ISequencesResponse {
  sequences: {id:string, time:string}[]
}

const handlerSequences = async (request: Request, response: Response<ISequencesResponse | IErrorResponse>, next: NextFunction) => {
  try {

    let {isreverse, keytime, limit} = validateRequest(request)
  
    var sequences:any[] = await readOrderedSequences(isreverse, keytime, limit);
    var res:ISequencesResponse = {sequences:sequences}

    //console.log(JSON.stringify(res))

    response.status(200).json(res)
  } catch (err) {
    console.log(`ERROR _handlerSequences_ ${err}`)
    response.status(500).json(standard500ErrorResponse(err))
  }
}

interface IErrorResponse {
  statusCode: number;
  message: string;
}

const validateRequest = (request: Request):{isreverse:boolean, keytime:string, limit:number} => {
  var isreverse:boolean = false;
  var sortStr:string = request.query["sort"]?request.query["sort"].toString():""
  if(sortStr!=="" && sortStr==="desc")
    isreverse = true

  var keytime:string = "";
  var keytimeStr:string = request.query["keytime"]?request.query["keytime"].toString():""
  if (keytimeStr !== "") {
    keytime = keytimeStr
    // assert that keytime is unix timestamp
  }

  var limit:number = 10;
  var limitStr:string = request.query["limit"]?request.query["limit"].toString():""
  if (limitStr !== "") {
    limit = Number.parseInt(limitStr)?Number.parseInt(limitStr):10;
    if (limit > 20) limit = 10;
  }

  return ({isreverse:isreverse, keytime:keytime, limit:limit})
}

const standard500ErrorResponse = (err:Error) => {
  var errresponse:IErrorResponse = {statusCode:500, message: `${err.name}:${err.message}`}
  return errresponse;
}