import express, { Request, Response, NextFunction } from 'express';

import { AppGlobal } from './app-global'
import { handlerCounts, handlerSequences, handlerSequenceEvents, handlerSequenceExists, handlerReaderPing } from './handler-reader'
import { handlerNewEvent, handlerSyncPrivatePing  } from './handler-sync'

import config from 'config';

const port = config.get('port')?config.get('port'):3001;  // default: 3001
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(function(req, res, next) {
  // 
  res.header("Access-Control-Allow-Origin", config.get("access-control-allow-origin-url")); // default: *
  if(config.get("access-control-allow-origin-url")!="*")
    res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.listen(port, () => {
  console.log(`Event Indexer API is running on port ${port}.`);
});

// Load the global instance
AppGlobal.instance();

// NOTE: accessed by node/vm from localhost only
app.get('/api/source/p-ping', handlerSyncPrivatePing);
app.post('/api/source/newevent', handlerNewEvent);

/////
// NOTE: accessed by ui from any network
app.get('/api/reader/ping', handlerReaderPing);
app.get('/api/reader/counts', handlerCounts);
app.get('/api/reader/sequenceexists', handlerSequenceExists);
app.get('/api/reader/sequences', handlerSequences);
app.post('/api/reader/sequenceevents', handlerSequenceEvents);
