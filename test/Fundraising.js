import { expect } from "chai";
import { ethers } from "hardhat";

describe("Fundraising", function () {
  let fundraising;
  let owner, contributor1, contributor2;

  beforeEach(async function () {
    const Fundraising = await ethers.getContractFactory("Fundraising");
    fundraising = await Fundraising.deploy();
    await fundraising.deployed();

    [owner, contributor1, contributor2] = await ethers.getSigners();
  });

  it("should create a campaign", async function () {
    const goal = ethers.parseEther("10")
    const deadline = (await ethers.provider.getBlock("latest")).timestamp + 3600;

    const tx = await fundraising.createCampaign(goal, deadline);
    await tx.wait();

    const campaign = await fundraising.campaigns(1);
    expect(campaign.creator).to.equal(owner.address);
    expect(campaign.goal.toString()).to.equal(goal.toString());
    expect(campaign.deadline.toString()).to.equal(deadline.toString());
    expect(campaign.fundsRaised.toString()).to.equal("0");

  })
});
