const ws = new WebSocket('wss://<dein-service-name>.onrender.com'); // Setze hier die URL deiner Render-Anwendung
let isQuizmaster = false;
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
        if (document.getElementById('buzzer')) {
            document.getElementById('buzzer').disabled = false;
        }
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

// Quizmaster-spezifische Logik
if (document.getElementById('select-question')) {
    isQuizmaster = true;

    // Fragen auflisten
    questions.forEach((question, index) => {
        const li = document.createElement('li');
        li.innerText = question;
        li.onclick = () => {
            ws.send(JSON.stringify({ type: 'selectQuestion', index }));
        };
        document.getElementById('question-list').appendChild(li);
    });
}