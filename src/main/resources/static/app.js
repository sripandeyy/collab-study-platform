const API_URL = 'http://localhost:8080/api';
let token = localStorage.getItem('jwt');
let username = localStorage.getItem('username');
let currentRoomId = null;
let stompClient = null;

document.addEventListener('DOMContentLoaded', () => {
    if (token) {
        showView('dashboard-view');
        loadRooms();
        document.getElementById('display-name').textContent = username || 'Student';
    } else {
        showView('auth-view');
    }
});

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
    document.getElementById(viewId).classList.add('active-view');
}

let isLoginMode = true;
function switchAuthTab(mode) {
    isLoginMode = (mode === 'login');
    document.getElementById('tab-login').classList.toggle('active', isLoginMode);
    document.getElementById('tab-register').classList.toggle('active', !isLoginMode);
    document.getElementById('name-group').style.display = isLoginMode ? 'none' : 'flex';
    document.getElementById('auth-error').textContent = '';
}

async function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const name = document.getElementById('name').value;
    const errorDiv = document.getElementById('auth-error');

    const endpoint = isLoginMode ? '/login' : '/register';
    const payload = isLoginMode ? { email, password } : { email, password, name };

    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) throw new Error('Authentication failed');
        const data = await res.json();
        
        if (isLoginMode) {
            token = data.jwt;
            username = email.split('@')[0];
            localStorage.setItem('jwt', token);
            localStorage.setItem('username', username);
            showView('dashboard-view');
            loadRooms();
            document.getElementById('display-name').textContent = username;
        } else {
            alert('Registration successful! Launching secure sequence...');
            switchAuthTab('login');
            document.getElementById('password').value = '';
        }
    } catch (err) {
        errorDiv.textContent = err.message || 'Access denied! Check your credentials.';
    }
}

function logout() {
    localStorage.removeItem('jwt');
    localStorage.removeItem('username');
    token = null;
    if(stompClient) stompClient.disconnect();
    window.location.reload();
}

function showDashboardSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active-section'));
    document.getElementById(`${sectionId}-section`).classList.add('active-section');
    
    if (sectionId === 'rooms') loadRooms();
}

async function apiFetch(path, options = {}) {
    if (!options.headers) options.headers = {};
    options.headers['Authorization'] = `Bearer ${token}`;
    options.headers['Content-Type'] = 'application/json';
    
    const res = await fetch(`${API_URL}${path}`, options);
    if (res.status === 401 || res.status === 403) logout();
    if (!res.ok) return null;
    try { return await res.json(); } catch(e) { return null; }
}

async function loadRooms() {
    const roomsGrid = document.getElementById('rooms-grid');
    roomsGrid.innerHTML = '<p>Discovering spaces...</p>';
    const rooms = await apiFetch('/rooms');
    if (!rooms) return;
    
    roomsGrid.innerHTML = '';
    rooms.forEach(room => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <h3>${room.name}</h3>
            <p>Interactive Study Session</p>
            <span class="badge">${room.topic || 'General Context'}</span>
        `;
        div.onclick = () => openRoom(room);
        roomsGrid.appendChild(div);
    });
}

function openCreateRoomModal() { document.getElementById('create-room-modal').classList.add('active'); }
function closeModals() { document.querySelectorAll('.modal').forEach(m => m.classList.remove('active')); }

async function createRoom() {
    const name = document.getElementById('room-name').value;
    const topic = document.getElementById('room-topic').value;
    if(!name) return;
    
    await apiFetch('/rooms', { method: 'POST', body: JSON.stringify({ name, topic }) });
    closeModals();
    loadRooms();
    document.getElementById('room-name').value = '';
    document.getElementById('room-topic').value = '';
}

function openRoom(room) {
    currentRoomId = room.id;
    document.getElementById('room-detail-title').textContent = room.name;
    document.getElementById('room-detail-topic').textContent = room.topic || 'General Context';
    showDashboardSection('room-detail');
    document.getElementById('chat-messages').innerHTML = ''; 
    connectWebSocket();
}

function connectWebSocket() {
    if (stompClient) stompClient.disconnect();
    const socket = new SockJS('http://localhost:8080/ws');
    stompClient = Stomp.over(socket);
    stompClient.debug = null; 
    stompClient.connect({}, function (frame) {
        stompClient.subscribe(`/topic/room/${currentRoomId}`, function (message) {
            const chatMsg = JSON.parse(message.body);
            displayMessage(chatMsg);
        });
    });
}

function displayMessage(msg) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    // Using simple mock comparison since we don't have full user hydrated properly in our basic backend
    const isSelf = msg.content && msg.content.includes(`[${username}]`);
    let displayContent = msg.content;
    let senderName = msg.user ? msg.user.email : 'Astronaut';
    
    if(msg.content.includes(`[`)){
        const match = msg.content.match(/\[(.*?)\] (.*)/);
        if(match){
            senderName = match[1];
            displayContent = match[2];
        }
    }

    div.className = `chat-message ${isSelf ? 'self' : ''}`;
    div.innerHTML = `<div class="chat-sender">${senderName}</div><div class="chat-text">${displayContent}</div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function sendChatMessage(e) {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const content = input.value.trim();
    if (content && stompClient) {
        // Mocking user identity resolution through content payload for this pure-frontend abstraction
        const msgStr = `[${username}] ${content}`;
        const message = { content: msgStr, room: { id: currentRoomId }, user: { id: 1 } };
        stompClient.send(`/app/chat/${currentRoomId}`, {}, JSON.stringify(message));
        input.value = '';
    }
}
