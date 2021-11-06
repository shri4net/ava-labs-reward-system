
export {
    IAddOrderedResult,
    IAddUniqueIDResult,
    ICountValue,
    IGetResult,
    IIncrementCountResult,
    IOrderedValue,
    IUniqueIDValue
}

/*
Representation
--------------
SQ = Sequence
SQID = SequenceID
EV = Event
EVID = EventID
TM = Time
TMSP = Timestamp
EVTM = Eventtime
CT = Count
ID = Identifier

Literals represented as CAPITAL-CASE
Variables represented in lower-case as <_variable_>
*/
//enum KeyType {
//  SQ = "SQ",
//  EV = "EV"
//}

/*
Counts (Prefix: 0x00)
------
KEY                     VALUE             DESC
0x00!SQ                 {CT:<_count_>}    Sequence Count
0x00!EV                 {CT:<_count_>}    Event Count
0x00!EV!<_sqid_>        {CT:<_count_>}    Event Count by Sequence
*/
const SQCountKey = () => { return `0x00!SQ` }
const EVCountKey = () => { return `0x00!EV` }
const EVCountBySQKey = (sqid:string) => { return `0x00!EV!${sqid}` }
interface ICountValue { CT:number }

//Prefix: 0x01...0x09 Reserved

/*
Unique IDs (Prefix: 0x10,0x20,...)
----------
KEY                   VALUE               DESC
0x10!<_sqid_>         {TM:<_tmsp_>}       Unique SequenceIDs
0x20!<_evid_>         {TM:<_tmsp_>}       Unique EventIDs
*/
const SQUniqueIDKey = (sqid:string) => { return `0x10!${sqid}` }
const EVUniqueIDKey = (evid:string) => { return `0x20!${evid}` }
interface IUniqueIDValue { TM:number }

interface IAddUniqueIDResult {
  isAdded: boolean,
  isIncremented: boolean,
  hasError: boolean,
  error: Error
}

interface IIncrementCountResult {
  isIncremented: boolean,
  hasError: boolean,
  error: Error
}

interface IGetResult<TValue> {
  found: boolean;
  value: TValue;
  hasError: boolean;
  error: Error;
  isNotFoundError: boolean;
}

/*
SequenceIDs Ordered by Time (Prefix: 0x11..0x19)
---------------------------
KEY                             VALUE               DESC    
0x11!<_tmsp_>                   {ID:<_sqid_>}       Ordered SequenceIDs by timestamp
0x12!<_evtm_>                   {ID:<_sqid_>}       Ordered SequenceIDs by eventtime
*/
const SQOrdByTMSPKey = (tmsp:string) => { return `0x11!${tmsp}` }
const SQOrdByEVTMKey = (evtm:string) => { return `0x12!${evtm}` }
interface IOrderedValue { ID:string }

/*
EventIDs Ordered by Time (Prefix: 0x21..0x29)
------------------------
KEY                             VALUE               DESC    
0x21!<_sqid_>!<_tmsp_>          {ID:<_evid_>}       Ordered EventIDs by sequenceid, timestamp
0x22!<_sqid_>!<_evtm_>          {ID:<_evid_>}       Ordered EventIDs by sequenceid, eventtime
*/
const EVOrdByTMSPKey = (sqid:string,tmsp:string) => { return `0x21!${sqid}!${tmsp}` }
const EVOrdByEVTMKey = (sqid:string,evtm:string) => { return `0x22!${sqid}!${evtm}` }
//interface IOrderedValue { ID:string }

interface IAddOrderedResult { isAdded:boolean, hasError:boolean, error:Error }
