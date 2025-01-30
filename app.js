import { initializeApp } from "https://www.gstatic.com/firebasejs/9.14.0/firebase-app.js";
import { getDatabase, ref, set, get, push, onChildAdded, onDisconnect, onValue } from "https://www.gstatic.com/firebasejs/9.14.0/firebase-database.js";
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const rtdb = getDatabase();


// Handle login
const handleLogin = async () => {
    const username = document.getElementById('username').value.trim();
    const country = document.getElementById('country').value.trim();

    if (!username || !country) {
        console.error("Login error: Username or country is empty");
        return;
    }

    localStorage.setItem('username', username);
    localStorage.setItem('country', country);

    await setUserOnline(username);

    document.getElementById('login-container').style.display = 'none';
    document.getElementById('chat-container').style.display = 'block';

    loadMessages();
};

// Handle user leaving
const handleUserLeaving = async () => {
    const username = localStorage.getItem('username');
    if (username) {
        const userRef = ref(rtdb, `status/${username}`);
        await set(userRef, { status: "offline" });
    }
};

// Send message
const sendMessage = async () => {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    const username = localStorage.getItem('username');
    const country = localStorage.getItem('country');

    if (message && username && country) {
        try {
            const messagesRef = ref(rtdb, 'messages');
            await push(messagesRef, {
                username,
                country,
                message,
                timestamp: Date.now()
            });
            messageInput.value = '';
        } catch (error) {
            console.error("Error sending message: ", error);
        }
    }
};

// Load messages
const loadMessages = () => {
    const messagesRef = ref(rtdb, 'messages');
    const messagesDiv = document.getElementById('messages');
    
    onChildAdded(messagesRef, async (snapshot) => {
        const data = snapshot.val();
        if (!data.username) return;

        const status = await getUserStatus(data.username);
        const userStatusDot = status === "online" ? "🟢" : "🔴";

        messagesDiv.innerHTML += `<p><strong>${data.username} (${data.country}):</strong> ${userStatusDot} ${data.message}</p>`;
        messagesDiv.scrollTop = messagesDiv.scrollHeight; // Auto-scroll
    });
};

// Auto-login check
const checkAutoLogin = async () => {
    const username = localStorage.getItem('username');
    const country = localStorage.getItem('country');

    if (!username || !country) return;

    document.getElementById('username').value = username;
    document.getElementById('country').value = country;
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('chat-container').style.display = 'block';

    await setUserOnline(username);
    loadMessages();
};

// Load page instantly
document.addEventListener("DOMContentLoaded", checkAutoLogin);
window.addEventListener('beforeunload', handleUserLeaving);
document.getElementById('join-button').addEventListener('click', handleLogin);
document.getElementById('send-button').addEventListener('click', sendMessage);

const sanitizeUsername = (username) => {
    return username.replace(/\./g, "_"); // Replace "." with "_"
};

const setUserOnline = async (username) => {
    if (!username) return;
    
    const safeUsername = sanitizeUsername(username); // Sanitize username
    const userRef = ref(rtdb, `status/${safeUsername}`);
    const connectedRef = ref(rtdb, ".info/connected");

    onValue(connectedRef, (snapshot) => {
        if (snapshot.val() === false) return;

        set(userRef, { status: "online" });

        onDisconnect(userRef).set({ status: "offline" });
    });
};

const getUserStatus = async (username) => {
    if (!username) return "offline";

    const safeUsername = sanitizeUsername(username); // Sanitize username
    const userRef = ref(rtdb, `status/${safeUsername}`);
    const snapshot = await get(userRef);
    return snapshot.exists() ? snapshot.val().status : "offline";
};
