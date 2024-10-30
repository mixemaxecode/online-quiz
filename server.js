const express = require('express');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware zur Bereitstellung von statischen Dateien (falls erforderlich)
app.use(express.static('public')); // Beispiel f�r den 'public'-Ordner

// WebSocket-Logik
wss.on('connection', (ws) => {
    console.log('Ein Benutzer hat sich verbunden!');

    ws.on('message', (message) => {
        console.log('Nachricht erhalten: %s', message);
        // Hier kannst du die Logik f�r die Verarbeitung von Nachrichten hinzuf�gen
    });

    ws.on('close', () => {
        console.log('Ein Benutzer hat die Verbindung getrennt.');
    });
});

// Setze den Port auf den von Render bereitgestellten Port
const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
    console.log(`Server l�uft auf Port ${PORT}`);
});