const SETTINGS = {
  laneCount: 4,
  approachTime: 1.35,
  hitLineOffset: 86,
  noteHeight: 26,
  noteWidthRatio: 0.72,
  missWindowMs: 140,
  scorePad: 8,
  chordTimeTolerance: 0.0005,
  hitSnapTime: 0.055,
  hitAnimationTime: 0.22,
  missFadeTime: 0.36,
  laneFlashTime: 0.26,
  effectDuration: {
    PERFECT: 260,
    GREAT: 220,
    GOOD: 180,
    MISS: 140,
  },
};

const KEY_TO_LANE = {
  KeyA: 0,
  KeyS: 1,
  KeyD: 2,
  KeyF: 3,
};

const LANE_PALETTES = [
  {
    body: "79, 131, 255",
    glow: "147, 196, 255",
  },
  {
    body: "53, 212, 255",
    glow: "157, 240, 255",
  },
  {
    body: "255, 100, 190",
    glow: "255, 170, 217",
  },
  {
    body: "215, 75, 255",
    glow: "239, 171, 255",
  }
];

const JUDGEMENTS = {
  PERFECT: { windowMs: 22, score: 3200, rgb: "236, 255, 255" },
  GREAT: { windowMs: 48, score: 2200, rgb: "126, 245, 168"},
  GOOD: { windowMs: 90, score: 1200, rgb: "255, 216, 91"},
  MISS: { windowMs: 140, score: 0, rgb: "255, 100, 117"},
};

const SAMPLE_RATE = 22050;
const TAU = Math.PI * 2;

function tap(time, lane) {
  return { type: "tap", time, lane };
}

function hold(time, lane, duration) {
  return { type: "hold", time, lane, duration };
}

const LEVEL_AUDIO_SPEC = {
  duration: 22.4,
  bpm: 132,
  leadsStepsPerBeat: 2,
  leadPattern: [69, 72, 76, 72, 74, 72, 69, 67, 69, 72, 76, 79, 76, 74, 72, 69],
  bassStepsPerBeat: 1,
  bassPattern: [45, 45, 45, 45, 41, 41, 43, 43, 45, 45, 48, 48, 43, 43, 41, 41],
  padBars: [
    [57, 60, 64],
    [53, 57, 60],
    [55, 59, 62],
    [52, 57, 60],
  ],
  kickPattern: [1, 0, 1, 0],
  snarePattern: [0, 1, 0, 1],
  hatPattern: [1, 1, 1, 1, 1, 1, 1, 1],
  leadMix: 0.18,
  bassMix: 0.18,
  padMix: 0.1,
  drive: 1.38,
  leadWave: "triangle",
  bassWave: "sine",
}

const LEVEL_BEATMAP = [
  tap(1.0, 0),
  tap(1.23, 1),
  tap(1.45, 1),
  tap(1.68, 3),
  tap(2.14, 1),
  tap(2.36, 2),
  tap(2.59, 0),
  tap(2.59, 3),
  hold(3.05, 2, 0.91),
  tap(3.5, 1),
  tap(3.73, 3),
  tap(3.95, 0),
  tap(4.18, 1),
  hold(4.64, 0, 0.68),
  tap(4.64, 3),
  tap(5.09, 2),
  tap(5.32, 1),
  tap(5.55, 3),
  tap(5.77, 2),
  tap(6.0, 0),
  tap(6.0, 1),
  hold(6.45, 3, 0.91),
  tap(6.91, 2),
  tap(7.14, 1),
  tap(7.36, 0),
  tap(7.59, 2),
  tap(8.05, 1),
  tap(8.27, 3),
  tap(8.5, 2),
  tap(8.73, 0),
  hold(9.18, 1, 1.14),
  tap(9.18, 2),
  tap(9.64, 3),
  tap(9.86, 0),
  tap(10.09, 2),
  tap(10.32, 3),
  tap(10.77, 0),
  tap(11.0, 1),
  tap(11.23, 2),
  tap(11.23, 3),
  hold(11.68, 0, 0.91),
  tap(12.14, 1),
  tap(12.36, 2),
  tap(12.59, 3),
  tap(12.82, 1),
  tap(13.27, 0),
  tap(13.5, 2),
  tap(13.73, 1),
  tap(13.95, 3),
  tap(14.41, 0),
  tap(14.41, 3),
  hold(14.86, 2, 1.36),
  tap(15.32, 1),
  tap(15.55, 0),
  tap(15.77, 3),
  tap(16.0, 1),
  tap(16.45, 2),
  tap(16.68, 3),
  tap(16.91, 1),
  tap(17.14, 0),
  tap(17.59, 0),
  tap(17.59, 2),
  tap(17.82, 1),
  tap(17.82, 3),
  hold(18.05, 0, 1.14),
  tap(18.05, 2),
  tap(18.5, 3),
  tap(18.73, 1),
  tap(19.18, 0),
  tap(19.18, 1),
  tap(19.18, 2),
  tap(19.18, 3),
  tap(19.64, 2),
  tap(19.86, 3),
  tap(20.09, 1),
  tap(20.32, 0),
  tap(20.77, 0),
  tap(20.77, 3),
];

