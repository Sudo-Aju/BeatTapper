const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const LANES = 4;
const LANE_KEYS = ['a', 's', 'd', 'f'];
const NOTE_SPEED = 5;
const JUDGEMENT_WINDOW = 30;

let HIT_LINE_Y = 0;
let notes = [];
let score = 0;

let combo = 0;
let laneFlashes =[0, 0, 0, 0];
let lastJudgement = "";
let judgementTimer = 0;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    HIT_LINE_Y = canvas.height * 0.85;

}
window.addEventListener('resize', resize);
resize();

class Note {
    constructor(lane) {
        this.lane = lane;
        this.y = 0;
        this.active = true;
    }

    update() {
        this.y += NOTE_SPEED;
        if (this.y > canvas.height) {
            this.active = false;
        }
    }
    draw() {
        const laneWidth = canvas.width / LANES;
        ctx.fillStyle = "#FFF";
        ctx.fillRect(this.lane * laneWidth + 10, this.y, laneWidth -20, 20);
    }
}

function triggerJudgement(msg) {
    lastJudgement = msg;
    judgmentTimer = 30;
    if (msg === "MISS") {
        combo = 0;
    }
        else {
            combo++;
        }
    }


window.addEventListener('keydown', (e) => {
    const laneIndex = LANE_KEYS.indexOf(e.key.toLowerCase());
    if (laneIndex === -1) return;

    laneFlashes[laneIndex] = 10;

    const hitNote = notes.find(n =>
        n.lane === laneIndex &&
        Math.abs(n.y - HIT_LINE_Y) < JUDGEMENT_WINDOW &&
        n.active
    );

    if (hitNote) {
        hitNote.active = false;
        score += 10;
        triggerJudgement("PERFECT")
    }
});

function spawnNotes() {
    if (Math.random() < 0.05) {
        const lane = Math.floor(Math.random() * LANES);
        notes.push(new Note(lane));
    }
}

function update() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const laneWidth = canvas.wdth / LANES;

    for (let i = 0; i < LANES; i++) {
        if (laneFlashes[i] > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${laneFlashes[i] / 20})`;
            ctx.fillRect(i * laneWidth, 0, laneWidth, canvas.height);
            laneFlashes[i]--;
        }

        ctx.strokeStyle = "#333";
        ctx.beginPath();
        ctx.beginPath();
        ctx.moveTo(i * laneWidth, 0);
        ctx.lineTo(i * laneWidth, canvas.height);
        ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.strokeRect(0, HIT_LINE_Y - JUDGEMENT_WINDOW, canvas.width, JUDGEMENT_WINDOW * 2);
    ctx.strokeStyle = "#FFF";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, HIT_LINE_Y);
    ctx.lineTo(canvas.width, HIT_LINE_Y);
    ctx.stroke;

    spawnNotes();
    notes = notes.filter(n => n.active);
    notes.forEach(note => {
        note.update();
        note.draw();
    });

    ctx.fillStyle = "#FFF";
    ctx.font = "bold 20px Courier New";
    ctx.fillText(`SCORE: ${score}`, 20, 40);
    ctx.fillText(`COMBO: ${combo}`, 20, 70);

    if (judgementTimer > 0) {
        ctx.textAlign = "center";
        ctx.font = "bold 40px Courier New"
        ctx.fillText(lastJudgment, canvas.width / 2, HIT_LINE_Y - 100);
    }

    requestAnimationFrame(update);
}

update();
