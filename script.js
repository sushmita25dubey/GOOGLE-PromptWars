// SmartEvent Central AI & Decision Engine

// 1. State Management
let gates = [
    { id: 1, name: "Gate 1", status: "Low", value: 1, prevStatus: "Low", statusStartTime: Date.now(), lastHighTime: 0, maxCongestionDuration: 0 },
    { id: 2, name: "Gate 2", status: "Medium", value: 2, prevStatus: "Medium", statusStartTime: Date.now(), lastHighTime: 0, maxCongestionDuration: 0 },
    { id: 3, name: "Gate 3", status: "High", value: 3, prevStatus: "High", statusStartTime: Date.now(), lastHighTime: 0, maxCongestionDuration: 0 },
    { id: 4, name: "Gate 4", status: "Low", value: 1, prevStatus: "Low", statusStartTime: Date.now(), lastHighTime: 0, maxCongestionDuration: 0 }
];

const statusMap = { 1: "Low", 2: "Medium", 3: "High" };
const waitConfig = { "Low": 2, "Medium": 5, "High": 10 };

const routes = {
    "Gate 1": "Walk straight past the main fountain, then turn left.",
    "Gate 2": "Head towards the West wing and take the escalators down.",
    "Gate 3": "Follow the blue signs along the North corridor.",
    "Gate 4": "Turn right at the central plaza and walk 200 meters."
};

const chatWindow = document.getElementById("chat-window");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const recGateValue = document.getElementById("rec-gate-value");

let lastUpdateTime = Date.now();

// 2. Core Simulation Engine
function getNextStatus(currentValue) {
    const rand = Math.random();
    let change = 0;

    if (currentValue === 1) {
        if (rand < 0.35) change = 1;
    } else if (currentValue === 2) {
        if (rand < 0.25) change = 1;
        else if (rand < 0.45) change = -1;
    } else if (currentValue === 3) {
        if (rand < 0.40) change = -1;
    }

    return currentValue + change;
}

function getReasoningMessage(gateName, change) {
    if (change > 0) {
        const msgs = [
            `🚨 <strong>Alert:</strong> ${gateName} is getting crowded due to an incoming audience.`,
            `🚨 <strong>Alert:</strong> ${gateName} is filling up as more people arrive.`
        ];
        return msgs[Math.floor(Math.random() * msgs.length)];
    } else {
        const msgs = [
            `✅ <strong>Update:</strong> ${gateName} cleared recently, good option!`,
            `✅ <strong>Update:</strong> The crowd at ${gateName} is easing.`
        ];
        return msgs[Math.floor(Math.random() * msgs.length)];
    }
}

function updateCrowdData() {
    let alerts = [];
    const now = Date.now();
    let congestionAlertSent = false;

    gates.forEach(gate => {
        gate.prevStatus = gate.status;
        const prevValue = gate.value;
        let newValue = getNextStatus(prevValue);

        const durSecs = Math.floor((now - gate.statusStartTime) / 1000);
        if (gate.status === "High" && durSecs > 25 && newValue === prevValue && !congestionAlertSent && Math.random() > 0.5) {
            alerts.push(`⚠️ <strong>Warning:</strong> ${gate.name} has been heavily congested for over ${durSecs}s. Please avoid!`);
            congestionAlertSent = true;
        }

        gate.value = newValue;
        gate.status = statusMap[newValue];

        const change = newValue - prevValue;
        if (change !== 0) {
            gate.statusStartTime = now;
            alerts.push(getReasoningMessage(gate.name, change));
        }
    });

    renderGates();
    updateRecommendationUI();

    lastUpdateTime = Date.now();
    updateTimeUI();

    if (alerts.length > 0 && Math.random() > 0.3) {
        addMessage(alerts[0], false, true);
    }
}

