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
	// TODO : add fields for rewards
	//reward_node_id
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

const (
	localRpcUri = "http://199.192.25.252:9650"
)

///
func (m *RewardMgr) Initialize(vm *VM, config Config) {
	log.Info("TimestampVM: Mempool initializing v.0.1")

	m.vm = vm
	m.config = config
	sid, err := ids.FromString(config.SubnetIDStr)
	if err != nil {
		log.Error(fmt.Sprintf("TimestampVM: Error in GetCurrentValidators: %v", err))
		return
	}
	m.subnet_id = sid

	m.subnet_validating_nodes = make(map[string]staking_data)

	log.Info(fmt.Sprintf("Polling interval: %s", m.config.PollingDuration))
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
				log.Info(fmt.Sprintf("TimestampVM: ticker.C triggered %d", m.timerCount))

				latest_subnet_validating_nodes := m.GetCurrentSubnetValidators(m.subnet_id)

				nodes_to_be_added := make(map[string]staking_data)
				// Get NEWLY ADDED validators
				for _, l_svn := range latest_subnet_validating_nodes {
					_, prs := m.subnet_validating_nodes[l_svn.node_id]
					if !prs {
						nodes_to_be_added[l_svn.node_id] = staking_data{node_id: l_svn.node_id}
						log.Info(fmt.Sprintf("Subnet Validator Nodes - Newly Added: %s", l_svn.node_id))
					}
				}

				nodes_to_be_rewarded_and_removed := make(map[string]staking_data)
				// Get REMOVED validators
				for _, svn := range m.subnet_validating_nodes {
					_, prs := latest_subnet_validating_nodes[svn.node_id]
					if !prs {
						nodes_to_be_rewarded_and_removed[svn.node_id] = staking_data{node_id: svn.node_id}
						log.Info(fmt.Sprintf("Subnet Validator Nodes - To be Rewarded & Removed: %s", svn.node_id))
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
							log.Error(fmt.Sprintf("Something wrong with node_id record! %s", m.subnet_validating_nodes[pvn.node_id].node_id))
							continue
						}

						if len(m.subnet_validating_nodes[pvn.node_id].reward_address) != len(pvn.reward_address) ||
							m.subnet_validating_nodes[pvn.node_id].primary_staking_amount != pvn.primary_staking_amount ||
							m.subnet_validating_nodes[pvn.node_id].uptime != pvn.uptime {

							// Update the records
							sd := staking_data{node_id: pvn.node_id, reward_address: pvn.reward_address, primary_staking_amount: pvn.primary_staking_amount, uptime: pvn.uptime}
							m.subnet_validating_nodes[pvn.node_id] = sd
							log.Info(fmt.Sprintf("Updated records for %s from primary network", pvn.node_id))
							log.Info(fmt.Sprintf("Updated records %s", pvn.reward_address))

							// Update the reward records
							if len(nodes_to_be_rewarded_and_removed) > 0 {
								nodes_to_be_rewarded_and_removed[pvn.node_id] = sd
								log.Info(fmt.Sprintf("Updated reward records for %s from primary network", pvn.node_id))
							}
						}
					}
				}

				this_NodeID := fmt.Sprintf("NodeID-%s", m.vm.ctx.NodeID.String())
				log.Info(fmt.Sprintf("This Node-ID %s, Master-Node-id %s", this_NodeID, m.config.MasterNodeID))

				// Reward every polling interval
				if this_NodeID == m.config.MasterNodeID {
					for _, n := range m.subnet_validating_nodes {
						if len(n.reward_address) > 0 {
							rewardaddr := n.reward_address[0]
							if rewardaddr[0:2] == "P-" {
								rewardaddr = "X-" + rewardaddr[2:]
							}
							m.SendRewards(rewardaddr, m.CalculateReward())
						} else {
							log.Warn(fmt.Sprintf("No address found for rewards: %s", n.node_id))
						}
					}
				} else {
					log.Warn(fmt.Sprintf("This node %s is NOT the Master Node-id for rewards", this_NodeID))
				}

				// Reward & Remove the finished nodes
				for _, n := range nodes_to_be_rewarded_and_removed {
					if this_NodeID == m.config.MasterNodeID {
						if len(n.reward_address) > 0 {
							rewardaddr := n.reward_address[0]
							if rewardaddr[0:2] == "P-" {
								rewardaddr = "X-" + rewardaddr[2:]
							}
							m.SendRewards(rewardaddr, m.CalculateReward())
						} else {
							log.Warn(fmt.Sprintf("No address found for rewards: %s", n.node_id))
						}
					} else {
						log.Warn(fmt.Sprintf("This node %s is NOT the Master Node-id for rewards", this_NodeID))
					}
					delete(m.subnet_validating_nodes, n.node_id)
				}

			}
		}
	}()
}

