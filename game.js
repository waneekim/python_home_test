// 게임 캔버스와 컨텍스트
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 게임 상태
let gameState = 'menu'; // menu, playing, paused, gameOver, gameWon
let score = 0;
let lives = 3;
let animationId;

// 게임 객체들
const ball = {
    x: canvas.width / 2,
    y: canvas.height - 30,
    dx: 5,
    dy: -5,
    radius: 10,
    speed: 7
};

const paddle = {
    width: 100,
    height: 15,
    x: (canvas.width - 100) / 2,
    y: canvas.height - 20,
    speed: 8
};

// 벽돌 설정
const brickRowCount = 6;
const brickColumnCount = 8;
const brickWidth = 90;
const brickHeight = 25;
const brickPadding = 5;
const brickOffsetTop = 60;
const brickOffsetLeft = 35;

// 벽돌 색상 배열
const brickColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'];

let bricks = [];

// 입력 처리
let mouseX = 0;
let rightPressed = false;
let leftPressed = false;

// DOM 요소들
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');

// 이벤트 리스너
document.addEventListener('keydown', keyDownHandler);
document.addEventListener('keyup', keyUpHandler);
document.addEventListener('mousemove', mouseMoveHandler);
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);
resetBtn.addEventListener('click', resetGame);

// 벽돌 초기화
function initBricks() {
    bricks = [];
    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < brickRowCount; r++) {
            bricks[c][r] = {
                x: c * (brickWidth + brickPadding) + brickOffsetLeft,
                y: r * (brickHeight + brickPadding) + brickOffsetTop,
                status: 1,
                color: brickColors[r]
            };
        }
    }
}

// 키보드 입력 처리
function keyDownHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = true;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = true;
    } else if (e.key === ' ') {
        e.preventDefault();
        if (gameState === 'menu') {
            startGame();
        } else if (gameState === 'playing') {
            togglePause();
        }
    }
}

function keyUpHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = false;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = false;
    }
}

// 마우스 입력 처리
function mouseMoveHandler(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
}

// 충돌 감지
function collisionDetection() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            const b = bricks[c][r];
            if (b.status === 1) {
                if (ball.x > b.x && ball.x < b.x + brickWidth && 
                    ball.y > b.y && ball.y < b.y + brickHeight) {
                    ball.dy = -ball.dy;
                    b.status = 0;
                    score += 10;
                    updateScore();
                    
                    // 모든 벽돌이 깨졌는지 확인
                    if (score === brickRowCount * brickColumnCount * 10) {
                        gameState = 'gameWon';
                    }
                }
            }
        }
    }
}

// 공 그리기
function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    ctx.shadowBlur = 10;
    ctx.closePath();
    ctx.shadowBlur = 0;
}

// 패들 그리기
function drawPaddle() {
    const gradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.height);
    gradient.addColorStop(0, '#4ecdc4');
    gradient.addColorStop(1, '#44a08d');
    
    ctx.beginPath();
    ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 10);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.closePath();
}

// 벽돌들 그리기
function drawBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            const b = bricks[c][r];
            if (b.status === 1) {
                const gradient = ctx.createLinearGradient(b.x, b.y, b.x, b.y + brickHeight);
                gradient.addColorStop(0, b.color);
                gradient.addColorStop(1, darkenColor(b.color, 20));
                
                ctx.beginPath();
                ctx.roundRect(b.x, b.y, brickWidth, brickHeight, 5);
                ctx.fillStyle = gradient;
                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.closePath();
            }
        }
    }
}

// 색상 어둡게 하기
function darkenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + 
                  (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + 
                  (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

// 메시지 표시
function drawMessage(text, subtext = '') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 - 30);
    
    if (subtext) {
        ctx.font = '24px Arial';
        ctx.fillText(subtext, canvas.width / 2, canvas.height / 2 + 20);
    }
}

// 파티클 효과 (벽돌 파괴시)
let particles = [];

function createParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x,
            y: y,
            dx: (Math.random() - 0.5) * 10,
            dy: (Math.random() - 0.5) * 10,
            color: color,
            life: 30
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.dx;
        p.y += p.dy;
        p.life--;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    particles.forEach(p => {
        ctx.globalAlpha = p.life / 30;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
        ctx.globalAlpha = 1;
    });
}