function scaleBeatmapNote(note, timeScale, holdDurationScale = 1) {
  const scaledTime = Number((note.time * timeScale).toFixed(3));
  if (note.type === "hold") {
    const scaledDuration = Number((note.duration * timeScale * holdDurationScale).toFixed(3));
    return hold(scaledTime, note.lane, scaledDuration);
  }
  return tap(scaledTime, note.lane);
}

function groupBeatmapNotes(beatmap, tolerance = 0.001) {
  const ordered = [...beatmap].sort((a, b) => a.time - b.time || a.lane - b.lane);
  const groups = [];

  for (let index = 0; index < ordered.length; index++) {
    const note = ordered[index];
    const lastGroup = groups[groups.length - 1];

    if (!lastGroup || Math.abs(lastGroup.time - note.time) > tolerance) {
      groups.push({
        time: note.time,
        notes: [note],
      });
      continue;
    }
    lastGroup.notes.push(note);
  }
  return groups;
}

function patternAllows(pattern, index) {
  return pattern[index % pattern.length] === 1;
}

function selectGroupNotes(notes, chordLimit, groupIndex) {
  const ordered = [...notes].sort((a, b) => a.lane - b.lane);
  if (ordered.length <= chordLimit) {
    return ordered;
  }

  if (chordLimit <= 1) {
    return [ordered[groupIndex % ordered.length]];
  }

  if (chordLimit === 2 ) {
    return [ordered[0], ordered[ordered.length -1]];
  }

  const center = ordered[Math.floor(ordered.length / 2)];
  return [ordered[0], center, ordered[ordered.length -1]].filter(
    (note, index, array) =>
      array.findIndex((item) => item.lane === note.lane && item.time === note.time) === index,
  );
}

function buildLevelAudioSpec(baseSpec, bpm) {
  const timeScale = baseSpec.bpm / bpm;
  return {
    ...baseSpec, bpm, duration: Number((baseSpec.duration * timeScale).toFixed(3)),
  };
}

function buildProgressiveBeatmap(baseBeatmap, config) {
  const timeScale = LEVEL_AUDIO_SPEC.bpm / config.bpm;
  const groups = groupBeatmapNotes(baseBeatmap, SETTINGS.chordTimeTolerance);
  const notes = [];
  let holdGroupIndex = 0;

  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    const group = groups[groupIndex];
    const keepGroup = groupIndex < config.keepFirstGroups || patternAllows(config.keepPattern, groupIndex);
    if (!keepGroup) {
      continue;
    }

    let selectedNotes = selectGroupNotes(group.notes, config.chordLimit, groupIndex);
    const hasHold = selectedNotes.some((note) => note.type === "hold");

    if (hasHold) {
      const keepHolds = patternAllows(config.holdPattern, holdGroupIndex);
      holdGroupIndex += 1;
      if(!keepHolds) {
        selectedNotes = selectedNotes.filter((note) => note.type != "hold");
      }
    }

    if (selectedNotes.length === 0) {
      continue;
    }

    notes.push(
      ...selectedNotes.map((note) =>
        scaleBeatmapNote(note, timeScale, config.holdDurationScale),
    ),
  
    );

  }
