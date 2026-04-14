// EchoVision AI - Professional Version
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let ws = null;
let isMuted = false;
let lastAnnounced = {};
const COOLDOWN_MS = 3000;
let synth = null;
let audioEnabled = false;

// DOM Elements
const objectNameEl = document.getElementById('objectName');
const distanceEl = document.getElementById('distance');
const directionEl = document.getElementById('direction');
const confidenceEl = document.getElementById('confidence');
const activityList = document.getElementById('activityList');

// Initialize speech
function initSpeech() {
    if ('speechSynthesis' in window) {
        synth = window.speechSynthesis;
        console.log('Speech synthesis available');
        addActivity('Speech synthesis ready');
        return true;
    }
    console.error('Speech synthesis not supported');
    addActivity('Speech synthesis not supported');
    return false;
}

// Speak function
function speak(msg) {
    if (isMuted) {
        console.log('Muted:', msg);
        return;
    }
    
    if (!audioEnabled) {
        console.log('Audio not enabled yet');
        addActivity('Click Enable Audio Output button first');
        return;
    }
    
    if (!synth) {
        initSpeech();
    }
    
    console.log('SPEAKING:', msg);
    addActivity(`Announcement: ${msg.substring(0, 60)}`);
    
    try {
        synth.cancel();
        const utterance = new SpeechSynthesisUtterance(msg);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        utterance.lang = 'en-US';
        synth.speak(utterance);
    } catch (e) {
        console.error('Speech error:', e);
    }
}

// Enable audio manually
function enableAudio() {
    audioEnabled = true;
    if (synth) {
        const test = new SpeechSynthesisUtterance('Audio enabled. EchoVision AI ready.');
        test.rate = 0.9;
        synth.speak(test);
        console.log('Audio enabled');
        addActivity('Audio enabled - You will now hear announcements');
    }
    const btn = document.getElementById('enableAudioBtn');
    if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.6';
        btn.textContent = 'Audio Enabled';
    }
}

// Add activity log
function addActivity(message) {
    const li = document.createElement('li');
    li.className = 'activity-item';
    li.innerHTML = `
        <span class="activity-time">${new Date().toLocaleTimeString()}</span>
        <span class="activity-text">${message}</span>
    `;
    activityList.insertBefore(li, activityList.firstChild);
    if (activityList.children.length > 15) {
        activityList.removeChild(activityList.lastChild);
    }
}

// WebSocket connection
function connectWebSocket() {
    ws = new WebSocket('ws://localhost:9000/ws');
    
    ws.onopen = () => {
        console.log('WebSocket connected');
        addActivity('Connected to server');
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Received:', data);
        
        if (data.type === 'detection') {
            updateUI(data);
            
            if (data.alerts && data.alerts.length > 0 && audioEnabled) {
                const now = Date.now();
                for (let alertMsg of data.alerts) {
                    const objName = alertMsg.split(',')[0].trim();
                    if (!lastAnnounced[objName] || (now - lastAnnounced[objName]) > COOLDOWN_MS) {
                        speak(alertMsg);
                        lastAnnounced[objName] = now;
                        break;
                    }
                }
            }
        } else if (data.type === 'mode_change') {
            if (audioEnabled) speak(data.message);
            addActivity(`Mode: ${data.message}`);
        } else if (data.type === 'emergency') {
            if (audioEnabled) speak(data.message);
            addActivity(`EMERGENCY: ${data.message}`);
        } else if (data.type === 'location') {
            if (audioEnabled) speak(data.message);
            addActivity(`Location: ${data.message}`);
        } else if (data.type === 'help') {
            if (audioEnabled) speak(data.message);
            addActivity(`Help: ${data.message}`);
        }
    };
    
    ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        addActivity('Connection error - server not running');
    };
    
    ws.onclose = () => {
        console.log('WebSocket closed');
        addActivity('Disconnected - reconnecting...');
        setTimeout(connectWebSocket, 3000);
    };
}

// Stream frames
let frameInterval;
function startStreaming() {
    if (frameInterval) clearInterval(frameInterval);
    frameInterval = setInterval(() => {
        if (video.readyState === video.HAVE_ENOUGH_DATA && ws && ws.readyState === WebSocket.OPEN) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frameData = canvas.toDataURL('image/jpeg', 0.6);
            ws.send(JSON.stringify({ type: 'frame', data: frameData }));
        }
    }, 500);
}