// 게임 업데이트
function update() {
    if (gameState !== 'playing') return;
    
    // 패들 이동 (마우스)
    if (mouseX > 0 && mouseX < canvas.width) {
        paddle.x = mouseX - paddle.width / 2;
    }
    
    // 패들 이동 (키보드)
    if (rightPressed && paddle.x < canvas.width - paddle.width) {
        paddle.x += paddle.speed;
    } else if (leftPressed && paddle.x > 0) {
        paddle.x -= paddle.speed;
    }
    
    // 공 이동
    ball.x += ball.dx;
    ball.y += ball.dy;
    
    // 벽과 충돌
    if (ball.x + ball.dx > canvas.width - ball.radius || ball.x + ball.dx < ball.radius) {
        ball.dx = -ball.dx;
    }
    if (ball.y + ball.dy < ball.radius) {
        ball.dy = -ball.dy;
    } else if (ball.y + ball.dy > canvas.height - ball.radius) {
        // 패들과 충돌 확인
        if (ball.x > paddle.x && ball.x < paddle.x + paddle.width && 
            ball.y + ball.radius > paddle.y) {
            // 패들의 어느 부분에 맞았는지에 따라 공의 각도 조정
            const hitPos = (ball.x - paddle.x) / paddle.width;
            ball.dx = ball.speed * (hitPos - 0.5) * 2;
            ball.dy = -Math.abs(ball.dy);
        } else {
            // 생명 감소
            lives--;
            updateLives();
            if (lives === 0) {
                gameState = 'gameOver';
            } else {
                // 공 리셋
                ball.x = canvas.width / 2;
                ball.y = canvas.height - 30;
                ball.dx = 5;
                ball.dy = -5;
            }
        }
    }
    
    // 벽돌 충돌 감지
    collisionDetection();
    
    // 파티클 업데이트
    updateParticles();
}

// 게임 렌더링
function draw() {
    // 캔버스 지우기
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 배경 그라디언트
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 게임 객체들 그리기
    drawBricks();
    drawBall();
    drawPaddle();
    drawParticles();
    
    // 게임 상태에 따른 메시지
    if (gameState === 'menu') {
        drawMessage('벽돌깨기 게임', '시작 버튼을 클릭하거나 스페이스바를 누르세요');
    } else if (gameState === 'paused') {
        drawMessage('일시정지', '계속하려면 일시정지 버튼을 다시 누르세요');
    } else if (gameState === 'gameOver') {
        drawMessage('게임 오버', `최종 점수: ${score}`);
    } else if (gameState === 'gameWon') {
        drawMessage('축하합니다!', `모든 벽돌을 깨뜨렸습니다! 점수: ${score}`);
    }
}

// 게임 루프
function gameLoop() {
    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
}

// 게임 시작
function startGame() {
    if (gameState === 'menu' || gameState === 'gameOver' || gameState === 'gameWon') {
        resetGame();
    }
    gameState = 'playing';
    updateButtons();
}

// 일시정지 토글
function togglePause() {
    if (gameState === 'playing') {
        gameState = 'paused';
    } else if (gameState === 'paused') {
        gameState = 'playing';
    }
    updateButtons();
}

// 게임 리셋
function resetGame() {
    gameState = 'menu';
    score = 0;
    lives = 3;
    
    // 공 리셋
    ball.x = canvas.width / 2;
    ball.y = canvas.height - 30;
    ball.dx = 5;
    ball.dy = -5;
    
    // 패들 리셋
    paddle.x = (canvas.width - paddle.width) / 2;
    
    // 벽돌 리셋
    initBricks();
    
    // UI 업데이트
    updateScore();
    updateLives();
    updateButtons();
    
    // 파티클 초기화
    particles = [];
}

// UI 업데이트 함수들
function updateScore() {
    scoreElement.textContent = `점수: ${score}`;
}

function updateLives() {
    livesElement.textContent = `생명: ${lives}`;
}

function updateButtons() {
    startBtn.disabled = gameState === 'playing';
    pauseBtn.disabled = gameState !== 'playing' && gameState !== 'paused';
    pauseBtn.textContent = gameState === 'paused' ? '재시작' : '일시정지';
}

// roundRect 폴리필 (구형 브라우저 지원)
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
        this.beginPath();
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.lineTo(x + width, y + height - radius);
        this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.lineTo(x + radius, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
        this.closePath();
    };
}

// 게임 초기화 및 시작
initBricks();
updateScore();
updateLives();
updateButtons();
gameLoop();