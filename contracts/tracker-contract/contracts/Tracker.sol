// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;
pragma experimental ABIEncoderV2;

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

  // ENCODE
  function encode(string memory status, string memory location) public pure returns (bytes memory) 
  {
    return abi.encode(status, location);
  }

  // DECODEs
  function decode(bytes memory data) public pure returns (string memory, string memory){
    return abi.decode(data, (string, string));
  }

  function decodemultiple(uint length, bytes[10] memory data) public pure returns (string[10] memory, string[10] memory){
    require(length > 0 && length <= 10);

    string[10] memory status; string[10] memory location;
    //string memory empty = "";
    //bytes32 encempty = keccak256(abi.encode(empty));

    uint i = 0;
    for(i = 0; i < length; i++) {
      //if(keccak256(data[i]) != encempty) {
        (status[i], location[i]) = abi.decode(data[i], (string, string));
      //}
    }

    return (status, location);
  }
}