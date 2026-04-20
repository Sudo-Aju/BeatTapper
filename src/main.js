const KEYS = ["KeyA", "KeyS", "KeyD", "KeyF"];
const APPROACH_TIME = 1.4;
const HIT_WINDOW = 0.18;
const LANE_COUNT = 4;
const NOTE_SPACING = 0.7;

const CHART = [
    0, 1, 2, 3,
    1, 2, 0, 3,
    3, 2, 1, 0,
].map((lane, index) => ({
    lane,
    time: 1 + index * NOTE_SPACING,
}));

const elements = {
    canvas: document.querySelector("#gameCanvas"),
    startButton: document.querySelector("#startButton"),
    scoreValue: document.querySelector("#scoreValue"),
    statusValue: document.querySelector("#statusValue"),
};

const ctx = elements.canvas.getContext("2d");

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

let combo = 0;
let lastJudgement = "";
let judgementTimer = 0;
let laneFlashes = [0, 0, 0, 0];

function init() {
    resizeCanvas();
    bindEvents();
    updateHud();
    requestAnimationFrame(loop);
}

function bindEvents() {
    elements.startButton.addEventListener("click", () => {
        startGame();
    });

    window.addEventListener("keydown", (event) => {
        const lane = KEYS.indexOf(event.code);
        if (lane === -1) return;

        event.preventDefault();

        laneFlashes[lane] = 10;

        hitLane(lane);
    });

    elements.canvas.addEventListener("pointerdown", (event) => {
        const rect = elements.canvas.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * state.width;
        const laneWidth = state.width / LANE_COUNT;
        hitLane(Math.max(0, Math.min(LANE_COUNT - 1, Math.floor(x / laneWidth))));
    });

    window.addEventListener("resize", resizeCanvas);
}

function startGame() {
    state.running = true;
    state.startAt = performance.now();
    state.elapsed = 0;
    state.score = 0;
    combo = 0;

    state.message = "Playing";

    state.notes = CHART.map((note) => ({
        ...note,
        hit: false,
        missed: false,
    }));

    updateHud();
}

function triggerJudgement(msg) {
    lastJudgement = msg;
    judgementTimer = 30;

    if (msg === "MISS") {
        combo = 0;
    } else {
            combo++;
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
        Math.abs(item.time - time) <= HIT_WINDOW,
);

if (!note) {
    triggerJudgement("MISS");
    state.message = "Miss";
    updateHud();
    return;
}

note.hit = true;
state.score += 100;

triggerJudgement("PERFECT");

state.message = "Hit";
updateHud();
}

function update() {
    if (!state.running) return;

    state.elapsed = (performance.now() - state.startAt) / 1000;

    for (const note of state.notes) {
        if (!note.hit && !note.missed && state.elapsed - note.time > HIT_WINDOW) {
            note.missed = true;
            triggerJudgement("MISS");
            state.message = "Miss";
        }
    }

    if (state.elapsed > CHART[CHART.length -1].time + 1) {
        state.running = false;
        state.message = "Finished";
    }

    updateHud();
}

function draw(){
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
    ctx.setTransform(state.dpr, 0 ,0, state.dpr, 0, 0);

    ctx.fillStyle = "#132952";
    ctx.fillRect(0, 0, state.width, state.height);

    const laneWidth = state.width / LANE_COUNT;
    const hitLineY = state.height - 80;
    const time = state.elapsed;

    for (let i = 0; i < LANE_COUNT; i++) {
        if(laneFlashes[i] > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${laneFlashes[i] / 20})`;
            ctx.fillRect(i * laneWidth, 0, laneWidth, state.height);
            laneFlashes[i]--;
        }
    }

    ctx.strokeStyle = "rgba(219, 171, 75, 0.28)";
    ctx.lineWidth = 2;
    for (let lane = 1; lane < LANE_COUNT; lane++) {
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
        if (distance > APPROACH_TIME || distance < -HIT_WINDOW) continue;

        const progress = 1 - distance / APPROACH_TIME;

        const x = note.lane * laneWidth + laneWidth * 0.15;
        const y = progress * (hitLineY - 40);
        const width = laneWidth * 0.7;
        const height = 20;

        ctx.fillStyle = note.missed
        ? "rgba(219, 171, 75, 0.35)"
        : "#DBAB4B";

        ctx.fillRect(x, y, width, height);
    }

    ctx.fillStyle = "#FFF";
    ctx.font = "bold 20px Arial";
    ctx.fillText(`Combo: ${combo}`, 20, 60);

    if (judgementTimer > 0) {
        ctx.textAlign = "center";
        ctx.font = "bold 40px Arial";
        ctx.fillStyle = "#FFF";
        ctx.fillText(lastJudgement, state.width / 2, state.height - 140);
        judgementTimer--;
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

function updateHud() {
    elements.scoreValue.textContent = String(state.score);
    elements.statusValue.textContent = state.message;
}

function resizeCanvas() {
    const rect = elements.canvas.getBoundingClientRect();

    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.width = Math.max(320, Math.floor(rect.width));
    state.height = Math.max(320, Math.floor(rect.height));

    elements.canvas.width = state.width * state.dpr;
    elements.canvas.height = state.height * state.dpr;
}

function getSongTime() {
    return state.elapsed;
}

init();