return notes.sort((a, b) => a.time - b.time || a.lane - b.lane);
}

const CONFIG = [
  {
    number: 1,
    bpm: 108,
    keepPattern: [1, 0, 0], 
    holdPattern: [1, 0, 0],
    chordLimit: 1,
    holdDurationScale: 0.78,
    keepFirstGroups: 4,
  },
  {
   number: 2,
    bpm: 116,
    keepPattern: [1, 0], 
    holdPattern: [1, 0],
    chordLimit: 1,
    holdDurationScale: 0.84,
    keepFirstGroups: 6,
  },
  {
    number: 3,
    bpm: 122,
    keepPattern: [1, 1, 0], 
    holdPattern: [1, 1, 0],
    chordLimit: 2,
    holdDurationScale: 0.9,
    keepFirstGroups: 6,
  },
  {
    number: 4,
    bpm: 108,
    keepPattern: [1, 1, 1, 0, 1], 
    holdPattern: [1, 0, 0, 1],
    chordLimit: 3,
    holdDurationScale: 0.96,
    keepFirstGroups: 10,
  },
  {
    number: 5,
    bpm: 132,
    keepPattern: [1], 
    holdPattern: [1],
    chordLimit: 4,
    holdDurationScale: 1,
    keepFirstGroups: 12,
  },
];

const LEVELS = CONFIG.map((config) => ({
  id: `level-${config.number}`,
  title: `level ${config.number}`,
  audioSpec: buildLevelAudioSpec(LEVEL_AUDIO_SPEC, config.bpm),
  beatmap:
    config.number === 5
      ? LEVEL_BEATMAP.map((note) => ({ ...note }))
      : buildProgressiveBeatmap(LEVEL_BEATMAP, config),
}));

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rgba(rgb, alpha) {
  return `rgba(${rgb}, ${alpha})`;
}

function midToFrequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function waveformSample(kind, frequency, time) {
  const phase = (time * frequency) % 1;
  switch (kind) {
    case "triangle":
      return 1 - 4 * Math.abs(phase - 0.5);
    case "saw":
      return phase * 2 - 1;
    case "pulse":
      return phase < 0.28 ? 1 : -1;
    default:
      return Math.sin(TAU * frequency * time);
  }
}

function pseudoNoise(seed) {
  const x = Math.sin(seed * 12.9898 + seed * 0.1234) * 43758.543123
  return x - Math.floor(x);
}

function envelope(localTime, attack, decay) {
  if (localTime < 0) {
    return 0;
  }
  const attachShape = attack <= 0 ? 1 : clamp(localTime / attack, 0, 1);
  return attachShape * Math.exp(-localTime / decay);
}

function renderSequenceVoice(time, bpm, pattern, stepsPerBeat, wave, mix, transpose = 0) {
  const stepDuration = (60 / bpm) / stepsPerBeat;
  const stepIndex = Math.floor(time / stepDuration);
  const midi = pattern[stepIndex % pattern.length];
  if(midi == null || midi < 0) {
    return 0;
  }

  const localTime = time - stepIndex * stepDuration;
  const frequency = midToFrequency(midi + transpose);
  const amp = envelope(localTime, stepDuration * 0.8, stepDuration * 0.9);
  return waveformSample(wave, frequency, time) * amp * mix;
}

function renderPadVoice(time, bpm, chords, mix) {
  const barDuration = (60 / bpm) * 4;
  const barIndex = Math.floor(time / barDuration);
  const chord = chords[barIndex % chords.length];
  const localTime = time - barIndex * barDuration;
  const swell = 0.72 + Math.sin((localTime / barDuration) * Math.PI) * 0.28;

  let value = 0;
  for (let i = 0; i < chord.length; i++) {
    const frequency = midToFrequency(chord[i]);
    value += waveformSample("triangle", frequency * (i === 2 ? 0.5 : 1), time);
  }

  return (value / chord.length) * mix * swell * 0.6;
}

