// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Fundraising is ReentrancyGuard {
    error CampaignDoesNotExist();
    error OnlyCreator();
    error CampaignStillRunning();
    error CampaignFinished();
    error GoalNotMet();

    struct Campaign {
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
    event CampaignCancelled(uint campaignID, address whoCancelled);
    event FundsWithdrawn(uint campaignID, uint amount);

    function createCampaign(uint _goal, uint _deadline) public {
        if (_deadline <= block.timestamp) revert CampaignFinished();
        require(_goal > 0, "Goal must be greater than zero.");
        campaignCount++;

        Campaign storage newCampaign = campaigns[campaignCount];
        newCampaign.creator = msg.sender;
        newCampaign.goal = _goal;
        newCampaign.deadline = _deadline;

        emit CampaignCreated(campaignCount, msg.sender, _goal, _deadline);
    }

    function contribute(uint _campaignID) external payable {
        if (_campaignID <= 0 || _campaignID > campaignCount) revert CampaignDoesNotExist();
        Campaign storage campaign = campaigns[_campaignID];

        if (campaign.deadline <= block.timestamp) revert CampaignFinished();
        require(msg.value > 0, "Contribution must be greater than zero.");
        require(campaign.fundsRaised + msg.value >= campaign.fundsRaised, "Overflow error");

        campaign.contributions[msg.sender] += msg.value;
        campaign.fundsRaised += msg.value;

        emit DonationMade(_campaignID, msg.sender, msg.value);
    }

    function getContribution(uint _campaignID, address _contributor) external view returns (uint) {
        if (_campaignID <= 0 || _campaignID > campaignCount) revert CampaignDoesNotExist();
        return campaigns[_campaignID].contributions[_contributor];
    }

    function withdrawFunds(uint _campaignID) external nonReentrant {
        if (_campaignID <= 0 || _campaignID > campaignCount) revert CampaignDoesNotExist();
        Campaign storage campaign = campaigns[_campaignID];

        if (msg.sender != campaign.creator) revert OnlyCreator();
        if (campaign.deadline > block.timestamp) revert CampaignStillRunning();
        if (campaign.fundsRaised < campaign.goal) revert GoalNotMet();

        uint amount = campaign.fundsRaised;
        campaign.fundsRaised = 0;

        (bool success, ) = campaign.creator.call{value: amount}("");
        require(success, "Transfer failed");

        emit FundsWithdrawn(_campaignID, amount);
    }

    function isGoalMet(uint _campaignID) external view returns (bool) {
        if (_campaignID <= 0 || _campaignID > campaignCount) revert CampaignDoesNotExist();
        return campaigns[_campaignID].fundsRaised >= campaigns[_campaignID].goal;
    }

    function cancelCampaign(uint _campaignID) external {
        if (_campaignID <= 0 || _campaignID > campaignCount) revert CampaignDoesNotExist();
        Campaign storage campaign = campaigns[_campaignID];

        if (msg.sender != campaign.creator) revert OnlyCreator();
        require(campaign.fundsRaised == 0, "Cannot cancel campaigns with funds raised.");
        if (campaign.deadline <= block.timestamp) revert CampaignFinished();

        emit CampaignCancelled(_campaignID, msg.sender);

        delete campaigns[_campaignID];
    }
}
