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
    const goal = ethers.parseEther("10");
    const deadline = await createCampaign(goal, 3600);

    const campaign = await fundraising.campaigns(1);
    expect(campaign.creator).to.equal(owner.address);
    expect(campaign.goal.toString()).to.equal(goal.toString());
    expect(campaign.deadline.toString()).to.equal(deadline.toString());
    expect(campaign.fundsRaised.toString()).to.equal("0");
  });

  it("should accept contributions", async function () {
    const goal = ethers.parseEther("10");
    await createCampaign(goal, 3600);

    const contribution = ethers.parseEther("1");
    await fundraising.connect(contributor1).contribute(1, { value: contribution });

    const campaign = await fundraising.campaigns(1);
    expect(campaign.fundsRaised.toString()).to.equal(contribution.toString());

    const contributionAmount = await fundraising.getContribution(1, contributor1.address);
    expect(contributionAmount.toString()).to.equal(contribution.toString());
  });

  it("should reject contribution if deadline has passed", async function () {
    const goal = ethers.parseEther("10");
    await createCampaign(goal, 3600);

    await ethers.provider.send("evm_increaseTime", [3600 + 1]);
    await ethers.provider.send("evm_mine", []);

    const contribution = ethers.parseEther("1");
    await expect(
      fundraising.connect(contributor1).contribute(1, { value: contribution })
    ).to.be.revertedWithCustomError(fundraising, "CampaignFinished");
  });

  it("should allow the creator to withdraw funds if the goal is met", async function () {
    const goal = ethers.parseEther("10");
    await createCampaign(goal, 3600);
    

    const contribution = ethers.parseEther("10");
    await fundraising.connect(contributor1).contribute(1, { value: contribution });

    const initialBalance = await ethers.provider.getBalance(owner.address);

    await ethers.provider.send("evm_increaseTime", [3600 + 1]);
    await ethers.provider.send("evm_mine", []);

    const tx = await fundraising.connect(owner).withdrawFunds(1);
    const receipt = await tx.wait();

    const gasUsed = BigInt(receipt.gasUsed) * BigInt(receipt.gasPrice);
    const finalBalance = await ethers.provider.getBalance(owner.address);

    expect(finalBalance).to.equal(initialBalance + contribution - gasUsed);
  });

  it("should reject withdrawal if the goal is not met", async function () {
    const goal = ethers.parseEther("10");
    await createCampaign(goal, 3600);

    const contribution = ethers.parseEther("5");
    await fundraising.connect(contributor1).contribute(1, { value: contribution });

    await ethers.provider.send("evm_increaseTime", [3600 + 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(fundraising.connect(owner).withdrawFunds(1)).to.be.revertedWithCustomError(
      fundraising,
      "GoalNotMet"
    );
  });

  it("should reject withdrawal by non-creators", async function () {
    const goal = ethers.parseEther("10");
    await createCampaign(goal, 3600);

    const contribution = ethers.parseEther("10");
    await fundraising.connect(contributor1).contribute(1, { value: contribution });

    await expect(fundraising.connect(contributor1).withdrawFunds(1)).to.be.revertedWithCustomError(
      fundraising,
      "OnlyCreator"
    );
  });

it("should allow the creator to cancel a campaign", async function () {
  const goal = ethers.parseEther("10");
  await createCampaign(goal, 3600);

  const tx = await fundraising.connect(owner).cancelCampaign(1);
  await tx.wait();

  // Check that the campaign data has been reset to default values
  const campaign = await fundraising.campaigns(1);
  expect(campaign.creator).to.equal(ethers.ZeroAddress); // Default address
  expect(campaign.goal).to.equal(0); // Default uint value
  expect(campaign.deadline).to.equal(0); // Default uint value
  expect(campaign.fundsRaised).to.equal(0); // Default uint value
});


  it("should reject cancellation if funds have been raised", async function () {
    const goal = ethers.parseEther("10");
    await createCampaign(goal, 3600);

    const contribution = ethers.parseEther("1");
    await fundraising.connect(contributor1).contribute(1, { value: contribution });

    await expect(fundraising.connect(owner).cancelCampaign(1)).to.be.revertedWith(
      "Cannot cancel campaigns with funds raised."
    );
  });

  it("should correctly determine if the goal is met", async function () {
    const goal = ethers.parseEther("10");
    await createCampaign(goal, 3600);

    const contribution = ethers.parseEther("5");
    await fundraising.connect(contributor1).contribute(1, { value: contribution });

    const isGoalMet = await fundraising.isGoalMet(1);
    expect(isGoalMet).to.be.false;

    await fundraising.connect(contributor2).contribute(1, { value: ethers.parseEther("5") });

    const isGoalMetAfter = await fundraising.isGoalMet(1);
    expect(isGoalMetAfter).to.be.true;
  });
});
