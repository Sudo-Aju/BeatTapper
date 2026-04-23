export const CONFIG = {
    APPROACH_TIME: 1.4,
    NOTE_SPACING: 0.7,
    HIT_LINE_Y: 80,
    LANE_COUNT: 4,
    NOTE_WIDTH_RATIO: 0.7,
    NOTE_HEIGHT: 20,
    BASE_SCORE: 100,
    HIT_WINDOW: {
        PERFECT: 0.018,
        GREAT: 0.040,
        GOOD: 0.100,
        MISS: 0.180,
    },
};

export const CHART= [
    0, 1, 2, 3,
    1, 2, 0, 3,
    3, 2, 1, 0,
    0, 2, 1, 3,
    2, 1, 0, 3,
].map((lane, index) => ({
    lane,
    time: 1 + index * CONFIG.NOTE_SPACING
}));