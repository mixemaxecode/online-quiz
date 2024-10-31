//const ws = new WebSocket('wss://online-quiz-sps0.onrender.com'); // Ersetze mit deiner WebSocket-URL
const ws = new WebSocket('ws://localhost:8080');
let questions = [];
let currentQuestionIndex = null; // Speichert die aktuelle Frage
let isRegistered = false;
let attemptedName = null; // Speichert den gewünschten Namen

// Funktion, um zu überprüfen, ob die Seite für den Quizmaster ist
const isQuizmaster = window.location.pathname.includes('quizmaster');

// Registrierung (Nur für Teilnehmer)
if (!isQuizmaster) {
    document.getElementById('register').onclick = () => {
        const name = document.getElementById('name').value;
        if (name) {
            attemptedName = name; // Speichere den Namen für die Übernahme
            ws.send(JSON.stringify({ type: 'register', name }));
        }
    };

    document.getElementById('buzzer').onclick = () => {
        ws.send(JSON.stringify({ type: 'buzzer' }));
    };
}

// Überprüfe, ob der Benutzer der Quizmaster ist, bevor die Events gesetzt werden
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

    // Schließe die Frage
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

    if (!isQuizmaster) {
        // Falls Name bereits vergeben
        if (data.type === 'nameTaken') {
            const confirmTakeOver = confirm("Name ist bereits vergeben. Möchten Sie den Namen übernehmen?");
            if (confirmTakeOver) {
                ws.send(JSON.stringify({ type: 'requestTakeOver', name: attemptedName }));
            }
        }

        // Falls Übernahme bestätigt wurde
        if (data.type === 'takeOverConfirmed') {
            alert("Übernahme des Namens wurde vom Quizmaster bestätigt!");
            ws.send(JSON.stringify({ type: 'registered' }));
            logPanel.innerText += `confirmed\n`;
        }

        if (data.type === 'takeOverDenied') {
            alert("Übernahme des Namens wurde vom Quizmaster abgelehnt.");
        }
    }

    if (data.type === 'confirmTakeOver' && isQuizmaster) {
        const confirmTakeOver = confirm(`Darf Spieler "${data.name}" übernommen werden?`);
        ws.send(JSON.stringify({ type: 'takeOverResponse', name: data.name, allow: confirmTakeOver }));
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
                    showQuestionButtons(); // Fragebuttons anzeigen
                };
                questionBoard.appendChild(questionCard);
            });
        } else {      

            document.getElementById('buzzer').disabled = false; // Aktivieren des Buzzers für Teilnehmer
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
        // Zeige die Buttons für den Quizmaster an, wenn eine Frage aktiv ist
        showQuestionButtons();
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

        // Event-Listener für Rechtsklick, um einen Teilnehmer zu entfernen
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

// Funktion, um die Buttons sichtbar zu machen
function showQuestionButtons() {
    document.getElementById('question-buttons').style.display = 'block'; // Buttons anzeigen
}

// Funktion, um die Buttons auszublenden
function hideQuestionButtons() {
    document.getElementById('question-buttons').style.display = 'none'; // Buttons ausblenden
}

// Stelle sicher, dass die Buttons initial ausgeblendet sind
hideQuestionButtons();
