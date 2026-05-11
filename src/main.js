const SETTINGS = {
  laneCount: 4,
  approachTime: 1.35,
  hitLineOffset: 86,
  noteHeight: 26,
  noteWidthRatio: 0.72,
  scorePad: 8,
  chordTimeTolerance: 0.0005,
  hitSnapTime: 0.055,
  hitAnimationTime: 0.22,
  missFadeTime: 0.22,
  missExitTime: 0.5,
  laneFlashTime: 0.26,
  effectDurations: {
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
  leadStepsPerBeat: 2,
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
  tap(1.45, 2),
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
      if (!keepHolds) {
        selectedNotes = selectedNotes.filter((note) => note.type !== "hold");
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
    keepFirstGroups: 8,
  },
  {
    number: 4,
    bpm: 128,
    keepPattern: [1, 1, 1, 0, 1], 
    holdPattern: [1, 1, 0, 1],
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
  title: `Level ${config.number}`,
  audioSpec: buildLevelAudioSpec(LEVEL_AUDIO_SPEC, config.bpm),
  beatmap:
    config.number === 5
      ? LEVEL_BEATMAP.map((note) => ({ ...note }))
      : buildProgressiveBeatmap(LEVEL_BEATMAP, config),
}));

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function easeOutSquared(progress) {
  const clamped = clamp(progress, 0, 1);
  return 1 - (1 - clamped) * (1 - clamped);
}

function rgba(rgb, alpha) {
  return `rgba(${rgb}, ${alpha})`;
}

function midiToFrequency(midi) {
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
  const x = Math.sin(seed * 12.9898 + seed * 0.1234) * 43758.5453123;
  return (x - Math.floor(x)) * 2 - 1;
}

function envelope(localTime, attack, decay) {
  if (localTime < 0) {
    return 0;
  }
  const attackShape = attack <= 0 ? 1 : clamp(localTime / attack, 0, 1);
  return attackShape * Math.exp(-localTime / decay);
}

function renderSequenceVoice(time, bpm, pattern, stepsPerBeat, wave, mix, transpose = 0) {
  const stepDuration = (60 / bpm) / stepsPerBeat;
  const stepIndex = Math.floor(time / stepDuration);
  const midi = pattern[stepIndex % pattern.length];
  if(midi == null || midi < 0) {
    return 0;
  }

  const localTime = time - stepIndex * stepDuration;
  const frequency = midiToFrequency(midi + transpose);
  const amp = envelope(localTime, stepDuration * 0.08, stepDuration * 0.9);
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
    const frequency = midiToFrequency(chord[i]);
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
  const beatDuration = 60 / bpm;
  const beatIndex = Math.floor(time / beatDuration);
  const localTime = time - beatIndex * beatDuration;
  if (!pattern[beatIndex % pattern.length] || localTime > 0.16) {
    return 0;
  }

  const tone = Math.sin(TAU * 180 * localTime) * Math.exp(-localTime * 18) * 0.25;
  const burst = pseudoNoise(sampleIndex + beatIndex * 101) * Math.exp(-localTime * 34) * 0.55;
  return tone + burst;
}

function renderHat(time, sampleIndex, bpm, pattern) {
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

    const chordSize = end - start
    
    
    for (let index = start; index < end; index++) {
      notes[index].chordGroup = groupId;
      notes[index].chordSize = chordSize;
    }

    groupId += 1;
    start = end;
  }

  return notes;
}

function createMulticolorGradient(ctx, startX, endX, variant = "body", alpha = 1) {
  const gradient = ctx.createLinearGradient(startX, 0, endX, 0);
  const channel = variant === "glow" ? "glow" : "body";

  gradient.addColorStop(0, rgba(LANE_PALETTES[0][channel], alpha));
  gradient.addColorStop(0.28, rgba(LANE_PALETTES[1][channel], alpha));
  gradient.addColorStop(0.68, rgba(LANE_PALETTES[2][channel], alpha));
  gradient.addColorStop(1, rgba(LANE_PALETTES[3][channel], alpha));

  return gradient;
}

