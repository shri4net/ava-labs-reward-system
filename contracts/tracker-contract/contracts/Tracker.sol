// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;
//pragma experimental ABIEncoderV2;

contract Tracker {

  //// Definition
  //   struct Data {
  //     string status;
  //     string location;
  //   }
  //// Declaration
  //   Data memory d = Data({
  //     status: status,
  //     location: location
  //   });

  function encode(string memory status, string memory location) public pure returns (bytes memory) {
    return abi.encode(status, location);
  }

  function decode(bytes memory data) public pure returns (string memory, string memory){
    return abi.decode(data, (string, string));
  }
}