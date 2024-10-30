//const ws = new WebSocket('wss://online-quiz-sps0.onrender.com'); // Ersetze mit deiner WebSocket-URL
const ws = new WebSocket('ws://localhost:8080');
let questions = [];
let currentQuestionIndex = null; // Speichert die aktuelle Frage
let isRegistered = false;

// Funktion, um zu ¸berpr¸fen, ob die Seite f¸r den Quizmaster ist
const isQuizmaster = window.location.pathname.includes('quizmaster');

// Registrierung (Nur f¸r Teilnehmer)
if (!isQuizmaster) {
    // Registrierungs-Logik bleibt f¸r Teilnehmer erhalten
    document.getElementById('register').onclick = () => {
        const name = document.getElementById('name').value;
        if (name) {
            ws.send(JSON.stringify({ type: 'register', name }));
        }
    };

    document.getElementById('buzzer').onclick = () => {
        ws.send(JSON.stringify({ type: 'buzzer' }));
    };
}

// ‹berpr¸fe, ob der Benutzer der Quizmaster ist, bevor die Events gesetzt werden
if (isQuizmaster) {
    // Markiere die Antwort als richtig
    document.getElementById('markCorrect').onclick = () => {
        if (document.getElementById('markCorrect').style.display !== 'none') {
            ws.send(JSON.stringify({ type: 'closeQuestion', correct: true }));
            hideQuestionButtons();
        }
    };

    // Markiere die Antwort als falsch
    document.getElementById('markWrong').onclick = () => {
        if (document.getElementById('markWrong').style.display !== 'none') {
            ws.send(JSON.stringify({ type: 'closeQuestion', correct: false }));
            hideQuestionButtons();
        }
    };

    // Schlieﬂe die Frage
    document.getElementById('closeQuestion').onclick = () => {
        if (document.getElementById('closeQuestion').style.display !== 'none') {
            ws.send(JSON.stringify({ type: 'closeQuestion', correct: null }));
            hideQuestionButtons();
        }
    };
}

// WebSocket Nachrichten empfangen
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'alreadyRegistered') {
        alert(`Der Name "${data.name}" ist bereits registriert.`);
    }

    if (data.type === 'registered') {
        questions = data.questions;
        isRegistered = true; // Setze den Status auf registriert
        document.getElementById('name').style.display = 'none'; // Blende das Eingabefeld aus
        document.getElementById('register').style.display = 'none';

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

            document.getElementById('buzzer').disabled = false; // Aktivieren des Buzzers f¸r Teilnehmer
        }
    }

    if (isRegistered) {
        document.getElementById('name').style.display = 'none'; // Blende das Eingabefeld aus
        document.getElementById('register').style.display = 'none'; // Blende den Registrierungsbutton aus
    }

    if (data.type === 'participants') {
        updateParticipantsPanel(data.participants);
    }

    if (data.type === 'question' && !isQuizmaster) {
        // Teilnehmer sehen die freigegebene Frage
        document.getElementById('question').innerText = data.question;
    }

    if (data.type === 'question' && isQuizmaster) {
        // Zeige die Buttons f¸r den Quizmaster an, wenn eine Frage aktiv ist
        showQuestionButtons();
    }

    if (data.type === 'buzzed') {
        if (isQuizmaster) {
            // Logs nur f¸r Quizmaster
            const logPanel = document.getElementById('log-panel');
            const now = Date.now();
            const delay = now - data.timestamp;
            const participantInfo = `${data.name} hat gebuzzert! (${delay} ms Verzˆgerung)`;
            logPanel.innerText += `${participantInfo}\n`;
            updateFastestParticipant(data.name);
        } else {
            // Teilnehmer-Panel aktualisieren
            updateFastestParticipant(data.name);
        }
    }

    

    // Hier neue Logik f¸r das Schlieﬂen der Frage
    if (data.type === 'questionClosed') {
        currentQuestionIndex = null; // Zur¸cksetzen der aktuellen Frage
        document.getElementById('question').innerText = ''; // Frage zur¸cksetzen f¸r Teilnehmer
        resetParticipantsPanel(); // Reset der Teilnehmer-Panels
    }
};

function resetParticipantsPanel() {
    const participants = document.querySelectorAll('.participant');
    participants.forEach(participant => {
        participant.classList.remove('fastest'); // Entferne die gr¸ne Markierung
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

        // Event-Listener f¸r Rechtsklick, um einen Teilnehmer zu entfernen
        participantDiv.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (isQuizmaster) {
                const confirmation = confirm(`Benutzer "${participant.name}" wirklich entfernen?`);
                if (confirmation) {
                    ws.send(JSON.stringify({ type: 'removeParticipant', name: participant.name }));
                }
            }
        });

        participantsPanel.appendChild(participantDiv);
    });
}

function updateFastestParticipant(name) {
    const fastestDiv = document.getElementById(`participant-${name}`);
    if (fastestDiv) {
        fastestDiv.classList.add('fastest');
    }
}

// Funktion, um die Buttons "Richtig", "Falsch" und "Frage schlieﬂen" auszublenden
function hideQuestionButtons() {
    document.getElementById('markCorrect').style.display = 'none';
    document.getElementById('markWrong').style.display = 'none';
    document.getElementById('closeQuestion').style.display = 'none';
}

// Funktion, um die Buttons sichtbar zu machen, wenn eine Frage ausgew‰hlt wurde
function showQuestionButtons() {
    document.getElementById('markCorrect').style.display = 'inline-block';
    document.getElementById('markWrong').style.display = 'inline-block';
    document.getElementById('closeQuestion').style.display = 'inline-block';
}

// Stelle sicher, dass die Buttons initial ausgeblendet sind
hideQuestionButtons();
