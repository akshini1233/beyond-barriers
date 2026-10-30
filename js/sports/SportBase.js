/**
 * BEYOND BARRIERS - INCLUSIVE VR SPORTS
 * Reusable Sport Base Class
 * Standardizes match timing, dual-team live scoreboards, passing, rebounds, turnovers, and win/loss states.
 */

class SportBase {
  constructor(arena, options = {}) {
    this.arena = arena;
    this.scene = arena.scene;
    this.name = options.name || 'Sport';
    this.key = options.key || 'sport';
    this.description = options.description || '';
    
    // 3D container for all sport-specific objects
    this.group = new THREE.Group();
    this.group.name = `SportGroup_${this.key}`;

    // Live Match State & Timers
    this.matchDuration = 60.0; // 60-second fast-paced competitive match
    this.matchTimeRemaining = 60.0;
    this.shotClock = 18.0; // 18-second possession clock
    this.isMatchActive = false;
    this.isPaused = false;

    // Dual-Team Match Scoreboard (Home Blue vs Away Red)
    this.homeScore = 0; // Blue Team (Player + Teammates)
    this.awayScore = 0; // Red Team (AI Opponents)
    
    // Comprehensive Player & Team Stats
    this.stats = {
      points: 0,
      assists: 0,
      rebounds: 0,
      shotsMade: 0,
      shotsAttempted: 0
    };

    this.streak = 0;
    this.bestStreak = 0;
    this.state = 'ready'; // 'ready', 'active', 'evaluating', 'counter_attack', 'completed'
    this.possession = 'player'; // 'player', 'teammate', 'opponent', 'loose_ball'
  }

  /* -------------------------------------------------------------
     LIFECYCLE HOOKS
     ------------------------------------------------------------- */
  enter() {
    this.resetMatch();
    this.scene.add(this.group);
    
    // Bind to shared Input Manager
    if (window.inputManager) {
      window.inputManager.bindSport(this);
    }

    // Update Scoreboard HUD
    this.updateHUD();
    const hud = document.getElementById('game-hud');
    if (hud) hud.classList.add('active');

    // Announce for accessibility
    if (window.a11y) {
      window.a11y.announce(`Match started! ${this.name}: Blue Team vs Red Opponents. 60 seconds on the clock.`);
    }

    if (window.soundEngine) {
      window.soundEngine.playWhistle();
    }

    this.isMatchActive = true;
    this.onEnter();
  }

  exit() {
    this.isMatchActive = false;
    this.onExit();
    this.scene.remove(this.group);
    
    if (this.arena) {
      this.arena.hideTrajectory();
    }

    if (window.inputManager) {
      window.inputManager.bindSport(null);
    }

    const hud = document.getElementById('game-hud');
    if (hud) hud.classList.remove('active');
  }

  resetMatch() {
    const dur = window.inputManager && window.inputManager.sessionDuration !== undefined 
      ? Number(window.inputManager.sessionDuration) 
      : 60;
    this.matchDuration = dur;
    this.matchTimeRemaining = dur > 0 ? dur : 0;
    this.shotClock = 18.0;
    this.homeScore = 0;
    this.awayScore = 0;
    this.stats = {
      points: 0,
      assists: 0,
      rebounds: 0,
      shotsMade: 0,
      shotsAttempted: 0
    };
    this.streak = 0;
    this.bestStreak = 0;
    this.state = 'ready';
    this.possession = 'player';
    this.isMatchActive = true;
    this.updateHUD();
  }

  restart() {
    this.resetMatch();
    this.onRestart();
    this.updateHUD();
    if (window.soundEngine) {
      window.soundEngine.playWhistle();
    }
    if (window.a11y) {
      window.a11y.announce(`${this.name} match restarted. 60 seconds remaining.`);
    }
  }

  /* -------------------------------------------------------------
     SUBCLASS IMPLEMENTATIONS
     ------------------------------------------------------------- */
  onEnter() {}
  onExit() {}
  onRestart() {}
  update(delta) {}
  handleActionStart() {}
  handleActionRelease(power, aimX, aimY) {}
  handleActionTrigger() {}
  handlePass(direction) {}
  handleRetry() {}

