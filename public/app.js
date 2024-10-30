const ws = new WebSocket('wss://online-quiz-sps0.onrender.com');
let questions = [];
let activeQuestion = false;
let fastestParticipant = null;
let incorrectBuzzers = new Set();

const isQuizmaster = window.location.pathname.includes('quizmaster');

// Registrierung
document.getElementById('register').onclick = () => {
    const name = document.getElementById('name').value;
    if (name) {
        ws.send(JSON.stringify({ type: 'register', name }));
    }
};

// Buzzer-Funktion für Teilnehmer
if (!isQuizmaster) {
    document.getElementById('buzzer').onclick = () => {
        const name = document.getElementById('name').value;
        if (activeQuestion && !incorrectBuzzers.has(name)) {
            ws.send(JSON.stringify({ type: 'buzzer' }));
        }
    };
}

// WebSocket Nachrichten empfangen
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'registered') {
        questions = data.questions;
        if (isQuizmaster) {
            setupQuestionBoard();
        } else {
            document.getElementById('buzzer').disabled = false;
        }
    }

    if (data.type === 'participants') {
        updateParticipantsPanel(data.participants);
    }

    if (data.type === 'question') {
        if (!isQuizmaster) {
            document.getElementById('question').innerText = data.question;
            activeQuestion = true;
        }
        resetParticipantsPanel(); // Panels bei neuer Frage zurücksetzen
    }

    if (data.type === 'buzzed') {
        if (isQuizmaster) {
            logBuzzed(data.name, data.timestamp);
        } else {
            highlightFastestParticipant(data.name);
        }
    }

    if (data.type === 'endQuestion') {
        resetParticipantsPanel();
        activeQuestion = false;
        incorrectBuzzers.clear(); // Zurücksetzen der fehlerhaften Buzzers
    }

    if (data.type === 'incorrect') {
        incorrectBuzzers.add(data.name); // Teilnehmer, die die Frage falsch beantwortet haben
    }
};

function setupQuestionBoard() {
    const questionBoard = document.getElementById('question-board');
    questionBoard.innerHTML = '';
    questions.forEach((question, index) => {
        const questionCard = document.createElement('div');
        questionCard.className = 'question-card';
        questionCard.innerText = question;
        questionCard.onclick = () => {
            ws.send(JSON.stringify({ type: 'selectQuestion', index }));
            document.getElementById('controls').style.display = 'block';
        };
        questionBoard.appendChild(questionCard);
    });

    document.getElementById('correct').onclick = () => {
        ws.send(JSON.stringify({ type: 'correctAnswer' }));
        endActiveQuestion();
    };

    document.getElementById('wrong').onclick = () => {
        const fastest = fastestParticipant;
        if (fastest) {
            ws.send(JSON.stringify({ type: 'wrongAnswer', name: fastest }));
        }
    };

    document.getElementById('close-question').onclick = () => {
        ws.send(JSON.stringify({ type: 'closeQuestion' }));
        endActiveQuestion();
    };
}

function updateParticipantsPanel(participants) {
    const participantsPanel = document.getElementById('participants-panel');
    participantsPanel.innerHTML = '';
    participants.forEach((participant) => {
        const participantDiv = document.createElement('div');
        participantDiv.className = 'participant';
        participantDiv.innerText = participant.name;
        participantDiv.id = `participant-${participant.name}`;
        participantsPanel.appendChild(participantDiv);
    });
}

function highlightFastestParticipant(name) {
    const fastestDiv = document.getElementById(`participant-${name}`);
    if (fastestDiv) {
        fastestDiv.classList.add('fastest');
        fastestParticipant = name; // Speichern des schnellsten Teilnehmers
    }
}

function logBuzzed(name, timestamp) {
    const logPanel = document.getElementById('log-panel');
    const now = Date.now();
    const delay = now - timestamp;
    logPanel.innerText += `${name} hat gebuzzert! (${delay} ms Verzögerung)\n`;
    highlightFastestParticipant(name);
}

function resetParticipantsPanel() {
    const participantsPanel = document.getElementById('participants-panel');
    participantsPanel.querySelectorAll('.participant').forEach((div) => {
        div.classList.remove('fastest');
    });
    fastestParticipant = null;
}

function endActiveQuestion() {
    activeQuestion = false;
    document.getElementById('controls').style.display = 'none';
    ws.send(JSON.stringify({ type: 'endQuestion' }));
}
