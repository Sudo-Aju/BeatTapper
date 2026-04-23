export class TimingController {
    constructor() {
        this.lastFrameTime = 0;
        this.deltaTime = 0;
        this.scaleDeltaTime = 0;
        this.timeScale = 1.0;
        this.isPaused = false;
        this.audioOffset = 0;
        this.hitWindows = {
            PERFECT: 0.018,
            GREAT: 0.040,
            GOOD: 0.100,
            MISS: 0.180,
        };

        this.currentTime = 0;
        this.startTime = 0;
        this.isRunning = false;
        this.frameTimeHistory = [];
        this.maxFrameHistory = 60;
        this.averageFrameTime = 0;
    }

    start() {
        this.startTime = performance.now();
        this.currentTime = 0;
        this.lastFrameTime = this.startTime;
        this.isRunning = true;
        this.isPaused = false;
        this.frameTimeHistory = [];
    }

    stop() {
        this.isRunning = false;
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        if (this.isPaused) {
            this.lastFrameTime = performance.now();
            this.isPaused = false;
        }
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

        this.frameTimeHistory.push(this.deltaTime);
        if (this.frameTimeHistory.length > this.maxFrameHistory) {
            this.frameTimeHistory.shift();
        }

        this.averageFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0)
            / this.frameTimeHistory.length;
    }

    getSongTime() {
        return this.currentTime - this.audioOffset;
    }

    getRawTime() {
        return this.currentTime;
    }

    setTimeScale(scale) {
        this.timeScale = Math.max(0.1, Math.min(3.0, scale));
    }

    setAudioOffset(offset) {
        this.audioOffset = offset;
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
            case "PERFECT": return 1.0;
            case "GREAT": return 0.8;
            case "GOOD": return 0.5;
            case "MISS": return 0;
            default: return 0;
        }
    }

    isWithingHitWindow(timeDiff) {
        return Math.abs(timeDiff) <= this.hitWindows.MISS;
    }

    getTimingAccuracy(timeDiff) {
        const absDiff = Math.abs(timeDiff);
        if (absDiff > this.hitWindows.MISS) return 0;
        return Math.max(0, 1 - (absDiff / this.hitWindows.MISS));
    }

    getFPS() {
        if (this.averageFrameTime === 0) return 60;
        return Math.round(1 / this.averageFrameTime);
    }

    setHitWindow(windows) {
        Object.assign(this.hitWindow, windows);
    }

    getHitWindows() {
        return { ...this.hitWindows };
    }

    reset() {
        this.currentTime = 0;
        this.deltaTime = 0;
        this.scaledDeltaTime = 0;
        this.lastFrameTime = 0;
        this.frameTimeHistory = [];
        this.isRunning = false;
        this.isPaused = false;
    }
}