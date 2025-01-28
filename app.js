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
const storeUsername = async (username, country) => {
    const db = await openDb();
    const transaction = db.transaction('users', 'readwrite');
    const store = transaction.objectStore('users');
    store.put({ username, country });
    return transaction.complete;
};

// Check if the username exists in IndexedDB for this device/browser
const usernameExists = async (username) => {
    const db = await openDb();
    const store = db.transaction('users').objectStore('users');
    const request = store.get(username);
    return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result !== undefined);
    });
};







// Handle user login
document.getElementById('join-button').addEventListener('click', async function() {
    const username = document.getElementById('username').value.trim();
    const country = document.getElementById('country').value;

    if (username && country) { // Ensure both username and country are available
        // Check if the username already exists in IndexedDB (for this device/browser)
        const exists = await usernameExists(username);
        if (exists) {
            alert('This username is already taken. Please choose a different one.');
            return;
        }

        // Store the username and country in IndexedDB and localStorage for auto-login
        await storeUsername(username, country);
        localStorage.setItem('username', username);
        localStorage.setItem('country', country);  // Store country in localStorage too

        // Hide login container and show chat container
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('chat-container').style.display = 'block';

        try {
            // Adding the 'joined chat' message with the correct username and country
            await addDoc(collection(db, 'messages'), {
                username: 'System',
                country: country, // Ensure country is stored
                message: `${username} (${country}) joined the chat`,
                timestamp: new Date()
            });

            loadMessages();
        } catch (error) {
            console.error("Error adding document: ", error);
        }
    } else {
        alert('Please enter both your name and country.');
    }
});

// Handle sending message
document.getElementById('send-button').addEventListener('click', async function() {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    const username = document.getElementById('username').value.trim();
    const country = document.getElementById('country').value; // Ensure country is captured on send

    if (message && username && country) {
        try {
            await addDoc(collection(db, 'messages'), {
                username: username,
                country: country, // Store the country correctly
                message: message,
                timestamp: new Date()
            });
            messageInput.value = '';
        } catch (error) {
            console.error("Error adding document: ", error);
        }
    }
});

// Load and display messages
function loadMessages() {
    const q = query(collection(db, 'messages'), orderBy('timestamp'));
    onSnapshot(q, (snapshot) => {
        const messagesDiv = document.getElementById('messages');
        messagesDiv.innerHTML = '';
        snapshot.forEach((doc) => {
            const data = doc.data();
            // Ensure that both username and country are present in the message rendering
            messagesDiv.innerHTML += `<p><strong>${data.username} (${data.country}):</strong> ${data.message}</p>`;
        });
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
}

// Check for auto-login when the page loads
const checkAutoLogin = () => {
    const username = localStorage.getItem('username');
    const country = localStorage.getItem('country'); // Get country from localStorage
    if (username && country) {
        document.getElementById('username').value = username;
        document.getElementById('country').value = country; // Set the country in input
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('chat-container').style.display = 'block';
        loadMessages();
    }
};

