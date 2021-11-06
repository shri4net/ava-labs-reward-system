package eventtokenizervm

import "time"

const (
	defaultMasterNodeID     = "NodeID-CQpNw9vWvqNbX8xPXnRufZkyHkpvkYHtm"
	defaultRewarderUser     = "username"
	defaultRewarderPassword = "password"
	defaultRewarderAddress  = "X-fuji1ugtsmdwrsgcw3n7mlkvxanayeyzyef0hakd2hy"
	defaultRewardTokenID    = "NPHxwugngk9Ru3biuvcZGBZvwcZo5FzMCggawXhtVoX8fRokH"
	defaultPollingDuration  = 24 * time.Hour

	defaultEnableIndexer = false
	defaultIndexerUri    = "http://localhost:3001/api/source/newevent"

	defaultlocalRpcUri = "http://localhost:9650"

	defaultEnableReward = true
	defaultRewardValue  = 1
)

// Config ...
type Config struct {
	MasterNodeID     string
	RewarderUser     string
	RewarderPassword string
	RewarderAddress  string
	RewardTokenID    string
	PollingDuration  time.Duration
	EnableIndexer    bool
	IndexerUri       string
	LocalRpcUri      string
	EnableReward     bool
	RewardValue      uint64
	RewardDisbursal  string
	RewardAsset      string
}

func (c *Config) SetDefaults() {
	c.MasterNodeID = defaultMasterNodeID
	c.RewarderUser = defaultRewarderUser
	c.RewarderPassword = defaultRewarderPassword
	c.RewarderAddress = defaultRewarderAddress
	c.RewardTokenID = defaultRewardTokenID
	c.EnableReward = defaultEnableReward
	c.PollingDuration = defaultPollingDuration
	c.EnableIndexer = defaultEnableIndexer
	c.IndexerUri = defaultIndexerUri
	c.LocalRpcUri = defaultlocalRpcUri
	c.RewardValue = defaultRewardValue
	c.RewardDisbursal = "periodic" // periodic | end
	c.RewardAsset = "custom"       // custom | avax
}
