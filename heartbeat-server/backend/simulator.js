const axios = require('axios');
const logger = require('./server/services/logger');

const SERVER_URL = 'http://localhost:3002';
const TOTAL_NODES = 10;

let nodes = [];

// Create nodes
for (let i = 1; i <= TOTAL_NODES; i++) {
nodes.push({
id: `node${i}`,
active: true
});
}

// Register all nodes
async function registerNodes() {
for (let node of nodes) {
await axios.post(`${SERVER_URL}/register`, {
nodeId: node.id
});
}
logger.info("All nodes registered");
}

// Send heartbeat
async function sendHeartbeat(node) {
try {
await axios.post(`${SERVER_URL}/heartbeat`, {
nodeId: node.id
});
} catch (err) {
logger.warn({ node: node.id, err }, "Heartbeat simulation request failed");
}
}

// Random failure simulation
function randomlyKillNodes() {
nodes.forEach(node => {
if (Math.random() < 0.2) {
node.active = false;
}
});
}

// Revive some nodes
function reviveNodes() {
nodes.forEach(node => {
if (!node.active && Math.random() < 0.3) {
node.active = true;
}
});
}

// Main loop
async function startSimulation() {
await registerNodes();


setInterval(() => {
    nodes.forEach(node => {
        if (node.active) {
            sendHeartbeat(node);
        }
    });
}, 3000);

setInterval(() => {
    randomlyKillNodes();
    reviveNodes();
}, 15000);


}

startSimulation();
