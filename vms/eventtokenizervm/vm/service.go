// (c) 2019-2020, Ava Labs, Inc. All rights reserved.
// See the file LICENSE for licensing terms.

package eventtokenizervm

import (
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/ava-labs/avalanchego/ids"
	"github.com/ava-labs/avalanchego/utils/formatting"
	"github.com/ava-labs/avalanchego/utils/json"
	"github.com/ava-labs/coreth/accounts"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/crypto"
	log "github.com/inconshreveable/log15"
)

var (
	errBadData     = errors.New("data must be base 58 repr. of 32 bytes")
	errNoSuchBlock = errors.New("couldn't get block from database. Does it exist?")
)

func errorBadData(msg string) error {
	//return errors.New(msg + " :data must be base 58 repr. of 32 bytes")
	return errors.New("Bad Data: " + msg)
}

// Service is the API service for this VM
type Service struct{ vm *VM }

// ProposeBlockArgs are the arguments to function ProposeBlock
type ProposeBlockArgs struct {
	SequenceID     string `json:"sequenceID"`     // Exact: 40 bytes 	(ids.ID)
	CodecAddress   string `json:"codecAddress"`   // Exact: 20 bytes 	(ids.ShortID)
	EncodedData    string `json:"encodedData"`    // Max: 	1K bytes	(encoded JSON string)
	RefID          string `json:"refID"`          // Max: 	32 bytes	(string)
	RefTime        string `json:"refTime"`        // Exact: 8 bytes 	(int64)
	CreatorAddress string `json:"creatorAddress"` // Exact: 20 bytes 	(ids.ShortID)
	SignedHash     string `json:"signedHash"`     // Exact: 65 bytes
}

// ProposeBlockReply is the reply from function ProposeBlock
type ProposeBlockReply struct{ Success bool }

// ProposeBlock is an API method to propose a new block.
func (s *Service) ProposeBlock(_ *http.Request, args *ProposeBlockArgs, reply *ProposeBlockReply) error {

	//// SequenceID
	sqid := ids.Empty
	if args.SequenceID != "" {
		asqid, errtr := ids.FromString(args.SequenceID)
		if errtr != nil {
			return errorBadData("SequenceID")
		}
		sqid = asqid
	}

	//// SignedHash
	if args.SignedHash != "" {
		bSignedHash, errsh := hexutil.Decode(args.SignedHash)
		if errsh != nil {
			return errorBadData(fmt.Sprintf("SignedHash - %v", errsh.Error()))
		}
		if bSignedHash[crypto.RecoveryIDOffset] != 27 && bSignedHash[crypto.RecoveryIDOffset] != 28 {
			return errorBadData("SignedHash - invalid Ethereum signature (V is not 27 or 28)")
		}
		bSignedHash[crypto.RecoveryIDOffset] -= 27 // Transform yellow paper V from 27/28 to 0/1

		originalmsg := "New Shipment"
		if args.SequenceID != "" {
			originalmsg = "New Event"
		}
		boriginalmsg := []byte(originalmsg)
		rpk, errsp := crypto.SigToPub(accounts.TextHash(boriginalmsg), bSignedHash)
		if errsp != nil {
			return errorBadData(fmt.Sprintf("SignedHash - %v", errsp.Error()))
		}
		daddr := crypto.PubkeyToAddress(*rpk)
		log.Debug(fmt.Sprintf("Block is signed by - Address:%v\n", daddr))
	} else {
		log.Debug("Block is not signed")
	}

	// Needs to verify that the Signed by Address and Passed Address are same.
	// Based on it, this request can be rejected or accepted as required.

	//// CodecAddress
	addrhs, _ := hex.DecodeString(args.CodecAddress)
	addrstr, erra := formatting.EncodeWithChecksum(formatting.CB58, addrhs[:]) // bytes to encoded string
	if erra != nil {
		log.Error(erra.Error())
		return errorBadData("CodecAddress - EncodeWithChecksum " + args.CodecAddress)
	}
	addr, errid := ids.ShortFromString(addrstr)
	if errid != nil {
		log.Error(errid.Error())
		return errorBadData("CodecAddress " + args.CodecAddress)
	}

	//// EncodedData
	bytes, _ := hex.DecodeString(args.EncodedData)
	if len(bytes) > maxEvtDataLen {
		return errorBadData("EncodedData should not be greater than 1K bytes")
	}
	data := make([]byte, len(bytes))
	copy(data[:], bytes) // Copy the bytes in dataSlice to data

	//// RefID
	b_refid := []byte(args.RefID)
	if len(b_refid) > 32 {
		return errorBadData("RefID should not be greater than 32 bytes")
	}

	//// RefTime
	var et int64 = 0
	if args.RefTime != "" {
		aet1, errt1 := strconv.ParseInt(args.RefTime, 10, 64)
		if errt1 == nil {
			et = aet1
		} else {
			aet2, errt2 := time.Parse(time.RFC3339, args.RefTime)
			if errt2 == nil {
				et = aet2.Unix()
			} else {
				log.Error(errt1.Error())
				log.Error(errt2.Error())
				return errorBadData("RefTime " + args.RefTime + " not in Unix or RFC3339 format")
			}
		}
	}

	//// CreatorAddress
	creatoraddrhs, _ := hex.DecodeString(args.CreatorAddress)
	creatoraddrstr, errca := formatting.EncodeWithChecksum(formatting.CB58, creatoraddrhs[:]) // bytes to encoded string
	if errca != nil {
		log.Error(errca.Error())
		return errorBadData("CreatorAddress - EncodeWithChecksum " + args.CreatorAddress)
	}
	creatoraddr, errcid := ids.ShortFromString(creatoraddrstr)
	if errcid != nil {
		log.Error(errcid.Error())
		return errorBadData("CreatorAddress " + args.CreatorAddress)
	}

	blockData := BlockData{sequenceID: sqid, encodedData: data, codecAddr: addr, refID: b_refid, refTime: et, creatorAddr: creatoraddr} //time.Now().Unix()}
	//log.Debug(fmt.Sprintf("Service::ProposeBlock - EncEventData Length:%d, %d, %d", len(blockData.eventData), len(data), len(bytes)))

	s.vm.proposeBlock(blockData)
	reply.Success = true
	return nil
}

