import React, { useRef, useState } from 'react'

import { Text, Heading, Input, Button, Flex, Stack, FormControl, FormLabel, useColorModeValue, Icon, RadioGroup, Radio } from "@chakra-ui/react"
import { FiEdit } from 'react-icons/fi'
import SimpleAlertDialog from "../components/simplealertdialog";

import {addevent} from '../libraries/api-adapter'
import { IConnectedAccount, PersonalSign } from '../entities/common';

interface AddEventPageProps {
  trackid: string;
  onPostSubmitClick: (trid: string) => void;
  connectedAccount: IConnectedAccount;
}

export default function AddEventPage({ trackid, onPostSubmitClick, connectedAccount, ...rest }: AddEventPageProps) {
  const [alertContent, setAlertContent] = useState({isOpen:false, body:""})
  const txtStatusRef = useRef<HTMLInputElement>(null)
  const txtLocationRef = useRef<HTMLInputElement>(null)
  const rdSignedRef = useRef<HTMLInputElement>(null)
  const rdUnsignedRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    var signedhash = ""
    if(rdSignedRef.current!.checked)
      signedhash = await PersonalSign(connectedAccount.account, 'New Event');

    const status = txtStatusRef.current!.value
    const location = txtLocationRef.current!.value

    var r = await addevent(trackid, status, location, connectedAccount.account, signedhash); // submitView(status, location)

    if(r == undefined)
      return
    else if (r instanceof Error)
      alert((r as Error).message)
    else {
      if (r===true)
        setAlertContent((ps)=>({...ps, isOpen:true, body: "Event submitted Successfully!"}))
      else
        alert("Event submission:" + r);
        
      //onPostSubmitClick(trackid)
    }
  }

  return (
    <>
    <form onSubmit={handleSubmit}>
    <Flex
      minH={'100vh'}
      align={'flex-start'}
      justify={'center'}
      bg={useColorModeValue('gray.50', 'gray.800')}>
      <Stack
        spacing={6}
        w={'full'}
        maxW={'xl'}
        bg={useColorModeValue('white', 'gray.700')}
        rounded={'xl'}
        boxShadow={'lg'}
        p={6}
        my={12}>
        <Heading textAlign="center" lineHeight={1.1} fontSize={{ base: '2xl', md: '2xl' }}>
        Add Event for TrackID<br/>
        </Heading>
        <Text textAlign="center" fontSize="sm">{trackid}</Text>
        <FormControl id="txtStatus" isRequired>
          <FormLabel>Status</FormLabel>
          <Input
            ref={txtStatusRef}
            maxLength={16}
            placeholder="Input status here"
            _placeholder={{ color: 'gray.500' }}
            type="text"
          />
        </FormControl>
        <FormControl id="txtLocation" isRequired>
          <FormLabel>Location</FormLabel>
          <Input
            ref={txtLocationRef}
            maxLength={32}
            placeholder="Input location here"
            _placeholder={{ color: 'gray.500' }}
            type="text"
          />
        </FormControl>
        <RadioGroup defaultValue="signed">
          <Stack direction="row">
          <Radio ref={rdSignedRef} value="signed">Signed</Radio>
          <Radio ref={rdUnsignedRef} value="unsigned">Not signed</Radio>
          </Stack>
        </RadioGroup>
        <Stack spacing={6}>
          <Button
            isDisabled={connectedAccount&&!connectedAccount.isconnected}
            type="submit"
            bg={'blue.400'}
            color={'white'}
            _hover={{
              bg: 'blue.500',
            }}>
            <Icon mr="4" fontSize="lg" as={FiEdit}/>
            Submit
          </Button>
          <Text hidden={connectedAccount&&connectedAccount.isconnected} color='teal' >Connect to Wallet to submit</Text>
        </Stack>
      </Stack>
    </Flex>    
    </form>
    <SimpleAlertDialog 
      title = "Info"
      body = {alertContent.body}
      isOpen={alertContent.isOpen}
      onClose={()=>{setAlertContent((ps)=>({...ps, isOpen:false})); onPostSubmitClick(trackid);}} />

    </>
  )
}