  /* -------------------------------------------------------------
     MATCH CLOCK & POSSESSION TICKER
     ------------------------------------------------------------- */
  tickMatch(delta) {
    if (!this.isMatchActive || this.isPaused || this.inTutorial) return;

    // Countdown Match Time (In practice mode duration === 0, time is infinite)
    if (this.matchDuration > 0) {
      this.matchTimeRemaining = Math.max(0, this.matchTimeRemaining - delta);
    }

    // Countdown Shot Clock during offensive possession
    if (this.possession === 'player' || this.possession === 'teammate') {
      this.shotClock = Math.max(0, this.shotClock - delta);

      // Warning beep when shot clock <= 4
      if (this.shotClock <= 4.0 && this.shotClock > 3.9) {
        if (window.soundEngine) window.soundEngine.playShotClockBeep();
      }

      // Shot Clock Violation
      if (this.shotClock <= 0 && this.state !== 'counter_attack') {
        this.triggerShotClockViolation();
      }
    }

    this.updateHUD();

    // Check Match Final
    if (this.matchDuration > 0 && this.matchTimeRemaining <= 0 && this.state !== 'completed') {
      this.finishMatch();
    }
  }

  triggerShotClockViolation() {
    this.shotClock = 18.0;
    this.showFeedback('24s SHOT CLOCK VIOLATION', 'TURNOVER TO RED', false);
    if (window.soundEngine) window.soundEngine.playWhistle();
    if (this.onShotClockViolation) {
      this.onShotClockViolation();
    }
  }

  /* -------------------------------------------------------------
     SCOREBOARD & SCORING OUTCOMES
     ------------------------------------------------------------- */
  awardScore(team, points, bannerMsg, isAssist = false) {
    if (team === 'home') {
      this.homeScore += points;
      this.stats.points += points;
      this.stats.shotsMade++;
      this.streak++;
      if (this.streak > this.bestStreak) this.bestStreak = this.streak;
      if (isAssist) this.stats.assists++;

      this.showFeedback(bannerMsg || `+${points} PTS!`, `BLUE ${this.homeScore} - ${this.awayScore} RED`, true);
      
      if (window.soundEngine) {
        window.soundEngine.playSuccessChime();
        setTimeout(() => window.soundEngine.playCrowdCheer(), 200);
      }
      if (window.a11y) {
        window.a11y.triggerHaptic(180, 0.8, 0.6);
        window.a11y.announce(`${bannerMsg}. Blue team now has ${this.homeScore} points.`);
      }
    } else {
      this.awayScore += points;
      this.showFeedback(bannerMsg || `OPPONENT SCORES +${points}`, `BLUE ${this.homeScore} - ${this.awayScore} RED`, false);
      
      if (window.soundEngine) {
        window.soundEngine.playCrowdGroan();
      }
      if (window.a11y) {
        window.a11y.announce(`Red opponents scored ${points} points. Score is Blue ${this.homeScore}, Red ${this.awayScore}.`);
      }
    }

    this.shotClock = 18.0;
    this.updateHUD();
  }

  // Error Recovery: Missed actions show gentle visual guidance and allow retries without harsh penalties
  registerMiss(message = 'GOOD TRY!') {
    this.streak = 0;
    this.stats.shotsAttempted++;

    const supportiveTips = [
      '↺ Good Try! • Calibrating shot arc...',
      '↺ Close Attempt! • Adjust power slightly...',
      '↺ Nice Form! • Keep eyes on target...'
    ];
    const guidance = supportiveTips[Math.floor(Math.random() * supportiveTips.length)];
    this.showFeedback(message, guidance, true);

    if (window.soundEngine) {
      window.soundEngine.playBounce();
    }
    if (window.a11y) {
      window.a11y.announce(`${message}. Ready for next attempt.`);
    }

    this.updateHUD();
  }

  // Backward-compatible outcome registrar for single-player target/rally modes
  registerOutcome(isSuccess, points = 0, message = '') {
    if (isSuccess) {
      this.awardScore('home', points, message);
    } else {
      this.registerMiss(message || 'MISSED');
    }
  }

  /* -------------------------------------------------------------
     MATCH END & WIN/LOSS CELEBRATION
     ------------------------------------------------------------- */
  finishMatch() {
    this.isMatchActive = false;
    this.state = 'completed';

    if (window.soundEngine) {
      window.soundEngine.playBuzzer();
      setTimeout(() => window.soundEngine.playWhistle(), 700);
    }

    const isVictory = this.homeScore > this.awayScore;
    const isTie = this.homeScore === this.awayScore;

    if (isVictory) {
      if (window.soundEngine) {
        setTimeout(() => window.soundEngine.playVictoryFanfare(), 800);
      }
      if (this.arena) {
        this.arena.spawnCelebration(new THREE.Vector3(0, 3, -5), 180);
      }
      if (window.a11y) {
        window.a11y.announce(`CHAMPIONSHIP VICTORY! Blue Team wins ${this.homeScore} to ${this.awayScore}!`);
      }
    } else {
      if (window.soundEngine) {
        setTimeout(() => window.soundEngine.playCrowdCheer(), 800);
      }
      if (window.a11y) {
        window.a11y.announce(`Match ended. Red opponents won ${this.awayScore} to ${this.homeScore}. Good effort!`);
      }
    }

    setTimeout(() => {
      this.showMatchResultModal(isVictory, isTie);
    }, 1200);
  }

