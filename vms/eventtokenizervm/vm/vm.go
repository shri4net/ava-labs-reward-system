// (c) 2019-2020, Ava Labs, Inc. All rights reserved.
// See the file LICENSE for licensing terms.

package eventtokenizervm

import (
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/gorilla/rpc/v2"
	log "github.com/inconshreveable/log15"

	"github.com/ava-labs/avalanchego/codec"
	"github.com/ava-labs/avalanchego/codec/linearcodec"
	"github.com/ava-labs/avalanchego/database/manager"
	"github.com/ava-labs/avalanchego/ids"
	"github.com/ava-labs/avalanchego/snow"
	"github.com/ava-labs/avalanchego/snow/consensus/snowman"
	"github.com/ava-labs/avalanchego/snow/engine/common"
	"github.com/ava-labs/avalanchego/snow/engine/snowman/block"
	"github.com/ava-labs/avalanchego/utils/formatting"
	cjson "github.com/ava-labs/avalanchego/utils/json"
	"github.com/ava-labs/avalanchego/version"
	"github.com/ava-labs/avalanchego/vms/components/core"
)

const (
	codecVersion  = 0
	Name          = "eventtokenizervm"
	maxEvtDataLen = 1024
)

var (
	errNoPendingBlocks = errors.New("there is no block to propose")
	errBadGenesisBytes = errors.New("genesis data should be bytes (max length 32)")
	Version            = version.NewDefaultVersion(1, 0, 0)

	_ block.ChainVM = &VM{}

	cfgEnableIndexer = false
	cfgIndexerUri    = ""
)

/*
// Data maintained by User/UI
	EncodedtData
	CodecAddress
	RefID
	RefTime

// Data maintained by System
	SequenceID
	Timestamp|ProposeTime
*/

type BlockData struct {
	sequenceID  ids.ID
	encodedData []byte
	codecAddr   ids.ShortID
	refID       []byte
	refTime     int64
	creatorAddr ids.ShortID
}

// VM implements the snowman.VM interface
type VM struct {
	core.SnowmanVM
	codec  codec.Manager
	rwdm   RewardMgr
	ctx    *snow.Context
	config Config
	// Proposed pieces of data that haven't been put into a block and proposed yet
	poolBlocks []BlockData
}

