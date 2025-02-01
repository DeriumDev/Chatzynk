import { initializeApp } from "https://www.gstatic.com/firebasejs/9.14.0/firebase-app.js";
import { firebaseConfig } from './firebase-config.js?v=1'; // Force refresh in case of caching issues
import { getDatabase, ref, set, get, push, onValue, query, orderByChild, onDisconnect, onChildAdded, increment } from "https://www.gstatic.com/firebasejs/9.14.0/firebase-database.js";


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const rtdb = getDatabase(app);
const messagesRef = ref(rtdb, 'messages'); // Define the reference for messages
const queryRef = query(messagesRef, orderByChild('timestamp'));
const loadedMessageKeys = new Set();

// Handle login
const handleLogin = async () => {
    try {
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

        // Send "User Joined" notification
        await push(messagesRef, {
            username: "System",
            country: "N/A",
            message: `${username} has joined the chat.`,
            timestamp: Date.now()
        });

        loadMessages();
    } catch (error) {
        console.error("Error during login: ", error);
    }
};

const handleUserLeaving = async () => {
    const username = localStorage.getItem('username');
    if (username) {
        // Set user status to offline in Firebase
        const userRef = ref(rtdb, `status/${sanitizeUsername(username)}`);
        await set(userRef, { status: "offline", lastSeen: Date.now() });

        // Push a "user left" message
        await push(messagesRef, {
            username: "System",
            country: "N/A",
            message: `${username} has left the chat.`,
            timestamp: Date.now()
        });

        // Clear local storage
        localStorage.removeItem('username');
        localStorage.removeItem('country');
    }
};

// Ensure the user is logged out when refreshing or closing the page
window.addEventListener('beforeunload', handleUserLeaving);

// Handle login and auto-login check
const checkAutoLogin = async () => {
    const username = localStorage.getItem('username');
    const country = localStorage.getItem('country');

    if (!username || !country) return; // If no username or country, do nothing

    document.getElementById('username').value = username;
    document.getElementById('country').value = country;
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('chat-container').style.display = 'block';

    await setUserOnline(username);
    loadMessages();
};

// Send message
const sendMessage = async () => {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    const username = localStorage.getItem('username');
    const country = localStorage.getItem('country');

    if (!message) {
        alert("Message cannot be empty!");
        return;
    }

    if (message && username && country) {
        try {
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

const loadMessages = async () => {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML = ""; // Clear previous messages
    loadedMessageKeys.clear(); // Reset stored keys

    let messagesArray = [];

    // Step 1: Fetch all existing messages first
    const snapshot = await get(queryRef);
    if (snapshot.exists()) {
        snapshot.forEach(childSnapshot => {
            const data = childSnapshot.val();
            const key = childSnapshot.key;
            if (!loadedMessageKeys.has(key)) {
                loadedMessageKeys.add(key);
                messagesArray.push({ key, ...data });
            }
        });

        // Sort messages by timestamp and display them

        messagesArray.sort((a, b) => a.timestamp - b.timestamp);
        messagesArray.forEach(data => appendMessage(data));
    }

    // Step 2: Listen for new messages in real-time
    onChildAdded(queryRef, (snapshot) => {
        const data = snapshot.val();
        const key = snapshot.key;
        if (!loadedMessageKeys.has(key)) {
            loadedMessageKeys.add(key);
            appendMessage(data);
        }
    });
};

// Function to format timestamp into readable 12-hour time
const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // Convert 0 to 12-hour format
    return `${hours}:${minutes} ${ampm}`;
};

const appendMessage = async (data) => {
    const messagesDiv = document.getElementById('messages');
    if (!data.username) return;

    const time = formatTime(data.timestamp);
    const date = new Date(data.timestamp);
    const formattedDate = date.toLocaleDateString();
    const formattedDateTime = `${formattedDate} ${time}`;

    const messageElement = document.createElement("p");

    if (data.username === "System" && data.message.includes("joined")) {
        // Display only "User Joined" messages
        messageElement.innerHTML = `<em>${data.message} <span style="color: gray; font-size: 0.70em;">(${formattedDateTime})</span></em>`;
        messageElement.style.fontStyle = 'italic';
        messageElement.style.color = "green"; // Green for join notifications
    } else if (data.username !== "System") {
        // Display regular messages
        const status = await getUserStatus(data.username);
        const userStatusDot = status === "online" ? "🟢" : "🔴";
        messageElement.innerHTML = `<strong>${data.username} (${data.country}):</strong> ${userStatusDot} ${data.message} <span style="color: gray; font-size: 0.70em;">(${formattedDateTime})</span>`;
    }

    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Auto-scroll
};


// Load page instantly
document.addEventListener("DOMContentLoaded", checkAutoLogin);
window.addEventListener('beforeunload', handleUserLeaving);
document.getElementById('join-button').addEventListener('click', handleLogin);
document.getElementById('send-button').addEventListener('click', sendMessage);

const sanitizeUsername = (username) => {
    return username.replace(/[.#$[\]]/g, "_"); // Replace invalid characters
};

const setUserOffline = async (username) => {
    const safeUsername = sanitizeUsername(username);
    const userRef = ref(rtdb, `status/${safeUsername}`);
    
    // Explicitly set user status to offline if they leave or disconnect
    await set(userRef, {
        status: "offline",
        lastSeen: Date.now()
    });
};

const setUserOnline = async (username) => {
    if (!username) return;

    const safeUsername = sanitizeUsername(username);
    const userRef = ref(rtdb, `status/${safeUsername}`);
    const connectedRef = ref(rtdb, ".info/connected");

    onValue(connectedRef, async (snapshot) => {
        if (snapshot.val()) {
            // User is connected, set them as online
            await set(userRef, { 
                status: "online",
                lastSeen: Date.now()
            });

            // If user disconnects, set status to offline
            onDisconnect(userRef).set({
                status: "offline",
                lastSeen: Date.now()
            });
        }
    });

    // Periodically update the user's status to "online"
    setInterval(async () => {
        const statusRef = ref(rtdb, `status/${safeUsername}`);
        await set(statusRef, {
            status: "online",
            lastSeen: Date.now()
        });
    }, 5000); // Update every 5 seconds
};

const getUserStatus = async (username) => {
    if (!username) return "offline";

    const safeUsername = sanitizeUsername(username);
    const userRef = ref(rtdb, `status/${safeUsername}`);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) return "offline";

    const data = snapshot.val();
    const now = Date.now();

    // If the last seen time was more than 10 seconds ago, consider them offline
    if (data.status === "online" && now - data.lastSeen > 10000) {
        await set(userRef, {
            status: "offline",
            lastSeen: Date.now()
        });
        return "offline";
    }

    return data.status;
};

const updateOnlineStatus = async () => {
    const usersRef = ref(rtdb, 'status');

    onValue(usersRef, (snapshot) => {
        const users = snapshot.val();
        const totalUsers = users ? Object.keys(users).length : 0;

        // Update the title with "Discussion Room - Users: X"
        document.getElementById('room-title').innerHTML = `Discussion Room - Users: ${totalUsers}`;
    });
};
// Call this function on page load or after login
document.addEventListener('DOMContentLoaded', updateOnlineStatus);