function renderKick(time, bpm, pattern) {
  const beatDuration = 60 / bpm;
  const beatIndex = Math.floor(time / beatDuration);
  const localTime = time - beatIndex * beatDuration;
  if (!pattern[beatIndex % pattern.length] || localTime > 0.22) {
    return 0;
  }

  const pitch = 110 - localTime * 260;
  return Math.sin(TAU * pitch * localTime) * Math.exp(-localTime * 15) * 0.9;
}

function renderSnare(time, sampleIndex, bpm, pattern) {
  const beatDuration = 60 / bpm;;
  const beatIndex = Math.floor(time / beatDuration);
  const localTime = time - beatIndex * beatDuration;
  if(!pattern[beatIndex % pattern.length ]|| localTime > 0.16) {
    return 0;
  }

  const tone = Math.sin(TAU * 180 * localTime) * Math.exp(-localTime * 18) * 0.25;
  const burst = pseudoNoise(sampleIndex + beatIndex * 101) * Math.exp(-localTime * 84) * 0.55;
  return tone + burst;
}

function renderHat (time, sampleIndex, bpm, pattern) {
  const stepDuration = (60 / bpm) / 2;
  const stepIndex = Math.floor(time / stepDuration);
  const localTime = time - stepIndex * stepDuration;
  if (!pattern[stepIndex % pattern.length] || localTime > 0.055) {
    return 0;
  }

  return pseudoNoise(sampleIndex + stepIndex * 41) * Math.exp(-localTime * 70) * 0.18;
}

function buildWaveFile(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;

  function writeString(offset, value) {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const sample = clamp(samples[i], -1, 1);
    view.setInt16(offset, sample * 32767, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav"});
}

function generateAudioFile(level) {
  const spec = level.audioSpec;
  const duration = spec.duration;
  const totalSamples = Math.floor(duration * SAMPLE_RATE);
  const samples = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const time = i / SAMPLE_RATE;
    let mix = 0;

    mix += renderKick(time, spec.bpm, spec.kickPattern);
    mix += renderSnare(time, i, spec.bpm, spec.snarePattern);
    mix += renderHat(time, i, spec.bpm, spec.hatPattern);
    mix += renderSequenceVoice(
      time,
      spec.bpm,
      spec.bassPattern,
      spec.bassStepsPerBeat,
      spec.bassWave,
      spec.bassMix,
      -12,
    );
    mix += renderSequenceVoice(
      time,
      spec.bpm,
      spec.leadPattern,
      spec.leadStepsPerBeat,
      spec.leadWave,
      spec.leadMix,
    );
    mix += renderPadVoice(time, spec.bpm, spec.padBars, spec.padMix);

    const shaped = Math.tanh(mix * spec.drive) * 0.68;
    samples[i] = shaped;
  }

  const blob = buildWaveFile(samples, SAMPLE_RATE);
  if (typeof File === "function") {
    return new File([blob], `${level.id}.wav`, { type: "audio/wav" });
  }

  blob.name = `${level.id}.wav`;
  return blob;
}

function waitForAudioReady(audio) {
  if (audio.readyState >= 2) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Audio failed to load"));
  };
  const cleanup = () => {
    audio.removeEventListener("loadedmetadata", onReady);
    audio.removeEventListener("canplaythrough", onReady);
    audio.removeEventListener("error", onError);
  };

  audio.addEventListener("loadedmetadata", onReady);
  audio.addEventListener("canplaythrough", onReady);
  audio.addEventListener("error", onError);
  
  audio.load();
});
}

function annotateChords(notes) {
  let groupId = 0;

  for (let start = 0; start < notes.length; ) {
    let end = start + 1;
    while (
      end < notes.length &&
      Math.abs(notes[end].time - notes[start].time) <= SETTINGS.chordTimeTolerance
    ) {
      end += 1;
    }

    const chordNotes = notes.slice(start, end);
    const lanes = chordNotes.map((note) => note.lane);
    const minLane = Math.min(...lanes);
    const maxLane = Math.max(...lanes);
    
    for (let index = start; index < end; index++) {
      notes[index].chordGroup = groupId;
      notes[index].chordSize = chordNotes.length;
      notes[index].chordMinLane = minLane;
      notes[index].chordMaxLane = maxLane;
    }

    groupId += 1;
    start = end;
  }

  return notes;
}

