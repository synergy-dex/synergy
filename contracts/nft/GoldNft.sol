// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/ISynt.sol";

/**
 * @title Contract for gold nft collection
 */

struct CardURI {
    string oneOz;
    string fiveOz;
    string tenOz;
    string theCube;
}

contract GoldNft is ERC721, Ownable {
    mapping(uint256 => uint256) public goldEquivalent; // nft gold equivalent in OZ (18 decimals)
    ISynt public goldSynt;
    address public treasury;
    CardURI public cardUri;
    string private contractUri;

    uint256 private lastId;
    uint256 public immutable mintFee; // 18 decimals

    constructor(uint256 _mintFee) ERC721("Gold NFT", "GOLD") {
        mintFee = _mintFee;
    }

    /* ================= OWNER FUNCTIONS ================= */

    /**
     * @dev Reinitialization available only on test purposes. It will be turned off on release
     */
    function initialize(address _goldSynt, address _treasury) external onlyOwner {
        // require(_goldSynt != address(0) && address(goldSynt) == address(0), "Initialize only once")
        goldSynt = ISynt(_goldSynt);
        treasury = _treasury;
    }

    /**
     * @dev Manually set metadata of the nft type
     */
    function setCardUri(uint8 _cardType, string calldata _uri) external onlyOwner {
        if (_cardType == 0) {
            cardUri.oneOz = _uri;
        } else if (_cardType == 1) {
            cardUri.fiveOz = _uri;
        } else if (_cardType == 2) {
            cardUri.tenOz = _uri;
        } else if (_cardType == 3) {
            cardUri.theCube = _uri;
        } else {
            revert("Incorrect card type");
        }
    }

    /**
     * @dev Manually set metadata of the contract
     */
    function setContractUri(string calldata _uri) external onlyOwner {
        contractUri = _uri;
    }

    /* ================= USER FUNCTIONS ================= */

    /**
     * @notice Mint GOLD NFT of given gold equivalent
     * @param _ounce gold equivalent in ounce
     */
    function mintCard(uint256 _ounce) external {
        require(
            _ounce == 1e18 || _ounce == 5e18 || _ounce == 10e18 || _ounce >= 1000e18,
            "Only 1 or 5 or 10 or 1000+ unce cards available"
        );

        uint256 fee_ = (_ounce * mintFee) / 1e18;

        goldSynt.transferFrom(msg.sender, address(this), _ounce);
        goldSynt.transferFrom(msg.sender, treasury, fee_);
        goldEquivalent[lastId] = _ounce;
        _safeMint(msg.sender, lastId++);
    }

    /**
     * @notice Burn NFT and receive its gold equivalent
     * @param _tokenId token id
     */
    function burnCard(uint256 _tokenId) external {
        require(_isApprovedOrOwner(_msgSender(), _tokenId), "Only owner or approved address can burn");

        goldSynt.transfer(ownerOf(_tokenId), goldEquivalent[_tokenId]);
        _burn(_tokenId);
        delete goldEquivalent[_tokenId];
    }

    /* ================= PUBLIC FUNCTIONS ================= */

    /**
     * @notice Return NFT image URI by ID
     */
    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        uint256 unce_ = goldEquivalent[_tokenId];

        if (unce_ == 1e18) {
            return cardUri.oneOz;
        } else if (unce_ == 5e18) {
            return cardUri.fiveOz;
        } else if (unce_ == 10e18) {
            return cardUri.tenOz;
        } else {
            return cardUri.theCube;
        }
    }

    /**
     * @notice Return contract metadata uri
     */
    function contractURI() public view returns (string memory) {
        return contractUri;
    }
}
