const ws = new WebSocket('wss://online-quiz-sps0.onrender.com'); // Ersetze mit deiner Render-URLhttps://online-quiz-sps0.onrender.com
let questions = [];

// Registrierung
document.getElementById('register').onclick = () => {
    const name = document.getElementById('name').value;
    if (name) {
        ws.send(JSON.stringify({ type: 'register', name }));
    }
};

// Buzzer
document.getElementById('buzzer').onclick = () => {
    ws.send(JSON.stringify({ type: 'buzzer' }));
};

// WebSocket Nachrichten empfangen
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'registered') {
        questions = data.questions;

        // Quizmaster-spezifische Logik
        if (document.getElementById('select-question')) {
            const questionList = document.getElementById('question-list');
            questionList.innerHTML = ''; // Vorherige Fragen löschen
            questions.forEach((question, index) => {
                const li = document.createElement('li');
                li.innerText = question;
                li.onclick = () => {
                    ws.send(JSON.stringify({ type: 'selectQuestion', index }));
                };
                questionList.appendChild(li);
            });
            document.getElementById('select-question').disabled = false; // Aktivieren des Frage-Buttons
        }

        document.getElementById('buzzer').disabled = false; // Aktivieren des Buzzer-Buttons
    }

    if (data.type === 'question') {
        document.getElementById('question').innerText = data.question;
    }

    if (data.type === 'buzzed') {
        const now = Date.now();
        const delay = now - data.timestamp;
        const participantInfo = `${data.name} hat gebuzzert! (${delay} ms Verzögerung)`;
        document.getElementById('buzzed-info').innerText += `${participantInfo}\n`;
    }
};