function createMulticolorGradient(ctx, startX, endX, varient = "body", alpha = 1) {
  const gradient = ctx.createLinearGradient(startX, 0, endX, 0);
  const channel = varient === "glow" ? "glow" : "body";

  gradient.addColorStop(0, rgba(LANE_PALETTES[0][channel], alpha));
  gradient.addColorStop(0.28, rgba(LANE_PALETTES[1][channel], alpha));
  gradient.addColorStop(0.68, rgba(LANE_PALETTES[1][channel], alpha));
  gradient.addColorStop(1, rgba(LANE_PALETTES[3][channel], alpha));

  return gradient;
}

function easeOutSquared(value) {
  const clamped = clamp(value, 0, 1);
  return 1 - (1 - clamped) * (1 - clamped);
}

function cloneBeatmap(beatmap) {
  const notes = beatmap
    .map((note, index) => {
      const duration = note.type === "hold" ? note.duration : 0;
      return {
        id: index,
        lane: note.lane,
        type: note.type,
        time: note.time,
        duration,
        endTime: note.time + duration,
        resolved: false,
        counted: false,
        headHit: false,
        holding: false,
        resolvedAt: -1,
        exitState: null,
        hitOriginY: null,
        chordGroup: -1,
        chordSize: 1,
        chordMinLane: note.lane,
        chordMaxLane: note.lane,
      };
    })
    .sort((a, b) => a.time - b.time || a.lane - b.lane);
  return annotateChords(notes);
}

function createLaneFeedbackState() {
  return Array.from({ length: SETTINGS.laneCount }, () => ({
    judgement: "",
    until: 0,
  }));
}

function getChartEnd(beatmap) {
  return beatmap.reduce((max, note) => {
    const endTime = note.type === "hold" ? note.time + note.duration : note.time;
    return Math.max(max, endTime);
  }, 0)
}

class BeatTapper {
  constructor() {
    this.refs = {
      screens: {
        main: document.getElementById("main-menu"),
        select: document.getElementById("song-select"),
        game: document.getElementById("game-container"),
        results: document.getElementById("result-screen"),
      },
      playButton: document.getElementById("btnPlay"),
      songList: document.getElementById("songsList"),
      score: document.getElementById("comboWrap"),
      judgement: document.getElementById("judgement"),
      canvas: document.getElementById("gameCanvas"),
      laneFrame: document.getElementById("lane-frame"),
      keySlots: [...document.querySelectorAll(".key-slot")],
      errorLanes: [...document.querySelectorAll(".error-lane")],
      errorMarkers: document.getElementById("errorMarkers"),
      resultsScore: document.getElementById("resultsScore"),
      resultsCombo: document.getElementById("resultsCombo"),
      backToMenu: document.getElementById("btnBackToMenu"),
    };

    this.ctx = this.refs.canvas.getContext("2d");
    this.metrics = {
      width: 0,
      height: 0,
      dpr: 1,
      laneWidth: 0,
      noteWidth: 0,
      noteHeight: SETTINGS.noteHeight,
      hitLineY: 0,
      pixelsPerSecond: 0,
    };

    this.state = {
      prepared: false,
      preparing: null,
      playing: false,
      audio: null,
      notes: [],
      laneQueues: Array.from({ length: SETTINGS.laneCount }, () => []),
      lanePointers: new Array(SETTINGS.laneCount).fill(0),
      activeHolds: new Array(SETTINGS.laneCount).fill(null),
      laneActive: new Array(SETTINGS.laneCount).fill(false),
      laneFeedback: createLaneFeedbackState(),
      pressedKeys: new Set(),
      renderStartIndex: 0,
      score: 0,
      combo: 0,
      maxCombo: 0,
      resolvedNotes: 0,
      lastObjectTime: 0,
      hitEffects: [],
      
    };

    this.loop = this.loop.bind(this);
    this.handleResize = this.handleResize.bind(this);
  }