///
func (m *RewardMgr) GetCurrentValidators(networkid ids.ID) map[string]staking_data {
	log.Info(fmt.Sprintf("TimestampVM: GetCurrentValidators: %v", networkid))

	pclient := platformvm.NewClient(localRpcUri, time.Minute)
	currentValidators, err := pclient.GetCurrentValidators(networkid)
	if err != nil {
		log.Error(fmt.Sprintf("TimestampVM: Error in GetCurrentValidators: %v", err))
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

	log.Info(fmt.Sprintf("Primary Network Node Count: %d", len(validating_nodes)))
	return validating_nodes
}

//
func (m *RewardMgr) GetCurrentSubnetValidators(networkid ids.ID) map[string]staking_data {
	log.Info(fmt.Sprintf("TimestampVM: GetCurrentSubnetValidators: %v", networkid))

	pclient := platformvm.NewClient(localRpcUri, time.Minute)
	currentValidators, err := pclient.GetCurrentValidators(networkid)
	if err != nil {
		log.Error(fmt.Sprintf("TimestampVM: Error in GetCurrentSubnetValidators: %v", err))
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

		log.Info(fmt.Sprintf("NodeID:%s", validator.NodeID))

		sd := staking_data{node_id: validator.NodeID}
		validating_nodes[validator.NodeID] = sd
	}

	return validating_nodes
}

//
func (m *RewardMgr) SendAVAX(rewardAddress string) {
	log.Info("TimestampVM: SendAVAX")

	avmclient := avm.NewClient(localRpcUri, "X", time.Minute)
	user := api.UserPass{Username: m.config.RewardeeUser, Password: m.config.RewardeePassword}
	from := []string{m.config.RewardeeAddress}
	to := rewardAddress
	sendTx, err := avmclient.Send(user, from, from[0], 10, "AVAX", to, "hello")
	if err != nil {
		log.Error(fmt.Sprintf("TimestampVM: Error in SendAVAX: %v", err))
		return
	}
	log.Info(fmt.Sprintf("TimestampVM: SendAVAX Tx: %s", sendTx.String()))
}

//
func (m *RewardMgr) SendRewards(rewardAddress string, rewardAmount uint64) {
	log.Info("TimestampVM: SendRewards")

	avmclient := avm.NewClient(localRpcUri, "X", time.Minute)
	user := api.UserPass{Username: m.config.RewardeeUser, Password: m.config.RewardeePassword}
	from := []string{m.config.RewardeeAddress}
	to := rewardAddress
	amt := rewardAmount
	assetID := m.config.RewardTokenID //RWD - RewardToken
	sendTx, err := avmclient.Send(user, from, from[0], amt, assetID, to, "hello")
	if err != nil {
		log.Error(fmt.Sprintf("TimestampVM: Error in SendRewards: %v", err))
		return
	}
	log.Info(fmt.Sprintf("TimestampVM: SendRewards Tx: %s", sendTx.String()))
}

//
func (m *RewardMgr) CalculateReward() uint64 {
	return 2
}
