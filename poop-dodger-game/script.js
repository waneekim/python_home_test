class PoopDodgerGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.livesElement = document.getElementById('lives');
        this.finalScoreElement = document.getElementById('finalScore');
        this.gameOverScreen = document.getElementById('gameOverScreen');
        
        this.player = {
            x: this.canvas.width / 2 - 25,
            y: this.canvas.height - 80,
            width: 50,
            height: 60,
            speed: 8
        };
        
        this.poops = [];
        this.score = 0;
        this.lives = 3;
        this.gameRunning = false;
        this.gameSpeed = 3;
        this.spawnRate = 0.02;
        
        this.keys = {
            left: false,
            right: false
        };
        
        this.setupEventListeners();
        this.gameLoop = this.gameLoop.bind(this);
    }
    
    setupEventListeners() {
        // 키보드 이벤트
        document.addEventListener('keydown', (e) => {
            switch(e.code) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.keys.left = true;
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.keys.right = true;
                    break;
            }
        });
        
        document.addEventListener('keyup', (e) => {
            switch(e.code) {
                case 'ArrowLeft':
                    this.keys.left = false;
                    break;
                case 'ArrowRight':
                    this.keys.right = false;
                    break;
            }
        });
        
        // 버튼 이벤트
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
    }
    
    startGame() {
        this.gameRunning = true;
        document.getElementById('startBtn').style.display = 'none';
        document.getElementById('pauseBtn').style.display = 'inline-block';
        document.getElementById('resetBtn').style.display = 'inline-block';
        this.gameLoop();
    }
    
    togglePause() {
        this.gameRunning = !this.gameRunning;
        const pauseBtn = document.getElementById('pauseBtn');
        if (this.gameRunning) {
            pauseBtn.textContent = '일시정지';
            this.gameLoop();
        } else {
            pauseBtn.textContent = '계속하기';
        }
    }
    
    resetGame() {
        this.gameRunning = false;
        this.score = 0;
        this.lives = 3;
        this.poops = [];
        this.player.x = this.canvas.width / 2 - 25;
        this.gameSpeed = 3;
        this.spawnRate = 0.02;
        
        this.updateUI();
        this.clearCanvas();
        this.drawPlayer();
        
        document.getElementById('startBtn').style.display = 'inline-block';
        document.getElementById('pauseBtn').style.display = 'none';
        document.getElementById('resetBtn').style.display = 'none';
        document.getElementById('pauseBtn').textContent = '일시정지';
        this.gameOverScreen.style.display = 'none';
    }
    
    restartGame() {
        this.resetGame();
        this.startGame();
    }
    
    updatePlayer() {
        // 플레이어 움직임
        if (this.keys.left && this.player.x > 0) {
            this.player.x -= this.player.speed;
        }
        if (this.keys.right && this.player.x < this.canvas.width - this.player.width) {
            this.player.x += this.player.speed;
        }
    }
    
    createPoop() {
        if (Math.random() < this.spawnRate) {
            const poopTypes = ['normal', 'long', 'wide', 'small', 'big'];
            const randomType = poopTypes[Math.floor(Math.random() * poopTypes.length)];
            
            // 10% 확률로 생크림 똥 생성
            const isCream = Math.random() < 0.1;
            const type = isCream ? 'cream' : randomType;
            
            let width = 30, height = 30;
            
            switch(type) {
                case 'long':
                    width = 25;
                    height = 40;
                    break;
                case 'wide':
                    width = 40;
                    height = 25;
                    break;
                case 'small':
                    width = 20;
                    height = 20;
                    break;
                case 'big':
                    width = 45;
                    height = 45;
                    break;
                case 'cream':
                    width = 35;
                    height = 35;
                    break;
            }
            
            this.poops.push({
                x: Math.random() * (this.canvas.width - width),
                y: -height,
                width: width,
                height: height,
                speed: this.gameSpeed + Math.random() * 2,
                type: type
            });
        }
    }
    
    updatePoops() {
        for (let i = this.poops.length - 1; i >= 0; i--) {
            this.poops[i].y += this.poops[i].speed;
            
            // 화면 밖으로 나간 똥 제거 및 점수 증가
            if (this.poops[i].y > this.canvas.height) {
                this.poops.splice(i, 1);
                this.score += 10;
                
                // 난이도 증가
                if (this.score % 200 === 0) {
                    this.gameSpeed += 0.5;
                    this.spawnRate += 0.005;
                }
            }
        }
    }
    
    checkCollisions() {
        for (let i = this.poops.length - 1; i >= 0; i--) {
            const poop = this.poops[i];
            
            if (poop.x < this.player.x + this.player.width &&
                poop.x + poop.width > this.player.x &&
                poop.y < this.player.y + this.player.height &&
                poop.y + poop.height > this.player.y) {
                
                // 충돌 발생
                this.poops.splice(i, 1);
                
                if (poop.type === 'cream') {
                    // 생크림 똥 - 생명 증가
                    this.lives++;
                    this.score += 50; // 보너스 점수
                    
                    // 긍정적인 효과
                    this.canvas.style.animation = 'glow 0.5s';
                    setTimeout(() => {
                        this.canvas.style.animation = '';
                    }, 500);
                } else {
                    // 일반 똥 - 생명 감소
                    this.lives--;
                    
                    // 화면 흔들림 효과
                    this.canvas.style.animation = 'shake 0.3s';
                    setTimeout(() => {
                        this.canvas.style.animation = '';
                    }, 300);
                    
                    if (this.lives <= 0) {
                        this.gameOver();
                    }
                }
                
                break;
            }
        }
    }
    
    gameOver() {
        this.gameRunning = false;
        this.finalScoreElement.textContent = this.score;
        this.gameOverScreen.style.display = 'block';
        
        document.getElementById('pauseBtn').style.display = 'none';
        document.getElementById('resetBtn').style.display = 'none';
    }
    
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    drawPlayer() {
        const ctx = this.ctx;
        const p = this.player;
        
        // 플레이어 몸 (사람 형태)
        ctx.fillStyle = '#FFB6C1';
        ctx.fillRect(p.x + 15, p.y + 10, 20, 30); // 몸통
        
        // 머리
        ctx.fillStyle = '#FFDBAC';
        ctx.beginPath();
        ctx.arc(p.x + 25, p.y + 15, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // 눈
        ctx.fillStyle = '#000';
        ctx.fillRect(p.x + 20, p.y + 10, 3, 3);
        ctx.fillRect(p.x + 27, p.y + 10, 3, 3);
        
        // 입
        ctx.beginPath();
        ctx.arc(p.x + 25, p.y + 18, 3, 0, Math.PI);
        ctx.stroke();
        
        // 팔
        ctx.fillStyle = '#FFDBAC';
        ctx.fillRect(p.x + 5, p.y + 20, 10, 5);
        ctx.fillRect(p.x + 35, p.y + 20, 10, 5);
        
        // 다리
        ctx.fillStyle = '#4169E1';
        ctx.fillRect(p.x + 18, p.y + 40, 6, 20);
        ctx.fillRect(p.x + 26, p.y + 40, 6, 20);
    }
    
    drawPoops() {
        for (const poop of this.poops) {
            if (poop.type === 'cream') {
                this.drawCreamPoop(poop);
            } else {
                this.drawNormalPoop(poop);
            }
        }
    }
    
    drawNormalPoop(poop) {
        const ctx = this.ctx;
        const centerX = poop.x + poop.width / 2;
        const centerY = poop.y + poop.height / 2;
        
        ctx.fillStyle = '#8B4513';
        
        switch(poop.type) {
            case 'normal':
                // 기본 똥 모양 (3단 구조)
                ctx.beginPath();
                ctx.arc(centerX, poop.y + poop.height * 0.3, poop.width * 0.25, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(centerX, poop.y + poop.height * 0.6, poop.width * 0.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(centerX, poop.y + poop.height * 0.85, poop.width * 0.15, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'long':
                // 긴 똥 모양 (5단 구조)
                for (let i = 0; i < 5; i++) {
                    const radius = Math.max(2, (poop.width * 0.25) - (i * 1));
                    ctx.beginPath();
                    ctx.arc(centerX, poop.y + (i + 1) * (poop.height / 6), radius, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
                
            case 'wide':
                // 넓고 납작한 똥
                ctx.fillRect(poop.x + 5, poop.y + 8, poop.width - 10, poop.height - 16);
                ctx.beginPath();
                ctx.arc(poop.x + poop.width / 4, centerY, poop.height * 0.3, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(poop.x + poop.width * 0.75, centerY, poop.height * 0.3, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'small':
                // 작은 똥 (2단)
                ctx.beginPath();
                ctx.arc(centerX, poop.y + poop.height * 0.4, poop.width * 0.3, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(centerX, poop.y + poop.height * 0.8, poop.width * 0.2, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'big':
                // 큰 똥 (4단 구조)
                for (let i = 0; i < 4; i++) {
                    const radius = Math.max(3, (poop.width * 0.3) - (i * 2));
                    ctx.beginPath();
                    ctx.arc(centerX, poop.y + (i + 1) * (poop.height / 5), radius, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
        }
        
        // 냄새 표시
        ctx.strokeStyle = '#90EE90';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX - 5, poop.y - 5);
        ctx.lineTo(centerX - 7, poop.y - 10);
        ctx.moveTo(centerX, poop.y - 5);
        ctx.lineTo(centerX - 2, poop.y - 10);
        ctx.moveTo(centerX + 5, poop.y - 5);
        ctx.lineTo(centerX + 3, poop.y - 10);
        ctx.stroke();
    }
    
    drawCreamPoop(poop) {
        const ctx = this.ctx;
        const centerX = poop.x + poop.width / 2;
        const centerY = poop.y + poop.height / 2;
        
        // 생크림 베이스 (흰색)
        ctx.fillStyle = '#FFFAF0';
        ctx.beginPath();
        ctx.arc(centerX, centerY, poop.width * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        // 생크림 토핑들
        ctx.fillStyle = '#FFF8DC';
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6;
            const x = centerX + Math.cos(angle) * (poop.width * 0.2);
            const y = centerY + Math.sin(angle) * (poop.height * 0.2);
            ctx.beginPath();
            ctx.arc(x, y, Math.max(2, 4), 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 중앙 체리
        ctx.fillStyle = '#FF1493';
        ctx.beginPath();
        ctx.arc(centerX, centerY - 5, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // 반짝임 효과
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(centerX - 8, centerY - 8, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX + 6, centerY - 6, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    updateUI() {
        this.scoreElement.textContent = this.score;
        this.livesElement.textContent = this.lives;
    }
    
    gameLoop() {
        if (!this.gameRunning) return;
        
        try {
            this.clearCanvas();
            
            this.updatePlayer();
            this.createPoop();
            this.updatePoops();
            this.checkCollisions();
            
            this.drawPlayer();
            this.drawPoops();
            
            this.updateUI();
            
            requestAnimationFrame(this.gameLoop);
        } catch (error) {
            console.error('Game loop error:', error);
            // 오류 발생 시 게임 재시작
            this.resetGame();
        }
    }
}

// CSS 애니메이션 추가
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    
    @keyframes glow {
        0%, 100% { 
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
            transform: scale(1);
        }
        50% { 
            box-shadow: 0 0 40px rgba(255, 215, 0, 0.8);
            transform: scale(1.02);
        }
    }
`;
document.head.appendChild(style);

// 게임 초기화
const game = new PoopDodgerGame();
game.drawPlayer();