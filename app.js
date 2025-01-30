import { initializeApp } from "https://www.gstatic.com/firebasejs/9.14.0/firebase-app.js";
import { getDatabase, ref, set, get, push, onChildAdded, onDisconnect, onValue } from "https://www.gstatic.com/firebasejs/9.14.0/firebase-database.js";
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const rtdb = getDatabase();
// Function to track user online status
const setUserOnline = (username) => {
    if (!username) return;

    const userRef = ref(rtdb, `status/${username}`);
    const connectedRef = ref(rtdb, ".info/connected");

    // Listen for connection status
    onValue(connectedRef, (snapshot) => {
        if (snapshot.val() === false) {
            // Not connected
            console.log("User disconnected from network");
            return;
        }

        // Set user online
        set(userRef, { status: "online" });

        // Auto-set user offline on disconnect
        onDisconnect(userRef).set({ status: "offline" });
    });
};

const getUserStatus = async (username) => {
    if (!username) return "offline"; // Default offline if no username

    const userRef = ref(rtdb, `status/${username}`);
    const snapshot = await get(userRef);
    return snapshot.exists() ? snapshot.val().status : "offline";
};

document.getElementById('join-button').addEventListener('click', async function() {
    const username = document.getElementById('username').value.trim();
    const country = document.getElementById('country').value.trim();

    if (!username || !country) {
        console.error("Login error: Username or country is empty");
        return;
    }

    localStorage.setItem('username', username);
    localStorage.setItem('country', country);

    await setUserOnline(username); // ✅ Set user online in Realtime Database

    document.getElementById('login-container').style.display = 'none';
    document.getElementById('chat-container').style.display = 'block';

    loadMessages();
});


const handleUserLeaving = async () => {
    const username = localStorage.getItem('username');
    if (username) {
        const userRef = ref(rtdb, `status/${username}`);
        await set(userRef, { status: "offline" });
    }
};

window.addEventListener('beforeunload', handleUserLeaving);

document.getElementById('send-button').addEventListener('click', async function () {
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
            messageInput.value = ''; // Clear input
        } catch (error) {
            console.error("Error sending message: ", error);
        }
    }
});


async function loadMessages() {
    const messagesRef = ref(rtdb, 'messages');

    onChildAdded(messagesRef, async (snapshot) => {
        const data = snapshot.val();
        if (!data.username) return;

        const status = await getUserStatus(data.username);
        const userStatusDot = status === "online" ? "🟢" : "🔴";

        const messagesDiv = document.getElementById('messages');
        messagesDiv.innerHTML += `<p><strong>${data.username} (${data.country}):</strong> ${userStatusDot} ${data.message}</p>`;
        messagesDiv.scrollTop = messagesDiv.scrollHeight; // Auto-scroll
    });
}

const checkAutoLogin = () => {
    const username = localStorage.getItem('username');
    const country = localStorage.getItem('country');

    if (!username || !country) {
        console.error("Auto-login failed: username or country is missing");
        return;
    }

    document.getElementById('username').value = username;
    document.getElementById('country').value = country;
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('chat-container').style.display = 'block';

    setUserOnline(username).then(() => {
        loadMessages(); // Ensure messages load after user is online
    });
};