// APIBlock is the API representation of a block
type APIBlock struct {
	Timestamp      json.Uint64 `json:"timestamp"` // Timestamp of most recent block
	EventID        string      `json:"eventID"`   // String repr. of ID of the most recent block
	ParentID       string      `json:"parentID"`  // String repr. of ID of the most recent block's parent
	SequenceID     string      `json:"sequenceID"`
	CodecAddress   string      `json:"codecAddress"` // 20
	EncodedData    string      `json:"encodedData"`  // 1K
	RefID          string      `json:"refID"`
	RefTime        json.Uint64 `json:"refTime"`
	CreatorAddress string      `json:"creatorAddress"` // 20
}

// GetBlockArgs are the arguments to GetBlock
type GetBlockArgs struct {
	// ID of the block we're getting.
	// If left blank, gets the latest block
	ID string
}

// GetBlockReply is the reply from GetBlock
type GetBlockReply struct {
	APIBlock
}

// GetBlock gets the block whose ID is [args.ID]
// If [args.ID] is empty, get the latest block
func (s *Service) GetBlock(_ *http.Request, args *GetBlockArgs, reply *GetBlockReply) error {
	// If an ID is given, parse its string representation to an ids.ID
	// If no ID is given, ID becomes the ID of last accepted block
	var id ids.ID
	var err error
	if args.ID == "" {
		id, err = s.vm.LastAccepted()
		if err != nil {
			return fmt.Errorf("problem finding the last accepted ID: %s", err)
		}
	} else {
		id, err = ids.FromString(args.ID)
		if err != nil {
			return errors.New("problem parsing ID")
		}
	}

	// Get the block from the database
	blockInterface, err := s.vm.GetBlock(id)
	if err != nil {
		return errNoSuchBlock
	}

	block, ok := blockInterface.(*Block)
	if !ok { // Should never happen but better to check than to panic
		return errBadData
	}

	//log.Info(fmt.Sprintf("Service::GetBlock - EncEventData Length:%d", len(block.EncEventData)))

	// Fill out the response with the block's data
	reply.APIBlock.EventID = block.ID().String()
	reply.APIBlock.Timestamp = json.Uint64(block.Timestamp().Unix())
	reply.APIBlock.ParentID = block.Parent().String()
	reply.APIBlock.EncodedData = hex.EncodeToString(block.EncodedData)
	reply.APIBlock.SequenceID = block.SequenceID.String()
	reply.APIBlock.CodecAddress = block.CodecAddress.Hex()
	reply.APIBlock.RefID = string(block.RefID)
	reply.APIBlock.RefTime = json.Uint64(block.RefTime)
	reply.APIBlock.CreatorAddress = block.CreatorAddress.Hex()

	return err
}

