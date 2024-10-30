const express = require('express');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));

let participants = [];
let questions = ["Frage 1", "Frage 2", "Frage 3"]; // Beispiel-Fragen
let activeQuestionIndex = null;
let buzzedParticipants = [];
let activeBuzzer = false;

server.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'register') {
            // Teilnehmer registrieren
            const newParticipant = { name: data.name, ws, score: 0 };
            participants.push(newParticipant);
            broadcast({
                type: 'participants',
                participants: participants.map(p => ({ name: p.name, score: p.score }))
            });
            ws.send(JSON.stringify({
                type: 'registered',
                questions: questions
            }));
        }

        if (data.type === 'selectQuestion' && isQuizmaster(ws)) {
            activeQuestionIndex = data.index;
            buzzedParticipants = [];
            activeBuzzer = true;

            broadcast({
                type: 'question',
                question: questions[activeQuestionIndex],
                index: activeQuestionIndex
            });
        }

        if (data.type === 'buzzer') {
            if (activeBuzzer && activeQuestionIndex !== null) {
                const participant = participants.find(p => p.ws === ws);
                if (participant && !buzzedParticipants.some(p => p.ws === ws)) {
                    const buzzTime = Date.now();
                    const delay = buzzedParticipants.length === 0 ? 0 : buzzTime - buzzedParticipants[0].timestamp;
                    buzzedParticipants.push({ ws, name: participant.name, timestamp: buzzTime, delay });

                    // An den Quizmaster senden
                    broadcastToQuizmaster({
                        type: 'buzzed',
                        name: participant.name,
                        timestamp: buzzTime
                    });

                    // An die Teilnehmer senden, um den schnellsten zu markieren
                    broadcast({
                        type: 'buzzed',
                        name: participant.name
                    });
                }
            }
        }

        if (data.type === 'correctAnswer' && isQuizmaster(ws)) {
            const fastest = buzzedParticipants[0];
            if (fastest) {
                const participant = participants.find(p => p.ws === fastest.ws);
                if (participant) {
                    participant.score += 1; // Punkt hinzufügen
                }
            }
            endQuestion();
        }

        if (data.type === 'wrongAnswer' && isQuizmaster(ws)) {
            const fastest = buzzedParticipants[0];
            if (fastest) {
                buzzedParticipants = buzzedParticipants.filter(p => p.ws !== fastest.ws);
                activeBuzzer = buzzedParticipants.length > 0;
            }
        }

        if (data.type === 'closeQuestion' && isQuizmaster(ws)) {
            endQuestion();
        }
    });

    ws.on('close', () => {
        // Entferne den Teilnehmer bei Verbindungsverlust
        participants = participants.filter(p => p.ws !== ws);
        broadcast({
            type: 'participants',
            participants: participants.map(p => ({ name: p.name, score: p.score }))
        });
    });
});

function isQuizmaster(ws) {
    return participants.length > 0 && participants[0].ws === ws;
}

function broadcast(data) {
    participants.forEach(p => p.ws.send(JSON.stringify(data)));
}

function broadcastToQuizmaster(data) {
    if (participants.length > 0) {
        participants[0].ws.send(JSON.stringify(data));
    }
}

function endQuestion() {
    activeQuestionIndex = null;
    activeBuzzer = false;
    buzzedParticipants = [];
    broadcast({ type: 'endQuestion' });
}

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});