/**
 * This MIT licensed component SidebarWithHeader is generously copied (and modified) from
 * https://chakra-templates.dev/navigation/sidebar
 * If you find it interesting, please buy a coffee for the author here
 * https://www.buymeacoffee.com/hauptrolle
 */

import React, { ReactNode, useEffect, useState } from 'react';
import {
  IconButton,
  Avatar,
  Box,
  CloseButton,
  Flex,
  HStack,
  VStack,
  Icon,
  useColorModeValue,
  Link,
  Drawer,
  DrawerContent,
  Text,
  useDisclosure,
  BoxProps,
  FlexProps,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Image,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiHome,
  FiMenu,
  FiChevronDown,
  FiEdit, FiList, FiPlusCircle, FiTruck
} from 'react-icons/fi';
import { GiCargoShip } from 'react-icons/gi'
import { MdAccountBox, MdNoAccounts } from 'react-icons/md'
import { IconType } from 'react-icons';
import { ReactText } from 'react';
import { IConnectedAccount } from '../entities/common'

interface LinkItemProps {
  name: string;
  menukey: string;
  icon: IconType;
}
const LinkItems: Array<LinkItemProps> = [
  { name: 'Home', menukey: 'Home', icon: FiHome },
  { name: 'List', menukey: 'List-Shipments', icon: FiList },
  { name: 'Track', menukey: 'Search-For-Track-Shipment', icon: FiTruck },
  { name: 'Add Event', menukey: 'Search-For-Add-Event', icon: FiEdit},
  { name: 'New Shipment', menukey: 'New-Shipment', icon: FiPlusCircle },
];

export default function SidebarWithHeader({
  children, onMenuClick, onAccountChange
}: {
  children: ReactNode;
  onMenuClick: (name: string) => void;
  onAccountChange: (connectedAccount:IConnectedAccount) => void;
}) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  return (
    <Box minH="100vh" bg={useColorModeValue('gray.100', 'gray.900')}>
      <SidebarContent
        onClose={() => onClose}
        onMenuClick = {onMenuClick}
        onAccountChange = {onAccountChange}
        display={{ base: 'none', md: 'block' }}
      />
      <Drawer
        autoFocus={false}
        isOpen={isOpen}
        placement="left"
        onClose={onClose}
        returnFocusOnClose={false}
        onOverlayClick={onClose}
        size="full">
        <DrawerContent>
          <SidebarContent onMenuClick={onMenuClick} onAccountChange={onAccountChange} onClose={onClose} />
        </DrawerContent>
      </Drawer>
      {/* mobilenav */}
      <MobileNav onOpen={onOpen} onAccountChange={onAccountChange} />
      <Box ml={{ base: 0, md: 60 }} p="4">
        {children}
      </Box>
    </Box>
  );
}

interface SidebarProps extends BoxProps {
  onClose: () => void;
  onMenuClick: (name: string) => void;
  onAccountChange: (connectedAccount:IConnectedAccount) => void;
}

const SidebarContent = ({ onClose, onMenuClick, onAccountChange, ...rest }: SidebarProps) => {
  return (
    <Box
      transition="3s ease"
      bg={useColorModeValue('white', 'gray.900')}
      borderRight="1px"
      borderRightColor={useColorModeValue('gray.200', 'gray.700')}
      w={{ base: 'full', md: 60 }}
      pos="fixed"
      h="full"
      {...rest}>
      <Flex h="20" alignItems="center" mx="8" justifyContent="space-between">
        <Icon mr="4" fontSize="4xl" as={GiCargoShip}/>
        <CloseButton display={{ base: 'flex', md: 'none' }} onClick={onClose} />
      </Flex>
      {LinkItems.map((link) => (
        <NavItem key={link.name} icon={link.icon} menukey={link.menukey} onMenuClick={onMenuClick}>
          {link.name}
        </NavItem>
      ))}
      <Flex justifyContent="flex-end" alignItems="center" direction="column" height="45%">
        <Box width="60%">
        <Tooltip placement="top" label="Avalanche v1.6.2"><span><img src='./powered_by_avalanche_bw.svg' alt="v1.6.2"/></span></Tooltip>
        </Box>
      </Flex>
    </Box>
  );
};

interface NavItemProps extends FlexProps {
  icon: IconType;
  children: ReactText;
  menukey: string;
  onMenuClick: (name: string) => void;
}
const NavItem = ({ icon, children, menukey, onMenuClick, ...rest }: NavItemProps) => {
  return (
    <Link href="#" onClick={() => onMenuClick(menukey) } style={{ textDecoration: 'none' }}>
      <Flex
        align="center"
        p="4"
        mx="4"
        borderRadius="lg"
        role="group"
        cursor="pointer"
        _hover={{
          bg: 'cyan.400',
          color: 'white',
        }}
        {...rest}>
        {icon && (
          <Icon
            mr="4"
            fontSize="16"
            _groupHover={{
              color: 'white',
            }}
            as={icon}
          />
        )}
        {children}
      </Flex>
    </Link>
  );
};

