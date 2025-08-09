(() => {
  /**
   * 간단한 캔버스 벽돌깨기 게임
   * - 키보드 ← →, 마우스 이동, 터치 드래그
   * - 스페이스: 시작/계속, P: 일시정지, 버튼 지원
   * - 점수, 목숨, 레벨 진행
   */

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const resumeBtn = document.getElementById("resumeBtn");
  const restartBtn = document.getElementById("restartBtn");

  // 디바이스 픽셀 비율 처리로 선명도 향상
  function resizeCanvasForDpr() {
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    // 고정된 CSS 크기에서 내부 캔버스 해상도 조정
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    if (!cssWidth || !cssHeight) return;
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // 반응형 리사이즈
  const resizeObserver = new ResizeObserver(() => {
    resizeCanvasForDpr();
    game && game.onResize();
  });
  resizeObserver.observe(canvas);

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  class Brick {
    constructor(x, y, width, height, hitPoints = 1, color = "#5bd1ff") {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.hitPoints = hitPoints;
      this.color = color;
      this.isDestroyed = false;
    }

    draw(ctx) {
      if (this.isDestroyed) return;
      ctx.save();
      const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
      gradient.addColorStop(0, this.color);
      gradient.addColorStop(1, "#0c2a44");
      ctx.fillStyle = gradient;
      ctx.fillRect(this.x, this.y, this.width, this.height);

      // 테두리
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x + 0.5, this.y + 0.5, this.width - 1, this.height - 1);

      // 내구도 표시
      if (this.hitPoints > 1) {
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.font = "bold 12px Pretendard, system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${this.hitPoints}`, this.x + this.width / 2, this.y + this.height / 2);
      }
      ctx.restore();
    }
  }

  class Game {
    constructor() {
      this.isRunning = false;
      this.isPaused = false;
      this.score = 0;
      this.lives = 3;
      this.level = 1;

      this.leftPressed = false;
      this.rightPressed = false;

      // 크기 및 배치
      this.paddleWidth = 90;
      this.paddleHeight = 14;
      this.paddleSpeed = 7.2;

      this.ballRadius = 7;

      // 벽돌 설정
      this.brickRows = 5;
      this.brickCols = 8;
      this.brickPadding = 10;
      this.brickOffsetTop = 70;
      this.brickOffsetLeft = 16;
      this.brickHeight = 22;

      // 런타임 값
      this.paddleX = 0;
      this.paddleY = 0;
      this.ballX = 0;
      this.ballY = 0;
      this.ballVelocityX = 0;
      this.ballVelocityY = 0;

      this.bricks = [];

      this.lastTimestamp = 0;

      this.registerEventHandlers();
      this.resetForNewGame();
    }

    registerEventHandlers() {
      document.addEventListener("keydown", (e) => {
        if (e.code === "ArrowLeft") this.leftPressed = true;
        if (e.code === "ArrowRight") this.rightPressed = true;
        if (e.code === "Space") {
          if (!this.isRunning) this.start();
          else if (this.isPaused) this.resume();
        }
        if (e.code === "KeyP") {
          if (this.isRunning && !this.isPaused) this.pause();
          else if (this.isRunning && this.isPaused) this.resume();
        }
      });
      document.addEventListener("keyup", (e) => {
        if (e.code === "ArrowLeft") this.leftPressed = false;
        if (e.code === "ArrowRight") this.rightPressed = false;
      });

      // 마우스 이동으로 패들 제어
      canvas.addEventListener("mousemove", (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        this.paddleX = clamp(x - this.paddleWidth / 2, 0, canvas.clientWidth - this.paddleWidth);
      });

      // 터치 드래그로 패들 제어
      canvas.addEventListener("touchstart", (e) => {
        if (!this.isRunning) this.start();
      }, { passive: true });
      canvas.addEventListener("touchmove", (e) => {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        this.paddleX = clamp(x - this.paddleWidth / 2, 0, canvas.clientWidth - this.paddleWidth);
      }, { passive: true });

      startBtn.addEventListener("click", () => this.start());
      pauseBtn.addEventListener("click", () => this.pause());
      resumeBtn.addEventListener("click", () => this.resume());
      restartBtn.addEventListener("click", () => this.resetForNewGame());
    }

    onResize() {
      // 화면 크기에 따라 일부 파라미터 스케일링
      const base = 480; // 캔버스 기준 너비
      const scale = canvas.clientWidth / base;
      this.paddleWidth = 90 * scale;
      this.paddleHeight = 14 * scale;
      this.paddleSpeed = 7.2 * scale;
      this.ballRadius = 7 * scale;
      this.brickRows = 5 + Math.floor((this.level - 1) / 2);
      this.brickCols = 8;
      this.brickPadding = 10 * scale;
      this.brickOffsetTop = 70 * scale;
      this.brickOffsetLeft = 16 * scale;
      this.brickHeight = 22 * scale;
      // 패들 위치 보정
      this.paddleX = clamp(this.paddleX, 0, canvas.clientWidth - this.paddleWidth);
      this.paddleY = canvas.clientHeight - (24 * scale + this.paddleHeight);
    }

    resetForNewGame() {
      this.score = 0;
      this.lives = 3;
      this.level = 1;
      this.isRunning = false;
      this.isPaused = false;
      this.setupLevel();
      this.draw();
    }

    setupLevel() {
      // 패들/공 초기화
      this.onResize();
      this.paddleX = (canvas.clientWidth - this.paddleWidth) / 2;
      this.paddleY = canvas.clientHeight - (24 + this.paddleHeight);

      this.ballX = canvas.clientWidth / 2;
      this.ballY = canvas.clientHeight - (48 + this.paddleHeight);
      const initialSpeed = 4 + Math.min(4, this.level * 0.8);
      this.ballVelocityX = (Math.random() < 0.5 ? -1 : 1) * initialSpeed * 0.8;
      this.ballVelocityY = -initialSpeed;

      // 벽돌 생성
      this.bricks = [];
      const colors = ["#5bd1ff", "#7aff7a", "#ffd166", "#ff7ab6", "#a48bff"];
      const colWidth = (canvas.clientWidth - this.brickOffsetLeft * 2 - (this.brickCols - 1) * this.brickPadding) / this.brickCols;
      for (let r = 0; r < this.brickRows; r++) {
        for (let c = 0; c < this.brickCols; c++) {
          const x = this.brickOffsetLeft + c * (colWidth + this.brickPadding);
          const y = this.brickOffsetTop + r * (this.brickHeight + this.brickPadding);
          const hp = 1 + Math.floor(r / 2) + Math.floor(this.level / 3);
          const color = colors[(r + c) % colors.length];
          this.bricks.push(new Brick(x, y, colWidth, this.brickHeight, hp, color));
        }
      }
    }

    start() {
      if (this.isRunning && !this.isPaused) return;
      this.isRunning = true;
      this.isPaused = false;
      this.lastTimestamp = performance.now();
      requestAnimationFrame(this.loop);
    }

    pause() {
      if (!this.isRunning || this.isPaused) return;
      this.isPaused = true;
      this.draw();
    }

    resume() {
      if (!this.isRunning || !this.isPaused) return;
      this.isPaused = false;
      this.lastTimestamp = performance.now();
      requestAnimationFrame(this.loop);
    }

    loop = (timestamp) => {
      if (!this.isRunning || this.isPaused) return;
      const deltaMs = timestamp - this.lastTimestamp;
      this.lastTimestamp = timestamp;

      // 최대 프레임 시간 제한(일시 정지 직후 등 급격한 dt 방지)
      const dt = Math.min(32, deltaMs) / 16.6667; // 기준 60fps

      this.update(dt);
      this.draw();
      requestAnimationFrame(this.loop);
    };

    update(dt) {
      // 키보드 패들 이동
      if (this.leftPressed) this.paddleX -= this.paddleSpeed * dt * 60 / 60;
      if (this.rightPressed) this.paddleX += this.paddleSpeed * dt * 60 / 60;
      this.paddleX = clamp(this.paddleX, 0, canvas.clientWidth - this.paddleWidth);

      // 공 이동
      this.ballX += this.ballVelocityX * dt;
      this.ballY += this.ballVelocityY * dt;

      // 벽 충돌
      if (this.ballX - this.ballRadius < 0) {
        this.ballX = this.ballRadius;
        this.ballVelocityX *= -1;
      } else if (this.ballX + this.ballRadius > canvas.clientWidth) {
        this.ballX = canvas.clientWidth - this.ballRadius;
        this.ballVelocityX *= -1;
      }
      if (this.ballY - this.ballRadius < 0) {
        this.ballY = this.ballRadius;
        this.ballVelocityY *= -1;
      }

      // 패들 충돌
      if (
        this.ballY + this.ballRadius >= this.paddleY &&
        this.ballY + this.ballRadius <= this.paddleY + this.paddleHeight &&
        this.ballX >= this.paddleX &&
        this.ballX <= this.paddleX + this.paddleWidth &&
        this.ballVelocityY > 0
      ) {
        // 패들의 어느 위치에 맞았는지에 따라 반사 각도 조정
        const hitRatio = (this.ballX - (this.paddleX + this.paddleWidth / 2)) / (this.paddleWidth / 2);
        const speed = Math.hypot(this.ballVelocityX, this.ballVelocityY);
        const maxBounceAngle = Math.PI / 2.8; // ~64도
        const bounceAngle = hitRatio * maxBounceAngle;
        this.ballVelocityX = speed * Math.sin(bounceAngle);
        this.ballVelocityY = -Math.abs(speed * Math.cos(bounceAngle));
        this.ballY = this.paddleY - this.ballRadius - 0.01;
      }

      // 바닥에 떨어짐
      if (this.ballY - this.ballRadius > canvas.clientHeight) {
        this.lives -= 1;
        if (this.lives <= 0) {
          this.gameOver();
          return;
        }
        // 공/패들만 재배치
        this.paddleX = (canvas.clientWidth - this.paddleWidth) / 2;
        this.ballX = canvas.clientWidth / 2;
        this.ballY = canvas.clientHeight - (48 + this.paddleHeight);
        this.ballVelocityX = (Math.random() < 0.5 ? -1 : 1) * 3.2;
        this.ballVelocityY = -3.8;
        this.isPaused = true; // 잠시 멈춘 상태에서 스페이스/버튼으로 재개
      }

      // 벽돌 충돌 감지 (AABB vs 원 충돌의 간단한 처리)
      for (const brick of this.bricks) {
        if (brick.isDestroyed) continue;
        const nearestX = clamp(this.ballX, brick.x, brick.x + brick.width);
        const nearestY = clamp(this.ballY, brick.y, brick.y + brick.height);
        const distX = this.ballX - nearestX;
        const distY = this.ballY - nearestY;
        if (distX * distX + distY * distY <= this.ballRadius * this.ballRadius) {
          // 반사: 충돌 축 판단
          if (Math.abs(distX) > Math.abs(distY)) this.ballVelocityX *= -1; else this.ballVelocityY *= -1;
          if (!brick.isDestroyed) {
            brick.hitPoints -= 1;
            if (brick.hitPoints <= 0) {
              brick.isDestroyed = true;
              this.score += 10;
            } else {
              this.score += 3;
            }
          }
          break; // 한 프레임에 한 개 처리 (과도한 다중충돌 방지)
        }
      }

      // 레벨 클리어 체크
      const remaining = this.bricks.filter(b => !b.isDestroyed).length;
      if (remaining === 0) {
        this.level += 1;
        // 난이도 증가: 공 속도 소폭 증가
        const speedUp = 1.12;
        this.ballVelocityX *= speedUp;
        this.ballVelocityY *= speedUp;
        this.setupLevel();
        this.isPaused = true; // 다음 레벨 시작 전 일시정지
      }
    }

    drawBackground() {
      const g = ctx.createLinearGradient(0, 0, 0, canvas.clientHeight);
      g.addColorStop(0, "#071a2d");
      g.addColorStop(1, "#04121f");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

      // 상단 광택
      const shine = ctx.createLinearGradient(0, 0, 0, 80);
      shine.addColorStop(0, "rgba(255,255,255,0.10)");
      shine.addColorStop(1, "rgba(255,255,255,0.00)");
      ctx.fillStyle = shine;
      ctx.fillRect(0, 0, canvas.clientWidth, 80);
    }

    drawHud() {
      ctx.save();
      ctx.fillStyle = "#e8f0fa";
      ctx.font = "600 14px Pretendard, system-ui";
      ctx.textBaseline = "top";
      ctx.fillText(`점수: ${this.score}`, 12, 10);
      ctx.fillText(`레벨: ${this.level}`, canvas.clientWidth / 2 - 24, 10);
      ctx.textAlign = "right";
      ctx.fillText(`목숨: ${this.lives}`, canvas.clientWidth - 12, 10);
      ctx.restore();
    }

    drawPaddle() {
      ctx.save();
      ctx.fillStyle = "#9ad1ff";
      const radius = Math.min(8, this.paddleHeight);
      const x = this.paddleX;
      const y = this.paddleY;
      const w = this.paddleWidth;
      const h = this.paddleHeight;
      // 라운드 직사각형
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.arcTo(x + w, y, x + w, y + h, radius);
      ctx.arcTo(x + w, y + h, x, y + h, radius);
      ctx.arcTo(x, y + h, x, y, radius);
      ctx.arcTo(x, y, x + w, y, radius);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    drawBall() {
      ctx.save();
      const g = ctx.createRadialGradient(this.ballX - 2, this.ballY - 4, 1, this.ballX, this.ballY, this.ballRadius + 2);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(1, "#72b7ff");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(this.ballX, this.ballY, this.ballRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    drawBricks() {
      for (const b of this.bricks) b.draw(ctx);
    }

    drawOverlay(text, subText = "스페이스/다시시작 버튼") {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

      ctx.fillStyle = "#eaf2ff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "800 28px Pretendard, system-ui";
      ctx.fillText(text, canvas.clientWidth / 2, canvas.clientHeight / 2 - 14);
      ctx.font = "600 14px Pretendard, system-ui";
      ctx.fillStyle = "#c4daff";
      ctx.fillText(subText, canvas.clientWidth / 2, canvas.clientHeight / 2 + 16);
      ctx.restore();
    }

    gameOver() {
      this.isRunning = false;
      this.isPaused = false;
      this.draw();
      this.drawOverlay("게임 오버", "처음부터 버튼을 누르세요");
    }

    draw() {
      resizeCanvasForDpr();
      this.drawBackground();
      this.drawHud();
      this.drawBricks();
      this.drawPaddle();
      this.drawBall();
      if (!this.isRunning && this.lives === 3 && this.score === 0 && this.level === 1) {
        this.drawOverlay("벽돌깨기", "시작 버튼 또는 스페이스바");
      } else if (this.isPaused && this.lives > 0) {
        this.drawOverlay("일시정지", "P/다시시작으로 계속");
      }
    }
  }

  const game = new Game();

  // 초기 렌더
  resizeCanvasForDpr();
  game.draw();
})();