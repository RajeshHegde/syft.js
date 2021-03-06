/*
The following is a step-by-step explanation of what's going on below:

1. Initiate syft.js and connect to the Grid
2. Get the protocol and assigned plan that this user is supposed to work on
 - If there is no workerId, Grid will generate one for us
 - If there is no scopeId, Grid will generate a scope and make this user the creator
 - Altogether, Grid will send back this user's information, their protocol, their assigned plan, and the workerId's and assignments of the other participants
3. Links are created whereby other participants may join
 - These links are to be shared with the other participants
 - Note that each user will need to request their protocol and assigned plan from the grid... they won't have access to another user's assigned plan
4. Create a direct peer-to-peer connection with the other participants
 - This is done using WebRTC under the hood using a mesh network by which every peer has a private data connection to every other peer
 - This is an asynchronous action, meaning that peers may come and go at any point
 - The syft.js library is capable of handling connections, disconnections, and reconnections without issue
*/

// In the real world: import syft from 'syft.js';
import Syft from '../../src';
import {
  getQueryVariable,
  writeIdentityToDOM,
  writeLinksToDOM
} from './_helpers';

const gridServer = document.getElementById('grid-server');
const connectButton = document.getElementById('connect');
const disconnectButton = document.getElementById('disconnect');
const appContainer = document.getElementById('app');
const textarea = document.getElementById('message');
const submitButton = document.getElementById('message-send');

appContainer.style.display = 'none';

connectButton.onclick = () => {
  appContainer.style.display = 'block';
  gridServer.style.display = 'none';
  connectButton.style.display = 'none';

  startSyft(gridServer.value);
};

const startSyft = url => {
  const workerId = getQueryVariable('worker_id');
  const scopeId = getQueryVariable('scope_id');

  // 1. Initiate syft.js and create socket connection
  const mySyft = new Syft({
    verbose: true,
    url,
    workerId,
    scopeId
  });

  submitButton.onclick = () => {
    mySyft.sendToParticipants(textarea.value);

    textarea.value = '';
  };

  disconnectButton.onclick = () => {
    mySyft.disconnectFromParticipants();
    mySyft.disconnectFromGrid();

    appContainer.style.display = 'none';
    gridServer.style.display = 'block';
    connectButton.style.display = 'block';
  };

  mySyft.onSocketStatus(async ({ connected }) => {
    if (connected) {
      // 2. Get the protocol and associated plan that are assigned to me
      const protocol = await mySyft.getProtocol('18797824900');

      console.log('PROTOCOL', protocol);

      // Write my identity to the screen - not required
      writeIdentityToDOM(
        `You are ${mySyft.role} "${mySyft.workerId}" in scope "${mySyft.scopeId}"`
      );

      // Push the workerId and scopeId onto the current URL if they aren't already there
      // This isn't strictly necessary, but if a user is a creator of a scope (instead of a participant),
      // then they won't be able to refresh and rejoin the scope they created
      if (!workerId && !scopeId) {
        window.history.pushState(
          {},
          null,
          `?worker_id=${mySyft.workerId}&scope_id=${mySyft.scopeId}`
        );
      }

      // 3. Create links for the other participants
      if (mySyft.role === 'creator') {
        writeLinksToDOM(
          Object.keys(mySyft.participants).map(
            id =>
              `${window.location.origin +
                window.location.pathname}?worker_id=${id}&scope_id=${
                mySyft.scopeId
              }`
          )
        );
      }

      // 4. Create a direct P2P connection with the other participants
      mySyft.connectToParticipants();
    }
  });
};
