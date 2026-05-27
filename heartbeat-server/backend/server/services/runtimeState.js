let ioInstance = null;
let activeSocketConnections = 0;

function setSocketServer(io) {
  ioInstance = io;
}

function incrementSockets() {
  activeSocketConnections += 1;
}

function decrementSockets() {
  activeSocketConnections = Math.max(0, activeSocketConnections - 1);
}

function getActiveSocketConnections() {
  if (ioInstance?.engine?.clientsCount !== undefined) {
    return ioInstance.engine.clientsCount;
  }

  return activeSocketConnections;
}

module.exports = {
  decrementSockets,
  getActiveSocketConnections,
  incrementSockets,
  setSocketServer
};
