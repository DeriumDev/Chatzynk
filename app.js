import { initializeApp } from "https://www.gstatic.com/firebasejs/9.14.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, query, orderBy, 
    doc, setDoc, updateDoc, serverTimestamp, getDocs 
} from "https://www.gstatic.com/firebasejs/9.14.0/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Open IndexedDB for storing the username
const openDb = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('chatAppDB', 1);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
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
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('users', 'readwrite');
        const store = transaction.objectStore('users');
        const request = store.put({ username, country });

        request.onsuccess = () => resolve();
        request.onerror = (error) => reject(error);
    });
};

// Check if the username exists in IndexedDB
const usernameExists = async (username) => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const store = db.transaction('users').objectStore('users');
        const request = store.get(username);

        request.onsuccess = () => resolve(!!request.result);
        request.onerror = (error) => reject(error);
    });
};

// Update Firestore user status
const updateUserStatus = async (username, country, status) => {
    const userRef = doc(db, "users", username);
    await setDoc(userRef, {
        username,
        country,
        status,
        lastSeen: serverTimestamp(),
    }, { merge: true });
};

// Handle user login
document.getElementById('join-button').addEventListener('click', async function() {
    const username = document.getElementById('username').value.trim();
    const country = document.getElementById('country').value.trim();

    if (!username || !country) {
        alert('Please enter both your name and country.');
        return;
    }

    const exists = await usernameExists(username);
    if (exists) {
        alert('This username is already taken. Please choose a different one.');
        return;
    }

    await storeUsername(username, country);
    localStorage.setItem('username', username);
    localStorage.setItem('country', country);

    document.getElementById('login-container').style.display = 'none';
    document.getElementById('chat-container').style.display = 'block';

    await updateUserStatus(username, country, 'online');

    await addDoc(collection(db, 'messages'), {
        username: 'System',
        country: country,
        message: `${username} (${country}) joined the chat`,
        timestamp: serverTimestamp()
    });

    loadMessages();
});

// Handle sending messages
document.getElementById('send-button').addEventListener('click', async function() {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    const username = localStorage.getItem('username');
    const country = localStorage.getItem('country');

    if (!message || !username || !country) return;

    await addDoc(collection(db, 'messages'), {
        username,
        country,
        message,
        timestamp: serverTimestamp()
    });

    messageInput.value = '';
});

// Load and display messages
const loadMessages = async () => {
    const q = query(collection(db, 'messages'), orderBy('timestamp'));
    onSnapshot(q, async (snapshot) => {
        const messagesDiv = document.getElementById('messages');
        messagesDiv.innerHTML = '';

        // Fetch all users' statuses in one query
        const usersSnapshot = await getDocs(collection(db, "users"));
        const usersStatus = {};
        usersSnapshot.forEach(user => {
            usersStatus[user.id] = user.data().status || "offline";
        });

        snapshot.docs.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            const username = data.username;
            const statusColor = usersStatus[username] === "online" ? "green" : "red";

            messagesDiv.innerHTML += `
                <p>
                    <span style="color: ${statusColor}; font-size: 15px;">●</span>
                    <strong>${username} (${data.country}):</strong> ${data.message}
                </p>`;
        });

        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
};

// Check for auto-login when the page loads
const checkAutoLogin = async () => {
    const username = localStorage.getItem('username');
    const country = localStorage.getItem('country');

    if (username && country) {
        document.getElementById('username').value = username;
        document.getElementById('country').value = country;
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('chat-container').style.display = 'block';

        await updateUserStatus(username, country, 'online');
        loadMessages();
    }
};

// Set user offline on window unload
window.addEventListener("beforeunload", async () => {
    const username = localStorage.getItem('username');
    const country = localStorage.getItem('country');
    if (username && country) {
        await updateUserStatus(username, country, 'offline');
    }
});

// Auto-login check on page load
checkAutoLogin();
