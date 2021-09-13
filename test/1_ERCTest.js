const { assert } = require('chai');
const truffleAssertions = require('truffle-assertions');

const toBN = web3.utils.toBN;

const v2 = artifacts.require('./Token.sol');
const escrow = artifacts.require('./NewEscrow.sol');

require('chai')
    .use(require('chai-as-promised'))
    .should(); 

contract('Testing', (accounts) => {
    let token;
    let instance;
    before(async() => {
        instance = await escrow.new(accounts[0]);
        token = await v2.new(accounts[0], instance.address);
        await instance.setTokenAddress(token.address);
    })
    describe('deployment', async() => {
        it('deploys escrow successfully', async() => {
            const address = await instance.address;
            assert.notEqual(address, 0x0);
            assert.notEqual(address, '');
            assert.notEqual(address, null);
            assert.notEqual(address, undefined);
        })

        it('deploys token successfully', async() => {
            const address = await token.address;
            assert.notEqual(address, 0x0);
            assert.notEqual(address, '');
            assert.notEqual(address, null);
            assert.notEqual(address, undefined);
        })

        it('has Escrow address', async() => {
            const escrowAddress = await token.escrowAddress();
            escrowAddress.should.equal(instance.address, "Escrow address set successfully");
        })

        it('has token address', async() =>{
            const tokenAddress = await instance.tokenAddress();
            tokenAddress.should.equal(token.address, "Token address set successfully");
        })
    })

    describe('Minting and Order', async() => {
        it('should not allow non creators to mint', async() => {
            await token.setMaxEditions(20);
            await truffleAssertions.reverts(token.mintToken(20, "test", accounts[2], accounts[3], 60, 40, 0, 0, 10000, 40, {from: accounts[2]}), "Only approved users can mint");
        })

        it('should not allow creators to mint 0 editions', async() => {
            await token.approveCreators([accounts[2]]);
            await truffleAssertions.reverts(token.mintToken(0, "test", accounts[2], accounts[3], 60, 40, 0, 0, 10000, 40, {from: accounts[2]}), "Zero editions");
        })

        // it('should not allow to set invalid saletype', async() => {
        //     await truffleAssertions.reverts(token.mintToken(20, "test", accounts[2], accounts[3], 60, 40, 3, 0, 10000, 40, {from: accounts[2]}), "Invalid saletype");
        // })

        it('should not allow other timelines for sale types', async() => {
            await truffleAssertions.reverts(token.mintToken(20, "test", accounts[2], accounts[3], 60, 40, 0, 1, 10000, 40, {from: accounts[2]}), "Invalid time for Buy Now");
            await truffleAssertions.reverts(token.mintToken(20, "test", accounts[2], accounts[3], 60, 40, 1, 13, 10000, 40, {from: accounts[2]}), "Incorrect time");
        })

        it('should not allow creators to mint more than max editions', async() => {
            await truffleAssertions.reverts(token.mintToken(30, "test", accounts[2], accounts[3], 60, 40, 0, 0, 10000, 40, {from: accounts[2]}), "Editions greater than allowed");
        })

        it('should not allow invalid percentages', async() => {
            await truffleAssertions.reverts(token.mintToken(20, "test", accounts[2], accounts[3], 60, 50, 0, 0, 10000, 40, {from: accounts[2]}), "Wrong percentages");
        })

        it('should not allow creators to set zero price', async() => {
            await truffleAssertions.reverts(token.mintToken(20, "test", accounts[2], accounts[3], 60, 40, 0, 0, 0, 0, {from: accounts[2]}), "Zero price");
        })

        it('should allow creators to mint tokens', async() => {
            await token.mintToken(20, "test", accounts[2], accounts[3], 60, 40, 0, 0, 10000, 40, {from: accounts[2]});
            const balance = await token.balanceOf(instance.address, 1);
            balance.toString().should.equal('20', "Editions set successfully");
        })

        it('should set order successfully according to minting', async() => {
            const order = await instance.order(1);
            const owner = await token.ownerOfToken(1);
            owner[0].should.equal(order[0], "Order owner address set successfully");
            order[1].toString().should.equal('1', "TokenId set successfully");
            order[2].toString().should.equal('20', "Amount set successfully");
            const holder = await instance.currentHolder(1, 10);
            holder.should.equal(owner[0], "Holder set successfully");
        })

        it('should not allow users to buy the edition at wrong price', async() => {
            await truffleAssertions.reverts(instance.buyNow(1, 10, {from: accounts[3], value: 1000}),"Wrong price");
        })

        it('should not allow users to buy wrong edition', async() => {
            await truffleAssertions.reverts(instance.buyNow(1, 100, {from: accounts[3], value: 10000}),"Wrong edition");
        })

        it('should allow user to buy the edition', async() => {
            const balance = await web3.eth.getBalance(accounts[2]);
            // console.log(balance);
            await instance.buyNow(1, 10, {from: accounts[3], value: 10000});
            const holder = await instance.currentHolder(1, 10);
            holder.should.equal(accounts[3], "Holder changed successfully");
            const balance1 = await web3.eth.getBalance(accounts[2]);
            // console.log(balance1);
            // console.log((toBN(balance).add(toBN(5400))).toString());
            balance1.toString().should.equal(((toBN(balance).add(toBN(5400))).toString()).toString(), "Balance updated successfully");
        })
        
        it('should not allow user to buy sold edition', async() => {
            await truffleAssertions.reverts(instance.buyNow(1, 10, {from: accounts[3], value: 10000}),"Already sold");
        })

        it('should set the sold edition in second hand market', async() => {
            await token.setApprovalForAll(instance.address, true, {from: accounts[3]});
            const test = await instance.secondHand(1, 10);
            test.should.equal(true, "Edition set successfully in second hand market");
        })

        it('should allow user to set the edition on sale for second hand', async() => {
            await instance.putOnSaleBuy(1, 10, 10000, {from: accounts[3]});
            const holder = await instance.currentHolder(1, 10);
            holder.should.equal(instance.address, "Holder changed successfully");
        })

        it('should allow users to buy items on second hand market', async() => {
            await instance.buyNow(2, 10, {from: accounts[4], value: 10000});
            const holder = await instance.currentHolder(1, 10);
            holder.should.equal(accounts[4], "Holder changed successfully");
            const balance = await token.balanceOf(accounts[4], 1);
            balance.toString().should.equal('1', "Transferred edition to user successfully");
        })

        it('should allow users to put items for auction', async() => {
            await token.mintToken(20, "test", accounts[2], accounts[3], 60, 40, 1, 24, 10000, 40, {from: accounts[2]});
            await instance.placeBid(3, 10, {from: accounts[3], value: 10001});
            const bid = await instance.bid(2, 10);
            bid[0].should.equal(accounts[3], "Bid placed successfully");
        })

        it('should not allow users to place bids after auction ended', async() => {
            function timeout(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            }
            await timeout(48000);
            await truffleAssertions.reverts(instance.placeBid(3, 10, {from: accounts[4], value: 10003}), "Auction ended");
        })

        it('should allow users to buy items after auction ends', async() => {
            await instance.buyNow(3, 11, {from: accounts[4], value: 10000});
            const holder = await instance.currentHolder(2, 11);
            holder.should.equal(accounts[4], "Holder set successfully");
        })

        it('should allow users to claim after auction ends', async() => {
            await instance.claimAfterAuction(3, 10, {from: accounts[3]});
            const holder = await instance.currentHolder(2, 10);
            holder.should.equal(accounts[3], "Holder set successfully");
        })

        it('should allow users to request for offers', async() => {
            await instance.requestOffer(2, 10, 1000, {from:accounts[3]});
            await instance.placeBid(4, 10, {from: accounts[4], value: 1001});
            const bid = await instance.bid(2, 10);
            bid[0].should.equal(accounts[4], "Bid placed successfully");
        })

        it('should allow users to claim back', async() => {
            function timeout(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            }
            await timeout(10000);
            await instance.claimBack(4, 10, {from: accounts[4]});
            const bid = await instance.bid(2, 10);
            bid[1].toString().should.equal("0", "Bid removed successfully");
        })

        it('should allow users to place bid and get accepted', async() => {
            await instance.placeBid(4, 10, {from: accounts[5], value: 1001});
            await instance.acceptOffer(4,10, {from: accounts[3]});
            const holder = await instance.currentHolder(2, 10);
            holder.should.equal(accounts[5], "Transfer successful");
        })

        it('should allow users to transfer editions', async() => {
            await token.setApprovalForAll(instance.address, true, {from: accounts[5]});
            await instance.transfer(accounts[5], accounts[4], 2, 10, "0xfe", {from: accounts[5]});
            const holder = await instance.currentHolder(2, 10);
            holder.should.equal(accounts[4], "Holder set successfully");
        })

        it('should burn token editions', async() => {
            const balance = await token.balanceOf(accounts[4], 2);
            balance.toString().should.equal('2', "Initial balance");
            await instance.burnTokenEdition(2, 10, {from: accounts[4]});
            const balance1 = await token.balanceOf(accounts[4], 2);
            balance1.toString().should.equal('1', "Token burn successful");
        })
    })
})