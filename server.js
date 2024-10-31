const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const { v4: uuidv4 } = require('uuid'); // UUID f�r eindeutige IDs

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));

let participants = [];
const registeredNames = new Set(); // Set zum Speichern der registrierten Namen
let questions = ["Was ist die Hauptstadt von Deutschland?", "Wie viele Bundesl�nder hat Deutschland?", "Wer schrieb 'Faust'?"];

wss.on('connection', (ws) => {
    const socketId = uuidv4();
    ws.id = socketId;
    ws.send(JSON.stringify({ type: 'socketId', id: socketId }));

    ws.send(JSON.stringify({ type: 'questions', questions }));

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'register') {
            if (!registeredNames.has(data.name)) { // �berpr�fen, ob der Name bereits registriert ist
                registeredNames.add(data.name); // Name hinzuf�gen
                participants.push({ id: socketId, name: data.name });
                ws.send(JSON.stringify({ type: 'registered', questions }));
                broadcast({ type: 'participants', participants: participants.map(p => ({ name: p.name })) });
            } else {
                ws.send(JSON.stringify({ type: 'nameTaken' })); // R�ckmeldung, dass bereits registriert
            }
        }

        if (data.type === 'registered') {
            ws.send(JSON.stringify({ type: 'registered', questions }));
            console.log(`registered`);
        }

        // �bernahme-Anfrage
        if (data.type === 'requestTakeOver') {
            // Nachricht an den Quizmaster zur Best�tigung der �bernahme
            broadcast({ type: 'confirmTakeOver', name: data.name, id: socketId });
        }

        // Quizmaster best�tigt oder lehnt die �bernahme ab
        if (data.type === 'takeOverResponse') {
            if (data.allow) { // Falls �bernahme erlaubt                              
                const newClient = [...wss.clients].find(client => client.id === data.id);
                newClient.send(JSON.stringify({ type: 'takeOverConfirmed', name: data.name, id: data.id }));
                const participant = participants.find(p => p.name === data.name);
                const oldSocketId = participant.id; // Alte ID speichern
                participant.id = data.id;

                // Benachrichtige den alten Client, dass er abgemeldet wird
                const oldClient = [...wss.clients].find(client => client.id === oldSocketId);                
                if (oldClient && oldClient.readyState === WebSocket.OPEN) {
                    oldClient.send(JSON.stringify({ type: 'forceLogout' }));
                }

            } else {
                broadcast({ type: 'takeOverDenied', name: data.name, id: data.id });
            }
            broadcast({ type: 'participants', participants: participants.map(p => ({ name: p.name })) });
        }

        if (data.type === 'selectQuestion') {
            const question = questions[data.index];
            broadcast({ type: 'question', question });
        }

        if (data.type === 'buzzer') {
            const timestamp = Date.now();
            const participant = participants.find(p => p.id === socketId);
            broadcast({ type: 'buzzed', name: participant.name, timestamp });
        }

        // Entfernen eines Teilnehmers
        if (data.type === 'removeParticipant') {
            participants = participants.filter(p => p.name !== data.name);
            registeredNames.delete(data.name); // Namen aus dem Set entfernen
            broadcast({ type: 'participants', participants: participants.map(p => ({ name: p.name })) });
        }

        // Schlie�en der Frage
        if (data.type === 'closeQuestion') {
            if (data.correct !== null) {
                // Logik f�r richtige/falsche Antworten kann hier hinzugef�gt werden
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
    console.log(`Server l�uft auf Port ${PORT}`);
});
