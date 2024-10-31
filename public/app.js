//const ws = new WebSocket('wss://online-quiz-sps0.onrender.com'); // Ersetze mit deiner WebSocket-URL
const ws = new WebSocket('ws://localhost:8080');
let socketId = null; // Zum Speichern der `socketId`
let questions = [];
let currentQuestionIndex = null; // Speichert die aktuelle Frage
let isRegistered = false;
let attemptedName = null; // Speichert den gew�nschten Namen

// Funktion, um zu �berpr�fen, ob die Seite f�r den Quizmaster ist
const isQuizmaster = window.location.pathname.includes('quizmaster');

// Registrierung (Nur f�r Teilnehmer)
if (!isQuizmaster) {
    document.getElementById('register').onclick = () => {
        const name = document.getElementById('name').value;
        if (name) {
            attemptedName = name; // Speichere den Namen f�r die �bernahme
            ws.send(JSON.stringify({ type: 'register', name }));
        }
    };

    document.getElementById('buzzer').onclick = () => {
        ws.send(JSON.stringify({ type: 'buzzer' }));
    };
}

// �berpr�fe, ob der Benutzer der Quizmaster ist, bevor die Events gesetzt werden
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

    // Schlie�e die Frage
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

    // Erhalte und speichere die `socketId` vom Server
    if (data.type === 'socketId') {
        socketId = data.id;
    }

    if (!isQuizmaster) {
        // Falls Name bereits vergeben
        if (data.type === 'nameTaken') {
            const confirmTakeOver = confirm("Name ist bereits vergeben. M�chten Sie den Namen �bernehmen?");
            if (confirmTakeOver) {
                ws.send(JSON.stringify({ type: 'requestTakeOver', name: attemptedName }));
            }
        }

        // Falls �bernahme best�tigt wurde
        if (data.type === 'takeOverConfirmed') {
            alert("�bernahme des Namens wurde vom Quizmaster best�tigt!");
            ws.send(JSON.stringify({ type: 'registered' }));
        }

        if (data.type === 'takeOverDenied') {
            alert("�bernahme des Namens wurde vom Quizmaster abgelehnt.");
        }

        if (data.type === 'forceLogout') {            
            isRegistered = false;

            // UI-Elemente aktualisieren, damit der Benutzer sich erneut registrieren kann
            document.getElementById('name').style.display = 'block';
            document.getElementById('register').style.display = 'block';
            document.getElementById('buzzer').disabled = true;

            alert("Sie wurden abgemeldet, da ein anderer Client Ihren Namen �bernommen hat.");
        }

    }

    if (data.type === 'confirmTakeOver' && isQuizmaster) {
        const confirmTakeOver = confirm(`Darf Spieler "${data.name}" von "${data.id}" �bernommen werden?`);
        ws.send(JSON.stringify({ type: 'takeOverResponse', name: data.name, id:data.id, allow: confirmTakeOver }));
    }

    if (data.type === 'registered') {
        isRegistered = true; // Setze den Status auf registriert
        document.getElementById('name').style.display = 'none'; // Blende das Eingabefeld aus
        document.getElementById('register').style.display = 'none';

        if (!isQuizmaster) {          
            document.getElementById('buzzer').disabled = false; // Aktivieren des Buzzers f�r Teilnehmer
        }
    }

    // Empfangene Fragen vom Server f�r den Quizmaster
    if (data.type === 'questions' && isQuizmaster) {
        questions = data.questions;
        displayQuestions(); // Funktion um die Fragen im UI anzuzeigen
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
        // Zeige die Buttons f�r den Quizmaster an, wenn eine Frage aktiv ist
        showQuestionButtons();
    }

    if (data.type === 'buzzed') {
        if (isQuizmaster) {
            // Logs nur f�r Quizmaster
            const logPanel = document.getElementById('log-panel');
            const participantInfo = `${data.name} hat gebuzzert! (${data.timestamp})`;
            logPanel.innerText += `${participantInfo}\n`;
            updateFastestParticipant(data.name);
        } else {
            // Teilnehmer-Panel aktualisieren
            updateFastestParticipant(data.name);
        }
    }

    

    // Hier neue Logik f�r das Schlie�en der Frage
    if (data.type === 'questionClosed') {
        currentQuestionIndex = null; // Zur�cksetzen der aktuellen Frage
        const questionElement = document.getElementById('question');
        if (questionElement) {
            questionElement.innerText = ''; // Frage zur�cksetzen f�r Teilnehmer
        }
        resetParticipantsPanel(); // Reset der Teilnehmer-Panels
    }
};

// Funktion um die Fragen im UI anzuzeigen
function displayQuestions() {
    const questionBoard = document.getElementById('question-board');
    questionBoard.innerHTML = ''; // Leere das Board
    questions.forEach((question, index) => {
        const questionCard = document.createElement('div');
        questionCard.className = 'question-card';
        questionCard.innerText = question;
        questionCard.onclick = () => {
            ws.send(JSON.stringify({ type: 'selectQuestion', index }));
            currentQuestionIndex = index; // Setze die aktuelle Frage
            showQuestionButtons(); // Fragebuttons anzeigen
            const logPanel = document.getElementById('log-panel');
            logPanel.innerText += `${question}\n`
        };
        questionBoard.appendChild(questionCard);
    });
}

function resetParticipantsPanel() {
    const participants = document.querySelectorAll('.participant');
    participants.forEach(participant => {
        participant.classList.remove('fastest'); // Entferne die gr�ne Markierung
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

        // Event-Listener f�r Rechtsklick, um einen Teilnehmer zu entfernen
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
