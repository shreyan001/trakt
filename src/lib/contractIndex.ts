export const contractsArray = [
    
 
    {
      name: "0G2NFTEscrow Contract",
      description: "This smart contract facilitates secure peer-to-peer exchanges between Ethereum (ETH) and Non-Fungible Tokens (NFTs). It acts as a trustless intermediary, ensuring both parties fulfill their commitments before the exchange is completed. For example, Alice can use this contract to safely trade her ETH for Bob's unique digital artwork NFT without the risk of either party backing out mid-transaction. The contract holds both assets in escrow until both parties have made their deposits, after which the exchange can be executed, or cancelled if needed, providing a safe and efficient way to swap ETH for any NFT.",
      contract_code: `// SPDX-License-Identifier: MIT
  pragma solidity 0.8.27;
  
  import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
  import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
  
  /**
   * @title 0G-to-NFT Escrow Contract
   * @dev P2P transactions using ETH through escrow for NFTs.
   */
  contract 0GtoNFTEscrow is ReentrancyGuard {
      struct EscrowOrder {
          address partyA;
          address partyB;
          address nftContract;
          uint256 nftTokenId;
          uint256 ethAmount;
          bool partyADeposited;
          bool partyBDeposited;
          bool executed;
      }
  
      mapping(uint256 => EscrowOrder) public escrowOrders;
      uint256 public nextOrderId;
  
      event EscrowOrderCreated(
          uint256 indexed orderId,
          address indexed partyA,
          address indexed partyB,
          address nftContract,
          uint256 nftTokenId,
          uint256 ethAmount
      );
  
      event PartyADeposit(uint256 indexed orderId, address indexed partyA);
      event PartyBDeposit(uint256 indexed orderId, address indexed partyB);
      event EscrowExecuted(uint256 indexed orderId);
      event EscrowCancelled(uint256 indexed orderId);
  
      modifier validContract(address _nftContract) {
          require(_nftContract.code.length > 0, "Invalid NFT contract");
          _;
      }
  
      modifier onlyParties(uint256 orderId) {
          EscrowOrder storage order = escrowOrders[orderId];
          require(
              msg.sender == order.partyA || msg.sender == order.partyB,
              "Not authorized"
          );
          _;
      }
  
      modifier notExecuted(uint256 orderId) {
          require(!escrowOrders[orderId].executed, "Already executed");
          _;
      }
  
      function createEscrowOrder(
          address _partyB,
          address _nftContract,
          uint256 _nftTokenId,
          uint256 _ethAmount
      ) external validContract(_nftContract) {
          EscrowOrder storage order = escrowOrders[nextOrderId];
          order.partyA = msg.sender;
          order.partyB = _partyB;
          order.nftContract = _nftContract;
          order.nftTokenId = _nftTokenId;
          order.ethAmount = _ethAmount;
          order.partyADeposited = false;
          order.partyBDeposited = false;
          order.executed = false;
  
          emit EscrowOrderCreated(
              nextOrderId,
              msg.sender,
              _partyB,
              _nftContract,
              _nftTokenId,
              _ethAmount
          );
          nextOrderId++;
      }
  
      function depositETHByPartyA(uint256 orderId) external payable nonReentrant onlyParties(orderId) {
          EscrowOrder storage order = escrowOrders[orderId];
          require(!order.executed, "Already executed");
          require(!order.partyADeposited, "Already deposited");
          require(msg.value == order.ethAmount, "Incorrect ETH amount");
  
          order.partyADeposited = true;
          emit PartyADeposit(orderId, msg.sender);
      }
  
      function depositNFTByPartyB(uint256 orderId) external nonReentrant onlyParties(orderId) {
          EscrowOrder storage order = escrowOrders[orderId];
          require(!order.executed, "Already executed");
          require(!order.partyBDeposited, "Already deposited");
  
          IERC721(order.nftContract).safeTransferFrom(
              msg.sender,
              address(this),
              order.nftTokenId
          );
  
          order.partyBDeposited = true;
          emit PartyBDeposit(orderId, msg.sender);
      }
  
      function executeTransaction(uint256 orderId) external nonReentrant onlyParties(orderId) {
          EscrowOrder storage order = escrowOrders[orderId];
          require(order.partyADeposited, "PartyA has not deposited");
          require(order.partyBDeposited, "PartyB has not deposited");
          require(!order.executed, "Already executed");
  
          (bool success, ) = order.partyB.call{value: order.ethAmount}("");
          require(success, "ETH transfer failed");
  
          IERC721(order.nftContract).safeTransferFrom(
              address(this),
              order.partyA,
              order.nftTokenId
          );
  
          order.executed = true;
          emit EscrowExecuted(orderId);
      }
  
      function cancelEscrow(uint256 orderId) external nonReentrant onlyParties(orderId) {
          EscrowOrder storage order = escrowOrders[orderId];
          require(!order.executed, "Cannot cancel executed order");
  
          if (order.partyADeposited) {
              (bool success, ) = order.partyA.call{value: order.ethAmount}("");
              require(success, "ETH refund failed");
          }
  
          if (order.partyBDeposited) {
              IERC721(order.nftContract).transfer(order.partyB, order.nftTokenId);
          }
  
          delete escrowOrders[orderId];
          emit EscrowCancelled(orderId);
      }
  }`,
      category: "escrow"
    }
    
  ];