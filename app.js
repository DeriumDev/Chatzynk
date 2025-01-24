import { initializeApp } from "https://www.gstatic.com/firebasejs/9.14.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, setDoc, deleteDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.14.0/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Reference to the online users collection
const onlineUsersCollection = collection(db, 'online_users');

// Join Button Event Listener
document.getElementById('join-button').addEventListener('click', async function() {
    const username = document.getElementById('username').value.trim();
    const country = document.getElementById('country').value;

    if (username) {
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('chat-container').style.display = 'block';

        try {
            // Set user as online in the 'online_users' collection
            await setDoc(doc(db, 'online_users', username), {
                username: username,
                status: 'online',
                lastActive: new Date()
            });

            // Add system message that the user has joined
            await addDoc(collection(db, 'messages'), {
                username: 'System',
                message: `${username} (${country}) joined the chat`,
                timestamp: new Date()
            });

            // Load messages
            loadMessages();
        } catch (error) {
            console.error("Error adding document: ", error);
            alert('An error occurred. Please try again later.');
        }
    } else {
        alert('Please enter your name.');
    }
});

// Send Button Event Listener
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
            alert('An error occurred. Please try again later.');
        }
    }
});

// Load Messages from Firestore
function loadMessages() {
    const q = query(collection(db, 'messages'), orderBy('timestamp'));
    onSnapshot(q, (snapshot) => {
        const messagesDiv = document.getElementById('messages');
        messagesDiv.innerHTML = '';
        snapshot.forEach((doc) => {
            const data = doc.data();
            const timestamp = new Date(data.timestamp.seconds * 1000);

            // Check if the user is online
            isUserOnline(data.username).then((isOnline) => {
                const timestampColor = isOnline ? 'green' : 'red';

                // Add message with timestamp color and size
                messagesDiv.innerHTML += `
                    <p>
                        <strong>${data.username}:</strong> ${data.message}
                        <span class="timestamp" style="color:${timestampColor}; font-size:small;">
                            ${timestamp.toLocaleString()}
                        </span>
                    </p>`;
            });
        });
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
}

// Check if User is Online (returns a Promise)
function isUserOnline(username) {
    return new Promise((resolve, reject) => {
        const userRef = doc(onlineUsersCollection, username);
        getDoc(userRef).then((docSnap) => {
            if (docSnap.exists()) {
                resolve(true); // User is online
            } else {
                resolve(false); // User is offline
            }
        }).catch((error) => {
            console.error("Error checking user status: ", error);
            reject(false);
        });
    });
}

// Handle User Leaving Chat (Before Unload Event)
window.addEventListener('beforeunload', function() {
    const username = document.getElementById('username').value.trim();

    if (username) {
        // Remove user from 'online_users' when they leave
        deleteDoc(doc(db, 'online_users', username)).then(() => {
            console.log(`${username} removed from online users`);
        }).catch((error) => {
            console.error("Error removing user from online status: ", error);
        });
    }
});
