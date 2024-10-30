// app.js

const socket = new WebSocket(`ws://${window.location.host}`);

let participantId = `Participant-${Math.floor(Math.random() * 1000)}`;

socket.addEventListener('open', () => {
    console.log('Verbindung zum Server hergestellt.');
    socket.send(JSON.stringify({ type: 'JOIN', id: participantId }));
});

socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'BUZZ') {
        const messageDiv = document.getElementById('messages');
        messageDiv.innerHTML += `<p>${data.id} hat gebuzzert!</p>`;
    }
});

document.getElementById('buzzer').addEventListener('click', () => {
    socket.send(JSON.stringify({ type: 'BUZZ', id: participantId }));
});