import { AppGlobal } from './app-global'
import { ICountValue, IGetResult, IUniqueIDValue } from './db-data'

export {
  readOrderedEvents,
  readOrderedSequences,
  get,
  getEVCount,
  getSQCount,
  getSQUniqueID
}

async function readSiblings (ordkeyprefix: string, isreverse: boolean = false, ts: string = "", lmt: number = 10) {
  var gtComparisonKey:string = `${ordkeyprefix}!`;
  var ltComparisonKey:string = `${ordkeyprefix}~`;
  if(ts!="")
  {
    if(!isreverse) {
      gtComparisonKey = `${ordkeyprefix}!${ts}!`
    } else {
      ltComparisonKey = `${ordkeyprefix}!${ts}~`
    }
  }

  var readable = AppGlobal.instance().dbRO
    .createReadStream({
      keys: true,
      values: true,
      valueAsBuffer:true,
      gt: gtComparisonKey,
      lt: ltComparisonKey,
      reverse: isreverse,
      limit: lmt
    });

  var datas = [];

  for await (const ri of readable) {
    datas.push(ri)
  }

  //console.log(gtComparisonKey, ltComparisonKey, lmt, datas.length)
  //console.log(JSON.stringify(datas))

  return datas;    
}

const readOrderedSequences = async (isreverse:boolean, ts:string, lmt:number) =>  {
  var siblings = await readSiblings(`0x11`, isreverse, ts, lmt);

  // convert
  var sequences:{id:string, time:string}[] = []
  for(var siblingkey in siblings) {
    sequences.push({id:siblings[siblingkey].value.ID, time:siblings[siblingkey].key.match(/!(\d*)$/)[1]})
  }
  return sequences;
}

const readOrderedSequencesByEventTime = async (isreverse:boolean, ts:string, lmt:number) =>  {
  return readSiblings(`0x12`, isreverse, ts, lmt);
}

const readOrderedEvents = async (sqid: string, isreverse:boolean, ts:string, lmt:number) => {
  var siblings = await readSiblings(`0x21!${sqid}`, isreverse, ts, lmt);

  // convert
  var events:{id:string, time:string}[] = []
  for(var siblingkey in siblings) {
    events.push({id:siblings[siblingkey].value.ID, time:siblings[siblingkey].key.match(/!(\d*)$/)[1]})
  }
  return events;
}

const readOrderedEventsByEventTime = async (sqid: string, isreverse:boolean, ts:string, lmt:number) => {
  return readSiblings(`0x22!${sqid}`, isreverse, ts, lmt);
}

const getSQUniqueID = async(sqid:string) => {
  return await get<IUniqueIDValue>(`0x10!${sqid}`);
}

const getEVUniqueID = async(evid:string) => {
  return await get<IUniqueIDValue>(`0x20!${evid}`);
}

const getSQCount = async() => {
  return await get<ICountValue>("0x00!SQ");
}

const getEVCount = async() => {
  return await get<ICountValue>("0x00!EV");
}

async function get<TValue> (key:string):Promise<IGetResult<TValue>> {
  var result: IGetResult<TValue> = {found: false, value: null, hasError: false, error: null, isNotFoundError: false};
  try {
    var val:TValue = await AppGlobal.instance().dbRO.get(key)
    result.found = true;
    result.value = val;
  } catch (err) {
    result.hasError = true;
    result.error = err;
    if(err.name === "NotFoundError")
      result.isNotFoundError = true;
    else
      console.log("ERROR _get_" + err + ` INPUT key:${key}`)
  }
  return result;
}
