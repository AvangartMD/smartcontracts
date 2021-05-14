// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import "./ERC1155.sol";

contract Test is ERC1155 {
    address payable public admin;
    uint256 public tokenId;
    uint256 public maxLimitCopies;
    uint256 public maxEditionPerCreator;
    // string[] public categories;

    struct creatorTokenIds {
        uint256[] tokenIds;
    }

    mapping(address => bool) public isApproved;
    mapping(uint256 => string) public tokenURI;
    mapping(uint256 => address) public owner;
    mapping(address => uint256) public maxEditions;
    mapping(address => creatorTokenIds) private creatorIds;

    constructor(address payable _admin) ERC1155("") {
        admin = _admin;
        isApproved[admin] = true;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only Owner can call this function");
        _;
    }

    function changeAdmin(address payable _admin) external onlyAdmin {
        admin = _admin;
    }

    function setMaxLimitCopies(uint256 _amount) external onlyAdmin {
        maxLimitCopies = _amount;
    }

    function setMaxEditions(uint256 _max) external onlyAdmin {
        require(_max > 0, "Zero max editions");
        maxEditionPerCreator = _max;
    }

    function approveCreator(address _creator) external onlyAdmin {
        require(!isApproved[_creator], "Already approved");
        isApproved[_creator] = true;
    }

    function disableCreator(address _creator) external onlyAdmin {
        require(isApproved[_creator], "Creator is not approved");
        isApproved[_creator] = false;
    }

    function mintEditionToken(string memory _tokenURI) external returns (bool) {
        address from = msg.sender;
        // require(_tokenURI != "", "Token URI not found");
        require(isApproved[from], "Only approved users can mint");
        if (from != admin) {
            require(
                maxEditions[from] <= maxEditionPerCreator,
                "Can't mint more than allowed editions"
            );
        }
        _mint(from, tokenId, 1, "");
        tokenURI[tokenId] = _tokenURI;
        creatorIds[from].tokenIds.push(tokenId);
        owner[tokenId] = from;
        tokenId++;
        maxEditions[from]++;
        return true;
    }

    function viewCreatorTokenIds(address _creator)
        external
        view
        returns (uint256[] memory)
    {
        return (creatorIds[_creator].tokenIds);
    }

    function mintTokenCopies(uint256 _amount, string memory _tokenURI)
        external
        returns (bool)
    {
        address from = msg.sender;
        require(_amount > 1, "Amount should be greater than one");
        if (from != admin) {
            require(
                _amount <= maxLimitCopies,
                "Can't mint more copies than allowed"
            );
            require(
                maxEditions[from] <= maxEditionPerCreator,
                "Can't mint more than allowed editions"
            );
        }
        require(isApproved[from], "Only approved users can mint");
        _mint(from, tokenId, _amount, "");
        tokenURI[tokenId] = _tokenURI;
        creatorIds[from].tokenIds.push(tokenId);
        owner[tokenId] = from;
        tokenId++;
        maxEditions[from]++;
        return true;
    }

    function burnToken(uint256 _id, uint256 _amount) external returns (bool) {
        address from = msg.sender;
        _burn(from, _id, _amount);
        return true;
    }
}
