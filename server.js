const express = require('express');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware zur Bereitstellung von statischen Dateien
app.use(express.static('public'));

// Fragen, die im Quiz verwendet werden
const questions = [
    "Was ist die Hauptstadt von Deutschland?",
    "Wie viele Kontinente gibt es?",
    "Wer malte die Mona Lisa?",
    "Was ist der kleinste Planet in unserem Sonnensystem?",
];

// WebSocket-Logik
let participants = [];

wss.on('connection', (ws) => {
    console.log('Ein Benutzer hat sich verbunden!');

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'register') {
            participants.push({ id: ws, name: data.name });
            ws.send(JSON.stringify({ type: 'registered', questions }));
        }

        if (data.type === 'buzzer') {
            const firstBuzzer = participants.find(p => p.id === ws);
            const timestamp = Date.now();
            ws.send(JSON.stringify({ type: 'buzzed', timestamp }));

            participants.forEach(participant => {
                if (participant.id !== ws) {
                    participant.id.send(JSON.stringify({ type: 'buzzed', name: firstBuzzer.name, timestamp }));
                }
            });
        }

        if (data.type === 'selectQuestion') {
            const question = questions[data.index];
            participants.forEach(participant => {
                participant.id.send(JSON.stringify({ type: 'question', question }));
            });
        }
    });

    ws.on('close', () => {
        console.log('Ein Benutzer hat die Verbindung getrennt.');
        participants = participants.filter(participant => participant.id !== ws);
    });
});

// Setze den Port auf den von Render bereitgestellten Port
const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});