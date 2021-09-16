const Tracker = artifacts.require("Tracker");

module.exports = function (deployer) {
  deployer.deploy(Tracker);
};