  showMatchResultModal(isVictory, isTie) {
    const modal = document.getElementById('modal-match-result');
    if (!modal) return;

    const title = document.getElementById('match-result-title');
    const subtitle = document.getElementById('match-result-subtitle');
    const trophy = document.getElementById('result-trophy-icon');
    const blueScore = document.getElementById('result-blue-score');
    const redScore = document.getElementById('result-red-score');

    const statPts = document.getElementById('stat-points');
    const statAst = document.getElementById('stat-assists');
    const statReb = document.getElementById('stat-rebounds');
    const statAcc = document.getElementById('stat-accuracy');

    if (blueScore) blueScore.textContent = this.homeScore;
    if (redScore) redScore.textContent = this.awayScore;

    const acc = this.stats.shotsAttempted > 0 
      ? Math.round((this.stats.shotsMade / this.stats.shotsAttempted) * 100) 
      : 80;

    if (statPts) statPts.textContent = this.stats.points;
    if (statAst) statAst.textContent = this.stats.assists;
    if (statReb) statReb.textContent = this.stats.rebounds;
    if (statAcc) statAcc.textContent = `${acc}%`;

    if (isVictory) {
      if (title) title.textContent = "\u{1F3C6} CHAMPIONSHIP VICTORY!";
      if (subtitle) subtitle.textContent = `BLUE TEAM WINS ${this.homeScore} - ${this.awayScore}! FANTASTIC PLAY!`;
      if (trophy) trophy.textContent = "\u{1F3C6}";
    } else if (isTie) {
      if (title) title.textContent = "\u{1F91D} THRILLING DRAW!";
      if (subtitle) subtitle.textContent = `TIE MATCH ${this.homeScore} - ${this.awayScore}! READY FOR REMATCH?`;
      if (trophy) trophy.textContent = "\u{1F525}";
    } else {
      if (title) title.textContent = "\u26A1 HARD FOUGHT MATCH!";
      if (subtitle) subtitle.textContent = `RED OPPONENTS LEAD ${this.awayScore} - ${this.homeScore}. TRY A REMATCH!`;
      if (trophy) trophy.textContent = "\u{1F948}";
    }

    modal.classList.add('active');
  }

  showFeedback(bannerText, pointsText, isSuccess) {
    const container = document.getElementById('floating-feedback');
    if (!container) return;

    const borderColor = isSuccess ? 'var(--accent-emerald)' : 'var(--accent-amber)';
    const glow = isSuccess ? 'rgba(16, 185, 129, 0.5)' : 'rgba(245, 158, 11, 0.5)';

    container.innerHTML = `
      <div class="feedback-banner" style="border-color:${borderColor}; box-shadow:0 0 30px ${glow}">
        ${bannerText}
      </div>
      <div class="feedback-points" style="color:${isSuccess ? 'var(--accent-emerald)' : 'var(--text-muted)'}">
        ${pointsText}
      </div>
    `;

    setTimeout(() => {
      if (container) container.innerHTML = '';
    }, 1250);
  }

  updateHUD() {
    // Top Scoreboard
    const blueScoreEl = document.getElementById('hud-score-blue');
    const redScoreEl = document.getElementById('hud-score-red');
    const matchClockEl = document.getElementById('hud-match-clock');
    const shotClockEl = document.getElementById('hud-shot-clock');

    if (blueScoreEl) blueScoreEl.textContent = this.homeScore;
    if (redScoreEl) redScoreEl.textContent = this.awayScore;

    if (matchClockEl) {
      if (this.matchDuration === 0) {
        matchClockEl.textContent = "\u221E PRACTICE";
      } else {
        const minutes = Math.floor(this.matchTimeRemaining / 60);
        const seconds = Math.floor(this.matchTimeRemaining % 60);
        matchClockEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }
    }

    if (shotClockEl) {
      shotClockEl.textContent = `SHOT: ${Math.ceil(this.shotClock)}s`;
      if (this.shotClock <= 5) {
        shotClockEl.style.color = '#ef4444';
      } else {
        shotClockEl.style.color = 'var(--accent-amber)';
      }
    }
  }
}

window.SportBase = SportBase;
