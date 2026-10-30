# BEYOND BARRIERS ?" INCLUSIVE VR SPORTS

> **A Complete, Playable, Accessible 3D VR & Desktop Sports Experience**  
> Designed for wheelchair users, seated athletes, one-handed players, players with limited arm mobility, and sports enthusiasts of all physical abilities.

---

## 🌟 Project Vision & Core Principles

**Beyond Barriers** was built from scratch to eliminate physical barriers in virtual reality sports. Rather than requiring players to stand, walk across a room, jump, or perform rapid two-handed arm swings, Beyond Barriers translates accessible inputs into genuine, physics-driven athletic gameplay.

- **100% Real Playable Experience**: Real 3D physics, collision detection, and scoring across all 6 sports ? not static mockups or placeholder buttons.
- **Seated & Wheelchair First**: Camera height calibrated to 1.25m seated eye level, keeping all interactive elements within a comfortable forward cone of vision.
- **No External Asset Dependencies**: All 3D geometry, court markings, backboards, nets, targets, balls, pins, rackets, and textures are generated procedurally with local Three.js (r128). Runs flawlessly offline and in isolated networks.
- **Universal Cross-Platform**: Usable immediately in any desktop or laptop browser (Chrome, Edge, Firefox, Safari) using mouse, keyboard, or gamepad, with native **WebXR Immersive VR** support for Meta Quest and PCVR headsets.

---

## 🏟️ The 6 Playable Sports

Every sport has its own unique 3D court, custom equipment, real ballistics/mechanics, practice mode, challenge mode, and feedback loops:

| Sport | Primary Objective | Mechanics & Physics | Scoring Rules |
| :--- | :--- | :--- | :--- |
| **🏀 Basketball** | Shoot basketball cleanly through the regulation hoop & backboard | Ballistic projectile trajectory ($g = 9.8\text{ m/s}^2$), backboard rebound collision, rim torus detection, swish pass detection | **100 PTS** (Swish bonus), **75 PTS** (Bank shot), Streak multipliers |
| **⚽ Football / Soccer** | Strike penalty kicks into the goal & corner target discs | Aerodynamic ball curve, crossbar & post collision, net rippling, target disc impact checks | **100 PTS** (Top corners), **50 PTS** (Bottom corners & Goal), **+10/streak** |
| **🎾 Tennis** | Return incoming serves over the 0.92m net into court targets | Automated ball launcher machine, assisted timing strike window, racket swing animation, boundary detection | **100 PTS** (Deep corners), **60 PTS** (Center box), In/Out calls |
| **🏸 Badminton** | Clear high 1.52m net with smashes and drop shots | Aerodynamic air drag ($0.97\text{x}$ decay factor), cork/feather shuttlecock orientation along velocity | **100 PTS** (Deep corners), **70 PTS** (Drop zone), Court boundaries |
| **🎳 Bowling** | Roll ball down hardwood lane to knock down all 10 pins | Ball-lane friction, gutter channels, 10-pin triangle rack, ball-pin & pin-to-pin chain reaction physics | **200 PTS** (Strike / 10 pins), **15 PTS / pin**, Gutter detection |
| **🏹 Archery** | Draw bowstring and land arrows into the gold bullseye | Bow draw tension, parabolic arrow drop, arrow sticking physics into target at exact coordinates | **100 PTS** (Gold Bullseye), **80 PTS** (Red), **60 PTS** (Blue), **40** (Black), **20** (White) |

---

## ♿ Comprehensive Accessibility Architecture

1. **Seated / Wheelchair Mode**:
   - Ergonomically adjusts camera height from 1.68m (standing) to 1.25m (seated).
   - Keeps court targets within a comfortable forward field of view ($-10^\circ$ to $+20^\circ$).
   - Never forces the player to step, walk, jump, or reach overhead.