function cloneBeatmap(beatmap) {
  const notes = beatmap
    .map((note) => {
      const duration = note.type === "hold" ? note.duration : 0;
      return {
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
      score: document.getElementById("score"),
      combo: document.getElementById("combo"),
      comboWrap: document.getElementById("comboWrap"),
      judgement: document.getElementById("judgement"),
      canvas: document.getElementById("gameCanvas"),
      laneFrame: document.getElementById("lane-frame"),
      keySlots: [...document.querySelectorAll(".key-slot")],
      errorLanes: [...document.querySelectorAll(".error-lane")],
      errorMarkers: document.getElementById("errorMarkers"),
      resultScore: document.getElementById("resultScore"),
      resultCombo: document.getElementById("resultCombo"),
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
    this.showScreen("game");
    this.resizeCanvas();
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
    
    const offset = currentTime - note.time;
    const judgement = this.classifyOffset(offset);
    if (!judgement) {
       return;
    }

    if (note.type === "hold") {
      this.resolveHoldHead (note, judgement, offset, currentTime);
    } else {
      this.resolveTap(note, judgement, offset, currentTime);
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
  this.resolveHoldTail(holdNote, judgement, offset, currentTime);
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
      lane.style.setProperty("--meter-scale", "0.12");
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
      laneElement.style.setProperty("--meter-scale", meterScale.toFixed(3));
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
        return "MISS";
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

    markResolved(note) {
      if (!note.counted) {
        note.counted = true;
        this.state.resolvedNotes += 1;
      }
    }

    getCurrentTime() {
      return this.state.audio ? this.state.audio.currentTime : 0;
    }

    setNoteExitState(note, exitState, atTime) {
      note.exitState = exitState;
      note.resolvedAt = this.state.audio ? this.state.audio.currentTime : note.time;
      note.hitOriginY = this.timeToY(note.time, note.resolvedAt);
    }

    resolveTap(note, judgement, offset) {
      note.resolved = true;
      this.setNoteExitState(note, judgement === "MISS" ? "miss" : "hit");
      this.markResolved(note);
      this.registerJudgement(judgement, offset, note.lane);
      this.peekLaneNote(note.lane);
    }

    resolveHoldHead(note, judgement, offset) {
      if(judgement === "MISS") {
        note.resolved = true;
        this.setNoteExitState(note, "miss");
        this.markResolved(note);
        this.registerJudgement("MISS", offset, note.lane);
        this.peekLaneNote(note.lane);
        return;
      }
      note.headHit = true;
      note.holding = true;
      this.state.activeHolds[note.lane] = note;
      this.registerJudgement(judgement, offset, note.lane);
    }

    resolveHoldTail(note, judgement, offset) {
      note.holding = false;
      note.resolved = true;
      this.setNoteExitState(note, judgement === "MISS" ? "miss" : "hit");
      this.state.activeHolds[note.lane] = null;
      this.markResolved(note);
      this.registerJudgement(judgement, offset, note.lane);
      this.peekLaneNote(note.lane);
    }

    registerJudgement(judgement, offset, lane) {
      if (judgement === "MISS") {
        this.state.combo = 0;
      } else {
        this.state.combo += 1;
        this.state.maxCombo = Math.max(this.state.maxCombo, this.state.combo);
        const comboBonus = Math.max(0, this.state.combo - 1) * 18;
        this.state.score += JUDGEMENTS[judgement].score + comboBonus;
        this.pulseCombo();
      }

      this.showJudgement(judgement);
      this.spawnHitEffect(lane, judgement);
      this.flashErrorLane(lane, judgement);
      this.addErrorMarker(offset, judgement);
      this.updateHud();
    }

    updateHud() {
      this.refs.score.textContent = String(this.state.score).padStart(SETTINGS.scorePad, "0");
      this.refs.combo.textContent = String(this.state.combo);
    }

    pulseCombo() {
      const element = this.refs.comboWrap;
      element.classList.remove("pulse");
      void element.offsetWidth;
      element.classList.add("pulse");
    }

    showJudgement(judgement) {
      const element = this.refs.judgement;
      element.textContent = judgement;
      element.dataset.judgement = judgement;
      element.classList.remove("show");
      void element.offsetWidth;
      element.classList.add("show");
    }

    clearJudgement() {
      this.refs.judgement.textContent = "";
      this.refs.judgement.classList.remove("show");
      delete this.refs.judgement.dataset.judgement;
    }

    spawnHitEffect(lane, judgement) {
      const laneCenter = this.metrics.laneWidth * lane + this.metrics.laneWidth * 0.5;
      this.state.hitEffects.push({
        laneCenter, y: this.metrics.hitLineY, judgement, start: performance.now(), duration: SETTINGS.effectDurations[judgement],
      });
    }

    addErrorMarker(offsetSeconds, judgement) {
      const marker = document.createElement("div");
      marker.className = "error-marker";
      marker.dataset.judgement = judgement;

      const missWindow = JUDGEMENTS.MISS.windowMs;
      const offsetMs = clamp(offsetSeconds * 1000, -missWindow, missWindow);
      const position = 50 + (offsetMs / missWindow) * 46;
      marker.style.left = `${position}%`;
      this.refs.errorMarkers.appendChild(marker);
      marker.addEventListener("animationend", () => marker.remove(), { once: true });
    }

    clearErrorMarkers() {
      this.refs.errorMarkers.innerHTML = "";
    }

    updateGameplay(currentTime) {
      for (let lane = 0; lane < SETTINGS.laneCount; lane++) {
        let note = this.peekLaneNote(lane);

        while (note) {
          if (note.type === "tap") {
            if (currentTime - note.time > JUDGEMENTS.MISS.windowMs / 1000) {
              this.resolveTap(note, "MISS", currentTime - note.time, currentTime);
              note = this.peekLaneNote(lane);
              continue;
            }
            break;
          }

          if (!note.headHit) {
            if (currentTime - note.time > JUDGEMENTS.MISS.windowMs / 1000) {
              this.resolveHoldHead(note, "MISS", currentTime - note.time, currentTime);
              note = this.peekLaneNote(lane);
              continue;
            }
            break;
          }

          if(note.holding && currentTime >= note.endTime) {
            const offset = currentTime - note.endTime;
            const judgement = this.classifyOffset(offset) || "MISS";
            this.resolveHoldTail(note, judgement, offset, currentTime);
            note = this.peekLaneNote(lane);
            continue;
          }

          break;
        }
      }

      const now = performance.now();
      this.state.hitEffects = this.state.hitEffects.filter(
        (effect) => now - effect.start < effect.duration,
      );
      
      if (
        this.state.resolvedNotes >= this.state.notes.length &&
          currentTime >= this.state.lastObjectTime + 0.35
        ) {
          this.finishLevel();
        }
    }

    finishLevel() {
      const finalScore = this.state.score;
      const maxCombo = this.state.maxCombo;

      this.stopAudio();
      this.resetKeyStates();
      this.refs.resultScore.textContent = finalScore.toLocaleString();
      this.refs.resultCombo.textContent = String(maxCombo);
      this.showScreen("results");
    }

    loop() {
      requestAnimationFrame(this.loop);
      if (!this.state.playing || !this.state.audio) {
        return;
      }

      const currentTime = this.state.audio.currentTime;
      this.updateGameplay(currentTime);
      this.renderErrorBar(currentTime);
      this.render(currentTime);
    }

    timeToY(noteTime, currentTime) {
      const delta = noteTime - currentTime;
      return this.metrics.hitLineY - this.metrics.noteHeight - delta * this.metrics.pixelsPerSecond;
    }

    getHitAnimationTop() {
      return this.metrics.hitLineY - this.metrics.noteHeight * 0.5;
    }

    isNoteVisualComplete(note, currentTime) {
      if (!note.resolved) {
        return false;
      }

      if (note.exitState === "hit") {
        if (note.type === "hold") {
          return true;
        }
        return (
          currentTime > note.resolvedAt + SETTINGS.hitSnapTime + SETTINGS.hitAnimationTime
        );
      }

     if (note.exitState === "miss") {
      return currentTime > note.resolvedAt + SETTINGS.missExitTime;
     }
     return true;
    }

    shouldRender(note, currentTime) {
      if (note.resolved) {
        return !this.isNoteVisualComplete(note, currentTime);
      }

      if (note.type === "hold" && note.headHit) {
        return note.endTime >= currentTime - 0.05;
      }

      const lateWindow = JUDGEMENTS.MISS.windowMs / 1000 + 0.04;
      return note.time >= currentTime - lateWindow && note.time <= currentTime + SETTINGS.approachTime + 0.12;
    }

    collectVisibleNotes(currentTime) {
      while (
        this.state.renderStartIndex < this.state.notes.length &&
        this.isNoteVisualComplete(this.state.notes[this.state.renderStartIndex], currentTime)
      ) {
        this.state.renderStartIndex += 1;
      }

      const visible = [];
      const renderLimit = currentTime + SETTINGS.approachTime + 0.12;

      for(let index = this.state.renderStartIndex; index < this.state.notes.length; index++) {
        const note = this.state.notes[index];
        if (!note.resolved && !note.headHit && note.time > renderLimit) {
          break;
        }

        if (this.shouldRender(note, currentTime)) {
          visible.push(note);
        }
      }

      return visible;
    }

    render(currentTime) {
      const ctx = this.ctx;
      const { width, height, laneWidth, noteWidth} = this.metrics;
      ctx.setTransform(this.metrics.dpr, 0, 0, this.metrics.dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      for (let lane = 0; lane < SETTINGS.laneCount; lane++) {
        if (!this.state.laneActive[lane] && !this.state.activeHolds[lane]) {
          continue;
        }

        const palette = LANE_PALETTES[lane];
        ctx.fillStyle = rgba(palette.body, this.state.activeHolds[lane] ? 0.14 : 0.1);
        ctx.fillRect(lane * laneWidth, 0, laneWidth, height);
      }

      const visibleNotes = this.collectVisibleNotes(currentTime);

      for (let i = 0; i < visibleNotes.length; i++) {
        const note = visibleNotes[i];
        const x = note.lane * laneWidth + (laneWidth - noteWidth) / 2;
        if (note.type === "hold") {
          this.drawHoldNote(note, x, currentTime);
        } else {
          this.drawTapNote(note, x, this.getTapRenderY(note, currentTime), this.getTapAnimation(note, currentTime))
        }
      }

      this.drawChordConnectors(visibleNotes, currentTime);
      this.drawHitEffect();
    }

    getTapAnimation(note, currentTime) {
      if (!note.resolved) {
        return {
          alpha: 1, scaleX: 1, scaleY: 1, yOffset: 0, snapProgress: 0,
        };
      }

      if (note.exitState === "hit") {
        const elapsed = Math.max(0, currentTime - note.resolvedAt);
        const snapProgress = clamp(elapsed / SETTINGS.hitSnapTime, 0, 1);
        const popProgress = clamp(
          (elapsed - SETTINGS.hitSnapTime) / SETTINGS.hitAnimationTime, 0, 1,
        );
        return {
          alpha: snapProgress < 1 ? 1 : 1 - popProgress * 0.94,
          scaleX: snapProgress < 1 ? 1 : 1 + popProgress * 0.9,
          scaleY: snapProgress < 1 ? 1: Math.max(0.18, 1 - popProgress * 0.78),
          yOffset: 0, progress: popProgress, snapProgress,
        };
      }

      const progress = clamp(
        (currentTime - note.resolvedAt) / SETTINGS.missFadeTime, 0, 1
      );
      const fade = 1 - easeOutSquared(progress);
      return {
        alpha: fade, scaleX: 1, scaleY: 1, yOffset: 0, progress, snapProgress: 1,
      };
    }
    getHoldAlpha(note, currentTime) {
      if (!note.resolved || note.exitState !== "miss") {
        return 1;
      }

      const progress = clamp(
        (currentTime - note.resolvedAt) / SETTINGS.missFadeTime, 0, 1,
      );
      return 1 - easeOutSquared(progress);
    }

    getTapRenderY(note, currentTime) {
      if (note.resolved && note.exitState === "hit") {
        const animation = this.getTapAnimation(note, currentTime);
        const startY = note.hitOriginY == null ? this.getHitAnimationTop() : note.hitOriginY;
        const lineY = this.getHitAnimationTop();
        return startY + (lineY - startY) * animation.snapProgress;
      }

      if (note.resolved && note.exitState === "miss") {
        if (note.hitOriginY == null) {
          note.hitOriginY = this.timeToY(
            note.time, note.resolvedAt
          );
        }
        return note.hitOriginY;
      }
      return this.timeToY(note.time, currentTime);
    }

    drawChordConnectors(visibleNotes, currentTime) {
      const ctx = this.ctx;
      const { laneWidth, noteWidth, noteHeight, height } = this.metrics;
      const groups = new Map();

      for (let index = 0; index < visibleNotes.length; index++) {
        const note = visibleNotes[index];
        if (note.chordSize < 2) {
          continue;
        }

        if (!groups.has(note.chordGroup)) {
          groups.set(note.chordGroup, []);
        }
        groups.get(note.chordGroup).push(note);
      }

      for (const notes of groups.values()) {
        if (notes.length < 2) {
          continue;
        }

        const ordered = [...notes].sort((a, b) => a.lane - b.lane);
        const lockToHitLine = ordered.some(
          (note) => (note.resolved && note.exitState === "hit") || (note.type === "hold" && note.headHit),
        );
        let alphaSum = 0;
        let ySum = 0;

        for (let index = 0; index < ordered.length; index++) {
          const note = ordered[index];
          const animation = note.type === "tap" ? this.getTapAnimation(note, currentTime) : { alpha: this.getHoldAlpha(note, currentTime), yOffset:0 };
          alphaSum += animation.alpha;
          ySum += lockToHitLine ? this.metrics.hitLineY : this.getTapRenderY(note, currentTime) + animation.yOffset + noteHeight * 0.5;
        }

        const alpha = alphaSum / ordered.length;
        const y = lockToHitLine ? this.metrics.hitLineY : ySum / ordered.length;
        if (alpha <= 0.02 || y < -16 || y > height + 16) {
          continue;
        }

        for (let index = 0; index < ordered.length - 1; index++) {
          const left = ordered[index];
          const right = ordered[index + 1];
          const leftX = left.lane * laneWidth + (laneWidth - noteWidth) / 2 + noteWidth - 2;
          const rightX = right.lane * laneWidth + (laneWidth - noteWidth) / 2 + 2;

          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.lineCap = "round";
          ctx.shadowBlur = 18;
          ctx.shadowColor = rgba("210, 236, 255", alpha * 0.55);
          ctx.strokeStyle = createMulticolorGradient(ctx, leftX, rightX, "glow", 0.98);
          ctx.lineWidth = 10;
          ctx.beginPath();
          ctx.moveTo(leftX, y);
          ctx.lineTo(rightX, y);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = createMulticolorGradient(ctx, leftX, rightX, "body", 0.95);
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(leftX, y);
          ctx.lineTo(rightX, y);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
    drawTapNote(note, x, y, animation = {}) {
      const ctx = this.ctx;
      const { noteWidth, noteHeight, height } = this.metrics;
      const { alpha = 1, scaleX = 1, scaleY = 1, yOffset = 0, snapProgress = 1,} = animation;
      const renderY = y + yOffset;
      if (alpha <= 0 || renderY > height + noteHeight * 2 || renderY + noteHeight < -noteHeight * 2) {
        return;
      }

      const palette = LANE_PALETTES[note.lane];
      const isChord = note.chordSize > 1;
      const isHitGhost = note.resolved && note.exitState === "hit";
      const isMissGhost = note.resolved && note.exitState === "miss";
      const centerX = x + noteWidth * 0.5;
      const centerY = renderY + noteHeight * 0.5;
      const bodyAlpha = isMissGhost ? 0.42 : 0.92;
      const glowAlpha = isMissGhost ? 0.15 : 0.54;
      const baseAlpha = isMissGhost ? 0.28 : 0.82;
      const strokeAlpha = isMissGhost ? 0.18 : 0.95;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(centerX, centerY);
      ctx.scale(scaleX, scaleY);
      ctx.translate(-centerX, -centerY);

      if (isHitGhost && snapProgress >= 1) {
        const flareAlpha = Math.min(1, alpha + 0.12);
        ctx.fillStyle = isChord ? createMulticolorGradient(ctx, x - 16, x + noteWidth + 16, "glow", flareAlpha * 0.32) : rgba(palette.glow, flareAlpha * 0.42);
      } else if (isMissGhost) {
        ctx.shadowBlur = 0;
      }

      const bevel = Math.max(4, Math.floor(noteHeight * 0.26));
        const outerInset = 0.5;
        const centerInset = bevel + 0.5;
        const centerWidth = Math.max(2, noteWidth - bevel * 2 - 1);
        const centerHeight = Math.max(2, noteHeight - bevel * 2 - 1);

      if (isChord) {
        

        ctx.fillStyle = rgba("34, 34, 34", baseAlpha);
        ctx.fillRect(x, renderY, noteWidth, noteHeight);

        ctx.fillStyle = rgba("255, 255, 255", Math.min(0.96, bodyAlpha + 0.06));
        ctx.fillRect(x + 1, renderY + 1, noteWidth - bevel, bevel);
        ctx.fillRect(x + 1, renderY + 1, bevel, noteHeight - bevel);

        ctx.fillStyle = rgba("106, 106, 106", Math.min(0.96, bodyAlpha + 0.04));
        ctx.fillRect(x + 1, renderY + noteHeight - bevel, bevel - 1, bevel - 1);
        ctx.fillRect(x + 1, renderY + noteHeight - bevel, noteWidth - 1, bevel - 1);
        ctx.fillStyle = createMulticolorGradient(
          ctx, x + centerInset, x + noteWidth - centerInset, "body", bodyAlpha,
        );
        ctx.fillRect(x + centerInset, renderY + centerInset, centerWidth, centerHeight);

        ctx.fillStyle = createMulticolorGradient(
          ctx, x + centerInset, x + noteWidth - centerInset, "glow", glowAlpha,
        );
        ctx.fillRect(x + centerInset, renderY + centerInset, centerWidth, Math.max(2, centerHeight * 0.34));
      
    }
      else {
        ctx.fillStyle = rgba(palette.body, bodyAlpha);
        ctx.fillRect(x, renderY, noteWidth, noteHeight);
        ctx.fillStyle = rgba(palette.glow, glowAlpha);
        ctx.fillRect(x + 4, renderY + 4, noteWidth - 8, Math.max(2, noteHeight * 0.34));
      
    }
    
      ctx.strokeStyle = rgba("0, 0, 0", strokeAlpha);
      ctx.lineWidth = 1;
      ctx.strokeRect(x + outerInset, renderY + outerInset, noteWidth - 1, noteHeight - 1);
      ctx.strokeStyle = rgba("255, 255, 255", Math.min(0.86, strokeAlpha));
      ctx.beginPath();
      ctx.moveTo(x + 1.5, renderY + noteHeight - 1.5);
      ctx.lineTo(x + 1.5, renderY + 1.5);
      ctx.lineTo(x + noteWidth - 1.5, renderY + 1.5);
      ctx.stroke();
      ctx.strokeStyle = rgba("24, 24, 24", Math.min(0.92, strokeAlpha));
      ctx.beginPath();
      ctx.moveTo(x + noteWidth - 1.5, renderY + 1.5);
      ctx.lineTo(x + noteWidth - 1.5, renderY + noteHeight - 1.5);
      ctx.lineTo(x + 1.5, renderY + noteHeight - 1.5);
      ctx.stroke();
      
      ctx.restore();
    }

    drawHoldNote(note, x, currentTime) {
      const ctx = this.ctx;
      const { width, noteWidth, noteHeight, hitLineY, height } = this.metrics;
      const palette = LANE_PALETTES[note.lane];
      const alpha = this.getHoldAlpha(note, currentTime);
      const isMissGhost = note.resolved && note.exitState === "miss";
      if (alpha <= 0) { return; }
      const headTop = this.timeToY(note.time, currentTime);
      const tailTop = this.timeToY(note.endTime, currentTime);
      if (tailTop > height + noteHeight || headTop < -noteHeight * 2) { return; }
      const bodyTop = tailTop + noteHeight * 0.44;
      const bodyBottom = headTop + noteHeight * 0.56;
      const bodyHeight = bodyBottom - bodyTop;
      const clipAtLine = note.headHit && (!note.resolved || note.exitState !== "miss");
      if (clipAtLine) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, width, hitLineY); ctx.clip();
      }

      if (bodyHeight > 0) {
        ctx.fillStyle = note.chordSize > 1 ? createMulticolorGradient( ctx, x + noteWidth * 0.18, x + noteWidth * 0.82, "body", isMissGhost ? alpha * 0.22 : alpha * (note.headHit ? 0.32 : 0.24),
      ) : rgba(palette.body, isMissGhost ? alpha * 0.22 : alpha * (note.headHit ? 0.32 : 0.24));
      ctx.fillRect(x + noteWidth * 0.18, bodyTop, noteWidth * 0.64, bodyHeight);
      ctx.fillStyle = note.chordSize > 1 ? createMulticolorGradient( ctx, x + noteWidth * 0.24, x + noteWidth * 0.76, "glow", isMissGhost ? alpha * 0.14 : alpha * (note.headHit ? 0.22 : 0.12),
    ) : rgba(palette.glow, isMissGhost ? alpha * 0.14 : alpha * (note.headHit ? 0.22 : 0.12));
    ctx.fillRect(x + noteWidth * 0.24, bodyTop, noteWidth * 0.52, bodyHeight);
      }
      this.drawTapNote(note, x, tailTop, { alpha });
      this.drawTapNote(note, x, headTop, { alpha });

      if (clipAtLine) {
        ctx.restore();
        ctx.fillStyle = note.chordSize > 1 ? createMulticolorGradient(ctx, x - 1, x + noteWidth + 1, "glow", 0.22) : rgba(palette.glow, 0.22);
        ctx.fillRect(x - 1, hitLineY - 3, noteWidth + 2, 6);
        ctx.fillStyle = note.chordSize > 1 ? createMulticolorGradient( ctx, x + noteWidth * 0.16, x + noteWidth * 0.84, "body", 0.16,
        ) : rgba(palette.body, 0.16);
        ctx.fillRect(x + noteWidth * 0.16, hitLineY - noteHeight * 0.28, noteWidth * 0.68, noteHeight * 0.28);
      }
    }

    drawHitEffect() {
      const ctx = this.ctx;
      const now = performance.now();
      for (let i = 0; i < this.state.hitEffects.length; i++) {
        const effect = this.state.hitEffects[i];
        const age = (now - effect.start) / effect.duration;
        if (age >= 1) { continue; }
        const style = JUDGEMENTS[effect.judgement];
        const alpha = 1 - age;
        const radius = effect.judgement === "PERFECT" ? 22 + age * 32 : effect.judgement === "GREAT" ? 18 + age * 24 : effect.judgement === "GOOD" ? 14 + age * 18 : 10 + age * 10;

        const burstWidth = effect.judgement === "PERFECT" ? 72 : effect.judgement === "GREAT" ? 54 : effect.judgement === "GOOD" ? 38 : 22;

        ctx.strokeStyle = rgba(style.rgb, alpha * 0.82);
        ctx.lineWidth = effect.judgement === "MISS" ? 2 : 3;
        ctx.beginPath();
        ctx.arc(effect.laneCenter, effect.y, radius, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = rgba(style.rgb, alpha * (effect.judgement === "MISS" ? 0.14 : 0.22));
        ctx.fillRect(
          effect.laneCenter - burstWidth * (0.5 + age * 0.12),
          effect.y - 4, burstWidth * (1 + age * 0.24), 8,
        );
      }
    }
    handleResize() {
      this.resizeCanvas();
    }

    resizeCanvas() {
      const rect = this.refs.laneFrame.getBoundingClientRect();
      if (!rect.width || !rect.height) { return; }
    
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.metrics.dpr = dpr;
    this.metrics.width = Math.floor(rect.width);
    this.metrics.height = Math.floor(rect.height);
    this.metrics.laneWidth = this.metrics.width / SETTINGS.laneCount;
    this.metrics.noteWidth = this.metrics.laneWidth * SETTINGS.noteWidthRatio;
    this.metrics.noteHeight = SETTINGS.noteHeight;
    this.metrics.hitLineY = this.metrics.height - SETTINGS.hitLineOffset;
    this.metrics.pixelsPerSecond = (this.metrics.hitLineY + this.metrics.noteHeight + 28) / SETTINGS.approachTime;
    this.refs.canvas.width = this.metrics.width * dpr;
    this.refs.canvas.height = this.metrics.height * dpr;
    this.refs.canvas.style.width = `${this.metrics.width}px`;
    this.refs.canvas.style.height = `${this.metrics.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}

const game = new BeatTapper();
game.init();