// Initialize this vm
// [ctx] is this vm's context
// [dbManager] is the manager of this vm's database
// [toEngine] is used to notify the consensus engine that new blocks are
//   ready to be added to consensus
// The data in the genesis block is [genesisData]
func (vm *VM) Initialize(
	ctx *snow.Context,
	dbManager manager.Manager,
	genesisData []byte,
	upgradeData []byte,
	configData []byte,
	toEngine chan<- common.Message,
	_ []*common.Fx,
	_ common.AppSender,
) error {
	vm.config.SetDefaults()

	version, err := vm.Version()
	vm.ctx = ctx
	if err != nil {
		log.Error("error initializing EventTokenizer VM: %v", err)
		return err
	}
	log.Info("Initializing EventTokenizer VM", "Version", version)

	if len(configData) > 0 {
		log.Info("Updating values from chain specific config.json file")
		if err := json.Unmarshal(configData, &vm.config); err != nil {
			return fmt.Errorf("Failed to unmarshal chain specific config %s: %w", string(configData), err)
		}
	}
	log.Info(fmt.Sprintf("Using Local Rpc Uri : %s", vm.config.LocalRpcUri))

	cfgEnableIndexer = vm.config.EnableIndexer
	cfgIndexerUri = vm.config.IndexerUri
	log.Info("Indexer: ", "Enable", cfgEnableIndexer, "Uri", cfgIndexerUri)

	if err := vm.SnowmanVM.Initialize(ctx, dbManager.Current().Database, vm.ParseBlock, toEngine); err != nil {
		log.Error("error initializing SnowmanVM: %v", err)
		return err
	}
	log.Info("SnowmanVM Initialized")
	c := linearcodec.NewDefault()
	manager := codec.NewDefaultManager()
	if err := manager.RegisterCodec(codecVersion, c); err != nil {
		return err
	}
	vm.codec = manager
	log.Info("vm.codec set")

	vm.rwdm.Initialize(vm, vm.config)

	// If database is empty, create it using the provided genesis data
	if !vm.DBInitialized() {
		log.Info("Creating Database")
		if len(genesisData) > maxEvtDataLen {
			return errBadGenesisBytes
		}

		// genesisData is a byte slice but each block contains an byte array
		// Take the first [dataLen] bytes from genesisData and put them in an array
		//var genesisDataArr []byte
		genesisDataArr := make([]byte, len(genesisData)) //bytes[len(bytes)]
		copy(genesisDataArr[:], genesisData)

		empty := ""
		b_empty := make([]byte, len(empty))
		copy(b_empty[:], empty)

		// Create the genesis block
		// Timestamp of genesis block is 0. It has no parent.
		genesisBlock, err := vm.NewBlock(ids.Empty, 0, time.Unix(0, 0), ids.Empty, ids.ShortEmpty, genesisDataArr, b_empty, time.Unix(0, 0).Unix(), ids.ShortEmpty)
		if err != nil {
			log.Error("error while creating genesis block: %v", err)
			return err
		}

		if err := vm.SaveBlock(vm.DB, genesisBlock); err != nil {
			log.Error("error while saving genesis block: %v", err)
			return err
		}

		// Accept the genesis block
		// Sets [vm.lastAccepted] and [vm.preferred]
		if err := genesisBlock.Accept(); err != nil {
			return fmt.Errorf("error accepting genesis block: %w", err)
		}

		if err := vm.SetDBInitialized(); err != nil {
			return fmt.Errorf("error while setting db to initialized: %w", err)
		}

		// Flush VM's database to underlying db
		if err := vm.DB.Commit(); err != nil {
			log.Error("error while committing db: %v", err)
			return err
		}
	} else {
		log.Info("Database already initialized")
	}
	return nil
}

// CreateHandlers returns a map where:
// Keys: The path extension for this VM's API (empty in this case)
// Values: The handler for the API
func (vm *VM) CreateHandlers() (map[string]*common.HTTPHandler, error) {
	handler, err := vm.NewHandler(Name, &Service{vm})
	return map[string]*common.HTTPHandler{
		"": handler,
	}, err
}

// CreateStaticHandlers returns a map where:
// Keys: The path extension for this VM's static API
// Values: The handler for that static API
// We return nil because this VM has no static API
// CreateStaticHandlers implements the common.StaticVM interface
func (vm *VM) CreateStaticHandlers() (map[string]*common.HTTPHandler, error) {
	newServer := rpc.NewServer()
	codec := cjson.NewCodec()
	newServer.RegisterCodec(codec, "application/json")
	newServer.RegisterCodec(codec, "application/json;charset=UTF-8")

	// name this service "eventtokenizer"
	staticService := CreateStaticService()
	return map[string]*common.HTTPHandler{
		"": {LockOptions: common.WriteLock, Handler: newServer},
	}, newServer.RegisterService(staticService, Name)
}

// Health implements the common.VM interface
func (vm *VM) HealthCheck() (interface{}, error) { return nil, nil }

// BuildBlock returns a block that this vm wants to add to consensus
func (vm *VM) BuildBlock() (snowman.Block, error) {
	if len(vm.poolBlocks) == 0 { // There is no block to be built
		return nil, errNoPendingBlocks
	}

	// Get the value to put in the new block
	blockData := vm.poolBlocks[0]
	vm.poolBlocks = vm.poolBlocks[1:]

	// Notify consensus engine that there are more pending data for blocks
	// (if that is the case) when done building this block
	if len(vm.poolBlocks) > 0 {
		defer vm.NotifyBlockReady()
	}

	// Gets Preferred Block
	preferredIntf, err := vm.GetBlock(vm.Preferred())
	if err != nil {
		return nil, fmt.Errorf("couldn't get preferred block: %w", err)
	}
	preferredHeight := preferredIntf.(*Block).Height()

	timeNow := time.Now()

	//// when the user has not provided a refTime, update it with block timestamp
	//if blockData.refTime == 0 {
	//	blockData.refTime = timeNow.Unix()
	//}

	// Build the block with preferred height
	block, err := vm.NewBlock(vm.Preferred(), preferredHeight+1, timeNow, blockData.sequenceID, blockData.codecAddr, blockData.encodedData, blockData.refID, blockData.refTime, blockData.creatorAddr)

	plainid, _ := formatting.Decode(formatting.CB58, block.ID().String())
	log.Debug(fmt.Sprintf("BuildBlock::BlockID is: CB58: %v, PlainHex: %v", block.ID(), hex.EncodeToString(plainid)))
	if err != nil {
		return nil, fmt.Errorf("couldn't build block: %w", err)
	}

	// Verifies block
	if err := block.Verify(); err != nil {
		return nil, err
	}
	return block, nil
}

