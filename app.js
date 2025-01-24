import { initializeApp } from "https://www.gstatic.com/firebasejs/9.14.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/9.14.0/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Open IndexedDB for storing the username
const openDb = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('chatAppDB', 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('users')) {
                db.createObjectStore('users', { keyPath: 'username' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = (error) => reject(error);
    });
};

// Store the username in IndexedDB
const storeUsername = async (username) => {
    const db = await openDb();
    const transaction = db.transaction('users', 'readwrite');
    const store = transaction.objectStore('users');
    store.put({ username });
    return transaction.complete;
};

// Check if the username exists in IndexedDB
const usernameExists = async (username) => {
    const db = await openDb();
    const store = db.transaction('users').objectStore('users');
    const request = store.get(username);
    return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result !== undefined);
    });
};

// Check if username is in localStorage for auto-login
const checkAutoLogin = () => {
    const username = localStorage.getItem('username');
    if (username) {
        document.getElementById('username').value = username;
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('chat-container').style.display = 'block';
        loadMessages();
    }
};

// Handle user login
document.getElementById('join-button').addEventListener('click', async function() {
    const username = document.getElementById('username').value.trim();
    const country = document.getElementById('country').value;

    if (username) {
        // Check if the username already exists in IndexedDB
        const exists = await usernameExists(username);
        if (exists) {
            alert('This username is already taken. Please choose a different one.');
            return;
        }

        // Store the username in IndexedDB
        await storeUsername(username);

        // Store username in localStorage for auto-login
        localStorage.setItem('username', username);

        // Hide login container and show chat container
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

// Check for auto-login when the page loads
checkAutoLogin();
