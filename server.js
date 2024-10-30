const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

let participants = [];
let questions = ["Was ist die Hauptstadt von Deutschland?", "Wie viele Bundesländer hat Deutschland?", "Wer schrieb 'Faust'?"];

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'register') {
            participants.push({ id: ws, name: data.name });
            ws.send(JSON.stringify({ type: 'registered', questions }));
            broadcast({ type: 'participants', participants: participants.map(p => ({ name: p.name })) });
        }

        if (data.type === 'selectQuestion') {
            const question = questions[data.index];
            broadcast({ type: 'question', question });
        }

        if (data.type === 'buzzer') {
            const timestamp = Date.now();
            const participant = participants.find(p => p.id === ws);
            broadcast({ type: 'buzzed', name: participant.name, timestamp });
        }
    });
});

function broadcast(message) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}