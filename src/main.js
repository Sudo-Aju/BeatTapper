const CONFIG = {
    APPROACH_TIME: 1.4,
    HIT_LINE_Y: 80,
    LANE_COUNT: 4,
    NOTE_WIDTH_RATIO: 0.7,
    NOTE_HEIGHT: 20,
    BASE_SCORE: 100,
    HOLD_SCORE_PER_SECOND: 50,
    HIT_WINDOWS: {
        PERFECT: 0.018,
        GREAT: 0.04,
        GOOD: 0.1,
        MISS: 0.18,
    },
    NOTE_SPACING: 0.7,
    COLORS: {
        BACKGROUND: "#111111",
        LANE_DIVIDER: "rgba(255, 255, 255, 0.18)",
        HIT_LINE: "#ffffff",
        NOTE: "#ffffff",
        NOTE_MISSED: "rgba(255, 255, 255, 0.25)",
        LANE_FLASH: "rgba(255, 255, 255, 0.16)",
        HOLD_BODY: rgba("255, 255, 255, 0.16"),
        MULTI_NOTE: "#d9d9d9",
    },
};

const CHART = [
    { lane: 0, time: 1.0, type: "tap" },
    { lane: 1, time: 1.5, type: "tap" },
    { lane: 2, time: 2.0, type: "tap" },
    { lane: 3, time: 2.5, type: "hold", duration: 1.0 },
    { lane: [0, 3], time: 4.0, type: "multi" },
    { lane: 1, time: 4.5, type: "tap" },
    { lane: 2, time: 5.0, type: "tap" },
    { lane: 0, time: 5.5, type: "hold", duration: 0.8 },
    { lane: 1, time: 5.5, type: "hold", duration: 0.8 },
    { lane: [2, 3], time: 6.5, type: "multi" },
    { lane: 3, time: 7.0, type: "tap" },
    { lane: 2, time: 7.35, type: "tap" },
    { lane: 1, time: 7.7, type: "tap" },
    { lane: 0, time: 8.0, type: "tap" },
]

class InputManager {
  constructor(laneCount = 4) {
    this.laneCount = laneCount;
    this.inputBuffer = [];
    this.bufferDuration = 0.05;
    this.keyBindings = {
      KeyA: 0,
      KeyS: 1,
      KeyD: 2,
      KeyF: 3,
    };
    this.pressedKeys = new Set();
    this.activeLanes = new Array(laneCount).fill(false);
    this.activeTimers = new Array(laneCount).fill(0);
    this.activeDisplayDuration = 5;
    this.onLaneHit = null;
    this.onLaneRelease = null;
    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener("keydown", (event) => this.handleKeyDown(event));
    window.addEventListener("keyup", (event) => this.handleKeyUp(event));
  }

  handleKeyDown(event) {
    if (Object.prototype.hasOwnProperty.call(this.keyBindings, event.code)) {
      event.preventDefault();
    }
    if (this.pressedKeys.has(event.code)) return;

    this.pressedKeys.add(event.code);
    const lane = this.keyBindings[event.code];
    if (lane !== undefined) {
      this.triggerLane(lane);
    }
  }

  handleKeyUp(event) {
    this.pressedKeys.delete(event.code);
    const lane = this.keyBindings[event.code];
    if (lane !== undefined) {
      this.activeLanes[lane] = false;
      this.activeTimers[lane] = 0;
      if (this.onLaneRelease) {
        this.onLaneRelease(lane);
      }
    }
  }

  triggerLane(lane) {
    const now = performance.now() / 1000;
    this.inputBuffer.push({ lane, time: now });
    this.activeLanes[lane] = true;
    this.activeTimers[lane] = this.activeDisplayDuration;
    if (this.onLaneHit) {
      this.onLaneHit(lane);
    }
  }

  update() {
    for (let i = 0; i < this.laneCount; i++) {
      if (this.activeTimers[i] > 0) {
        this.activeTimers[i]--;
        if (this.activeTimers[i] <= 0) {
          this.activeLanes[i] = false;
        }
      }
    }
  }

  getActiveLanes() {
    return [...this.activeLanes];
  }

  getLaneFlashIntensity(lane) {
    if (this.activeTimers[lane] <= 0) return 0;
    return (this.activeTimers[lane] / this.activeDisplayDuration) * 10;
  }

  getKeyForLane(lane) {
    for (const [key, boundLane] of Object.entries(this.keyBindings)) {
      if (boundLane === lane) {
        return key.replace("Key", "");
      }
    }
    return "?";
  }

  setKeyForLane(lane, keyCode) {
    for (const key of Object.keys(this.keyBindings)) {
      if (this.keyBindings[key] === lane) {
        delete this.keyBindings[key];
      }
    }
    this.keyBindings[keyCode] = lane;
  }

  getBufferSize() {
    return this.inputBuffer.length;
  }

