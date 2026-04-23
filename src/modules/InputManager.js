export class InputManager {
    constructor(laneCount = 4) {
        this.laneCount = laneCount;

        this.inputBuffer = []
        this.bufferDuration = 50;
        this.latencyOffset = 20;

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
        window.addEventListener("keydown", (e) => this.handleKeyDown(e));
        window.addEventListener("keyup", (e) => this.handleKeyUp(e));
    }

    handleKeyDown(event) {
        if (this.keyBindings[event.code] !== undefined) {
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

            if (this.onLaneRelease) {
                this.onLaneRelease(lane);
            }
        }
    }

    triggerLane(lane) {
        const now = performance.now();

        this.inputBuffer.push({
            lane,
            time: now + this.latencyOffset,
        });

        this.activeLanes[lane] = true;
        this.activeTimers[lane] = this.activeDisplayDuration;

        if (this.onLaneHit) {
            this.onLaneHit(lane);
        }
    }

    processBuffer(currentTime, callback) {
        for (let i = this.inputBuffer.length - 1; i >= 0; i--) {
            const input = this.inputBuffer[i];

            if (Math.abs(currentTime - input.time) <= this.bufferDuration) {
                callback(input.lane, input.time);
                this.inputBuffer.splice(i, 1);
            }
        }

        this.inputBuffer = this.inputBuffer.filter(
            input => currentTime - input.time <= this.bufferDuration
        );

        if (this.inputBuffer.length > 50) {
            this.inputBuffer.shift();
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

        if (this.keyBindings[keyCode] !== undefined) {
            const oldLane = this.keyBindings[keyCode];
            this.keyBindings[keyCode] = lane;

            for (const [key, boundLane] of Object.entries(this.keyBindings)) {
                if (boundLane === oldLane && key !== keyCode) {
                    delete this.keyBindings[key];
                    break;
                }
            }
        } else {
            this.keyBindings[keyCode] = lane;
        }
    }

    getBufferSize() {
        return this.inputBuffer.length;
    }

    handlePointer(x, canvasWidth) {
        const laneWidth = canvasWidth / this.laneCount;
        const lane = Math.max(
            0,
            Math.min(this.laneCount -1, Math.floor(x / laneWidth))
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
