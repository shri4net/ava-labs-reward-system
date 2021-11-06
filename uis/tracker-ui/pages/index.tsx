import React, { useEffect, useState } from 'react'
import SidebarWithHeader from '../components/sidebarwithheader'
import HomePage from './home'
import ListShipmentsPage from './list-shipments'
import SearchForTrackShipmentPage from './search-for-track-shipment'
import SearchForAddEventPage from './search-for-add-event'
import NewShipmentPage from './new-shipment'
import TrackShipmentPage from './track-shipment'
import AddEventPage from './add-event'
import { Button, Box, Heading, Link, Flex } from "@chakra-ui/react"
import { IConnectedAccount } from '../entities/common'

const IndexPage = () => {
  //const [tcVal, setTcVal] = useState("")
  const [lnkVal, setLnkVal] = useState({val:"", id:""})
  const [connectedAccount, setConnectedAccount] = useState<IConnectedAccount>({isconnected:false, account:"", chainid:""})

  return (
    <>
    <SidebarWithHeader onAccountChange={(ca:IConnectedAccount)=>{ setConnectedAccount(ca); }} onMenuClick={(nm:string)=>{setLnkVal({val:nm, id:""})}}>
      <ContentContainer connectedAccount={connectedAccount} val={lnkVal.val} id={lnkVal.id} onLinkClick={(nm:string, id:string)=>{setLnkVal({val:nm, id:id})}}></ContentContainer>
    </SidebarWithHeader>
    </>
  )
}

export default IndexPage;

interface IContentContainerProps {
  val: string;
  onLinkClick: (nm:string, id: string) => void;
  //lnkVal: {val:string, id:string}
  id:string;
  connectedAccount:IConnectedAccount;
}

const ContentContainer = ({val, onLinkClick, id, connectedAccount, ...rest}:IContentContainerProps) => {
  const [choice, setChoice] = useState({value:"", id: ""})

  useEffect(() => {
    //alert(val)
    setChoice({value:val, id:id})
  }, [val, id])

  //useEffect(() => {
  //  setChoice({value:val})
  //}, [lnkVal])

  const renderPage = (page: string) => {
    //alert(choice.value)
    switch (choice.value) {
      case "Home":
        return <HomePage></HomePage>
        break;
      case "List-Shipments":
        return <ListShipmentsPage onLinkClick={(id:string)=>{onLinkClick("Track-Shipment", id)}}></ListShipmentsPage>
        break;
      case "Search-For-Track-Shipment":
        return <SearchForTrackShipmentPage onSearchClick={(id:string)=>{onLinkClick("Track-Shipment", id)}}></SearchForTrackShipmentPage>
        break;
      case "Search-For-Add-Event":
        return <SearchForAddEventPage onSearchClick={(id:string)=>{onLinkClick("Add-Event", id)}}></SearchForAddEventPage>
        break;
      case "New-Shipment":
        return <NewShipmentPage connectedAccount={connectedAccount} onPostSubmitClick={()=>{onLinkClick("List-Shipments", "")}}></NewShipmentPage>
        break;
      case "Track-Shipment":
        return <TrackShipmentPage id={choice.id} onAddEventClick={(id:string)=>{onLinkClick("Add-Event", id)}}></TrackShipmentPage>
        break;
      case "Add-Event":
        return <AddEventPage connectedAccount={connectedAccount} trackid={choice.id} onPostSubmitClick={(trid)=>{onLinkClick("Track-Shipment", trid)}}></AddEventPage>
        break;
      default:
        return <HomePage></HomePage>
        break;
    }
  }

  return(
    <>
      {
        renderPage(choice.value)
      }
    </>
  ) 
}
