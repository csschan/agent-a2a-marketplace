// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AgentMarketplace
 * @notice A2A (Agent-to-Agent) Marketplace for autonomous task execution
 * @dev Enables agents to post tasks, accept tasks, and receive payment autonomously
 *
 * Built for #USDCHackathon - Demonstrating TRUE Agentic Commerce
 */
contract AgentMarketplace is ReentrancyGuard {

    // ============ State Variables ============

    IERC20 public immutable usdc;
    address public owner;
    uint256 public taskCounter;
    uint256 public platformFee = 250; // 2.5% fee (basis points)
    uint256 public constant FEE_DENOMINATOR = 10000;

    // ============ Enums ============

    enum TaskStatus {
        Open,           // Task posted, waiting for agent
        Assigned,       // Task assigned to an agent
        Submitted,      // Agent submitted proof
        Completed,      // Task completed and paid
        Cancelled       // Task cancelled by poster
    }

    // ============ Structs ============

    struct Task {
        uint256 id;
        address poster;         // Agent A (task poster)
        address assignedTo;     // Agent B (task executor)
        string description;
        uint256 reward;         // Amount in USDC
        TaskStatus status;
        string proofURI;        // URI to proof (IPFS, etc)
        uint256 createdAt;
        uint256 deadline;
    }

    // ============ Storage ============

    mapping(uint256 => Task) public tasks;
    mapping(address => uint256) public agentEarnings;
    mapping(address => uint256) public agentTasksCompleted;

    // ============ X402 Payment System ============

    mapping(address => uint256) public agentBalances;        // Prepaid balances for x402
    mapping(uint256 => uint256) public taskAccessFee;        // Fee to view full task details
    mapping(uint256 => mapping(address => bool)) public hasAccessToTask;  // Track who paid for access
    mapping(address => uint256) public apiCallCount;         // Track API usage per agent

    uint256 public defaultAccessFee = 100000;  // 0.1 USDC (6 decimals)
    uint256 public apiCallCost = 10000;        // 0.01 USDC per API call

    // ============ Events ============

    event TaskPosted(
        uint256 indexed taskId,
        address indexed poster,
        string description,
        uint256 reward,
        uint256 deadline
    );

    event TaskAssigned(
        uint256 indexed taskId,
        address indexed assignedTo
    );

    event ProofSubmitted(
        uint256 indexed taskId,
        address indexed submitter,
        string proofURI
    );

    event TaskCompleted(
        uint256 indexed taskId,
        address indexed executor,
        uint256 reward,
        uint256 platformFee
    );

    event TaskCancelled(
        uint256 indexed taskId,
        address indexed poster
    );

    // ============ X402 Events ============

    event BalanceDeposited(
        address indexed agent,
        uint256 amount,
        uint256 newBalance
    );

    event BalanceWithdrawn(
        address indexed agent,
        uint256 amount,
        uint256 newBalance
    );

    event AccessPurchased(
        uint256 indexed taskId,
        address indexed agent,
        uint256 fee
    );

    event ApiCallCharged(
        address indexed agent,
        uint256 cost,
        uint256 remainingBalance
    );

    // ============ Modifiers ============

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyPoster(uint256 taskId) {
        require(tasks[taskId].poster == msg.sender, "Not task poster");
        _;
    }

    modifier onlyAssigned(uint256 taskId) {
        require(tasks[taskId].assignedTo == msg.sender, "Not assigned to you");
        _;
    }

    // ============ Constructor ============

    constructor(address _usdc) {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
        owner = msg.sender;
    }

    // ============ Core Functions ============

    /**
     * @notice Agent A posts a task with USDC reward
     * @param description Task description
     * @param reward Amount of USDC to pay
     * @param deadline Task deadline (Unix timestamp)
     */
    function postTask(
        string calldata description,
        uint256 reward,
        uint256 deadline
    ) external nonReentrant returns (uint256) {
        require(bytes(description).length > 0, "Empty description");
        require(reward > 0, "Reward must be > 0");
        require(deadline > block.timestamp, "Invalid deadline");

        // Transfer USDC from poster to contract (escrow)
        require(
            usdc.transferFrom(msg.sender, address(this), reward),
            "USDC transfer failed"
        );

        taskCounter++;
        uint256 taskId = taskCounter;

        tasks[taskId] = Task({
            id: taskId,
            poster: msg.sender,
            assignedTo: address(0),
            description: description,
            reward: reward,
            status: TaskStatus.Open,
            proofURI: "",
            createdAt: block.timestamp,
            deadline: deadline
        });

        emit TaskPosted(taskId, msg.sender, description, reward, deadline);

        return taskId;
    }

    /**
     * @notice Agent B accepts an open task
     * @param taskId ID of the task to accept
     */
    function acceptTask(uint256 taskId) external {
        Task storage task = tasks[taskId];

        require(task.status == TaskStatus.Open, "Task not open");
        require(task.deadline > block.timestamp, "Task expired");
        require(task.poster != msg.sender, "Cannot accept own task");

        task.assignedTo = msg.sender;
        task.status = TaskStatus.Assigned;

        emit TaskAssigned(taskId, msg.sender);
    }

    /**
     * @notice Agent B submits proof of completion
     * @param taskId ID of the task
     * @param proofURI URI to proof (IPFS hash, URL, etc)
     */
    function submitProof(
        uint256 taskId,
        string calldata proofURI
    ) external onlyAssigned(taskId) {
        Task storage task = tasks[taskId];

        require(task.status == TaskStatus.Assigned, "Task not assigned");
        require(bytes(proofURI).length > 0, "Empty proof");

        task.proofURI = proofURI;
        task.status = TaskStatus.Submitted;

        emit ProofSubmitted(taskId, msg.sender, proofURI);
    }

    /**
     * @notice Agent A approves completion and releases payment
     * @param taskId ID of the task to complete
     */
    function completeTask(uint256 taskId) external onlyPoster(taskId) nonReentrant {
        Task storage task = tasks[taskId];

        require(task.status == TaskStatus.Submitted, "Proof not submitted");

        task.status = TaskStatus.Completed;

        // Calculate fees
        uint256 fee = (task.reward * platformFee) / FEE_DENOMINATOR;
        uint256 executorPayout = task.reward - fee;

        // Update stats
        agentEarnings[task.assignedTo] += executorPayout;
        agentTasksCompleted[task.assignedTo]++;

        // Transfer USDC to executor
        require(
            usdc.transfer(task.assignedTo, executorPayout),
            "Payout failed"
        );

        // Transfer fee to platform
        if (fee > 0) {
            require(
                usdc.transfer(owner, fee),
                "Fee transfer failed"
            );
        }

        emit TaskCompleted(taskId, task.assignedTo, executorPayout, fee);
    }

    /**
     * @notice Agent A cancels an open or assigned task
     * @param taskId ID of the task to cancel
     */
    function cancelTask(uint256 taskId) external onlyPoster(taskId) nonReentrant {
        Task storage task = tasks[taskId];

        require(
            task.status == TaskStatus.Open || task.status == TaskStatus.Assigned,
            "Cannot cancel"
        );

        task.status = TaskStatus.Cancelled;

        // Refund USDC to poster
        require(
            usdc.transfer(task.poster, task.reward),
            "Refund failed"
        );

        emit TaskCancelled(taskId, msg.sender);
    }

    // ============ View Functions ============

    /**
     * @notice Get task details
     */
    function getTask(uint256 taskId) external view returns (Task memory) {
        return tasks[taskId];
    }

    /**
     * @notice Get agent statistics
     */
    function getAgentStats(address agent) external view returns (
        uint256 totalEarnings,
        uint256 tasksCompleted
    ) {
        return (agentEarnings[agent], agentTasksCompleted[agent]);
    }

    /**
     * @notice Check if task is available
     */
    function isTaskAvailable(uint256 taskId) external view returns (bool) {
        Task memory task = tasks[taskId];
        return task.status == TaskStatus.Open && task.deadline > block.timestamp;
    }

    // ============ X402 Payment Functions ============

    /**
     * @notice Deposit USDC for micropayments (x402)
     * @param amount Amount of USDC to deposit
     */
    function depositBalance(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");

        require(
            usdc.transferFrom(msg.sender, address(this), amount),
            "Deposit failed"
        );

        agentBalances[msg.sender] += amount;

        emit BalanceDeposited(msg.sender, amount, agentBalances[msg.sender]);
    }

    /**
     * @notice Withdraw unused balance
     * @param amount Amount to withdraw
     */
    function withdrawBalance(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(agentBalances[msg.sender] >= amount, "Insufficient balance");

        agentBalances[msg.sender] -= amount;

        require(
            usdc.transfer(msg.sender, amount),
            "Withdrawal failed"
        );

        emit BalanceWithdrawn(msg.sender, amount, agentBalances[msg.sender]);
    }

    /**
     * @notice Purchase access to premium task details
     * @param taskId Task to access
     */
    function purchaseTaskAccess(uint256 taskId) external nonReentrant {
        require(tasks[taskId].id != 0, "Task not found");
        require(!hasAccessToTask[taskId][msg.sender], "Already has access");

        uint256 fee = taskAccessFee[taskId] > 0 ? taskAccessFee[taskId] : defaultAccessFee;
        require(agentBalances[msg.sender] >= fee, "Insufficient balance");

        agentBalances[msg.sender] -= fee;
        agentBalances[owner] += fee; // Fee goes to platform

        hasAccessToTask[taskId][msg.sender] = true;

        emit AccessPurchased(taskId, msg.sender, fee);
    }

    /**
     * @notice Charge agent for API call (called by trusted backend)
     * @param agent Agent to charge
     * @param cost Cost of the API call
     */
    function chargeApiCall(address agent, uint256 cost) external onlyOwner {
        require(agentBalances[agent] >= cost, "Insufficient balance");

        agentBalances[agent] -= cost;
        agentBalances[owner] += cost;
        apiCallCount[agent]++;

        emit ApiCallCharged(agent, cost, agentBalances[agent]);
    }

    /**
     * @notice Set custom access fee for a task
     * @param taskId Task ID
     * @param fee Access fee (0 = use default)
     */
    function setTaskAccessFee(uint256 taskId, uint256 fee) external onlyPoster(taskId) {
        taskAccessFee[taskId] = fee;
    }

    /**
     * @notice Check if agent has access to task
     */
    function checkTaskAccess(uint256 taskId, address agent) external view returns (bool) {
        // Poster always has access
        if (tasks[taskId].poster == agent) return true;
        // Assigned agent has access
        if (tasks[taskId].assignedTo == agent) return true;
        // Check if purchased access
        return hasAccessToTask[taskId][agent];
    }

    /**
     * @notice Get agent balance
     */
    function getBalance(address agent) external view returns (uint256) {
        return agentBalances[agent];
    }

    // ============ Admin Functions ============

    /**
     * @notice Update platform fee (only owner)
     * @param newFee New fee in basis points (max 1000 = 10%)
     */
    function updatePlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        platformFee = newFee;
    }

    /**
     * @notice Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }

    /**
     * @notice Update default access fee
     */
    function updateDefaultAccessFee(uint256 newFee) external onlyOwner {
        defaultAccessFee = newFee;
    }

    /**
     * @notice Update API call cost
     */
    function updateApiCallCost(uint256 newCost) external onlyOwner {
        apiCallCost = newCost;
    }
}
