
# Event-Indexer
The indexer will source the events from a avalanche node. The indexer will also serve the frontend, e.g. tracker-ui.

## Environment requirements
Node (version 14 or later) and Yarn (version v1.22.* or above)

## Setup
### Clone the repository
> git clone https://github.com/shri4net/ava-labs-reward-system.git


### Change to source directory
```bash
cd services/event-indexer
```

### Configuration update
The custom configuration file is at config/default.json. Update it accordingly.  
Sample:
```bash
{
  "port": 3001,
  "source-node-ip": "127.0.0.1",
  "access-control-allow-origin-url": "*"
}
```
'port' - Define the port at which event indexer will listen and serve.  
'source-node-ip' - Define the Node IP from which event requests will be accepted. Use '\*' to allow from any node (Not recomended)  
'access-control-allow-origin-url' - CORS configuration to allow browser to access this API. Use '\*' to allow from any frontend.  

### Install & start the service
```bash
yarn install
yarn serve
```