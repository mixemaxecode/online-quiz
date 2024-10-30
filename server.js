// server.js

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

// Initialisiere das Express-Application
const app = express();
app.use(cors());
app.use(express.static('public')); // Dient statische Dateien aus dem 'public' Ordner

// Setze den Port
const PORT = process.env.PORT || 8080;

// Erstelle den HTTP-Server
const server = http.createServer(app);

// WebSocket-Server initialisieren
const wss = new WebSocket.Server({ server });

// Teilnehmer speichern
let participants = [];

// WebSocket-Verbindung handhaben
wss.on('connection', (ws) => {
    console.log('Ein Teilnehmer hat sich verbunden.');

    // Teilnehmer-Informationen speichern
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'JOIN':
                participants.push({ id: data.id, ws });
                console.log(`Teilnehmer ${data.id} hat sich angemeldet.`);
                break;

            case 'BUZZ':
                console.log(`Teilnehmer ${data.id} hat gebuzzert!`);
                // Hier kannst du die Logik hinzufügen, um den Buzz zu handhaben
                broadcast({ type: 'BUZZ', id: data.id });
                break;

            // Weitere Message-Types können hier hinzugefügt werden
        }
    });

    // Verbindung schließen
    ws.on('close', () => {
        participants = participants.filter((p) => p.ws !== ws);
        console.log('Ein Teilnehmer hat die Verbindung getrennt.');
    });
});

// Helper-Funktion zum Senden von Nachrichten an alle Teilnehmer
function broadcast(data) {
    participants.forEach((participant) => {
        participant.ws.send(JSON.stringify(data));
    });
}

// Starte den Server
server.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});