  init() {
    this.bindEvents();
    this.showScreen("main");
    this.resizeCanvas();
    requestAnimationFrame(this.loop);
    window.setTimeout(() => {
      this.prepareLevels().catch(() => {
        this.refs.playButton.textContent = "Play";
      });
    }, 40);
  }


  bindEvents() 
  {
    this.refs.playButton.addEventListener("click", async () => {
      this.refs.playButton.disabled = true;
      this.refs.playButton.textContent = "Loading";
      try {
        await this.prepareLevels();
        this.refs.playButton.textContent = "Play";
        this.showScreen("select");
        this.renderSongList();
      } finally {
        this.refs.playButton.disabled = false;
      }
    });

    this.refs.backToMenu.addEventListener("click", () => {
      this.stopAudio();
      this.resetKeyStates();
      this.showScreen("main");
    });

    window.addEventListener("keydown", (event) => this.onKeyDown(event));
    window.addEventListener("keyup", (event) => this.onKeyUp(event));
    window.addEventListener("blur", () => this.releaseAllKeys());
    window.addEventListener("resize", this.handleResize);

    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
      this.resizeObserver.observe(this.refs.laneFrame);
    }

  }

  async prepareLevels() {
    if (this.state.prepared) {
      return;
    }

    if (this.state.preparing) {
      await this.state.preparing;
      return;
    }

    this.state.preparing = (async () => {
      for (const level of LEVELS) {
        if (level.audioUrl) {
          continue;
        }

        const file = generateAudioFile(level);
        level.audioUrl = URL.createObjectURL(file);
        level.lastObjectTime = getChartEnd(level.beatmap);
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }

      this.state.prepared = true;
      this.renderSongList ();
    })();

    try {
      await this.state.preparing;
    } finally {
      this.state.preparing = null;
    }
    }
  
  renderSongList() {
    this.refs.songList.innerHTML = "";
    
    LEVELS.forEach((level) => {
      const button = document.createElement("button");
      button.type = "button";
      button.innerHTML = `<strong>${level.title}</strong>`;
      button.addEventListener("click", () => {
        this.startLevel(level.id).catch(() => {
          this.showScreen("main");
        });
      });
      this.refs.songList.appendChild(button);
    });
  }

  async startLevel(levelId) {
    const level = LEVELS.find((item) => item.id === levelId);
    if (!level) { 
      return;
    }

    await this.prepareLevels();
    this.stopAudio();
    this.resetKeyStates();
    const audio = new Audio(level.audioUrl);
    audio.preload = "auto";
    audio.volume = 0.92;
    await waitForAudioReady(audio);

    const notes = cloneBeatmap(level.beatmap);
    const laneQueues = Array.from({ length: SETTINGS.laneCount }, () => []);
    notes.forEach((note) => {
      laneQueues[note.lane].push(note);
    });

    this.state.audio = audio;
    this.state.notes = notes;
    this.state.laneQueues = laneQueues;
    this.state.lanePointers = new Array(SETTINGS.laneCount).fill(0);
    this.state.activeHolds = new Array(SETTINGS.laneCount).fill(null);
    this.state.renderStartIndex = 0;
    this.state.score = 0;
    this.state.combo = 0;
    this.state.maxCombo = 0;
    this.state.resolvedNotes = 0;
    this.state.lastObjectTime = level.lastObjectTime;
    this.state.hitEffects = [];
    this.state.playing = true;
    this.updateHud();
    this.clearJudgement();
    this.clearErrorMarkers();
    this.showScreen("game")
    this.resizeCanvas()

    audio.currentTime = 0;
    await audio.play();
  }

  stopAudio() {
    if (!this.state.audio) {
      return;
    }

    this.state.audio.pause();
    this.state.audio.currentTime = 0;
    this.state.audio = null;
    this.state.playing = false;
  }

  showScreen(screen) {
    this.refs.screens.main.hidden = screen !== "main";
    this.refs.screens.select.hidden = screen !== "select";
    this.refs.screens.game.hidden = screen !== "game";
    this.refs.screens.results.hidden = screen !== "results";
  }

  onKeyDown(event) {
    if (event.code === "Escape" && this.state.playing) {
      this.stopAudio();
      this.resetKeyStates();
      this.showScreen("main");
      return;
    }

    const lane = KEY_TO_LANE[event.code];
    if (lane == null) {
      return;
    }

    event.preventDefault();
    if (this.state.pressedKeys.has(event.code)) {
      return;
    }

    this.state.pressedKeys.add(event.code);
    this.state.laneActive[lane] = true;
    this.renderKeyStates();

    if (!this.state.playing || !this.state.audio) {
      return;
    }

    const activeHold = this.state.activeHolds[lane];
    if (activeHold) {
      return;
    }

    const currentTime = this.state.audio.currentTime;
    const note = this.peekLaneNote(lane);
    if (!note) {
      return;
    }
    if (activeHold) {
       return;
    }  
    const offset = currentTime - note.time;
    const judgement = this.classifyOffset(offset);
    if (!judgement) {
       return;
    }

    if (note.type === "hold") {
      this.resolveHoldHead (note, judgement, offset);
    } else {
      this.resolveTap(note, judgement, offset);
    }  
}

