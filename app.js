import { initializeApp } from "https://www.gstatic.com/firebasejs/9.14.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/9.14.0/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.getElementById('join-button').addEventListener('click', async function() {
    const username = document.getElementById('username').value.trim();
    const country = document.getElementById('country').value;

    if (username) {
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('chat-container').style.display = 'block';

        try {
            await addDoc(collection(db, 'messages'), {
                username: 'System',
                message: `${username} (${country}) joined the chat`,
                timestamp: new Date()
            });

            loadMessages();
        } catch (error) {
            console.error("Error adding document: ", error);
        }
    } else {
        alert('Please enter your name.');
    }
});

document.getElementById('send-button').addEventListener('click', async function() {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();

    if (message) {
        const username = document.getElementById('username').value.trim();
        try {
            await addDoc(collection(db, 'messages'), {
                username: username,
                message: message,
                timestamp: new Date()
            });
            messageInput.value = '';
        } catch (error) {
            console.error("Error adding document: ", error);
        }
    }
});

function loadMessages() {
    const q = query(collection(db, 'messages'), orderBy('timestamp'));
    onSnapshot(q, (snapshot) => {
        const messagesDiv = document.getElementById('messages');
        messagesDiv.innerHTML = '';
        snapshot.forEach((doc) => {
            const data = doc.data();
            messagesDiv.innerHTML += `<p><strong>${data.username}:</strong> ${data.message}</p>`;
        });
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
}