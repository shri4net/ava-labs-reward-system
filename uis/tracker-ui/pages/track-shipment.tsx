import { useState, useEffect } from 'react';
import { Text, Button, Table, Tbody, Tr, Td, Box, Thead, Divider, Tooltip, Icon } from "@chakra-ui/react"
import React, { useRef } from 'react'

import {IEventsView, getshipmentevents} from '../libraries/api-adapter'
import { MdAccountCircle } from 'react-icons/md';


interface TrackShipmentPageProps {
  id:string;
  onAddEventClick: (trid: string) => void;
}

const TrackShipmentPage = ({id, onAddEventClick, ...rest}:TrackShipmentPageProps) => {
  const [trackids, setTrackids] = useState<IEventsView[]>([])

  useEffect(() => {
    if(id != undefined) {
      const trks = async() => {
        var eventsView = await getshipmentevents(id);
        setTrackids(eventsView)
      }
      trks()
    }
  },[id])

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
      <Box mt="4" mb="4" textAlign="center"><b>Tracking for ID : </b>{id}</Box>
      <Box backgroundColor="white" border="0px" >
        <Table>
          <Thead>
            <Tr color="gray">
              <Td></Td>
              <Td>EventID</Td>
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
                  <Td><Text fontSize="sm" fontFamily="mono">{item.id}</Text></Td>
                  <Td><Text fontSize="sm" color="gray">{formatDate(item.time)}<br/>{formatTime(item.time)}</Text></Td>
                  <Td><Text fontSize="lg">{item.status}</Text></Td>
                  <Td><Text fontSize="lg">{item.location}</Text></Td>
                  <Td><Tooltip label={`Added by: ${item.creator}`} color="black" background="gray.200" fontSize="sm" placement="bottom-end"><span><Icon color={'#'+item.creator.substring(2,8)} fontSize="xl" as={MdAccountCircle} /></span></Tooltip></Td>
                </Tr>
              )
            }
          </Tbody>
        </Table>
      </Box>
      <Divider mt="4" mb="4" />
      <Box ml={4} mb={12}>
        <Button as="button" mr={2} onClick={()=>{onAddEventClick(id)}} colorScheme="blue" variant="outline">Add Event</Button>
        <span>to this TrackID</span>
      </Box>
    </Box>
  </>
  )
}

export default TrackShipmentPage
