# BeatTapper Game

Beat Tapper is a minimalist rythm arcade engine built with vanilla javascript and html5 canvas. it features a responsive four lane playfield designed for high performace and precise input handling. notes fall down the screen and you catch them using the keys A S D and F.

---

## core engine features
---
the game was built using a custom engine based on html5 and javascript:

 it features a responsive four lane playfield that scales to any window size. the system includes a real time collision engine that uses a judgement widnow to calcualte it precision. i implemented procedural note generation to create continues stream of gameplay. visual feedbakc is provided thorugh lane flashes and a centered judgement ui that shows perfect and miss indicators. the game tracks player performance with a score system and a combo counter that resets when a note falls off the screen. i used an object oriented approach to manage notes anda. request animation frame loop to maintain 60 frams per second gameplay.

---

## technical architecture

#### rendering and performance
the engine uses the requestanimationframe api to sync gamepaly with the display refresh rate.
