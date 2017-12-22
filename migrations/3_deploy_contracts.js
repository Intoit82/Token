var BackendLedger = artifacts.require("./BackendLedger.sol");
var LinkedLedgerToken = artifacts.require("./LedgerLinkedToken.sol");

module.exports = function(deployer,network,accounts) {
  let ledger,token;
  let regulatotAddress = accounts[0];
   
  return BackendLedger.deployed()
  .then(instance => {

  ledger = instance;
    console.log("Ledger address: " ,ledger.address);
    deployer.deploy(LinkedLedgerToken,ledger.address,1);
    
   });
}
     