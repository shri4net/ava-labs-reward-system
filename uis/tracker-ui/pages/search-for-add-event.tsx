import { Heading, Input, Button, Flex, Stack, useColorModeValue, FormControl, FormLabel, Icon } from "@chakra-ui/react"
import React, { useRef, useState } from 'react'
import { FiEdit } from 'react-icons/fi';
import SimpleAlertDialog from "../components/simplealertdialog";
import {isTrackExists} from '../libraries/api-adapter'

interface SearchForAddEventPageProps {
  onSearchClick: (id: string) => void;
}

const SearchForAddEventPage = ({ onSearchClick, ...rest }: SearchForAddEventPageProps) => {
  const txtTrackIDRef = useRef<HTMLInputElement>(null)
  const [alertContent, setAlertContent] = useState({isOpen:false, body:""})

  const handleClick = async () => {
    const trackid = txtTrackIDRef.current!.value

    var r = await isTrackExists(trackid)
    if (r)
      onSearchClick(trackid)
    else {
      setAlertContent((ps)=>({...ps, isOpen:true, body: `TrackID '${trackid}' does not exist`}))
    }
  }
  
  return (
    <>
    <Flex
      minH={'100vh'}
      align={'flex-start'}
      justify={'center'}
      bg={useColorModeValue('gray.50', 'gray.800')}>
      <Stack
        spacing={4}
        w={'full'}
        maxW={'2xl'}
        bg={useColorModeValue('white', 'gray.700')}
        rounded={'xl'}
        boxShadow={'lg'}
        p={6}
        my={12}>
        <Heading lineHeight={1.1} fontSize={{ base: '2xl', md: '2xl' }}>
        Add Event for
        </Heading>
        <Stack spacing={6} direction="row">
          <FormControl id="txtTrackID" isRequired>
            <FormLabel>Track ID</FormLabel>
            <Input
              ref={txtTrackIDRef}
              placeholder="Input Track ID here"
              _placeholder={{ color: 'gray.500' }}
              type="text"
            />
          </FormControl>
          <Button
            p={6}
            alignSelf="flex-end"
            onClick={handleClick}
            bg={'blue.400'}
            color={'white'}
            _hover={{
              bg: 'blue.500',
            }}>
            <Icon mr="4" fontSize="lg" as={FiEdit}/>
            Search
          </Button>
        </Stack>
      </Stack>
    </Flex>
    <SimpleAlertDialog 
      title = "Input Error"
      body = {alertContent.body}
      isOpen={alertContent.isOpen}
      onClose={()=>{setAlertContent((ps)=>({...ps, isOpen:false}))}} />
  </>
  )
}

export default SearchForAddEventPage
