import React, {useEffect, useState} from 'react'
import { Box, Spacer, Text, HStack, UnorderedList, ListItem } from "@chakra-ui/react"
import StatsCard from '../components/statscard'
import {
  FiTruck,
  FiLayers,
  FiLink
} from 'react-icons/fi';

import { ICountsView, getcounts } from '../libraries/api-adapter';

const HomePage = () => {
  const [counts, setCounts] = useState<ICountsView[]>([])

  useEffect(() => {
    const trks = async() => {
      var countsview = await getcounts();
      //alert(JSON.stringify(countsview))
      setCounts(countsview);
    }
    trks()
  },[])

  return (
    <>
      <Box display="flex" alignItems="flex-start" justifyContent="center" backgroundColor="white">
      <Box width="2xl" backgroundColor="white" border="0px" >
        <p>
        Shipment Tracking Dapp facilitates tracking of a shipment from source to destination.
        </p>
        <br/>
        <h4>Features</h4>
        <UnorderedList>
        <ListItem>List all Shipments</ListItem>
        <ListItem>Track Shipment</ListItem>
        <ListItem>Add Events</ListItem>
        <ListItem>New Shipment</ListItem>
        </UnorderedList>
        <br/>
        <h4>Technology</h4>
        <p>
        Built using Avalanche permission-less subnet.
        </p>
      </Box>
      <Box width="sm" flexDirection="column" spacing="20px">
      <Text>Stats</Text>
      <br/>
      <StatsCard
          title={'Shipments'}
          stat={counts!=undefined && counts[0]!=undefined?counts[0].count.toString():""}
          icon={<FiTruck size={'3em'} />}
      />
      <br/>
      <StatsCard
          title={'Events'}
          stat={counts!=undefined && counts[1]!=undefined?counts[1].count.toString():""}
          icon={<FiLayers size={'3em'} />}
      />
      <Spacer height="20px" />
      </Box>
      </Box>
    </>
  )
}

export default HomePage