  handlePointer(x, canvasWidth) {
    const laneWidth = canvasWidth / this.laneCount;
    const lane = Math.max(
      0,
      Math.min(this.laneCount - 1, Math.floor(x / laneWidth)),
    );
    this.triggerLane(lane);
  }

  reset() {
    this.inputBuffer = [];
    this.pressedKeys.clear();
    this.activeLanes.fill(false);
    this.activeTimers.fill(0);
  }
}
class TimingController {
  constructor() {
    this.lastFrameTime = 0;
    this.deltaTime = 0;
    this.scaledDeltaTime = 0;
    this.timeScale = 1.0;
    this.isPaused = false;
    this.audioOffset = 0;
    this.hitWindows = {
      PERFECT: 0.018,
      GREAT: 0.04,
      GOOD: 0.1,
      MISS: 0.18,
    };
    this.currentTime = 0;
    this.startTime = 0;
    this.isRunning = false;
  }

  start() {
    this.startTime = performance.now();
    this.currentTime = 0;
    this.lastFrameTime = this.startTime;
    this.isRunning = true;
    this.isPaused = false;
  }

  stop() {
    this.isRunning = false;
  }

  update() {
    if (!this.isRunning || this.isPaused) {
      this.deltaTime = 0;
      this.scaledDeltaTime = 0;
      return;
    }

    const now = performance.now();
    this.deltaTime = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    this.scaledDeltaTime = this.deltaTime * this.timeScale;
    this.currentTime += this.scaledDeltaTime;
  }

  getSongTime() {
    return this.currentTime - this.audioOffset;
  }

  getJudgement(timeDiff) {
    const absDiff = Math.abs(timeDiff);
    if (absDiff <= this.hitWindows.PERFECT) return "PERFECT";
    if (absDiff <= this.hitWindows.GREAT) return "GREAT";
    if (absDiff <= this.hitWindows.GOOD) return "GOOD";
    if (absDiff <= this.hitWindows.MISS) return "MISS";
    return null;
  }

  getScoreMultiplier(judgement) {
    switch (judgement) {
      case "PERFECT":
        return 1.0;
      case "GREAT":
        return 0.8;
      case "GOOD":
        return 0.5;
      case "MISS":
        return 0;
      default:
        return 0;
    }
  }

  reset() {
    this.currentTime = 0;
    this.deltaTime = 0;
    this.scaledDeltaTime = 0;
    this.lastFrameTime = 0;
    this.isRunning = false;
    this.isPaused = false;
  }
}

class RenderEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.layers = {
            background: [],
            lanes: [],
            notes: [],
            effects: [],
            ui: [],
        };
        this.width = 0;
        this.height = 0;
        this.dpr = 1;
        this.dirtyRegions = [];
        this.useDirtyRegions = false;
        this.drawCalls = 0;
        this.frameCount = 0;
        this.transformStack = [];
        this.currentTransform = { x: 0, y: 0, scale: 1 };
    }

    resize(width, height, dpr = 1) {
        this.width = width;
        this.height = height;
        this.dpr = dpr;
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
    }

    beginFrame() {
        this.drawCalls = 0;
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.layers.background = [];
        this.layers.lanes = [];
        this.layers.notes = [];
        this.layers.effects = [];
        this.layers.ui = [];
    }

    addBackgroundCommand(drawFn) {
        this.layers.background.push(drawFn);
    }
    
    addLaneCommand(drawFn) {
        this.layers.lanes.push(drawFn);
    }

    addNoteCommand(drawFn) {
        this.layers.notes.push(drawFn);
    }

    addEffectCommand(drawFn) {
        this.layers.effects.push(drawFn);
    }
    addUICommand(drawFn) {
        this.layers.ui.push(drawFn);
    }

    render() {
        for (const cmd of this.layers.background) {
            this.executeCommand(cmd);
        }
        for (const cmd of this.layers.lanes) {
            this.executeCommand(cmd);
        }
        for (const cmd of this.layers.notes) {
            this.executeCommand(cmd);
        }
        for (const cmd of this.layers.effects) {
            this.executeCommand(cmd);
        }
        for (const cmd of this.layers.ui) {
            this.executeCommand(cmd);
        }
        this.frameCount++;
    }

    executeCommand(cmd) {
        cmd(this.ctx, this.width, this.height);
        this.drawCalls++;
    }
}

class Note {
    constructor(lane, time, type = "tap") {
        this.lane = lane;
        this.time = time;
        this.type = type;
        this.hit = false;
        this.missed = false;
        this.processed = false;
    }

    canHit(currentTime, hitWindow) {
        return Math.abs(this.time - currentTime) <= hitWindow;
    }

    getTimeDiff(currentTime) {
        return this.time - currentTime;
    }

    markHit() {
        this.hit = true;
    }

    markMissed() {
        this.missed = true;
    }
}

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