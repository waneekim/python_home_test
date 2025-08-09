class BrickBreakerGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 게임 상태
        this.gameRunning = false;
        this.gamePaused = false;
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        
        // 게임 요소들
        this.paddle = {
            x: this.canvas.width / 2 - 50,
            y: this.canvas.height - 30,
            width: 100,
            height: 15,
            speed: 8,
            dx: 0
        };
        
        this.ball = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 50,
            radius: 8,
            dx: 4,
            dy: -4
        };
        
        this.bricks = [];
        this.brickRowCount = 8;
        this.brickColumnCount = 10;
        this.brickWidth = 75;
        this.brickHeight = 20;
        this.brickPadding = 10;
        this.brickOffsetTop = 60;
        this.brickOffsetLeft = 30;
        
        // 이벤트 리스너 설정
        this.setupEventListeners();
        
        // 벽돌 초기화
        this.initializeBricks();
        
        // 게임 루프 시작
        this.gameLoop();
    }
    
    setupEventListeners() {
        // 마우스 이벤트
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.gameRunning && !this.gamePaused) {
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                this.paddle.x = mouseX - this.paddle.width / 2;
                this.paddle.x = Math.max(0, Math.min(this.canvas.width - this.paddle.width, this.paddle.x));
            }
        });
        
        // 키보드 이벤트
        document.addEventListener('keydown', (e) => {
            if (this.gameRunning && !this.gamePaused) {
                switch(e.key) {
                    case 'ArrowLeft':
                        this.paddle.dx = -this.paddle.speed;
                        break;
                    case 'ArrowRight':
                        this.paddle.dx = this.paddle.speed;
                        break;
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                this.paddle.dx = 0;
            }
        });
        
        // 버튼 이벤트
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());
    }
    
    initializeBricks() {
        this.bricks = [];
        for (let c = 0; c < this.brickColumnCount; c++) {
            this.bricks[c] = [];
            for (let r = 0; r < this.brickRowCount; r++) {
                this.bricks[c][r] = { 
                    x: 0, 
                    y: 0, 
                    status: 1,
                    color: this.getBrickColor(r)
                };
            }
        }
    }
    
    getBrickColor(row) {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
            '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
        ];
        return colors[row % colors.length];
    }
    
    startGame() {
        if (!this.gameRunning) {
            this.gameRunning = true;
            this.gamePaused = false;
            document.getElementById('startBtn').disabled = true;
            document.getElementById('pauseBtn').disabled = false;
        }
    }
    
    togglePause() {
        if (this.gameRunning) {
            this.gamePaused = !this.gamePaused;
            document.getElementById('pauseBtn').textContent = this.gamePaused ? '계속하기' : '일시정지';
        }
    }
    
    resetGame() {
        this.gameRunning = false;
        this.gamePaused = false;
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        
        // 게임 요소들 초기화
        this.paddle.x = this.canvas.width / 2 - 50;
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height - 50;
        this.ball.dx = 4;
        this.ball.dy = -4;
        
        this.initializeBricks();
        
        // UI 업데이트
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('pauseBtn').textContent = '일시정지';
        this.updateUI();
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('lives').textContent = this.lives;
    }
    
    collisionDetection() {
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                const brick = this.bricks[c][r];
                if (brick.status === 1) {
                    if (this.ball.x > brick.x && 
                        this.ball.x < brick.x + this.brickWidth && 
                        this.ball.y > brick.y && 
                        this.ball.y < brick.y + this.brickHeight) {
                        
                        this.ball.dy = -this.ball.dy;
                        brick.status = 0;
                        this.score += 10;
                        this.updateUI();
                        
                        // 모든 벽돌이 깨졌는지 확인
                        if (this.checkWin()) {
                            this.nextLevel();
                        }
                    }
                }
            }
        }
    }
    
    checkWin() {
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                if (this.bricks[c][r].status === 1) {
                    return false;
                }
            }
        }
        return true;
    }
    
    nextLevel() {
        this.level++;
        this.ball.dx *= 1.1; // 공 속도 증가
        this.ball.dy *= 1.1;
        this.initializeBricks();
        
        // 레벨 완료 메시지
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'white';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`레벨 ${this.level-1} 완료!`, this.canvas.width/2, this.canvas.height/2);
        this.ctx.font = '24px Arial';
        this.ctx.fillText('클릭하여 다음 레벨 시작', this.canvas.width/2, this.canvas.height/2 + 50);
        
        this.gamePaused = true;
        this.canvas.addEventListener('click', () => {
            this.gamePaused = false;
            this.canvas.removeEventListener('click', arguments.callee);
        }, { once: true });
    }
    
    update() {
        if (!this.gameRunning || this.gamePaused) return;
        
        // 패들 업데이트
        this.paddle.x += this.paddle.dx;
        this.paddle.x = Math.max(0, Math.min(this.canvas.width - this.paddle.width, this.paddle.x));
        
        // 공 업데이트
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;
        
        // 벽 충돌 검사
        if (this.ball.x + this.ball.radius > this.canvas.width || this.ball.x - this.ball.radius < 0) {
            this.ball.dx = -this.ball.dx;
        }
        if (this.ball.y - this.ball.radius < 0) {
            this.ball.dy = -this.ball.dy;
        }
        
        // 패들 충돌 검사
        if (this.ball.y + this.ball.radius > this.paddle.y &&
            this.ball.x > this.paddle.x &&
            this.ball.x < this.paddle.x + this.paddle.width) {
            
            // 공이 패들의 어느 부분에 맞았는지에 따라 방향 조정
            const hitPoint = (this.ball.x - this.paddle.x) / this.paddle.width;
            const angle = (hitPoint - 0.5) * Math.PI / 3; // -30도 ~ 30도
            
            const speed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
            this.ball.dx = speed * Math.sin(angle);
            this.ball.dy = -speed * Math.cos(angle);
        }
        
        // 공이 바닥에 떨어졌을 때
        if (this.ball.y + this.ball.radius > this.canvas.height) {
            this.lives--;
            this.updateUI();
            
            if (this.lives <= 0) {
                this.gameOver();
            } else {
                this.resetBall();
            }
        }
        
        // 벽돌 충돌 검사
        this.collisionDetection();
    }
    
    resetBall() {
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height - 50;
        this.ball.dx = 4 * (Math.random() > 0.5 ? 1 : -1);
        this.ball.dy = -4;
    }
    
    gameOver() {
        this.gameRunning = false;
        this.gamePaused = false;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'red';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('게임 오버!', this.canvas.width/2, this.canvas.height/2);
        this.ctx.fillStyle = 'white';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`최종 점수: ${this.score}`, this.canvas.width/2, this.canvas.height/2 + 50);
        
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
    }
    
    draw() {
        // 캔버스 클리어
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 벽돌 그리기
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                if (this.bricks[c][r].status === 1) {
                    const brickX = c * (this.brickWidth + this.brickPadding) + this.brickOffsetLeft;
                    const brickY = r * (this.brickHeight + this.brickPadding) + this.brickOffsetTop;
                    this.bricks[c][r].x = brickX;
                    this.bricks[c][r].y = brickY;
                    
                    this.ctx.fillStyle = this.bricks[c][r].color;
                    this.ctx.fillRect(brickX, brickY, this.brickWidth, this.brickHeight);
                    this.ctx.strokeStyle = '#333';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(brickX, brickY, this.brickWidth, this.brickHeight);
                }
            }
        }
        
        // 패들 그리기
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);
        this.ctx.strokeStyle = '#666';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);
        
        // 공 그리기
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#FF6B6B';
        this.ctx.fill();
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // 레벨 표시
        this.ctx.fillStyle = '#333';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`레벨: ${this.level}`, 10, 30);
        
        // 게임 상태 표시
        if (!this.gameRunning) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '36px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('게임을 시작하려면 버튼을 클릭하세요', this.canvas.width/2, this.canvas.height/2);
        }
        
        if (this.gamePaused && this.gameRunning) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '36px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('일시정지됨', this.canvas.width/2, this.canvas.height/2);
        }
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// 게임 시작
window.addEventListener('load', () => {
    new BrickBreakerGame();
});