import { getFirestore, collection, addDoc, getDocs, query, onSnapshot, updateDoc, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-app.js";

import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const loginContainer = document.getElementById('login-container');
const chatContainer = document.getElementById('chat-container');
const joinButton = document.getElementById('join-button');
const sendButton = document.getElementById('send-button');
const usernameInput = document.getElementById('username');
const countrySelect = document.getElementById('country');
const messageInput = document.getElementById('message-input');
const messagesDiv = document.getElementById('messages');
const contactList = document.getElementById('contact-list');

let currentUser = null;

joinButton.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    const country = countrySelect.value;
    
    if (username) {
        signInAnonymously(auth).then(() => {
            onAuthStateChanged(auth, user => {
                if (user) {
                    currentUser = {
                        uid: user.uid,
                        username,
                        country,
                        status: 'online',
                        lastActive: Date.now()
                    };

                    setDoc(doc(db, "users", user.uid), currentUser);
                    loginContainer.style.display = 'none';
                    chatContainer.style.display = 'block';
                    loadContacts();
                    loadMessages();
                }
            });
        });
    } else {
        alert('Please enter your name.');
    }
});

sendButton.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message) {
        addDoc(collection(db, 'messages'), {
            uid: currentUser.uid,
            username: currentUser.username,
            message,
            timestamp: Date.now()
        });
        messageInput.value = '';
    }
});

function loadContacts() {
    const q = query(collection(db, "users"));
    onSnapshot(q, (snapshot) => {
        contactList.innerHTML = '';
        snapshot.forEach(doc => {
            const user = doc.data();
            const li = document.createElement('li');
            li.textContent = `${user.username} (${user.country}) - ${user.status}`;
            li.style.color = user.status === 'online' ? 'green' : 'red';
            contactList.appendChild(li);
        });
    });
}

function loadMessages() {
    const q = query(collection(db, 'messages'));
    onSnapshot(q, (snapshot) => {
        messagesDiv.innerHTML = '';
        snapshot.forEach(doc => {
            const msg = doc.data();
            const p = document.createElement('p');
            p.textContent = `${msg.username}: ${msg.message}`;
            messagesDiv.appendChild(p);
        });
    });
}

window.addEventListener('beforeunload', () => {
    if (currentUser) {
        updateDoc(doc(db, "users", currentUser.uid), {
            status: 'offline',
            lastActive: Date.now()
        });
    }
});
