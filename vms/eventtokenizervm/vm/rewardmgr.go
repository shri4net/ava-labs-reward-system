package eventtokenizervm

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/ava-labs/avalanchego/api"
	"github.com/ava-labs/avalanchego/ids"
	"github.com/ava-labs/avalanchego/utils/constants"
	"github.com/ava-labs/avalanchego/utils/timer"
	"github.com/ava-labs/avalanchego/vms/avm"
	"github.com/ava-labs/avalanchego/vms/platformvm"

	log "github.com/inconshreveable/log15"
)

type staking_data struct {
	node_id                string
	blockchain_id          string
	primary_staking_amount uint64
	reward_address         []string
	change_address         string
	start_time             string
	end_time               string
	uptime                 float32
	pollticks              uint16
	reward_amount          uint64
}

func (sd *staking_data) ModifyUptime(ut float32) {
	sd.uptime = ut
}

func (sd *staking_data) ModifyRewardAddress(addr []string) {
	sd.reward_address = addr
}

func (sd *staking_data) ModifyPrimaryStakingAmount(amt uint64) {
	sd.primary_staking_amount = amt
}

type RewardMgr struct {
	vm                      *VM
	config                  Config
	timer                   *timer.Timer
	timerCount              int
	subnet_validating_nodes map[string]staking_data
	subnet_id               ids.ID
}

