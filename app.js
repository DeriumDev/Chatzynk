import { initializeApp } from "https://www.gstatic.com/firebasejs/9.14.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.14.0/firebase-firestore.js";
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

// Handle user login (join)
document.getElementById('join-button').addEventListener('click', async function() {
    const username = document.getElementById('username').value.trim();
    const country = document.getElementById('country').value.trim();

    if (!username) {
        console.error("Login error: Username is empty");
        return;
    }

    if (!country) {
        console.error("Login error: Country is empty");
        return;
    }

    await storeUsername(username, country);
    localStorage.setItem('username', username);
    localStorage.setItem('country', country);

    await setUserStatus(username, 'online');

    document.getElementById('login-container').style.display = 'none';
    document.getElementById('chat-container').style.display = 'block';

    loadMessages();
});
// Handle user leaving (set status to offline)
const handleUserLeaving = async () => {
    const username = localStorage.getItem('username');
    if (username) {
        await setUserStatus(username, 'offline');
    }
};

// Listen for window close or reload
window.addEventListener('beforeunload', handleUserLeaving);

// Handle sending message
document.getElementById('send-button').addEventListener('click', async function () {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    const username = localStorage.getItem('username');
    const country = localStorage.getItem('country');

    if (message && username && country) {
        try {
            await addDoc(collection(db, 'messages'), {
                username,
                country,
                message,
                timestamp: new Date()
            });
            messageInput.value = ''; // Clear input
        } catch (error) {
            console.error("Error adding document: ", error);
        }
    }
});

// Load and display messages with user status
async function loadMessages() {
    const q = query(collection(db, 'messages'), orderBy('timestamp'));
    onSnapshot(q, async (snapshot) => {
        const messagesDiv = document.getElementById('messages');
        messagesDiv.innerHTML = ''; // Clear previous messages

        const messages = snapshot.docs.map(doc => doc.data());

        // Fetch user statuses in parallel
        const statusPromises = messages.map(data =>
            data.username && data.username !== 'System' 
                ? getUserStatus(data.username) 
                : Promise.resolve('offline')
        );

        const statuses = await Promise.all(statusPromises);

        // Display messages
        messages.forEach((data, index) => {
            if (!data.username) return; // Skip if no username

            const userStatusDot = statuses[index] === 'online' ? '🟢' : '🔴';
            messagesDiv.innerHTML += `<p><strong>${data.username} (${data.country}):</strong> ${userStatusDot} ${data.message}</p>`;
        });

        messagesDiv.scrollTop = messagesDiv.scrollHeight; // Auto-scroll
    });
}


const setUserStatus = async (username, status) => {
    if (!username) {
        console.error("setUserStatus error: username is undefined or empty.");
        return;
    }
    
    try {
        const safeUsername = encodeURIComponent(username); // Encode to avoid special character issues
        const userRef = doc(db, 'users', safeUsername);
        await setDoc(userRef, { status }, { merge: true });
    } catch (error) {
        console.error("Error setting user status: ", error);
    }
};

const getUserStatus = async (username) => {
    if (!username) {
        console.error("getUserStatus error: username is undefined or empty.");
        return 'offline';
    }
    
    try {
        const safeUsername = encodeURIComponent(username);
        const docRef = doc(db, 'users', safeUsername);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data().status || 'offline' : 'offline';
    } catch (error) {
        console.error("Error fetching user status:", error);
        return 'offline';
    }
};

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

    loadMessages();
};
