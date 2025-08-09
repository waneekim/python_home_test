(function () {
  "use strict";

  const DESIGN_WIDTH = 800;
  const DESIGN_HEIGHT = 600;

  const GAME_STATE = {
    MENU: "MENU",
    RUNNING: "RUNNING",
    PAUSED: "PAUSED",
    LEVEL_CLEARED: "LEVEL_CLEARED",
    GAME_OVER: "GAME_OVER",
  };

  function clamp(value, min, max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

  class AudioManager {
    constructor() {
      this.isEnabled = true;
      this.audioContext = null;
    }

    ensureContext() {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
        }
      }
    }

    setEnabled(enabled) {
      this.isEnabled = Boolean(enabled);
    }

    async resumeIfNeeded() {
      if (this.audioContext && this.audioContext.state === "suspended") {
        try {
          await this.audioContext.resume();
        } catch (_) {
          /* ignore */
        }
      }
    }

    playBeep(frequency, durationMs, type = "sine", gainValue = 0.05) {
      if (!this.isEnabled) return;
      this.ensureContext();
      if (!this.audioContext) return;

      const ctx = this.audioContext;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.value = gainValue;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + durationMs / 1000);
    }

    brick() { this.playBeep(440, 40, "triangle", 0.06); }
    wall() { this.playBeep(220, 30, "sawtooth", 0.04); }
    paddle() { this.playBeep(520, 40, "square", 0.06); }
    loseLife() { this.playBeep(140, 280, "sine", 0.06); }
    levelUp() { this.playBeep(660, 120, "triangle", 0.07); setTimeout(() => this.playBeep(880, 120, "triangle", 0.07), 120); }
  }

  class InputHandler {
    constructor(canvas, paddle, onTogglePause, onRestart, onStartOrLaunch) {
      this.canvas = canvas;
      this.paddle = paddle;
      this.onTogglePause = onTogglePause;
      this.onRestart = onRestart;
      this.onStartOrLaunch = onStartOrLaunch;
      this.isPointerDown = false;
      this.lastKnownPointerX = DESIGN_WIDTH / 2;
      this.keysDown = new Set();

      window.addEventListener("keydown", (e) => this.handleKeyDown(e));
      window.addEventListener("keyup", (e) => this.handleKeyUp(e));

      canvas.addEventListener("mousemove", (e) => this.handlePointerMove(e));
      canvas.addEventListener("touchmove", (e) => this.handleTouchMove(e), { passive: true });
      canvas.addEventListener("touchstart", (e) => this.handleTouchStart(e), { passive: true });
      canvas.addEventListener("mousedown", (e) => this.handleMouseDown(e));
      window.addEventListener("mouseup", () => { this.isPointerDown = false; });
    }

    mapClientToCanvasX(clientX) {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = DESIGN_WIDTH / rect.width;
      const x = (clientX - rect.left) * scaleX;
      return clamp(x, 0, DESIGN_WIDTH);
    }

    handlePointerMove(e) {
      const x = this.mapClientToCanvasX(e.clientX);
      this.lastKnownPointerX = x;
      this.paddle.setTargetCenterX(x);
    }

    handleTouchMove(e) {
      if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0];
        const x = this.mapClientToCanvasX(touch.clientX);
        this.lastKnownPointerX = x;
        this.paddle.setTargetCenterX(x);
      }
    }

    handleTouchStart(e) {
      if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0];
        const x = this.mapClientToCanvasX(touch.clientX);
        this.lastKnownPointerX = x;
        this.paddle.setTargetCenterX(x);
      }
      this.onStartOrLaunch();
    }

    handleMouseDown(e) {
      this.isPointerDown = true;
      const x = this.mapClientToCanvasX(e.clientX);
      this.lastKnownPointerX = x;
      this.paddle.setTargetCenterX(x);
    }

    handleKeyDown(e) {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      this.keysDown.add(key);
      if (key === "arrowleft" || key === "a") this.paddle.setKeyboardDirection(-1);
      if (key === "arrowright" || key === "d") this.paddle.setKeyboardDirection(1);
      if (key === "p") this.onTogglePause();
      if (key === "r") this.onRestart();
      if (key === " ") this.onStartOrLaunch();
    }

    handleKeyUp(e) {
      const key = e.key.toLowerCase();
      this.keysDown.delete(key);
      if (key === "arrowleft" || key === "a") this.paddle.releaseKeyboardDirection(-1);
      if (key === "arrowright" || key === "d") this.paddle.releaseKeyboardDirection(1);
    }
  }

  class Paddle {
    constructor(gameWidth, gameHeight) {
      this.gameWidth = gameWidth;
      this.gameHeight = gameHeight;
      this.width = 120;
      this.height = 18;
      this.movementSpeed = 720;
      this.positionX = (gameWidth - this.width) / 2;
      this.positionY = gameHeight - 48;
      this.keyboardDirection = 0;
      this.targetCenterX = gameWidth / 2;
    }

    setKeyboardDirection(direction) {
      if (direction === -1 && this.keyboardDirection === 1) this.keyboardDirection = 0;
      else if (direction === 1 && this.keyboardDirection === -1) this.keyboardDirection = 0;
      else this.keyboardDirection = direction;
    }

    releaseKeyboardDirection(direction) {
      if (this.keyboardDirection === direction) this.keyboardDirection = 0;
    }

    setTargetCenterX(centerX) {
      this.targetCenterX = clamp(centerX, this.width / 2, this.gameWidth - this.width / 2);
    }

    update(deltaSeconds) {
      if (this.keyboardDirection !== 0) {
        this.positionX += this.keyboardDirection * this.movementSpeed * deltaSeconds;
      } else {
        const desiredX = this.targetCenterX - this.width / 2;
        const distance = desiredX - this.positionX;
        const maxStep = this.movementSpeed * deltaSeconds;
        const step = clamp(distance, -maxStep, maxStep);
        this.positionX += step;
      }
      this.positionX = clamp(this.positionX, 0, this.gameWidth - this.width);
    }

    draw(ctx) {
      ctx.save();
      const radius = 8;
      const x = this.positionX;
      const y = this.positionY;
      const w = this.width;
      const h = this.height;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      const grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, "#44ff99");
      grad.addColorStop(1, "#2fa447");
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    }
  }

  class Ball {
    constructor(gameWidth, gameHeight) {
      this.gameWidth = gameWidth;
      this.gameHeight = gameHeight;
      this.radius = 8;
      this.reset();
    }

    reset(anchorX = this.gameWidth / 2, anchorY = this.gameHeight - 64) {
      this.positionX = anchorX;
      this.positionY = anchorY;
      this.speed = 420;
      this.velocityX = 0;
      this.velocityY = -this.speed;
      this.isLaunched = false;
    }

    attachToPaddle(paddle, pointerCenterX) {
      const clamped = clamp(pointerCenterX, paddle.width / 2, this.gameWidth - paddle.width / 2);
      this.positionX = clamped;
      this.positionY = paddle.positionY - this.radius - 2;
      this.velocityX = 0;
      this.velocityY = -this.speed;
      this.isLaunched = false;
    }

    launchIfNeeded() {
      if (!this.isLaunched) {
        this.isLaunched = true;
        if (Math.abs(this.velocityX) < 40) {
          this.velocityX = (Math.random() < 0.5 ? -1 : 1) * 140;
        }
      }
    }

    update(deltaSeconds, paddle, audio) {
      if (!this.isLaunched) {
        this.positionX = clamp(paddle.targetCenterX, this.radius, this.gameWidth - this.radius);
        this.positionY = paddle.positionY - this.radius - 2;
        return;
      }

      this.positionX += this.velocityX * deltaSeconds;
      this.positionY += this.velocityY * deltaSeconds;

      if (this.positionX - this.radius <= 0) {
        this.positionX = this.radius;
        this.velocityX = Math.abs(this.velocityX);
        audio.wall();
      }
      if (this.positionX + this.radius >= this.gameWidth) {
        this.positionX = this.gameWidth - this.radius;
        this.velocityX = -Math.abs(this.velocityX);
        audio.wall();
      }
      if (this.positionY - this.radius <= 0) {
        this.positionY = this.radius;
        this.velocityY = Math.abs(this.velocityY);
        audio.wall();
      }

      const ballBottom = this.positionY + this.radius;
      const paddleTop = paddle.positionY;
      const paddleLeft = paddle.positionX;
      const paddleRight = paddle.positionX + paddle.width;
      const isWithinX = this.positionX >= paddleLeft - this.radius && this.positionX <= paddleRight + this.radius;
      if (ballBottom >= paddleTop && isWithinX && this.velocityY > 0) {
        this.positionY = paddleTop - this.radius;
        this.velocityY = -Math.abs(this.velocityY);
        const hitRelative = (this.positionX - (paddle.positionX + paddle.width / 2)) / (paddle.width / 2);
        const maxAngle = Math.PI / 3;
        const angle = hitRelative * maxAngle;
        const speed = Math.hypot(this.velocityX, this.velocityY);
        this.velocityX = Math.sin(angle) * speed;
        this.velocityY = -Math.cos(angle) * speed;
        audio.paddle();
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.positionX, this.positionY, this.radius, 0, Math.PI * 2);
      ctx.closePath();
      const grad = ctx.createRadialGradient(this.positionX - 2, this.positionY - 2, 2, this.positionX, this.positionY, this.radius);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(1, "#8bd2ff");
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    }
  }

  class Brick {
    constructor(x, y, width, height, health) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.health = health;
      this.isDestroyed = false;
    }

    hit() {
      this.health -= 1;
      if (this.health <= 0) this.isDestroyed = true;
    }

    draw(ctx) {
      if (this.isDestroyed) return;
      const ratio = clamp(this.health / 3, 0, 1);
      const topColor = `hsl(${200 + 80 * (1 - ratio)}, 80%, ${38 + 12 * ratio}%)`;
      const bottomColor = `hsl(${180 + 60 * (1 - ratio)}, 80%, ${28 + 8 * ratio}%)`;
      ctx.save();
      ctx.beginPath();
      const r = 6;
      const x = this.x, y = this.y, w = this.width, h = this.height;
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      const grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, topColor);
      grad.addColorStop(1, bottomColor);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    }
  }

  function buildLevel(levelIndex, width, height) {
    const columns = 10;
    const rowsBase = 4 + (levelIndex % 3);
    const brickWidth = Math.floor((width - 80) / columns);
    const brickHeight = 26;
    const offsetX = Math.floor((width - columns * brickWidth) / 2);
    const offsetY = 80;

    const bricks = [];
    for (let row = 0; row < rowsBase; row++) {
      for (let col = 0; col < columns; col++) {
        const x = offsetX + col * brickWidth;
        const y = offsetY + row * (brickHeight + 10);
        const health = 1 + ((row + levelIndex) % 3);
        bricks.push(new Brick(x, y, brickWidth - 6, brickHeight, health));
      }
    }
    return bricks;
  }

  function circleRectCollision(ball, rect) {
    const nearestX = clamp(ball.positionX, rect.x, rect.x + rect.width);
    const nearestY = clamp(ball.positionY, rect.y, rect.y + rect.height);
    const dx = ball.positionX - nearestX;
    const dy = ball.positionY - nearestY;
    const overlap = ball.radius - Math.hypot(dx, dy);
    if (overlap > 0) {
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (absDx > absDy) return { axis: "x" };
      if (absDy > absDx) return { axis: "y" };
      return { axis: Math.random() < 0.5 ? "x" : "y" };
    }
    return null;
  }

  class Game {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.gameWidth = DESIGN_WIDTH;
      this.gameHeight = DESIGN_HEIGHT;
      this.audio = new AudioManager();
      this.paddle = new Paddle(this.gameWidth, this.gameHeight);
      this.ball = new Ball(this.gameWidth, this.gameHeight);
      this.input = new InputHandler(
        canvas,
        this.paddle,
        () => this.togglePause(),
        () => this.restart(),
        () => this.startOrLaunch()
      );

      this.score = 0;
      this.lives = 3;
      this.levelIndex = 0;
      this.bricks = buildLevel(this.levelIndex, this.gameWidth, this.gameHeight);
      this.state = GAME_STATE.MENU;

      this.lastTime = 0;
      this.accumulator = 0;
      this.maxDelta = 0.033;

      this.dom = this.queryDom();
      this.wireDom();
      this.updateHud();

      window.addEventListener("resize", () => this.resizeCanvas());
      this.resizeCanvas();
      requestAnimationFrame((t) => this.gameLoop(t));
    }

    queryDom() {
      return {
        overlay: document.getElementById("overlay"),
        overlayPanel: document.getElementById("overlayPanel"),
        overlayPrimaryBtn: document.getElementById("overlayPrimaryBtn"),
        overlaySecondaryBtn: document.getElementById("overlaySecondaryBtn"),
        scoreValue: document.getElementById("scoreValue"),
        livesValue: document.getElementById("livesValue"),
        levelValue: document.getElementById("levelValue"),
        pauseBtn: document.getElementById("pauseBtn"),
        restartBtn: document.getElementById("restartBtn"),
        soundBtn: document.getElementById("soundBtn"),
      };
    }

    wireDom() {
      this.dom.pauseBtn.addEventListener("click", () => this.togglePause());
      this.dom.restartBtn.addEventListener("click", () => this.restart());
      this.dom.soundBtn.addEventListener("click", () => this.toggleSound());
      this.dom.overlayPrimaryBtn.addEventListener("click", () => this.startOrLaunch());
      this.dom.overlaySecondaryBtn.addEventListener("click", () => this.restart());
      this.updateOverlay();
    }

    toggleSound() {
      this.audio.setEnabled(!this.audio.isEnabled);
      this.dom.soundBtn.textContent = `소리: ${this.audio.isEnabled ? "켬" : "끔"}`;
      this.audio.ensureContext();
      this.audio.resumeIfNeeded();
    }

    startOrLaunch() {
      if (this.state === GAME_STATE.MENU) {
        this.state = GAME_STATE.RUNNING;
        this.updateOverlay();
        this.audio.resumeIfNeeded();
        return;
      }
      if (this.state === GAME_STATE.LEVEL_CLEARED) {
        this.nextLevel();
        return;
      }
      if (this.state === GAME_STATE.GAME_OVER) {
        this.restart();
        return;
      }
      if (this.state === GAME_STATE.RUNNING || this.state === GAME_STATE.PAUSED) {
        this.ball.launchIfNeeded();
      }
    }

    togglePause() {
      if (this.state === GAME_STATE.RUNNING) {
        this.state = GAME_STATE.PAUSED;
      } else if (this.state === GAME_STATE.PAUSED) {
        this.state = GAME_STATE.RUNNING;
      }
      this.updateOverlay();
    }

    restart() {
      this.score = 0;
      this.lives = 3;
      this.levelIndex = 0;
      this.bricks = buildLevel(this.levelIndex, this.gameWidth, this.gameHeight);
      this.paddle = new Paddle(this.gameWidth, this.gameHeight);
      this.ball = new Ball(this.gameWidth, this.gameHeight);
      this.input.paddle = this.paddle;
      this.state = GAME_STATE.MENU;
      this.updateHud();
      this.updateOverlay();
    }

    nextLevel() {
      this.levelIndex += 1;
      this.bricks = buildLevel(this.levelIndex, this.gameWidth, this.gameHeight);
      this.paddle = new Paddle(this.gameWidth, this.gameHeight);
      const newBall = new Ball(this.gameWidth, this.gameHeight);
      newBall.attachToPaddle(this.paddle, this.paddle.targetCenterX);
      this.ball = newBall;
      this.input.paddle = this.paddle;
      this.state = GAME_STATE.RUNNING;
      this.updateHud();
      this.updateOverlay();
      this.audio.levelUp();
    }

    loseLife() {
      this.lives -= 1;
      if (this.lives <= 0) {
        this.state = GAME_STATE.GAME_OVER;
      } else {
        this.ball = new Ball(this.gameWidth, this.gameHeight);
        this.ball.attachToPaddle(this.paddle, this.paddle.targetCenterX);
      }
      this.updateHud();
      this.updateOverlay();
      this.audio.loseLife();
    }

    updateHud() {
      this.dom.scoreValue.textContent = String(this.score);
      this.dom.livesValue.textContent = String(this.lives);
      this.dom.levelValue.textContent = String(this.levelIndex + 1);
    }

    updateOverlay() {
      const overlay = this.dom.overlay;
      const panel = this.dom.overlayPanel;
      const primary = this.dom.overlayPrimaryBtn;
      const secondary = this.dom.overlaySecondaryBtn;

      if (this.state === GAME_STATE.MENU) {
        overlay.classList.remove("hidden");
        panel.textContent = "스페이스/클릭으로 시작하세요";
        primary.textContent = "시작";
        secondary.textContent = "재시작";
      } else if (this.state === GAME_STATE.PAUSED) {
        overlay.classList.remove("hidden");
        panel.textContent = "일시정지됨";
        primary.textContent = "계속";
        secondary.textContent = "재시작";
      } else if (this.state === GAME_STATE.LEVEL_CLEARED) {
        overlay.classList.remove("hidden");
        panel.textContent = "레벨 클리어!";
        primary.textContent = "다음 레벨";
        secondary.textContent = "재시작";
      } else if (this.state === GAME_STATE.GAME_OVER) {
        overlay.classList.remove("hidden");
        panel.textContent = `게임 오버\n최종 점수: ${this.score}`;
        primary.textContent = "다시 시작";
        secondary.textContent = "메뉴";
      } else {
        overlay.classList.add("hidden");
      }

      this.dom.pauseBtn.textContent = this.state === GAME_STATE.PAUSED ? "계속" : "일시정지";
    }

    resizeCanvas() {
      const container = this.canvas.parentElement;
      const maxWidth = container.clientWidth - 0;
      const scale = clamp(maxWidth / DESIGN_WIDTH, 0.2, 2);
      const cssWidth = Math.round(DESIGN_WIDTH * scale);
      const cssHeight = Math.round(DESIGN_HEIGHT * scale);
      this.canvas.style.width = `${cssWidth}px`;
      this.canvas.style.height = `${cssHeight}px`;
    }

    handleCollisions() {
      const ball = this.ball;
      for (const brick of this.bricks) {
        if (brick.isDestroyed) continue;
        const collision = circleRectCollision(ball, brick);
        if (!collision) continue;

        brick.hit();
        this.score += 10;
        if (collision.axis === "x") ball.velocityX = -ball.velocityX;
        else ball.velocityY = -ball.velocityY;
        this.audio.brick();
        break;
      }
      this.bricks = this.bricks.filter((b) => !b.isDestroyed || b.health > 0);
      if (this.bricks.every((b) => b.isDestroyed)) {
        this.state = GAME_STATE.LEVEL_CLEARED;
        this.updateOverlay();
      }
    }

    drawBackground() {
      const ctx = this.ctx;
      const g = ctx.createLinearGradient(0, 0, 0, this.gameHeight);
      g.addColorStop(0, "#0b1220");
      g.addColorStop(1, "#0a0d14");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.gameWidth, this.gameHeight);
      ctx.strokeStyle = "rgba(88, 166, 255, 0.18)";
      ctx.lineWidth = 1;
      for (let y = 80; y < this.gameHeight; y += 40) {
        ctx.beginPath();
        ctx.moveTo(16, y);
        ctx.lineTo(this.gameWidth - 16, y);
        ctx.stroke();
      }
    }

    update(deltaSeconds) {
      if (this.state !== GAME_STATE.RUNNING) return;
      this.paddle.update(deltaSeconds);
      this.ball.update(deltaSeconds, this.paddle, this.audio);
      this.handleCollisions();
      if (this.ball.positionY - this.ball.radius > this.gameHeight) {
        this.loseLife();
      }
      this.updateHud();
    }

    draw() {
      const ctx = this.ctx;
      this.drawBackground();
      for (const brick of this.bricks) brick.draw(ctx);
      this.paddle.draw(ctx);
      this.ball.draw(ctx);

      if (this.state !== GAME_STATE.RUNNING) {
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(0, 0, this.gameWidth, this.gameHeight);
        ctx.restore();
      }
    }

    gameLoop(timestampMs) {
      const deltaSecondsRaw = (timestampMs - this.lastTime) / 1000;
      this.lastTime = timestampMs;
      const deltaSeconds = Math.min(this.maxDelta, deltaSecondsRaw || 0.016);
      this.update(deltaSeconds);
      this.draw();
      requestAnimationFrame((t) => this.gameLoop(t));
    }
  }

  function init() {
    const canvas = document.getElementById("gameCanvas");
    canvas.width = DESIGN_WIDTH;
    canvas.height = DESIGN_HEIGHT;
    const game = new Game(canvas);

    const pauseBtn = document.getElementById("pauseBtn");
    const restartBtn = document.getElementById("restartBtn");
    const soundBtn = document.getElementById("soundBtn");

    pauseBtn.addEventListener("click", () => game.togglePause());
    restartBtn.addEventListener("click", () => game.restart());
    soundBtn.addEventListener("click", () => game.toggleSound());

    window.__brickBreaker = game;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();