//
func (m *RewardMgr) Initialize(vm *VM, config Config) {
	log.Info("Rewardmgr: Initializing v.0.1")

	m.vm = vm
	m.config = config
	m.subnet_id = m.vm.ctx.SubnetID

	log.Info(fmt.Sprintf("Rewardmgr: Polling interval: %s", m.config.PollingDuration))

	this_NodeID := fmt.Sprintf("NodeID-%s", m.vm.ctx.NodeID.String())
	log.Info(fmt.Sprintf("Rewardmgr: This Node-ID : %s , Master-Node-id : %s", this_NodeID, m.config.MasterNodeID))

	if this_NodeID == m.config.MasterNodeID {
		log.Info(fmt.Sprintf("Rewardmgr: This node %s is the Master Node-id for rewards", this_NodeID))
	} else {
		log.Info(fmt.Sprintf("Rewardmgr: This node %s is NOT the Master Node-id for rewards", this_NodeID))
	}
	m.subnet_validating_nodes = make(map[string]staking_data)

	m.timerCount = 0
	ticker := time.NewTicker(m.config.PollingDuration)
	done := make(chan bool)
	// defer ticker.Stop()
	go func() {
		for {
			select {
			case <-done:
				return
			case <-ticker.C:
				m.timerCount++
				log.Info(fmt.Sprintf("Rewardmgr: polling ticker triggered %d", m.timerCount))

				latest_subnet_validating_nodes := m.GetCurrentSubnetValidators(m.subnet_id)

				nodes_to_be_added := make(map[string]staking_data)
				// Get NEWLY ADDED validators
				for _, l_svn := range latest_subnet_validating_nodes {
					_, prs := m.subnet_validating_nodes[l_svn.node_id]
					if !prs {
						nodes_to_be_added[l_svn.node_id] = staking_data{node_id: l_svn.node_id}
						log.Info(fmt.Sprintf("Rewardmgr: Subnet Validator Nodes - Newly Added: %s", l_svn.node_id))
					}
				}

				nodes_to_be_rewarded_and_removed := make(map[string]staking_data)
				// Get REMOVED validators
				for _, svn := range m.subnet_validating_nodes {
					_, prs := latest_subnet_validating_nodes[svn.node_id]
					if !prs {
						//  nodes_to_be_rewarded_and_removed[svn.node_id] = staking_data{node_id: svn.node_id}
						log.Info(fmt.Sprintf("Rewardmgr: Subnet Validator Nodes - To be Rewarded & Removed: %s", svn.node_id))
						sd := staking_data{node_id: svn.node_id, reward_address: svn.reward_address, primary_staking_amount: svn.primary_staking_amount, uptime: svn.uptime}
						nodes_to_be_rewarded_and_removed[svn.node_id] = sd
					}
				}

				// Add the NEW nodes
				for _, n := range nodes_to_be_added {
					m.subnet_validating_nodes[n.node_id] = staking_data{node_id: n.node_id}
				}

				primary_validating_nodes := m.GetCurrentValidators(constants.PrimaryNetworkID)
				for _, pvn := range primary_validating_nodes {
					_, prs := m.subnet_validating_nodes[pvn.node_id]
					if prs {
						if m.subnet_validating_nodes[pvn.node_id].node_id != pvn.node_id {
							log.Error(fmt.Sprintf("Rewardmgr: Something wrong with node_id record! %s", m.subnet_validating_nodes[pvn.node_id].node_id))
							continue
						}

						if len(m.subnet_validating_nodes[pvn.node_id].reward_address) != len(pvn.reward_address) ||
							m.subnet_validating_nodes[pvn.node_id].primary_staking_amount != pvn.primary_staking_amount ||
							m.subnet_validating_nodes[pvn.node_id].uptime != pvn.uptime {

							// Update the records
							sd := staking_data{node_id: pvn.node_id, reward_address: pvn.reward_address, primary_staking_amount: pvn.primary_staking_amount, uptime: pvn.uptime}
							m.subnet_validating_nodes[pvn.node_id] = sd
							log.Info(fmt.Sprintf("Rewardmgr: Updated records for %s from primary network", pvn.node_id))
							log.Info(fmt.Sprintf("Rewardmgr: Updated records %s", pvn.reward_address))

						}
					}
				}

				// Reward every polling interval
				for _, n := range m.subnet_validating_nodes {
					if len(n.reward_address) > 0 {
						rewardaddr := n.reward_address[0]
						if rewardaddr[0:2] == "P-" {
							rewardaddr = "X-" + rewardaddr[2:]
						}
						if m.config.RewardDisbursal == "end" {
						    updatedRewardAmount := m.subnet_validating_nodes[n.node_id].reward_amount + m.CalculateReward()
						    log.Debug(fmt.Sprintf("Rewardmgr: updatedRewardAmount : %d for %s", updatedRewardAmount, n.node_id))
						    sd := staking_data{node_id: n.node_id, reward_address: n.reward_address, primary_staking_amount: n.primary_staking_amount, uptime: n.uptime, reward_amount: updatedRewardAmount}
						    m.subnet_validating_nodes[n.node_id] = sd
						} else if m.config.RewardDisbursal == "periodic" {
							if this_NodeID == m.config.MasterNodeID {
								m.SendRewards(rewardaddr, m.CalculateReward())
								// TODO : check if the SendRewards is successful and then loop for sending next rewards
								// workaround of sleep so that last transaction is not duplicated 
								time.Sleep(5 * time.Second)
							} else {
								log.Debug(fmt.Sprintf("Rewardmgr: This node %s is NOT the Master Node-id for rewards", this_NodeID))
							}
						}
					} else {
						log.Warn(fmt.Sprintf("Rewardmgr: periodic : No address found for rewards: %s", n.node_id))
					}
				}

				// Reward & Remove the finished nodes
				for _, n := range nodes_to_be_rewarded_and_removed {
					if len(n.reward_address) > 0 {
						rewardaddr := n.reward_address[0]
						if rewardaddr[0:2] == "P-" {
							rewardaddr = "X-" + rewardaddr[2:]
						}
						if m.config.RewardDisbursal == "end" {
							if this_NodeID == m.config.MasterNodeID {
								endRewardAmount := m.subnet_validating_nodes[n.node_id].reward_amount
						                log.Debug(fmt.Sprintf("Rewardmgr: endRewardAmount : %d", endRewardAmount))
								m.SendRewards(rewardaddr, endRewardAmount)
							} else {
								log.Debug(fmt.Sprintf("Rewardmgr: This node %s is NOT the Master Node-id for rewards", this_NodeID))
							}
						}
					} else {
						log.Warn(fmt.Sprintf("Rewardmgr: end : No address found for rewards: %s", n.node_id))
					}
					delete(m.subnet_validating_nodes, n.node_id)
				}

			}
		}
	}()
}