// Update UI
function updateUI(data) {
    if (data.objects && data.objects.length > 0) {
        const top = data.objects[0];
        objectNameEl.textContent = top.name.charAt(0).toUpperCase() + top.name.slice(1);
        distanceEl.textContent = `${top.distance} meters`;
        directionEl.textContent = top.direction.charAt(0).toUpperCase() + top.direction.slice(1);
        confidenceEl.textContent = `${Math.round(top.confidence * 100)}%`;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        for (let obj of data.objects) {
            const [x1, y1, x2, y2] = obj.bbox;
            let color = '#10b981';
            if (obj.distance < 1) color = '#ef4444';
            else if (obj.distance < 2) color = '#f59e0b';
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
            ctx.fillStyle = color;
            ctx.font = 'bold 14px Inter';
            ctx.fillText(`${obj.name} ${obj.distance}m`, x1, y1 - 8);
        }
    } else {
        objectNameEl.textContent = '—';
        distanceEl.textContent = '—';
        directionEl.textContent = '—';
        confidenceEl.textContent = '—';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
}

// Camera initialization
async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        await new Promise(resolve => video.onloadedmetadata = resolve);
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        startStreaming();
        addActivity('Camera initialized');
    } catch (err) {
        console.error('Camera error:', err);
        addActivity('Camera access denied - please grant permissions');
    }
}

// Voice commands
function initVoiceCommands() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        addActivity('Voice commands not supported in this browser');
        return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onresult = (event) => {
        const command = event.results[event.results.length-1][0].transcript.toLowerCase();
        console.log('Voice command:', command);
        addActivity(`Voice: ${command}`);
        
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'command', command }));
        }
        
        if (command.includes('mute')) {
            isMuted = true;
            if (audioEnabled) speak('Muted');
            document.getElementById('muteBtn').innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M23 9l-6 6M17 9l6 6"/></svg><span>Unmute</span>';
        } else if (command.includes('unmute')) {
            isMuted = false;
            if (audioEnabled) speak('Unmuted');
            document.getElementById('muteBtn').innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M23 9l-6 6M17 9l6 6"/></svg><span>Mute</span>';
        }
    };
    
    recognition.start();
    addActivity('Voice recognition active - say Help for commands');
}

// Button handlers
document.getElementById('modeNav').onclick = () => {
    if (ws) ws.send(JSON.stringify({ type: 'command', command: 'navigation' }));
    setActiveButton('modeNav');
    addActivity('Navigation mode selected');
};
document.getElementById('modeFace').onclick = () => {
    if (ws) ws.send(JSON.stringify({ type: 'command', command: 'face search' }));
    setActiveButton('modeFace');
    addActivity('Face search mode selected');
};
document.getElementById('modeCurrency').onclick = () => {
    if (ws) ws.send(JSON.stringify({ type: 'command', command: 'currency' }));
    setActiveButton('modeCurrency');
    addActivity('Currency mode selected');
};
document.getElementById('modeOCR').onclick = () => {
    if (ws) ws.send(JSON.stringify({ type: 'command', command: 'read text' }));
    setActiveButton('modeOCR');
    addActivity('Text reading mode selected');
};
document.getElementById('locationBtn').onclick = () => {
    if (ws) ws.send(JSON.stringify({ type: 'command', command: 'where am i' }));
};
document.getElementById('emergencyBtn').onclick = () => {
    if (ws) ws.send(JSON.stringify({ type: 'command', command: 'emergency' }));
};
document.getElementById('repeatBtn').onclick = () => {
    if (ws) ws.send(JSON.stringify({ type: 'command', command: 'repeat' }));
};
document.getElementById('muteBtn').onclick = () => {
    isMuted = !isMuted;
    const btn = document.getElementById('muteBtn');
    if (isMuted) {
        btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M23 9l-6 6M17 9l6 6"/></svg><span>Unmute</span>';
        if (audioEnabled) speak('Muted');
    } else {
        btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M23 9l-6 6M17 9l6 6"/></svg><span>Mute</span>';
        if (audioEnabled) speak('Unmuted');
    }
};

function setActiveButton(activeId) {
    const buttons = ['modeNav', 'modeFace', 'modeCurrency', 'modeOCR'];
    buttons.forEach(id => {
        const btn = document.getElementById(id);
        if (id === activeId) {
            btn.classList.add('active');
            btn.classList.remove('secondary');
            btn.classList.add('primary');
        } else {
            btn.classList.remove('active');
            btn.classList.remove('primary');
            btn.classList.add('secondary');
        }
    });
}

document.getElementById('enableAudioBtn').onclick = enableAudio;

// Initialize
initSpeech();
initCamera();
connectWebSocket();
initVoiceCommands();