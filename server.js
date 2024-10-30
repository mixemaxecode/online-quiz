// server.js
const WebSocket = require('ws');
const PORT = process.env.PORT || 8080; // Dynamischer Port für Heroku
const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'new-question') {
            broadcast({ type: 'new-question', question: data.question });
        } else if (data.type === 'buzz') {
            broadcast({ type: 'buzz', time: data.time }, ws);
        }
    });
});

function broadcast(data, exclude) {
    wss.clients.forEach((client) => {
        if (client !== exclude && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}