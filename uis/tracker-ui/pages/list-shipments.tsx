import { useState, useEffect } from 'react';
import { Text, Table, Tbody, Tr, Td, Box, TableCaption, Thead, Link, Flex, Icon, Tooltip, Heading } from "@chakra-ui/react"
import React from 'react'

import {IShipmentsView, getshipments} from '../libraries/api-adapter'
import { MdAccountCircle } from 'react-icons/md';

interface ListShipmentsPageProps {
  onLinkClick: (id: string) => void;
}

const ListShipmentsPage =  ({ onLinkClick, ...rest }: ListShipmentsPageProps) => {
  const [trackids, setTrackids] = useState<IShipmentsView[]>([])

  useEffect(() => {
      const trks = async() => {
        var shipmentsView = await getshipments();
        setTrackids(shipmentsView)
      }
      trks()
  },[])

  const formatDate = (dt:string) => {
    let d:string = new Date(parseInt(dt)*1000).toDateString();
    let dp:string[] = d.substring(d.indexOf(" ") + 1).split(" ")
    return `${dp[0]} ${dp[1]}, ${dp[2]}`
  }

  const formatTime = (dt:string) => {
    let t:string = new Date(parseInt(dt)*1000).toTimeString();
    return t.substring(0, t.indexOf(" "))
  }

  return (
    <>
    <Box display="flex" flexDirection="column" alignItems="stretch" justifyContent="center" backgroundColor="white">
      <Box textAlign="center">
      <Heading lineHeight={1.1} fontSize={{ base: 'xl', md: 'xl' }}>
      List of Recent Shipments
      </Heading>        
      </Box>
      <Box backgroundColor="white" border="0px" flex="1">
        <Table>
          <Thead variant="unstyled" mt={4}>
          <Tr color="gray">
              <Td></Td>
              <Td></Td>
              <Td colSpan={3} textAlign="center">Last Updated</Td>
            </Tr>
            <Tr color="gray">
              <Td></Td>
              <Td>TrackID</Td>
              <Td>Timestamp</Td>
              <Td>Status</Td>
              <Td>Location</Td>
              <Td></Td>
            </Tr>
          </Thead>
          <Tbody>
            {
              trackids.map((item, index) => 
                <Tr key={index}>
                  <Td><Text fontSize="lg">{index+1}</Text></Td>
                  <Td><Text fontSize="sm" fontFamily="mono"><Link color="blue" as="button" onClick={()=>onLinkClick(item.trackid)}>{item.trackid}</Link></Text></Td>
                  <Td><Text fontSize="sm" color="gray">{formatDate(item.eventtime)}<br/>{formatTime(item.eventtime)}</Text></Td>
                  <Td><Text fontSize="lg">{item.status}</Text></Td>
                  <Td><Text fontSize="lg">{item.location}</Text></Td>
                  <Td><Tooltip label={`Added by: ${item.creator}`} color="black" background="gray.200" fontSize="sm" placement="bottom-end"><span><Icon color={'#'+item.creator.substring(2,8)} fontSize="xl" as={MdAccountCircle} /></span></Tooltip></Td>
                </Tr>
              )
            }
          </Tbody>
        </Table>
      </Box>
    </Box>
  </>
  )
}

export default ListShipmentsPage
