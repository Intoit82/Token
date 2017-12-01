web3.eth.getTransactionReceiptMined = require("../utils/getTransactionReceiptMined.js");
Promise = require("bluebird");
Promise.allNamed = require("../utils/sequentialPromiseNamed.js");
const randomIntIn = require("../utils/randomIntIn.js");
const toBytes32 = require("../utils/toBytes32.js");

if (typeof web3.eth.getAccountsPromise === "undefined") {
    Promise.promisifyAll(web3.eth, { suffix: "Promise" });
}

const BackendLedger = artifacts.require("./BackendLedger.sol");
const LedgerLinkedToken = artifacts.require("./LedgerLinkedToken.sol");

contract('Token interaction', function(accounts) {

    let ledger, token0, token1,
        devTeam, user0, user1,user2;
        
    const mintValue = randomIntIn(500, 1000);
    const transferValue = randomIntIn(1, 100);
    
    before("should prepare", function() {
        assert.isAtLeast(accounts.length, 4);
        devTeam = accounts[0];
        user0 = accounts[1];
        user1 = accounts[2];
        user2 = accounts[3];
        return web3.eth.getBalancePromise(devTeam)
            .then(balance => assert.isAtLeast(web3.fromWei(balance).toNumber(), 10));
    });

    describe("Create Ledger", function() {
     
        beforeEach("Prepar ledger and a token", function() {
            return BackendLedger.new( { from: devTeam })
                .then(instance => ledger = instance)
                .then(() => ledger.mint(user0,mintValue), {from: devTeam})
                .then(() => ledger.balanceOf(user0), {from: user0})
                //.then(balance => console.log("Minted balance : ", balance.toNumber()))
                .then(balance => assert.isAtLeast(balance.toNumber(), 500));

                
        });

        describe("Token interaction", function() {

            it("Token interaction 1", function() {
                return LedgerLinkedToken.new(ledger.address,{from:devTeam})
            .then(instance => {
                token0 = instance;
                console.log("First token deployed at: ", token0.address);
                return token0.setTransfers(true, {from:devTeam});
            })
            .then(tx => {
                assert.strictEqual(tx.logs[0].args.newState,true,"Token0 set transfers has failed");
                return token0.transfer(user1,50, {from:user0});
            })
            .catch(error => {
                console.log("Failed to transfer funds before dev team moved operator permissions as expected");
                return ledger.setOperator(token0.address,{from:devTeam});
            })
            .then(tx => {
                assert.strictEqual(tx.logs[0].args.newOperator,token0.address,"ledger operator permission set transfers has failed");                
                return token0.transfer(user1,50, {from:user0});
            })
            .then(tx => {
                assert.strictEqual(tx.logs[0].args.to,user1,"Failed to transfer to user1 tokens");
                assert.strictEqual(tx.logs[0].args.value.toNumber(),50,"Failed to transfer to user1 tokens");
                return LedgerLinkedToken.new(ledger.address,{from:devTeam})
            })
            .then(instance => {
                token1 = instance;
                console.log("Second token deployed at: ", token1.address);
                return token1.setTransfers(true, {from:devTeam});
            })
             .then(tx => {
                assert.strictEqual(tx.logs[0].args.newState,true,"Token0 set transfers has failed");
                return token0.upgradeToken(token1.address, {from:devTeam});
            })
             then(tx => {
                assert.strictEqual(tx.logs[0].args.oldToken,token0.address,"Failed to upgrade token");
                assert.strictEqual(tx.logs[0].args.newToken,token1.address,"Failed to upgrade token");
                return token0.transfer(user2,25, {from:user1});
            })
            .catch(error => {
                console.log("Failed to transfer funds from old token as expected");
                return ledger.setOperator(token0.address,{from:devTeam});
            })
            .then(tx => {
                assert.strictEqual(tx.logs[0].args.newOperator,token0.address,"ledger operator permission set transfers has failed");                
                return token1.transfer(user2,35, {from:user1});
            })
            .then(tx => {
                assert.strictEqual(tx.logs[0].args.to,user2,"Failed to transfer to user1 tokens");
                assert.strictEqual(tx.logs[0].args.value.toNumber(),35,"Failed to transfer to user1 tokens");
                return ledger.prevLinkedTokens[0]({from:user3})
            })
            .then(prevAddress =>{
                assert.strictEqual(prevAddress,token0.address,"Failed to confirm old token in ledger");
                return token1.balanceOf(user1,{from: devTeam})
            })
            .then(balance => assert.strictEqual(balance,35))
            .then(token1.balanceOf(user2,{from: devTeam}))
            .then(balance => assert.strictEqual(balance,15))
            .then(ledger.balanceOf(user2,{from: devTeam}))
            .then(balance => assert.strictEqual(balance,15));


               
            }); 

            });
        });
});