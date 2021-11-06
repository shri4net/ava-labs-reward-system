import { AppGlobal } from './app-global'
import { get } from './db-reader'
import { IAddOrderedResult, IAddUniqueIDResult, ICountValue, IIncrementCountResult, IOrderedValue, IUniqueIDValue } from './db-data'

export {
  addSQUniqueID,
  addSQOrderedByTMSP,
  addSQOrderedByEVTM,
  addEVUniqueID,
  addEVOrderedByTMSP,
  addEVOrderedByEVTM
}

const addSQUniqueID = async(sqid:string, tm:number) => {
  return await addUniqueID(`0x10!${sqid}`, tm, "0x00!SQ");
}

const addEVUniqueID = async(sqid:string, evid:string, tm:number) => {
  var r1 = await addUniqueID(`0x20!${evid}`, tm, "0x00!EV");
  if(r1.isAdded && r1.isIncremented) {
    var r2 = await incrementCount(`0x00!EV!${sqid}`);
  }
  return r1;
}

async function addUniqueID (idkey:string, tm:number, ctkey:string):Promise<IAddUniqueIDResult> {
  var result:IAddUniqueIDResult = {isAdded:false, isIncremented:false, hasError: false, error: null};
  try {
    var rgu = await get<IUniqueIDValue>(idkey);
    if(!rgu.found && rgu.hasError && rgu.isNotFoundError ) {
      var idval:IUniqueIDValue = { TM:tm }
      await AppGlobal.instance().db.put(idkey, idval)
      result.isAdded = true;

      var ric = await incrementCount(ctkey);
      result.isIncremented = ric.isIncremented;
      result.hasError = ric.hasError;
      result.error = ric.error;
    }
  } catch (err) {
    result.hasError = true;
    result.error = err;
    console.log('ERROR _addUniqueID_ ' + err + ` INPUT idkey:${idkey}, tm:${tm}, ctkey:${ctkey}`);
  }
  return result;
}

async function incrementCount(ctkey:string):Promise<IIncrementCountResult> {
  var result:IIncrementCountResult = {isIncremented:false, hasError: false, error: null};
  try {
    var rgc = await get<ICountValue>(ctkey);
    if(rgc.found) {
      var ctval_inc:ICountValue = {CT:rgc.value.CT+1}
      await AppGlobal.instance().db.put(ctkey, ctval_inc)
      result.isIncremented = true;
    } else if (!rgc.found && rgc.hasError && rgc.isNotFoundError) {
      var ctval_first:ICountValue = {CT:1}
      await AppGlobal.instance().db.put(ctkey, ctval_first)
      result.isIncremented = true;
    }
  } catch (err) {
    result.hasError = true;
    result.error = err;
    console.log('ERROR _incrementCount_ ' + err + ` INPUT ctkey:${ctkey}`);
  }
  return result;
}


const addSQOrderedByTMSP = async(sqid:string, tmsp:number):Promise<IAddOrderedResult> => {
  return await addOrdered("0x11", tmsp, sqid);
}
const addSQOrderedByEVTM = async(sqid:string, evtm:number):Promise<IAddOrderedResult> => {
  return await addOrdered("0x12", evtm, sqid);
}

const addEVOrderedByTMSP = async(sqid:string, tmsp:number, evid:string):Promise<IAddOrderedResult>=> {
  return await addOrdered(`0x21!${sqid}`, tmsp, evid); 
}
const addEVOrderedByEVTM = async(sqid:string, evtm:number, evid:string):Promise<IAddOrderedResult> => {
  return await addOrdered(`0x22!${sqid}`, evtm, evid); 
}

const addOrdered = async (ordkeyprefix:string, tm:number, val_id:string):Promise<IAddOrderedResult> => {
  var result:IAddOrderedResult = {isAdded:false, hasError:false, error:null};
  try {
    var val:IOrderedValue = { ID:val_id };
    var key:string = `${ordkeyprefix}!${tm}`;
    await AppGlobal.instance().db.put(key, val);
    //console.log(key, JSON.stringify(val))
    result.isAdded = true;
  } catch (err) {
    result.hasError = true;
    result.error = err;
  }
  return result;
}
