# BeatTapper Game

![BeatTapper Logo](https://github.com/Sudo-Aju/BeatTapper/blob/main/Assets/logo1.png)

> A fast, retro themed rhythm arcade game built with vanilla JavaScript and HTML5 Canvas.

[View Source](src/main.js) . [Open Demo](https://sudo-aju.github.io/BeatTapper/src/index.html)

---

## Table of Content

[About](#about)
[Features](#features)
[How to Play](#how-to-play)
[Controls](#controls)
[Gallery](#gallery)

---

## About

BeatTapper is a responsive rhythm game for four-lane gameplay. Players hit falling notes in time with the beat using the keys `A`, `S`, `D`, `F`. The game is optimized for smooth animation, precise judgement, and quick visual feedback.

This game's UI and overall theme is inspired by WIN95's retro UI, with a clean playfield, dynamic hold notes, and a combo + judgement scoring system.

---

## Features

Responsive four-lane canvas
Precise timing judgement for PERFECT / GREAT / GOOD / MISS
Real-time lane flashes and visual hit feedback
Combo counter and score tracking
Built with vanilla JavaScript
Optimized `requestAnimationFrame` loop for smooth 60 FPS gameplay
Modular beatmap and note generation system (Meaning you can make your own map if you want 🤓)

---

## How to Play

Click on the link given in about page of the repositery.
Wait for the game to begin.
Press the correct key when a note crosses the hit line.
Hold `A`, `S`, `D`, `F` for sustained hold notes until they complete.
Score points for timing accuracy and keep the combo alive.

---

## Controls

`A` = Lane 1
`S` = Lane 2
`D` = Lane 3
`F` = Lane 4

> Notes fall vertically, and the hit line is the timing window for jusgement.

---

## Gallery

| Gameplay | Main Menu | Levels |
|----|---|---|
| ![Gameplay Screenshot](https://github.com/Sudo-Aju/BeatTapper/blob/main/Assets/Gallery/screenshot-1.png) | ![Intro](https://github.com/Sudo-Aju/BeatTapper/blob/main/Assets/Gallery/screenshot-2.png) | ![Level](https://github.com/Sudo-Aju/BeatTapper/blob/main/Assets/Gallery/screenshot-3.png) |

---

## AI Usage

### Tools Used
- Vs Code Copilot
- Claude
- Codex

### AI-assisted tasks
- Fixed gameplay bugs and rendering issues
- identified typos and redundant code
- Added defensive programming practices including:
  - null checks
  - Value clamping
  - state handling improvements
  - helper function refactoring
- simplified and cleaned up existing code
- Removed unnecessary animatons
- Added saftey checks to reduce runtime errors

### Example Prompts
- `"teh notes are invisible in the starting and then repears after the line, the notes are still not appearing in the starting, fix it."`
- `"remove all animations, also the flying ones after line."`
- `"remove all redundant code or anything wihch is not needed."`
- `"please add security checks, Make sure the code doesn't break."`

---

## Want to Help?

Submit bug fixes or gameplay improvements.
Add new beatmpas, audio, or visual effects.
Enhance the UI with score metrics, level select or multidevice support.

---

Made with HTML5 Canvas, vanilla JavaScript, and a passion for rhytm games.

With love ~ Azmeer Pirani ❤️
