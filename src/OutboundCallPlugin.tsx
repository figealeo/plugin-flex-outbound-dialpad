import * as Flex from '@twilio/flex-ui';
import { FlexPlugin } from 'flex-plugin';
import { SyncClient } from "twilio-sync";
import { Manager } from "@twilio/flex-ui";

import { loadDialPadInterface } from "./components/dialpad";
import { loadExternalTransferInterface } from "./components/external-transfer";


import { registerReservationCreatedExtensions } from "./eventListeners/workerClient/reservationCreated";
import { registerActionExtensions } from "./eventListeners/actionsFramework";


const PLUGIN_NAME = 'OutboundCallPlugin';
export const FUNCTIONS_HOSTNAME = 'call-9269-dev.twil.io';
export const DEFAULT_FROM_NUMBER = "+12135148669"; // twilio account or verified number
export const SYNC_CLIENT = new SyncClient(Manager.getInstance().user.token);

function tokenUpdateHandler() {

  console.log("OUTBOUND DIALPAD: Refreshing SYNC_CLIENT Token");

  const loginHandler = Manager.getInstance().store.getState().flex.session.loginHandler;

  const tokenInfo = loginHandler.getTokenInfo();
  const accessToken = tokenInfo.token;

  SYNC_CLIENT.updateToken(accessToken);
}

export default class OutboundCallPlugin extends FlexPlugin {
  constructor() {
    super(PLUGIN_NAME);
  }

  /**
   * This code is run when your plugin is being started
   * Use this to modify any UI components or attach to the actions framework
   *
   * @param flex { typeof Flex }
   * @param manager { Flex.Manager }
   */
  init(flex: typeof Flex, manager: Flex.Manager) {
    const translationStrings = {
      DIALPADExternalTransferHoverOver: "Add Conference Participant",
      DIALPADExternalTransferPhoneNumberPopupHeader: "Enter phone number to add to the conference",
      DIALPADExternalTransferPhoneNumberPopupTitle: "Phone Number",
      DIALPADExternalTransferPhoneNumberPopupCancel: "Cancel",
      DIALPADExternalTransferPhoneNumberPopupDial: "Dial"
    };
    //add translationStrings into manager.strings, preserving anything thats already there - this allows language to be updated outside of updating this plugin
    manager.strings = { ...translationStrings, ...manager.strings };

    //Add listener to loginHandler to refresh token when it expires
    manager.store.getState().flex.session.loginHandler.on("tokenUpdated", tokenUpdateHandler);
    tokenUpdateHandler();
    // Add custom extensions
    loadDialPadInterface.bind(this)(flex, manager);
    loadExternalTransferInterface.bind(this)(flex, manager);
    registerReservationCreatedExtensions(manager);
    registerActionExtensions();
  }
}