// GetBlockArgs are the arguments to GetBlock
type GetBlocksArgs struct {
	// ID of the block we're getting.
	// If left blank, gets the latest block
	IDs []string
}

// GetBlockReply is the reply from GetBlock
type GetBlocksReply struct {
	APIBlocks []APIBlock
}

// GetBlock gets the block whose ID is [args.ID]
// If [args.ID] is empty, get the latest block
func (s *Service) GetBlocks(_ *http.Request, args *GetBlocksArgs, reply *GetBlocksReply) error {
	// If an ID is given, parse its string representation to an ids.ID
	// If no ID is given, ID becomes the ID of last accepted block

	var err error
	for i := 0; i < len(args.IDs); i++ {
		var id ids.ID
		if args.IDs[i] == "" {
			id, err = s.vm.LastAccepted()
			if err != nil {
				return fmt.Errorf("problem finding the last accepted ID: %s", err)
			}
		} else {
			id, err = ids.FromString(args.IDs[i])
			if err != nil {
				return errors.New("problem parsing ID")
			}
		}

		// Get the block from the database
		blockInterface, err := s.vm.GetBlock(id)
		if err != nil {
			return errNoSuchBlock
		}

		block, ok := blockInterface.(*Block)
		if !ok { // Should never happen but better to check than to panic
			return errBadData
		}

		//log.Info(fmt.Sprintf("Service::GetBlock - EncEventData Length:%d", len(block.EncEventData)))

		// Fill out the response with the block's data

		var APIBlock APIBlock
		APIBlock.EventID = block.ID().String()
		APIBlock.Timestamp = json.Uint64(block.Timestamp().Unix())
		APIBlock.ParentID = block.Parent().String()
		APIBlock.EncodedData = hex.EncodeToString(block.EncodedData)
		APIBlock.SequenceID = block.SequenceID.String()
		APIBlock.CodecAddress = block.CodecAddress.Hex()
		APIBlock.RefID = string(block.RefID)
		APIBlock.RefTime = json.Uint64(block.RefTime)
		APIBlock.CreatorAddress = block.CreatorAddress.Hex()

		reply.APIBlocks = append(reply.APIBlocks, APIBlock)
	}
	return err
}

/// Reward module

type RewardConfigReply struct {
	MasterNodeID    string `json:"master-node-id"`
	SubnetIDStr     string `json:"subnet-id-str"`
	RewardeeAddress string
	RewardTokenID   string
	PollingDuration time.Duration
}

// GetRewardConfig details
func (s *Service) GetRewardConfig(_ *http.Request, args *GetBlockArgs, reply *RewardConfigReply) error {
	// If an ID is given, parse its string representation to an ids.ID
	// If no ID is given, ID becomes the ID of last accepted block
	var err error
	if args.ID == "" {
		_, err = s.vm.LastAccepted()
		if err != nil {
			return fmt.Errorf("problem finding the last accepted ID: %s", err)
		}
	} else {
		_, err = ids.FromString(args.ID)
		if err != nil {
			return errors.New("problem parsing ID")
		}
	}

	// Fill out the response with the block's data
	reply.MasterNodeID = s.vm.rwdm.config.MasterNodeID
	//reply.SubnetIDStr = s.vm.rwdm.config.SubnetIDStr
	reply.SubnetIDStr = s.vm.ctx.SubnetID.String()
	reply.RewardeeAddress = s.vm.rwdm.config.RewarderAddress
	reply.RewardTokenID = s.vm.rwdm.config.RewardTokenID
	reply.PollingDuration = s.vm.rwdm.config.PollingDuration

	return err
}

// SetRewardConfigArgs are the arguments to function SetRewardConfig
type SetRewardConfigArgs struct {
	RewardeeAddress string
	RewardTokenID   string
}

// SetRewardConfigReply is the reply from function SetRewardConfig
type SetRewardConfigReply struct{ Success bool }

// SetRewardConfig is an API method to change some VM config parameters
// TODO: Needs node admin previledges to access this endpoint
func (s *Service) SetRewardConfig(_ *http.Request, args *SetRewardConfigArgs, reply *SetRewardConfigReply) error {

	s.vm.rwdm.config.RewarderAddress = args.RewardeeAddress
	s.vm.rwdm.config.RewardTokenID = args.RewardTokenID

	reply.Success = true
	return nil
}
