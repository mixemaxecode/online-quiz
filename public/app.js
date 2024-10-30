const ws = new WebSocket('wss://online-quiz-sps0.onrender.com'); // Ersetze mit deiner WebSocket-URL
let questions = [];
let currentQuestionIndex = null; // Speichert die aktuelle Frage

// Funktion, um zu überprüfen, ob die Seite für den Quizmaster ist
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

// Markiere die Antwort als richtig
document.getElementById('markCorrect').onclick = () => {
    ws.send(JSON.stringify({ type: 'closeQuestion', correct: true }));
    document.getElementById('markCorrect').style.display = 'none';
    document.getElementById('markWrong').style.display = 'none';
    document.getElementById('closeQuestion').style.display = 'none';
};

// Markiere die Antwort als falsch
document.getElementById('markWrong').onclick = () => {
    ws.send(JSON.stringify({ type: 'closeQuestion', correct: false }));
    document.getElementById('markCorrect').style.display = 'none';
    document.getElementById('markWrong').style.display = 'none';
    document.getElementById('closeQuestion').style.display = 'none';
};

// Schließe die Frage
document.getElementById('closeQuestion').onclick = () => {
    ws.send(JSON.stringify({ type: 'closeQuestion', correct: null }));
    document.getElementById('markCorrect').style.display = 'none';
    document.getElementById('markWrong').style.display = 'none';
    document.getElementById('closeQuestion').style.display = 'none';
};

// WebSocket Nachrichten empfangen
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'registered') {
        questions = data.questions;

        if (isQuizmaster) {
            // Fragen im Frageboard anzeigen
            const questionBoard = document.getElementById('question-board');
            questionBoard.innerHTML = '';
            questions.forEach((question, index) => {
                const questionCard = document.createElement('div');
                questionCard.className = 'question-card';
                questionCard.innerText = question;
                questionCard.onclick = () => {
                    ws.send(JSON.stringify({ type: 'selectQuestion', index }));
                    currentQuestionIndex = index; // Setze die aktuelle Frage
                    document.getElementById('markCorrect').style.display = 'inline'; // Zeige Buttons
                    document.getElementById('markWrong').style.display = 'inline';
                    document.getElementById('closeQuestion').style.display = 'inline';
                };
                questionBoard.appendChild(questionCard);
            });
        } else {
            document.getElementById('buzzer').disabled = false; // Aktivieren des Buzzers für Teilnehmer
        }
    }

    if (data.type === 'participants') {
        updateParticipantsPanel(data.participants);
    }

    if (data.type === 'question' && !isQuizmaster) {
        // Teilnehmer sehen die freigegebene Frage
        document.getElementById('question').innerText = data.question;
    }

    if (data.type === 'buzzed') {
        if (isQuizmaster) {
            // Logs nur für Quizmaster
            const logPanel = document.getElementById('log-panel');
            const now = Date.now();
            const delay = now - data.timestamp;
            const participantInfo = `${data.name} hat gebuzzert! (${delay} ms Verzögerung)`;
            logPanel.innerText += `${participantInfo}\n`;
            updateFastestParticipant(data.name);
        } else {
            // Teilnehmer-Panel aktualisieren
            updateFastestParticipant(data.name);
        }
    }

    // Hier neue Logik für das Schließen der Frage
    if (data.type === 'questionClosed') {
        currentQuestionIndex = null; // Zurücksetzen der aktuellen Frage
        document.getElementById('question').innerText = ''; // Frage zurücksetzen für Teilnehmer
        resetParticipantsPanel(); // Reset der Teilnehmer-Panels
    }
};

function resetParticipantsPanel() {
    const participants = document.querySelectorAll('.participant');
    participants.forEach(participant => {
        participant.classList.remove('fastest'); // Entferne die grüne Markierung
    });
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
