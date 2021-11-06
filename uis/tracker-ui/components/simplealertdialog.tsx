
import { Button, AlertDialog, AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, AlertDialogCloseButton, AlertDialogBody, AlertDialogFooter, useDisclosure } from "@chakra-ui/react"
import React, { useRef } from 'react'

interface ISimpleAlertDialogProps {
  title:string;
  body:string;
  isOpen:boolean;
  onClose: () => void;
}

const SimpleAlertDialog = ({isOpen, title, body, onClose,...rest}:ISimpleAlertDialogProps) => {
  const cancelRef = useRef<HTMLButtonElement>(null)

  return (
    <AlertDialog
      leastDestructiveRef={cancelRef}
      onClose={onClose}
      isOpen={isOpen}
      isCentered
    >
    <AlertDialogOverlay />
    <AlertDialogContent>
      <AlertDialogHeader>{title}</AlertDialogHeader>
      <AlertDialogCloseButton />
      <AlertDialogBody>{body}</AlertDialogBody>
      <AlertDialogFooter>
        <Button ref={cancelRef} onClick={onClose}>
          OK
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
    </AlertDialog>
  );
}

export default SimpleAlertDialog;