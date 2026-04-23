import { InputManager } from "./modules/InputManager.js";
import { CONFIG, CHART } from "./modules/GameConfig.js";

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
    startAt: 0,
    elapsed: 0,
    score: 0,
    notes: [],
    message: "Press Play",
    width: 0,
    height: 0,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
};

const visuals ={
    combo: 0,
    lastJudgement: "",
    judgementTimer: 0,
    laneFlashes: [0, 0, 0, 0],
};

const input = new InputManager(CONFIG.LANE_COUNT);

input.onLaneHit =(lane) => {
    visuals.laneFlashes[lane] = 12;
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
    state.startAt = performance.now();
    state.elapsed = 0;
    state.score = 0;
    visuals.combo = 0;

    state.message = "Playing";

    state.notes = CHART.map((note) => ({
        ...note,
        hit: false,
        missed: false,
    }));

    updateHud();
}

function triggerJudgement(msg) {
    visuals.lastJudgement = msg;
    visuals.judgementTimer = 30;

    ui.judgement.className = "judgement " + msg.toLowerCase();

    if (msg === "MISS") {
        visuals.combo = 0;
    } else {
            visuals.combo++;
    }
}

function hitLane(lane) {
    if (!state.running) return;

    const time = getSongTime();

    const note = state.notes.find(
        (item) =>
        !item.hit &&
        !item.missed &&
        item.lane === lane &&
        Math.abs(item.time - time) <= CONFIG.HIT_WINDOW
);

if (!note) {
    triggerJudgement("MISS");
    state.message = "Miss";
    updateHud();
    return;
}

note.hit = true;
state.score += CONFIG.BASE_SCORE;

const diff = Math.abs(note.time - time);

if (diff < 0.05) triggerJudgement("PERFECT");
else if (diff < 0.1) triggerJudgement("GREAT");
else triggerJudgement("GOOD");

state.message = "Hit";
}

function update() {
    if (!state.running) return;

    state.elapsed = (performance.now() - state.startAt) / 1000;

    input.update();
    input.processBuffer(performance.now(), (lane) => {
        visuals.laneFlashes[lane] = 12;
        hitLane(lane)
    });
    
    for (const note of state.notes) {
        if (!note.hit && !note.missed && state.elapsed - note.time > CONFIG.HIT_WINDOW) {
            note.missed = true;
            triggerJudgement("MISS");
        }
    }

    if (state.elapsed > CHART[CHART.length - 1].time +1) {
        state.running = false
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
    const time = state.elapsed;

    
    for (let i = 0; i < CONFIG.LANE_COUNT; i++) {
        if(visuals.laneFlashes[i] > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${visuals.laneFlashes[i] / 20})`;
            ctx.fillRect(i * laneWidth, 0, laneWidth, state.height);
            visuals.laneFlashes[i]--;
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

        const distance = note.time - time;
        if (distance > CONFIG.APPROACH_TIME || distance < - CONFIG.HIT_WINDOW) continue;

        const progress = 1 - distance / CONFIG.APPROACH_TIME;
        const x = note.lane * laneWidth + laneWidth * 0.15;
        const y = progress * (hitLineY - 40);
        const width = laneWidth * 0.7;
        const height = 20;

        ctx.fillStyle = note.missed
        ? "rgba(219, 171, 75, 0.35)"
        : "#DBAB4B";

        ctx.fillRect(x, y, width, height);
    }

    if (visuals.judgementTimer > 0) {
        visuals.judgementTimer--;
    }
}

function loop() {
    update();
    draw();
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

    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.width = Math.max(320, Math.floor(rect.width));
    state.height = Math.max(320, Math.floor(rect.height));

    ui.canvas.width = state.width * state.dpr;
    ui.canvas.height = state.height * state.dpr;
}

function getSongTime() {
    return state.elapsed;
}

init();