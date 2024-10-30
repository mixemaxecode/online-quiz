const ws = new WebSocket('wss://online-quiz-sps0.onrender.com'); 
let questions = [];
let activeQuestionIndex = null;
let answeredParticipants = new Set(); // Speichert Spieler, die eine Frage falsch beantwortet haben

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
        ws.send(JSON.stringify({ type: 'buzzer' }));
    };
}

// WebSocket Nachrichten empfangen
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'registered') {
        questions = data.questions;
        if (isQuizmaster) {
            renderQuestions();
        } else {
            document.getElementById('buzzer').disabled = false; // Aktivieren des Buzzers für Teilnehmer
        }
    }

    if (data.type === 'participants') {
        updateParticipantsPanel(data.participants);
    }

    if (data.type === 'question' && !isQuizmaster) {
        // Frage für die Teilnehmer anzeigen
        document.getElementById('question').innerText = data.question;
        document.getElementById('buzzer').disabled = answeredParticipants.has(data.index);
    }

    if (data.type === 'buzzed') {
        if (isQuizmaster) {
            logBuzz(data);
        } else {
            updateFastestParticipant(data.name);
        }
    }

    if (data.type === 'endQuestion') {
        resetParticipantsPanel();
    }
};

if (isQuizmaster) {
    // Buttons für Frageverwaltung hinzufügen
    document.getElementById('correct-answer').onclick = () => {
        ws.send(JSON.stringify({ type: 'correctAnswer' }));
    };

    document.getElementById('wrong-answer').onclick = () => {
        ws.send(JSON.stringify({ type: 'wrongAnswer' }));
    };

    document.getElementById('close-question').onclick = () => {
        ws.send(JSON.stringify({ type: 'closeQuestion' }));
    };
}

function renderQuestions() {
    const questionBoard = document.getElementById('question-board');
    questionBoard.innerHTML = '';
    questions.forEach((question, index) => {
        const questionCard = document.createElement('div');
        questionCard.className = 'question-card';
        questionCard.innerText = question;
        questionCard.onclick = () => {
            ws.send(JSON.stringify({ type: 'selectQuestion', index }));
            activeQuestionIndex = index;
            toggleQuestionControls(true);
        };
        questionBoard.appendChild(questionCard);
    });
}

function toggleQuestionControls(active) {
    document.getElementById('correct-answer').classList.toggle('hidden', !active);
    document.getElementById('wrong-answer').classList.toggle('hidden', !active);
    document.getElementById('close-question').classList.toggle('hidden', !active);
}

function logBuzz(data) {
    const logPanel = document.getElementById('log-panel');
    const now = Date.now();
    const delay = now - data.timestamp;
    const participantInfo = `${data.name} hat gebuzzert! (${delay} ms Verzögerung)`;
    logPanel.innerText += `${participantInfo}\n`;
    updateFastestParticipant(data.name);
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

function updateFastestParticipant(name) {
    const fastestDiv = document.getElementById(`participant-${name}`);
    if (fastestDiv) {
        fastestDiv.classList.add('fastest');
    }
}

function resetParticipantsPanel() {
    const participants = document.querySelectorAll('.participant');
    participants.forEach((participant) => {
        participant.classList.remove('fastest');
    });
    answeredParticipants.clear(); // Set zurücksetzen
}