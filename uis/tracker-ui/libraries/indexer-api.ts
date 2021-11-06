export {
  getSequences,
  getSequenceEvents,
  isSequenceExists,
  getCounts,
  EventSortType,
};

export type { 
  ISequence,
  ISequenceEvent,
  ICountOf,
};

interface ISequencesResponse {
  sequences: ISequence[]
}

interface ISequence {
  id:string;
  time:string;
}

const getSequences = async ():Promise<ISequence[]> => {
  var url: string = process.env.eventIndexReaderUri + "/sequences?sort=desc"
  var result:ISequence[] = [];
  try {
    const response = await fetch(url, {method: 'GET', mode: 'cors', headers:{'Accept': 'application/json'}})
    const jres:ISequencesResponse = await response.json();
    result = jres.sequences;
    //alert(JSON.stringify(jres))
  } catch (error) {
    alert(`Error: ${error}`)
  }
  return result;
}

const makeGetSequenceEventsBody = (sequenceids:string[] = []) => {
  var b:ISequenceEventsInput = {
    sequenceids: []
  };

  b.sequenceids = sequenceids;
  return b
}

interface ISequenceEventsInput {
  sequenceids:string[];
}

interface ISequenceEventsResponse {
  sequenceevents: ISequenceEvent[]
}

interface ISequenceEvent {
  id:string;
  events: {id:string, time:string}[];
}

enum EventSortType {
  ASC = "asc",
  DESC = "desc"
}

const getSequenceEvents = async (sequenceids:string[], sorttype:EventSortType, limit:number, keytime?:number):Promise<ISequenceEvent[]> => {
  var url: string = `${process.env.eventIndexReaderUri}/sequenceevents?sort=${sorttype}&limit="${limit}`
  var result:ISequenceEvent[] = [];
  try {
    const jobj = makeGetSequenceEventsBody(sequenceids);
    const response = await fetch(url, {method: 'POST', mode: 'cors', headers:{'Content-Type': 'application/json'}, body: JSON.stringify(jobj)})
    const jres:ISequenceEventsResponse = await response.json();
    result = jres.sequenceevents;
  } catch (error) {
    alert(`Error: ${error}`)
  }
  return result;
}

interface ISequenceExistsResponse {
  exists: boolean;
  hasError: boolean;
}

const isSequenceExists = async (sequenceid: string):Promise<ISequenceExistsResponse> => {
  var url = process.env.eventIndexReaderUri + "/sequenceexists?sequenceid=" + sequenceid
  var result:ISequenceExistsResponse = {exists: false, hasError: false}
  try {
    const response = await fetch(url, {method: 'GET', mode: 'cors', headers:{'Accept': 'application/json'}})
    const jres:ISequenceExistsResponse = await response.json();
    result = jres;
  } catch (error) {
    alert(`Error: ${error}`)
    result.hasError = true
  }
  return result;
}

interface ICountsResponse {
  counts: ICountOf[]
}

interface ICountOf {
  of: string,
  count: number
}

const getCounts = async ():Promise<ICountOf[]> => {
  var url: string = process.env.eventIndexReaderUri + "/counts"
  var result:ICountOf[] = [];
  try {
    const response = await fetch(url, {method: 'GET', mode: 'cors', headers:{'Accept': 'application/json'}})
    const jres:ICountsResponse = await response.json();
    result = jres.counts;
    //alert(JSON.stringify(jres))
  } catch (error) {
    alert(`Error: ${error}`)
  }
  return result;
}