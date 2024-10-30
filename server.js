const express = require('express');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));

let participants = [];
const registeredNames = new Set(); // Set zum Speichern der registrierten Namen
let questions = ["Was ist die Hauptstadt von Deutschland?", "Wie viele Bundesländer hat Deutschland?", "Wer schrieb 'Faust'?"];

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'register') {
            if (!registeredNames.has(data.name)) { // Überprüfen, ob der Name bereits registriert ist
                registeredNames.add(data.name); // Name hinzufügen
                participants.push({ id: ws, name: data.name });
                ws.send(JSON.stringify({ type: 'registered', questions }));
                broadcast({ type: 'participants', participants: participants.map(p => ({ name: p.name })) });
            } else {
                ws.send(JSON.stringify({ type: 'alreadyRegistered', name: data.name })); // Rückmeldung, dass bereits registriert
            }
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

        // Entfernen eines Teilnehmers
        if (data.type === 'removeParticipant') {
            participants = participants.filter(p => p.name !== data.name);
            broadcast({ type: 'participants', participants: participants.map(p => ({ name: p.name })) });
        }

        // Schließen der Frage
        if (data.type === 'closeQuestion') {
            if (data.correct !== null) {
                // Logik für richtige/falsche Antworten kann hier hinzugefügt werden
            }
            broadcast({ type: 'questionClosed' });
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
    console.log(`Server läuft auf Port ${PORT}`);
});
