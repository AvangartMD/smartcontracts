const Token = artifacts.require("Token");
const NewEscrow = artifacts.require("NewEscrow");

module.exports = function(deployer, network, accounts) {
    deployer.deploy(NewEscrow, accounts[0]).then(function() {
        return deployer.deploy(Token, accounts[0], NewEscrow.address);
      });

};
