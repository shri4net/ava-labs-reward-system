// (c) 2019-2020, Ava Labs, Inc. All rights reserved.
// See the file LICENSE for licensing terms.

package eventtokenizervm

import (
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
)

/*
// Data maintained by User/UI
	EncEventData
	EventContractAddr
	EventTime

// Data maintained by System
	UniqueID
	TrackID
	Timestamp|PublishTime
*/

type BlockData struct {
	trackID           ids.ID
	eventData         []byte
	eventContractAddr ids.ShortID
	eventTime         int64
}

// VM implements the snowman.VM interface
// Each block in this chain contains a Unix timestamp
// and a piece of data (a string)
type VM struct {
	core.SnowmanVM
	codec codec.Manager
	// Proposed pieces of data that haven't been put into a block and proposed yet
	//mempool [][dataLen]byte
	rwdm       RewardMgr
	ctx        *snow.Context
	config     Config
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
) error {
	vm.config.SetDefaults()
	version, err := vm.Version()
	vm.ctx = ctx
	if err != nil {
		log.Error("error initializing Timestamp VM: %v", err)
		return err
	}
	log.Info("Initializing Timestamp VM", "Version", version)
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

		// Create the genesis block
		// Timestamp of genesis block is 0. It has no parent.
		genesisBlock, err := vm.NewBlock(ids.Empty, 0, time.Unix(0, 0), ids.Empty, ids.ShortEmpty, time.Now().Unix(), genesisDataArr)
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

	// name this service "timestamp"
	staticService := CreateStaticService()
	return map[string]*common.HTTPHandler{
		"": {LockOptions: common.WriteLock, Handler: newServer},
	}, newServer.RegisterService(staticService, Name)
}

// Health implements the common.VM interface
func (vm *VM) HealthCheck() (interface{}, error) { return nil, nil }

// BuildBlock returns a block that this vm wants to add to consensus
func (vm *VM) BuildBlock() (snowman.Block, error) {
	//if len(vm.mempool) == 0 { // There is no block to be built
	if len(vm.poolBlocks) == 0 { // There is no block to be built
		return nil, errNoPendingBlocks
	}

	// Get the value to put in the new block
	//value := vm.mempool[0]
	//vm.mempool = vm.mempool[1:]
	blockData := vm.poolBlocks[0]
	vm.poolBlocks = vm.poolBlocks[1:]

	// Notify consensus engine that there are more pending data for blocks
	// (if that is the case) when done building this block
	//if len(vm.mempool) > 0 {
	if len(vm.poolBlocks) > 0 {
		defer vm.NotifyBlockReady()
	}

	// Gets Preferred Block
	preferredIntf, err := vm.GetBlock(vm.Preferred())
	if err != nil {
		return nil, fmt.Errorf("couldn't get preferred block: %w", err)
	}
	preferredHeight := preferredIntf.(*Block).Height()

	log.Info(fmt.Sprintf("BuildBlock - EncEventData Length:%d", len(blockData.eventData)))

	// Build the block with preferred height
	block, err := vm.NewBlock(vm.Preferred(), preferredHeight+1, time.Now(), blockData.trackID, blockData.eventContractAddr, blockData.eventTime, blockData.eventData)
	if err != nil {
		return nil, fmt.Errorf("couldn't build block: %w", err)
	}

	// Verifies block
	if err := block.Verify(); err != nil {
		return nil, err
	}
	return block, nil
}

// proposeBlock appends [data] to [p.mempool].
// Then it notifies the consensus engine
// that a new block is ready to be added to consensus
// (namely, a block with data [data])
//func (vm *VM) proposeBlock(data [dataLen]byte) {
func (vm *VM) proposeBlock(data BlockData) {
	//vm.mempool = append(vm.mempool, data)
	vm.poolBlocks = append(vm.poolBlocks, data)
	log.Info(fmt.Sprintf("proposeBlock: eventDatalength-%d, trackID-%s, contract-%s", len(data.eventData), data.trackID.String(), data.eventContractAddr.String()))
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
// - the block's data is [data]
// - the block's timestamp is [timestamp]
// The block is persisted in storage
func (vm *VM) NewBlock(parentID ids.ID, height uint64, timestamp time.Time, trackID ids.ID, eventContractAddr ids.ShortID, eventTime int64, encEventData []byte) (*Block, error) {
	// Create our new block
	block := &Block{
		Block:             core.NewBlock(parentID, height),
		Timestamp:         timestamp.Unix(),
		EventContractAddr: eventContractAddr,
		EventTime:         eventTime,
		EncEventData:      encEventData,
	}
	block.UniqueID = block.ID()
	if trackID == ids.Empty {
		block.TrackID = block.UniqueID
	} else {
		block.TrackID = trackID
	}
	//block.AppData = appData
	//block.AppDataAddr = ids.ShortEmpty

	log.Info(fmt.Sprintf("NewBlock - EncEventData Length:%d", len(block.EncEventData)))

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
