// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
// import "hardhat/console.sol";

contract Fundraising {

  struct Campaign{
    address creator;
    uint goal;
    uint deadline;
    uint fundsRaised;
    mapping(address => uint) contributions;
  }

  mapping(uint => Campaign) public campaigns;
  uint public campaignCount;

  event CampaignCreated(uint campaignID, address creator, uint goal, uint deadline);
  event DonationMade(uint campaignID, address contributor, uint contribution);

  function createCampaign(uint _goal, uint _deadline) public {
    require(_deadline > block.timestamp, "Deadline must be in the future");
    require(_goal > 0, "Goal must be greater than zero.");
    campaignCount++;

    Campaign storage newCampaign = campaigns[campaignCount];

    newCampaign.creator = msg.sender;
    newCampaign.goal = _goal;
    newCampaign.deadline = _deadline;
    newCampaign.fundsRaised = 0;
  
    emit CampaignCreated(campaignCount, msg.sender, _goal, _deadline);
  }

  function contribute(uint _campaignID) external payable{
    require(_campaignID > 0 && _campaignID <= campaignCount, "Campaign does not exist.");
    Campaign storage campaign = campaigns[_campaignID];
    
    require(campaign.deadline > block.timestamp, "Campaign has finished.");
    require(msg.value > 0, "Your contribution must be greater than zero.");
    
    campaign.contributions[msg.sender] += msg.value;
    campaign.fundsRaised += msg.value;

    emit DonationMade(_campaignID, msg.sender, msg.value);
  }

  function getContribution(uint _campaignID, address _contributor) external view returns (uint) {
    require(_campaignID > 0 && _campaignID <= campaignCount, "Campaign does not exist.");
    return campaigns[_campaignID].contributions[_contributor];
  }
}