function updateTimeUI() {
    const timeElem = document.getElementById("last-updated-time");
    if (timeElem) {
        const diff = Math.floor((Date.now() - lastUpdateTime) / 1000);
        timeElem.textContent = `Last updated ${diff} second${diff === 1 ? '' : 's'} ago`;
    }

    const now = Date.now();
    gates.forEach(g => {
        const durSecs = Math.floor((now - g.statusStartTime) / 1000);

        // Track absolute historical maximums
        if (g.status === "High") {
            g.lastHighTime = now;
            if (durSecs > g.maxCongestionDuration) {
                g.maxCongestionDuration = durSecs;
            }
        }

        const durElem = document.getElementById(`duration-${g.id}`);
        if (durElem) {
            if (g.status === "High" && durSecs >= 25) {
                durElem.textContent = `⚠️ Heavily Congested (${durSecs}s)`;
                durElem.className = "gate-duration warn-text";
            } else {
                const verb = g.status === "High" ? "Crowded" : (g.status === "Low" ? "Clear" : "Busy");
                durElem.textContent = `• ${verb} for ${durSecs}s`;
                durElem.className = "gate-duration";
            }
        }

        const stabElem = document.getElementById(`stability-${g.id}`);
        if (stabElem) {
            let stability = "Normal";
            let sClass = "stab-normal";

            if (g.status === "High" || (now - g.lastHighTime < 30000 && g.status !== "High")) {
                stability = "Unstable";
                sClass = "stab-unstable";
            } else if (durSecs < 15) {
                stability = "Changing";
                sClass = "stab-changing";
            } else if (g.status === "Low" && durSecs >= 20) {
                stability = "Stable";
                sClass = "stab-stable";
            }

            stabElem.textContent = `[${stability}]`;
            stabElem.className = `gate-stability ${sClass}`;
        }
    });

    updateInsightsUI();
}

function renderGates() {
    const container = document.getElementById("gates-container");
    container.innerHTML = "";

    gates.forEach(gate => {
        const isLow = gate.status === "Low";
        const div = document.createElement("div");
        div.className = `gate-card ${isLow ? 'highlight-low' : ''}`;
        div.innerHTML = `
            <div class="gate-name">${gate.name}</div>
            <div class="gate-status status-${gate.status.toLowerCase()}">${gate.status}</div>
            <div class="gate-wait">~${waitConfig[gate.status]} min wait</div>
            <div class="gate-duration" id="duration-${gate.id}"></div>
            <div class="gate-stability" id="stability-${gate.id}"></div>
        `;
        container.appendChild(div);
    });
}

function updateRecommendationUI() {
    const bestGate = getBestGate();
    recGateValue.textContent = bestGate.name;
    recGateValue.style.animation = "none";
    setTimeout(() => recGateValue.style.animation = "fadeIn 0.3s ease", 10);
}

function getBestGate() {
    const now = Date.now();
    return [...gates].sort((a, b) => {
        // Condition 1: Avoid gates previously heavily congested (high traffic duration > 15s in the last 45s)
        const aBad = (now - a.lastHighTime < 45000 && a.maxCongestionDuration > 15) ? 1 : 0;
        const bBad = (now - b.lastHighTime < 45000 && b.maxCongestionDuration > 15) ? 1 : 0;
        if (aBad !== bBad) return aBad - bBad; // Push bad gates to the bottom

        // Condition 2: Always prefer naturally lowest traffic
        if (a.value !== b.value) return a.value - b.value;

        const durA = now - a.statusStartTime;
        const durB = now - b.statusStartTime;

        // Condition 3: For "Low" capacities specifically, prefer the ones with the LEAST duration (newly opened up)
        if (a.value === 1) return durA - durB;

        return durA - durB;
    })[0];
}

function getHeavyGates() {
    const now = Date.now();
    return gates.filter(g => g.status === "High" && (now - g.statusStartTime) >= 25000);
}

function updateInsightsUI() {
    const insightsList = document.getElementById("insights-list");
    const insightsSummary = document.getElementById("insights-summary");
    if (!insightsList || !insightsSummary) return;

    const heavyGates = getHeavyGates();
    insightsSummary.textContent = `Total congested: ${heavyGates.length}`;

    const now = Date.now();
    let itemsHTML = "";

    // Track absolute peak duration via internal history
    let peakGate = gates.reduce((prev, current) => (prev.maxCongestionDuration > current.maxCongestionDuration) ? prev : current);
    if (peakGate.maxCongestionDuration > 0) {
        itemsHTML += `<li class="insight-item danger">📈 Peak congestion detected at ${peakGate.name} (${peakGate.maxCongestionDuration}s)</li>`;
    }

    heavyGates.forEach(g => {
        const dur = Math.floor((now - g.statusStartTime) / 1000);
        itemsHTML += `<li class="insight-item danger">⚠️ ${g.name} congested for ${dur} seconds</li>`;
    });

    const recentClear = [...gates].filter(g => g.status === "Low" && Math.floor((now - g.statusStartTime) / 1000) < 60);
    // Sort recently cleared so the newest cleared is at the top
    recentClear.sort((a, b) => b.statusStartTime - a.statusStartTime).forEach(g => {
        itemsHTML += `<li class="insight-item success">✅ ${g.name} is now clear</li>`;
    });

    if (itemsHTML === "") {
        itemsHTML = `<li class="insight-item">No major anomalies detected. Monitoring event arrays...</li>`;
    }

    insightsList.innerHTML = itemsHTML;
}

