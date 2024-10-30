const express = require('express');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));

let participants = [];
let questions = ["Was ist die Hauptstadt von Deutschland?", "Wie viele Bundesl�nder hat Deutschland?", "Wer schrieb 'Faust'?"];

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

        // Handling question close
        if (data.type === 'closeQuestion') {
            if (data.correct !== null) {
                // Handle correct/wrong answer logic
                // (Hier kannst du die Punktevergabe und das Deaktivieren des Buzzers einf�gen)
            }
            broadcast({ type: 'questionClosed' }); // Sende an alle Clients
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

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
    console.log(`Server l�uft auf Port ${PORT}`);
});