onKeyUp(event) {
  const lane = KEY_TO_LANE[event.code];
  if (lane == null) {
    return;
  }

  event.preventDefault();
  this.state.pressedKeys.delete(event.code);
  this.state.laneActive[lane] = false;
  this.renderKeyStates();
  
  if(!this.state.playing || !this.state.audio) {
     return;
  }

  const holdNote = this.state.activeHolds[lane];
  if (!holdNote) {
    return;
  }

  const currentTime = this.state.audio.currentTime;
  const offset = currentTime - holdNote.endTime;
  const judgement = 
      currentTime < holdNote.endTime -JUDGEMENTS.MISS.windowMs / 1000
           ? "MISS"
           : this.classifyOffset(offset) || "MISS";
  this.resolveHoldTail(holdNote, judgement, offset);
}

releaseAllKeys() {
  if (this.state.pressedKeys.size === 0) {
    return;
  }

  const pressed = [...this.state.pressedKeys];
  pressed.forEach((code) => {
    this.onKeyUp({ code, preventDefault () {} });
  });
  this.state.pressedKeys.clear();
}

resetKeyStates() {
     this.state.pressedKeys.clear();
     this.state.laneActive.fill(false);
     this.state.activeHolds.fill(null);
     this.clearLaneFeedback();
     this.renderKeyStates();
}

renderKeyStates() {
     this.refs.keySlots.forEach ((slot, index) => {
         slot.classList.toggle("active", this.state.laneActive[index]);
     });
     this.renderErrorBar(this.state.audio ? this.state.audio.currentTime : 0);
}

clearLaneFeedback() {
  this.state.laneFeedback = createLaneFeedbackState();
  this.refs.errorLanes.forEach((lane) => {
      lane.classList.remove("active", "holding", "flash");
      lane.style.setProperty("--meter-scale", "0.12")
      lane.style.setProperty("--meter-opacity", "0.18");
      delete lane.dataset.judgement;
  });
}

flashErrorLane(lane, judgement) {
     const feedback = this.state.laneFeedback[lane];
     if (!feedback) {
         return;
     }
      feedback.judgement = judgement;
      feedback.until = performance.now() + SETTINGS.laneFlashTime * 1000;
      this.renderErrorBar(this.state.audio ? this.state.audio.currentTime : 0);
}

