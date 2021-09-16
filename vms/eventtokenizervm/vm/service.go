// (c) 2019-2020, Ava Labs, Inc. All rights reserved.
// See the file LICENSE for licensing terms.

package eventtokenizervm

import (
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/ava-labs/avalanchego/ids"
	"github.com/ava-labs/avalanchego/utils/formatting"
	"github.com/ava-labs/avalanchego/utils/json"
	log "github.com/inconshreveable/log15"
)

var (
	errBadData     = errors.New("data must be base 58 repr. of 32 bytes")
	errNoSuchBlock = errors.New("couldn't get block from database. Does it exist?")
)

func errorBadData(msg string) error {
	return errors.New(msg + " :data must be base 58 repr. of 32 bytes")
}

// Service is the API service for this VM
type Service struct{ vm *VM }

// ProposeBlockArgs are the arguments to function ProposeValue
type ProposeBlockArgs struct {
	// Data in the block. Must be base 58 encoding of 32 bytes.
	//Data string `json:"data"`
	TrackID           string `json:"trackID"`
	EventContractAddr string `json:"eventContractAddr"` // 20
	EncEventData      string `json:"encEventData"`      // 1K
	EventTime         string `json:"eventTime"`
}

// ProposeBlockReply is the reply from function ProposeBlock
type ProposeBlockReply struct{ Success bool }

// ProposeBlock is an API method to propose a new block whose data is [args].Data.
// [args].Data must be a string repr. of a 32 byte array
func (s *Service) ProposeBlock(_ *http.Request, args *ProposeBlockArgs, reply *ProposeBlockReply) error {

	trid, errtr := ids.FromString(args.TrackID)
	if errtr != nil {
		return errorBadData("TrackID")
	}

	/*
		bytes := []byte(args.EncEventData)
		if len(bytes) > maxEvtDataLen {
			return errorBadData("EncEventData")
		}
	*/
	bytes, _ := hex.DecodeString(args.EncEventData)
	if len(bytes) > maxEvtDataLen {
		return errorBadData("EncEventData")
	}

	/*
		bytes, err := formatting.Decode(formatting.CB58, args.EncEventData)
		if err != nil || len(bytes) != maxEvtDataLen {
			//return errBadData
			return errorBadData("EncEventData")
		}
	*/

	//var data []byte // The data as an array of bytes
	data := make([]byte, len(bytes)) //bytes[len(bytes)]
	//copy(data[:], bytes[:maxEvtDataLen]) // Copy the bytes in dataSlice to data
	copy(data[:], bytes) // Copy the bytes in dataSlice to data
	//data = append(data, bytes[])

	/*
		a, erra := hex.DecodeString(args.EventContractAddr)
		if erra != nil {
			log.Error(erra.Error())
			return errorBadData("EventContractAddr - Hex " + args.EventContractAddr)
		}
	*/
	// hex-string to bytes
	//addrhs := []byte(args.EventContractAddr)
	addrhs, _ := hex.DecodeString(args.EventContractAddr)
	log.Info(fmt.Sprintf("Length: %d", len(addrhs)))

	// bytes to encoded string
	addrstr, erra := formatting.EncodeWithChecksum(formatting.CB58, addrhs[:])
	if erra != nil {
		log.Error(erra.Error())
		return errorBadData("EventContractAddr - EncodeWithChecksum " + args.EventContractAddr)
	}

	addr, errid := ids.ShortFromString(addrstr)
	if errid != nil {
		log.Error(errid.Error())
		//return errBadData
		return errorBadData("EventContractAddr " + args.EventContractAddr)
	}

	blockData := BlockData{trackID: trid, eventData: data, eventContractAddr: addr, eventTime: time.Now().Unix()}
	log.Info(fmt.Sprintf("Service::ProposeBlock - EncEventData Length:%d, %d, %d", len(blockData.eventData), len(data), len(bytes)))

	//s.vm.proposeBlock(data)
	s.vm.proposeBlock(blockData)
	reply.Success = true
	return nil
}

// APIBlock is the API representation of a block
type APIBlock struct {
	Timestamp json.Uint64 `json:"timestamp"` // Timestamp of most recent block
	//Data      			string      `json:"data"`      // Data in the most recent block. Base 58 repr. of 5 bytes.
	ID                string      `json:"id"`       // String repr. of ID of the most recent block
	ParentID          string      `json:"parentID"` // String repr. of ID of the most recent block's parent
	TrackID           string      `json:"trackID"`
	EventContractAddr string      `json:"eventContractAddr"` // 20
	EncEventData      string      `json:"encEventData"`      // 1K
	EventTime         json.Uint64 `json:"eventTime"`
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

	log.Info(fmt.Sprintf("Serive::GetBlock - EncEventData Length:%d", len(block.EncEventData)))

	// Fill out the response with the block's data
	reply.APIBlock.ID = block.ID().String()
	reply.APIBlock.Timestamp = json.Uint64(block.Timestamp)
	reply.APIBlock.ParentID = block.Parent().String()
	//reply.APIBlock.EncEventData, err = formatting.EncodeWithChecksum(formatting.CB58, block.EncEventData[:])
	reply.APIBlock.EncEventData = hex.EncodeToString(block.EncEventData)
	reply.APIBlock.TrackID = block.TrackID.String()
	reply.APIBlock.EventContractAddr = block.EventContractAddr.Hex()
	reply.APIBlock.EventTime = json.Uint64(block.EventTime)

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
	reply.SubnetIDStr = s.vm.rwdm.config.SubnetIDStr
	reply.RewardeeAddress = s.vm.rwdm.config.RewardeeAddress
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
func (s *Service) SetRewardConfig(_ *http.Request, args *SetRewardConfigArgs, reply *SetRewardConfigReply) error {

	s.vm.rwdm.config.RewardeeAddress = args.RewardeeAddress
	s.vm.rwdm.config.RewardTokenID = args.RewardTokenID

	reply.Success = true
	return nil
}