interface MobileProps extends FlexProps {
  onOpen: () => void;
  onAccountChange: (connectedAccount:IConnectedAccount) => void;
}
type EthWindow = typeof window & {ethereum: any}

const MobileNav = ({ onOpen, onAccountChange, ...rest }: MobileProps) => {
  const [connectedAccount, setConnectedAccount] = useState<IConnectedAccount>({isconnected:false, account:"", chainid:""})

  useEffect(() => {
    const ethwin : EthWindow = (window as any)
    const init = async() => {
      if(ethwin.ethereum) {
        await getAccount(ethwin);
        ethwin.ethereum.on('accountsChanged', async(a:string[])=>{getAccount(ethwin);})
        //ethwin.ethereum.on('networkChanged', async(network:string)=>{ alert('network:' + JSON.stringify(network)) } )
        //ethwin.ethereum.on('chainChanged', async(chain:string)=>{
        //  const chainId = await ethwin.ethereum.request({ method: 'eth_chainId', });
        //  alert('chain:' + JSON.stringify(chain) + ', chainID:' + chainId)
        //})
      } else {
        //alert('Metamask plugin not found or not enabled.')
      }
    }
    //init()

  },[])

  const getAccount = async(ethwin:EthWindow) => {
    //var accts = await ethwin.ethereum.send('eth_requestAccounts');
    const accts = await ethwin.ethereum.request({ method: 'eth_requestAccounts', });
    //alert(JSON.stringify(accts))
    const chainId = await ethwin.ethereum.request({ method: 'eth_chainId' }); 
    //var accts = await ethwin.ethereum.enable();
    var connectedAccount:IConnectedAccount = {isconnected:true, account: accts[0], chainid: chainId}
    //setConnectedAccount({isconnected:true, account: accts.result[0], chainid: chainId})
    setConnectedAccount(connectedAccount)
    onAccountChange(connectedAccount)
  }

  const getAccountNameLabel = () => {
    return connectedAccount.isconnected?
      `${connectedAccount.account.substring(0,6)}...${connectedAccount.account.substring(38,42)}`:
      "Guest"
  }

  const connectWalletClick = async() => {
    const ethwin : EthWindow = (window as any)
    if(ethwin.ethereum) {
      await getAccount(ethwin);
      ethwin.ethereum.on('accountsChanged', async(a:string[])=>{getAccount(ethwin);})
      //ethwin.ethereum.on('networkChanged', async(network:string)=>{ alert('network:' + JSON.stringify(network)) } )
      //ethwin.ethereum.on('chainChanged', async(chain:string)=>{alert('chain:' + JSON.stringify(chain))})
    } else {
      alert('Metamask plugin not found or not enabled.')
    }
  }

  const profileClick = () => {
    alert(`${connectedAccount.account}`)
  }

  return (
    <Flex
      ml={{ base: 0, md: 60 }}
      px={{ base: 4, md: 4 }}
      height="20"
      alignItems="center"
      bg={useColorModeValue('white', 'gray.900')}
      borderBottomWidth="1px"
      borderBottomColor={useColorModeValue('gray.200', 'gray.700')}
      justifyContent={{ base: 'space-between', md: 'flex-end' }}
      {...rest}>
      <IconButton
        display={{ base: 'flex', md: 'none' }}
        onClick={onOpen}
        variant="outline"
        aria-label="open menu"
        icon={<FiMenu />}
      />

      <Text
        mr={20}
        display={{ base: 'flex' }}
        fontSize="2xl"
        fontFamily="monospace"
        fontWeight="bold">
        Shipment Tracking
      </Text>

      <HStack spacing={{ base: '0', md: '6' }}>
        <Flex alignItems={'center'}>
          <Menu>
            <MenuButton
              py={2}
              transition="all 0.3s"
              _focus={{ boxShadow: 'none' }}>
              <HStack>
                <Icon
                  as={!connectedAccount.isconnected?MdNoAccounts:MdAccountBox}
                  color={!connectedAccount.isconnected?'gray':'#'+connectedAccount.account.substring(2,8)}
                  background={'white'}
                  fontSize={'3xl'}
                />
                <VStack
                  display={{ base: 'none', md: 'flex' }}
                  alignItems="flex-start"
                  spacing="1px"
                  ml="2">
                  <Text fontSize="sm">{getAccountNameLabel()}</Text>
                </VStack>
                <Box display={{ base: 'none', md: 'flex' }}>
                  <FiChevronDown />
                </Box>
              </HStack>
            </MenuButton>
            <MenuList
              bg={useColorModeValue('white', 'gray.900')}
              borderColor={useColorModeValue('gray.200', 'gray.700')}>
              <MenuItem isDisabled={connectedAccount.isconnected} onClick={connectWalletClick}>Connect Wallet</MenuItem>
              <MenuItem isDisabled={!connectedAccount.isconnected} onClick={profileClick}>Profile</MenuItem>
              <MenuDivider />
              <MenuItem isDisabled={!connectedAccount.isconnected}>Settings</MenuItem>
              <MenuDivider />
              <MenuItem isDisabled={!connectedAccount.isconnected}>Disconnect</MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </HStack>
    </Flex>
  );
};