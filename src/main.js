import { InputManager } from "./modules/InputManager.js";
import { CONFIG, CHART } from "./modules/GameConfig.js";
import { TimingController } from "./modules/TimingController.js"

const ui = {
    canvas: document.getElementById("gameCanvas"),
    score: document.getElementById("score"),
    status: document.getElementById("status"),
    combo: document.getElementById("combo"),
    judgement: document.getElementById("judgement"),
    startBtn: document.getElementById("startBtn"),
    keySlots: document.getElementById("keySlots"),
    bufferSize: document.getElementById("bufferSize")
};

const ctx = ui.canvas.getContext("2d");

const state = {
    running: false,
    score: 0,
    notes: [],
    message: "Press Play",
    width: 0,
    height: 0,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    hits: { PERFECT: 0, GREAT: 0, GOOD: 0, MISS: 0},
};

const visuals ={
    combo: 0,
    lastJudgement: "",
    judgementTimer: 0,
};

const input = new InputManager(CONFIG.LANE_COUNT);
const timing = new TimingController();

input.onLaneHit =(lane) => {
    if (state.running) {
        handleInput(lane);
    }
};

function init() {
    resizeCanvas();
    bindEvents();
    updateHud();
    requestAnimationFrame(loop);
}

function bindEvents() {
    ui.startBtn.addEventListener("click",startGame);

    ui.canvas.addEventListener("pointerdown", (e) => {
        const rect = ui.canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * state.width;
        input.handlePointer(x, state.width);
    });

    window.addEventListener("resize", resizeCanvas);
}

function startGame() {
    input.reset()

    state.running = true;
    state.score = 0;
    visuals.combo = 0;
    state.hits = { PERFECT: 0, GREAT: 0, GOOD: 0, MISS: 0};

    timing.reset();
    timing.start();

    state.message = "Playing";

    state.notes = CHART.map((note) => ({
        ...note,
        hit: false,
        missed: false,
    }));

    updateHud();
}

function handleInput(lane) {
    if (!state.running) return;

    const songTime = timing.getSongTime();

    const note = state.notes.find(n => 
        !n.hit &&
        !n.missed &&
        n.lane === lane
    );

    if (!note) {
        triggerJudgement("MISS", 0);
        return;
    }

    const timeDiff = note.time - songTime;
    const judgement = timing.getJudgement(timeDiff);

    if (!judgement) {
        triggerJudgement("MISS", timeDiff);
        return;
    }

    note.hit = true;
    triggerJudgement(judgement, timeDiff);
}

function triggerJudgement(type, timeDiff) {
    visuals.lastJudgement = type;
    visuals.judgementTimer = 30;

    ui.judgement.className = "judgement " + type.toLowerCase();

    state.hits[type]++;

    if (type === "MISS") {
        visuals.combo = 0;
    } else { 
        visuals.combo++;
    }

    const multiplier = timing.getScoreMultiplier(type);
    const scoreGain = Math.floor(CONFIG.BASE_SCORE * multiplier * (1 + visuals.combo * 0.05));

    state.score += scoreGain;
    state.message = type;
}

function update() {
    if (!state.running) return;

    timing.update();
    input.update();
    
    const songTime = timing.getSongTime();

    for (const note of state.notes) {
        if (!note.hit && !note.missed) {
            const diff = note.time - songTime;
            if (diff < -CONFIG.HIT_WINDOW.MISS) {
                note.missed = true;
                triggerJudgement("MISS", diff);
            }
        }
    }

    const last = state.notes[state.notes.length - 1];
    if (last && songTime > last.time + 1) {
        state.running = false;
        state.message = "Finished";
    }

    updateHud();
}

function draw(){
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ui.canvas.width, ui.canvas.height);
    ctx.setTransform(state.dpr, 0 ,0, state.dpr, 0, 0);

    ctx.fillStyle = "#132952";
    ctx.fillRect(0, 0, state.width, state.height);

   
    const laneWidth = state.width / CONFIG.LANE_COUNT;
    const hitLineY = state.height - CONFIG.HIT_LINE_Y;
    const songTime = timing.getSongTime();

    const active = input.getActiveLanes();
    for (let i = 0; i < CONFIG.LANE_COUNT; i++) {
        if (active[i]) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
            ctx.fillRect(i * laneWidth, 0, laneWidth, state.height)
        }
    }

    ctx.strokeStyle = "rgba(219, 171, 75, 0.28)";
    ctx.lineWidth = 2;
    for (let lane = 1; lane < CONFIG.LANE_COUNT; lane++) {
        ctx.beginPath();
        ctx.moveTo(lane * laneWidth, 0);
        ctx.lineTo(lane * laneWidth, state.height); 
        ctx.stroke();
    }

    ctx.strokeStyle = "#DBAB4B";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, hitLineY);
    ctx.lineTo(state.width, hitLineY);
    ctx.stroke();

    for (const note of state.notes) {
        if (note.hit) continue;

        const distance = note.time - songTime;
        if (distance > CONFIG.APPROACH_TIME || distance < - CONFIG.HIT_WINDOW) continue;

        const progress = 1 - distance / CONFIG.APPROACH_TIME;
        
        const x = note.lane * laneWidth + laneWidth * 0.15;
        const y = progress * (hitLineY - 40);

        ctx.fillStyle = note.missed
            ? "rgba(219, 171, 75, 0.35)"
            : "#DBAB4B";

        ctx.fillRect(x, y, laneWidth * 0.7, CONFIG.NOTE_HEIGHT);
    }

    if (visuals.judgementTimer > 0) {
        visuals.judgementTimer--;
    }
}

function loop() {
    update();
    draw();

    if (ui.bufferSize) {
        ui.bufferSize.textContent = input.getBufferSize();
    }

    if (ui.fpsDisplay) {
        ui.fpsDisplay.textContent = timing.getFPS();
    }

    requestAnimationFrame(loop);
}

function updateHud() {
    ui.score.textContent = String(state.score).padStart(6, "0");
    ui.status.textContent = state.message;
    ui.combo.textContent = visuals.combo;
    ui.judgement.textContent = visuals.judgementTimer > 0 ? visuals.lastJudgement : "";
}

function resizeCanvas() {
    const rect = ui.canvas.getBoundingClientRect();

    state.width = Math.max(320, Math.floor(rect.width));
    state.height = Math.max(320, Math.floor(rect.height));

    ui.canvas.width = state.width * state.dpr;
    ui.canvas.height = state.height * state.dpr;
}

init();