2. **One-Handed Play**:
   - All essential actions (aiming, charging, shooting, pausing, retrying) can be performed using a single input method (one mouse hand, one gamepad thumbstick + trigger, or single touchscreen tap).
3. **Simplified Motion (Tap & Hold / Auto-Oscillation)**:
   - Eliminates rapid physical swings or prolonged holds.
   - Tap once to begin power meter oscillation; tap again to release with desired power.
4. **Adjustable Aim Assistance**:
   - **High**: Full 3D dashed trajectory arc + gentle target angle magnetism.
   - **Medium**: 3D trajectory guide arc.
   - **Low**: Subtle visual guide.
   - **Off**: Full manual simulation.
5. **Adjustable Difficulty**:
   - **Beginner**: Generous target sizes ($1.6\times$), wide timing windows (1000ms), strong magnetism.
   - **Intermediate**: Standard regulation targets ($1.25\times$), 650ms timing windows.
   - **Advanced**: Realistic strict targets ($1.0\times$), 400ms timing windows.
6. **High Contrast Mode**:
   - Switches UI to deep pure blacks (`#000000`), radiant yellow borders (`#ffff00`), and pure white text.
7. **Text Size Scaling**:
   - Scales typography seamlessly across Normal (16px), Large (18px), and Extra Large (21px).
8. **Audio & Visual Feedback**:
   - Synthesized Web Audio API sound effects: basketball swish, backboard thud, football kick punch, goal horn, tennis racket pop, shuttlecock snap, bowling pin crash, archery bullseye chime.
   - Celebratory 3D particle bursts, floating point banners, and focus rings.
9. **Comfort Rest Reminders**:
   - Built-in timer (5, 10, or 15 minutes) displaying gentle stretch and eye relaxation breaks.
10. **Screen Reader & Spoken Announcements**:
    - Full ARIA live regions (`aria-live="polite"` and `aria-live="assertive"`) and optional Text-to-Speech audio announcements.

---

## 🎮 Controls Reference

| Action | Desktop (Mouse + Keyboard) | Gamepad | Meta Quest / WebXR Controller | Touchscreen / Mobile |
| :--- | :--- | :--- | :--- | :--- |
| **Aim** | Move Mouse or `Arrow Keys` / `WASD` | Left Thumbstick | Controller Ray Direction | Drag on screen |
| **Primary Action** (Shoot / Kick / Swing / Roll / Release) | Left Click (Hold & Release) or `Space` / `Enter` | Button 0 (`A` / `Cross`) | Index Trigger | Tap Big Action Button |
| **Retry / Reset Shot** | `R` key or On-screen button | Button 2 (`X` / `Square`) | ? | Tap HUD `RETRY` button |
| **Pause / Resume** | `P` or `Escape` key | Button 9 (`Start`) | Grip Squeeze | Tap HUD `PAUSE` button |
| **Switch Mode** (Practice ↔ Challenge) | Click HUD Mode Button | ? | ? | Tap HUD Mode Button |

---

## 🚀 How to Launch and Test

### Method 1: One-Click Desktop Launcher
Double-click `Launch_Game.bat` inside the project folder:
```cmd
Launch_Game.bat
```
This automatically starts the local server on `http://localhost:8080/` and launches your default browser.

### Method 2: PowerShell Server
Run PowerShell in the project directory:
```powershell
powershell -ExecutionPolicy Bypass -File .\server.ps1
```
Open `http://localhost:8080/` in Google Chrome or Microsoft Edge.

### Method 3: Testing on Meta Quest 2 / 3 / Pro
1. Connect your PC and Meta Quest headset to the same Wi-Fi network.
2. Launch `server.ps1`. The server console will print your local network IP (e.g. `http://192.168.1.15:8080/`).
3. Put on your Meta Quest headset, open the **Meta Quest Browser**, and type that URL into the address bar.
4. On the welcome screen or sports arena, click the **🥽 ENTER VR** button to step directly into the inclusive 3D sports stadium!