renderErrorBar(currentTime) {
  const now = performance.now();

  this.refs.errorLanes.forEach((laneElement, index) => {
      const active = this.state.laneActive[index];
      const holdNote = this.state.activeHolds[index];
      const feedback = this.state.laneFeedback[index];
      const flashActive = feedback.until > now && Boolean(feedback.judgement);

      let meterScale = 0.12;
      let meterOpacity = 0.18;

      if (holdNote && this.state.audio) {
         const duration = Math.max(holdNote.duration, 0.001);
         const remaining = clamp((holdNote.endTime - currentTime) / duration, 0, 1);
         meterScale = Math.max(0.08, remaining);
         meterOpacity =0.92;
      } else if (active) {
          meterScale = 0.82;
          meterOpacity = 0.8;
      } else if (flashActive) {
          const flashProgress = clamp(
            (feedback.until - now) / (SETTINGS.laneFlashTime * 1000),
            0,
            1,
          );
          meterScale = 0.28 + flashProgress * 0.72;
          meterOpacity = 0.26 + flashProgress * 0.54;
      }
      
      laneElement.classList.toggle("active", active);
      laneElement.classList.toggle("holding", Boolean(holdNote));
      laneElement.classList.toggle("flash", flashActive);
      laneElement.style.setProperty("--meter-scale", meterScale.toFixed(3))
      laneElement.style.setProperty("--meter-opacity", meterOpacity.toFixed(3));

      if (flashActive) {
          laneElement.dataset.judgement = feedback.judgement;
      } else {
          delete laneElement.dataset.judgement;
      }
  });
}

classifyOffset(offsetSeconds) {
     const offsetMs = Math.abs(offsetSeconds * 1000);
     if (offsetMs <= JUDGEMENTS.PERFECT.windowMs) {
          return "PERFECT";
      }
      if (offsetMs <= JUDGEMENTS.GREAT.windowMs) {
          return "GREAT";
      }
      if (offsetMs <= JUDGEMENTS.GOOD.windowMs) {
        return "GOOD";
      }
      if (offsetMs <= JUDGEMENTS.MISS.windowMs) {
        return "MISS"
      }
      return null;
    }

    peekLaneNote(lane){
      const queue = this.state.laneQueues[lane];
      let pointer = this.state.lanePointers[lane];

      while (pointer < queue.length && queue[pointer].resolved) {
        pointer += 1;
      }

      this.state.lanePointers[lane] = pointer;
      return queue[pointer] || null;
    }

    markedResolved(note) {
      if (!note.counted) {
        note.counted = true;
        this.state.resolvedNotes += 1;
      }
    }

    setNoteExitState(note, exitState) {
      note.exitState = exitState;
      note.resolvedAt = this.state.audio ? this.state.audio.currentTime : note.time;
      note.hitOriginY = exitState === "hit" ? this.timeToY(note.time, note.resolvedAt) : null;
    }

    resolveTap(note, judgement, offset) {
      note.resolved = true;
      this.setNoteExitState(note, judgement === "MISS" ? "miss" : "hit");
      this.markedResolved(note);
      this.registerJudgement(judgement, offset, note.lane);
      this.peekLaneNote(note.lane);
    }

    resolveHoldHead(note, judgement, offset) {
      if(judgement === "MISS") {
        note.resolved = true;
        this.setNoteExitState(note, "miss");
        this.markedResolved(note);
        this.registerJudgement("MISS", offset, note.lane);
        this.peekLaneNote(note.lane);
        return;
      }
      note.headHit = true;
      note.holding = true;
      this.state.activeHolds[note.lane] = note;
      this.registerJudgement(judgement, offset, note.lane);
    }

    resizeCanvas() {
      const rect = this.refs.canvas.getBoundingClientRect();
      this.refs.canvas.width = rect.width;
      this.refs.canvas.height = rect.height;
      this.metrics.width = rect.width;
      this.metrics.height = rect.height;
    }

    handleResize() {
      this.resizeCanvas();
    }

    loop() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.metrics.width, this.metrics.height);
      const laneWidth = this.metrics.width / 4;
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = ["#4f83ff", "#35d4ff", "#ff64be", "#d74bff"][i];
        ctx.fillRect(
          i * laneWidth + 12,
          120 + Math.sin(performance.now() * 0.002 + i) * 80,
          laneWidth - 24,
          20
        );
      }
      requestAnimationFrame(this.loop);
    }

    updateHud() {}
    clearJudgement() {}
    clearErrorMarkers() {}
    registerJudgement() {}

    timeToY() {
      return 0;
    }

    resolveHoldTail() {}

}

const game = new BeatTapper();
game.init();