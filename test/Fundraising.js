const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Fundraising", function () {
  let fundraising;
  let owner, contributor1, contributor2;

  beforeEach(async function () {
    const Fundraising = await ethers.getContractFactory("Fundraising");
    fundraising = await Fundraising.deploy();
    await fundraising.waitForDeployment();

    [owner, contributor1, contributor2] = await ethers.getSigners();
  });

  async function createCampaign(goal, durationInSeconds) {
    const deadline = (await ethers.provider.getBlock("latest")).timestamp + durationInSeconds;
    const tx = await fundraising.createCampaign(goal, deadline);
    await tx.wait();
    return deadline;
  }

  
  it("should create a campaign", async function () {
    const goal = ethers.parseEther("10")
    const deadline = await createCampaign(goal, 3600)

    // const tx = await fundraising.createCampaign(goal, deadline);
    // await tx.wait();

    const campaign = await fundraising.campaigns(1);
    expect(campaign.creator).to.equal(owner.address);
    expect(campaign.goal.toString()).to.equal(goal.toString());
    expect(campaign.deadline.toString()).to.equal(deadline.toString());
    expect(campaign.fundsRaised.toString()).to.equal("0");

  })

  it("should accept contributions", async function () {
    const goal = ethers.parseEther("10")

    await createCampaign(goal, 3600);
    
    const contribution = ethers.parseEther("1");
    await fundraising.connect(contributor1).contribute(1, {value: contribution});

    const campaign = await fundraising.campaigns(1);
    expect(campaign.fundsRaised.toString()).to.equal(contribution.toString());
      
    const contributionAmount = await fundraising.getContribution(1, contributor1.address);
    expect(contributionAmount.toString()).to.equal(contribution.toString());
  })

  it("should reject contribution if deadline has passed", async function() {
    const goal = ethers.parseEther("10")
    
    await createCampaign(goal, 3600);
    
    // Wait for the deadline to pass
    await ethers.provider.send("evm_increaseTime", [3600 + 1]);
    await ethers.provider.send("evm_mine", []);
        
    const contribution = ethers.parseEther("1");
    await expect(fundraising.connect(contributor1).contribute(1, {value: contribution})).to.be.revertedWith(
      "Campaign has finished.");
  })
});


