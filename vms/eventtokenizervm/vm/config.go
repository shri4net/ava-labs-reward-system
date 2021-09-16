package eventtokenizervm

import "time"

const (
	defaultSubnetIDStr      = "ER1mFqjFxQiCb12QFjAfVfAmTTua3xAaA9MKXSDjio796eRfG"
	defaultNodeID           = "NodeID-CQpNw9vWvqNbX8xPXnRufZkyHkpvkYHtm"
	defaultRewardeeUser     = "username"
	defaultRewardeePassword = "password"
	defaultRewardeeAddress  = "X-fuji1ugtsmdwrsgcw3n7mlkvxanayeyzyef0hakd2hy"
	defaultRewardTokenID    = "NPHxwugngk9Ru3biuvcZGBZvwcZo5FzMCggawXhtVoX8fRokH"
	defaultEnableReward     = true
	defaultPollingDuration  = 1 * time.Hour
)

// Config ...
type Config struct {
	MasterNodeID     string `json:"master-node-id"`
	SubnetIDStr      string `json:"subnet-id-str"`
	RewardeeUser     string
	RewardeePassword string
	RewardeeAddress  string
	RewardTokenID    string
	EnableReward     bool
	PollingDuration  time.Duration
}

func (c *Config) SetDefaults() {
	c.SubnetIDStr = defaultSubnetIDStr
	c.MasterNodeID = defaultNodeID
	c.RewardeeUser = defaultRewardeeUser
	c.RewardeePassword = defaultRewardeePassword
	c.RewardeeAddress = defaultRewardeeAddress
	c.RewardTokenID = defaultRewardTokenID
	c.EnableReward = defaultEnableReward
	c.PollingDuration = defaultPollingDuration
}
