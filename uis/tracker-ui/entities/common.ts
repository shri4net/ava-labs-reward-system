import { ethers } from 'ethers';

export interface IConnectedAccount{
  isconnected:boolean;
  account: string;
  chainid: string;
}

type EthWindow = typeof window & {ethereum: any}

export const PersonalSign = async(from:string, msg:string):Promise<string> => {
  var signedmsg = "";
  try {
    const ethwin : EthWindow = (window as any)
    const cmsg = `0x${Buffer.from(msg, 'utf8').toString('hex')}`;
    signedmsg = await ethwin.ethereum.request({
      method: 'personal_sign',
      params: [cmsg, from, 'password'],
    });
  } catch (err) {
    var e = err as Error
    alert(JSON.stringify(e.message) + ". Submitting anyway...")
  }
  return signedmsg;
}

/*
const connectWalletClick = async() => {
  const ethwin : EthWindow = (window as any)
  if(ethwin.ethereum) {
    await getAccount(ethwin);
    ethwin.ethereum.on('accountsChanged', async(a:string[])=>{getAccount(ethwin);})
    ethwin.ethereum.on('accountsChanged', async(a:string[])=>{getAccount(ethwin);})
  } else {
    alert('Metamask plugin not found or not enabled.')
  }
}

const getAccount = async(ethwin:EthWindow) => {
  var accts = await ethwin.ethereum.send('eth_requestAccounts');
  //var accts = await ethwin.ethereum.enable();
  setConnectedAccount({isconnected:true, account: accts.result[0]})
  var connectedAccount:IConnectedAccount = {isconnected:true, account: accts.result[0]}
  onAccountChange(connectedAccount)
}
*/