// 3. Chat System
function addMessage(text, isUser = false, isAlert = false) {
    const msgDiv = document.createElement("div");
    if (isAlert) {
        msgDiv.className = `message alert-message`;
    } else {
        msgDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    }
    msgDiv.innerHTML = text;
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function toggleTyping(show) {
    if (show) {
        const typingDiv = document.createElement("div");
        typingDiv.className = "typing-indicator";
        typingDiv.id = "typing-indicator";
        typingDiv.innerHTML = `<div class="dot"></div><div class="dot"></div><div class="dot"></div>`;
        chatWindow.appendChild(typingDiv);
    } else {
        const typingDiv = document.getElementById("typing-indicator");
        if (typingDiv) typingDiv.remove();
    }
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// 4. Intent & AI Decisions
function synthesizeResponse(text) {
    const lower = text.toLowerCase();
    const best = getBestGate();
    const heavyGates = getHeavyGates();
    const now = Date.now();

    if (lower.includes("hurry") || lower.includes("fast") || lower.includes("late") || lower.includes("quick")) {
        const durSecs = Math.floor((now - best.statusStartTime) / 1000);
        let resp = `If you're in a hurry, head straight to <strong>${best.name}</strong>. It's highly stable and has been completely clear for ${durSecs} seconds! <br><br>📍 <strong>Directions:</strong> ${routes[best.name]}`;
        return resp;
    }

    if (lower.includes("avoid") || lower.includes("safe") || lower.includes("least") || lower.includes("best") || lower.includes("which")) {
        const durSecs = Math.floor((now - best.statusStartTime) / 1000);
        let resp = `<strong>${best.name}</strong> is best. It has been clear for ${durSecs}s.`;

        if (heavyGates.length > 0) {
            const heavyName = heavyGates[0].name;
            const heavyDur = Math.floor((now - heavyGates[0].statusStartTime) / 1000);
            resp += ` Avoid ${heavyName}, it has been heavily crowded for ${heavyDur} seconds.`;
        }
        resp += `<br><br>📍 <strong>Directions:</strong> ${routes[best.name]}`;
        return resp;
    }

    if (lower.includes("status") || lower.includes("all gates") || lower.includes("crowd")) {
        let resp = `Live congestion durations:<br><br>`;
        gates.forEach(g => {
            const colorClass = g.status === "High" ? "warn" : (g.status === "Low" ? "safe" : "");
            const dur = Math.floor((now - g.statusStartTime) / 1000);
            const stateText = g.status === "High" ? "congested" : (g.status === "Low" ? "clear" : "active");
            resp += `• <strong>${g.name}</strong>: <span class="${colorClass}">${g.status}</span> (${stateText} for ${dur}s)<br>`;
        });
        return resp;
    }

    if (lower.includes("hi ") || lower.startsWith("hi") || lower.includes("hello")) {
        return "Hello! I analyze both queue scale <strong>and time metrics</strong>. Ask me for the <strong>best gate</strong> to see my logic in action!";
    }

    return "I analyze queue volumes and duration concurrently. Ask <strong>'which gate is best'</strong> to avoid long congestion times.";
}

function processUserInput() {
    const text = userInput.value.trim();
    if (!text) return;

    addMessage(text, true);
    userInput.value = "";
    toggleTyping(true);

    setTimeout(() => {
        toggleTyping(false);
        const response = synthesizeResponse(text);
        addMessage(response, false);
    }, 600 + Math.random() * 400);
}

// Init Event Loop
renderGates();
updateRecommendationUI();
updateTimeUI();
setInterval(updateTimeUI, 1000);
setInterval(updateCrowdData, 18000);

sendBtn.addEventListener("click", processUserInput);
userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") processUserInput();
});