//
func (m *RewardMgr) GetCurrentValidators(networkid ids.ID) map[string]staking_data {
	log.Debug(fmt.Sprintf("Rewardmgr: GetCurrentValidators: %v", networkid))

	pclient := platformvm.NewClient(m.config.LocalRpcUri, time.Minute)
	nodeIDs := []ids.ShortID{}
	currentValidators, err := pclient.GetCurrentValidators(networkid, nodeIDs)
	if err != nil {
		log.Error(fmt.Sprintf("Rewardmgr: Error in GetCurrentValidators: %v", err))
		return nil
	}

	validating_nodes := make(map[string]staking_data)
	for _, validatorMap := range currentValidators {
		// Validator
		validatorBytes, err := json.Marshal(validatorMap)
		if err != nil {
			log.Error(err.Error())
			return nil
		}
		validator := platformvm.APIPrimaryValidator{}

		err = json.Unmarshal(validatorBytes, &validator)
		if err != nil {
			log.Error(err.Error())
			return nil
		}

		// Uptime
		ut := float32(*validator.Uptime)

		// StakingAmount
		samount := uint64(*validator.StakeAmount)

		//log.Info(fmt.Sprintf("NodeID:%s Uptime:%f, StakeAmount:%d, RewardAddress:%s", validator.NodeID, ut, samount, validator.RewardOwner.Addresses[0]))

		sd := staking_data{node_id: validator.NodeID, reward_address: validator.RewardOwner.Addresses, primary_staking_amount: samount, uptime: ut}
		validating_nodes[validator.NodeID] = sd
	}

	log.Debug(fmt.Sprintf("Rewardmgr: Primary Network Node Count: %d", len(validating_nodes)))
	return validating_nodes
}

//
func (m *RewardMgr) GetCurrentSubnetValidators(networkid ids.ID) map[string]staking_data {
	log.Debug(fmt.Sprintf("Rewardmgr: GetCurrentSubnetValidators: %v", networkid))

	pclient := platformvm.NewClient(m.config.LocalRpcUri, time.Minute)
	nodeIDs := []ids.ShortID{}
	currentValidators, err := pclient.GetCurrentValidators(networkid, nodeIDs)
	if err != nil {
		log.Error(fmt.Sprintf("Rewardmgr: Error in GetCurrentSubnetValidators: %v", err))
		return nil
	}

	validating_nodes := make(map[string]staking_data)
	for _, validatorMap := range currentValidators {
		// Validator
		validatorBytes, err := json.Marshal(validatorMap)
		if err != nil {
			log.Error(err.Error())
			return nil
		}
		validator := platformvm.APIPrimaryValidator{}

		err = json.Unmarshal(validatorBytes, &validator)
		if err != nil {
			log.Error(err.Error())
			return nil
		}

		log.Debug(fmt.Sprintf("Rewardmgr: CurrentSubnetValidators NodeID:%s", validator.NodeID))

		sd := staking_data{node_id: validator.NodeID}
		validating_nodes[validator.NodeID] = sd
	}

	return validating_nodes
}

//
func (m *RewardMgr) SendRewards(rewardAddress string, rewardAmount uint64) {

	avmclient := avm.NewClient(m.config.LocalRpcUri, "X", time.Minute)
	user := api.UserPass{Username: m.config.RewarderUser, Password: m.config.RewarderPassword}
	from := []string{m.config.RewarderAddress}
	to := rewardAddress
	amt := rewardAmount
	assetID := m.config.RewardTokenID //RWD - RewardToken
	if m.config.RewardAsset == "custom" {
	   assetID = m.config.RewardTokenID //RWD - RewardToken
	} else if m.config.RewardAsset == "avax" {
           assetID = m.vm.ctx.AVAXAssetID.String()    // alternative = "AVAX"
	}

	sendTx, err := avmclient.Send(user, from, from[0], amt, assetID, to, "hello")
	if err != nil {
		log.Error(fmt.Sprintf("Rewardmgr: Error in SendRewards: %v", err))
		return
	} else {
		log.Debug(fmt.Sprintf("Rewardmgr: SendRewards AssetID: %s ToAddress : %s  Tx: %s", assetID, to, sendTx.String()))
	}
}

//
func (m *RewardMgr) CalculateReward() uint64 {
        rewardAmount := uint64(0)
	if m.config.EnableReward {
	   rewardAmount = m.config.RewardValue
	}

	log.Debug(fmt.Sprintf("Rewardmgr: Reward Amount : %d", rewardAmount))
	return rewardAmount
}