// proposeBlock appends [data] to [poolBlocks].
// Then it notifies the consensus engine
// that a new block is ready to be added to consensus
// (namely, a block with data [data])
func (vm *VM) proposeBlock(data BlockData) {
	vm.poolBlocks = append(vm.poolBlocks, data)
	//log.Debug(fmt.Sprintf("proposeBlock: eventDatalength-%d, sequenceID-%s, contract-%s", len(data.eventData), data.sequenceID.String(), data.eventContractAddr.String()))
	vm.NotifyBlockReady()
}

// ParseBlock parses [bytes] to a snowman.Block
// This function is used by the vm's state to unmarshal blocks saved in state
// and by the consensus layer when it receives the byte representation of a block
// from another node
func (vm *VM) ParseBlock(bytes []byte) (snowman.Block, error) {
	// A new empty block
	block := &Block{}

	// Unmarshal the byte repr. of the block into our empty block
	_, err := vm.codec.Unmarshal(bytes, block)
	if err != nil {
		return nil, err
	}

	// Initialize the block
	// (Block inherits Initialize from its embedded *core.Block)
	block.Initialize(bytes, &vm.SnowmanVM)

	// Return the block
	return block, nil
}

// NewBlock returns a new Block where:
// - the block's parent is [parentID]
// - the block's timestamp is [timestamp]
// The block is persisted in storage
func (vm *VM) NewBlock(parentID ids.ID, height uint64, timestamp time.Time, sequenceID ids.ID, codecAddr ids.ShortID, encodedData []byte, refID []byte, refTime int64, creatorAddr ids.ShortID) (*Block, error) {
	// Create our new block
	block := &Block{
		Block:          core.NewBlock(parentID, height, timestamp.Unix()),
		CodecAddress:   codecAddr,
		RefID:          refID,
		RefTime:        refTime,
		EncodedData:    encodedData,
		CreatorAddress: creatorAddr,
	}

	block.SequenceID = sequenceID

	//log.Info(fmt.Sprintf("NewBlock - EncEventData Length:%d", len(block.EncEventData)))

	// Get the byte representation of the block
	blockBytes, err := vm.codec.Marshal(codecVersion, block)
	if err != nil {
		return nil, err
	}

	// Initialize the block by providing it with its byte representation
	// and a reference to SnowmanVM
	block.Initialize(blockBytes, &vm.SnowmanVM)
	return block, nil
}

// Returns this VM's version
func (vm *VM) Version() (string, error) {
	return Version.String(), nil
}

func (vm *VM) Connected(id ids.ShortID) error {
	return nil // noop
}

func (vm *VM) Disconnected(id ids.ShortID) error {
	return nil // noop
}

// This VM doesn't (currently) have any app-specific messages
func (vm *VM) AppGossip(nodeID ids.ShortID, msg []byte) error {
	return nil
}

// This VM doesn't (currently) have any app-specific messages
func (vm *VM) AppRequest(nodeID ids.ShortID, requestID uint32, deadline time.Time, request []byte) error {
	return nil
}

// This VM doesn't (currently) have any app-specific messages
func (vm *VM) AppResponse(nodeID ids.ShortID, requestID uint32, response []byte) error {
	return nil
}

// This VM doesn't (currently) have any app-specific messages
func (vm *VM) AppRequestFailed(nodeID ids.ShortID, requestID uint32) error {
	return nil
}
