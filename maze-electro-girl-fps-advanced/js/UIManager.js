/**
 * UIManager: 고급 UI 관리 시스템
 * 
 * 핵심 기능:
 * - 실시간 HUD 업데이트
 * - 게임 상태 화면 관리
 * - 애니메이션 및 시각적 피드백
 * - 알림 및 효과 시스템
 * - 반응형 UI 디자인
 */
class UIManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        
        // UI 요소들
        this.elements = {
            // HUD 요소들
            coinCount: document.getElementById('coinCount'),
            score: document.getElementById('score'),
            healthFill: document.getElementById('healthFill'),
            healthText: document.getElementById('healthText'),
            powerFill: document.getElementById('powerFill'),
            powerLevel: document.getElementById('powerLevel'),
            ammoCount: document.getElementById('ammoCount'),
            
            // 화면 요소들
            mainMenu: document.getElementById('mainMenu'),
            gameOverScreen: document.getElementById('gameOverScreen'),
            victoryScreen: document.getElementById('victoryScreen'),
            
            // 알림 및 효과
            damageIndicator: document.getElementById('damageIndicator'),
            pickupNotification: document.getElementById('pickupNotification'),
            
            // 최종 결과
            finalCoins: document.getElementById('finalCoins'),
            finalScore: document.getElementById('finalScore'),
            enemiesKilled: document.getElementById('enemiesKilled'),
            victoryCoins: document.getElementById('victoryCoins'),
            victoryScore: document.getElementById('victoryScore'),
            completionTime: document.getElementById('completionTime')
        };
        
        // 애니메이션 상태
        this.animations = {
            damageIndicator: {
                active: false,
                duration: 500,
                startTime: 0
            },
            pickupNotification: {
                active: false,
                duration: 2000,
                queue: []
            },
            scoreCounter: {
                current: 0,
                target: 0,
                speed: 50 // 초당 증가량
            },
            coinCounter: {
                current: 0,
                target: 0,
                speed: 5
            }
        };
        
        // 게임 통계
        this.gameStats = {
            startTime: 0,
            endTime: 0,
            coinsCollected: 0,
            enemiesKilled: 0,
            totalScore: 0
        };
        
        // 알림 메시지 템플릿
        this.notificationMessages = {
            COIN: '🪙 코인 획득!',
            POWER_CUBE: '⚡ 전기 큐브!',
            HEALTH_PACK: '❤️ 체력 회복!',
            SPEED_BOOST: '🏃 스피드 부스트!',
            SHIELD: '🛡️ 실드 활성화!',
            LEVEL_UP: '🔥 전기 총 레벨 업!',
            ENEMY_KILL: '💀 적 제거!'
        };
        
        // 크로스헤어 상태
        this.crosshair = {
            element: document.querySelector('.crosshair'),
            hitMarkerActive: false
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.initializeUI();
    }
    
    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 메인 메뉴 버튼들
        document.getElementById('startBtn')?.addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('tutorialBtn')?.addEventListener('click', () => {
            this.showTutorial();
        });
        
        // 게임 오버 화면 버튼들
        document.getElementById('restartBtn')?.addEventListener('click', () => {
            this.restartGame();
        });
        
        document.getElementById('mainMenuBtn')?.addEventListener('click', () => {
            this.showMainMenu();
        });
        
        // 승리 화면 버튼들
        document.getElementById('playAgainBtn')?.addEventListener('click', () => {
            this.restartGame();
        });
        
        document.getElementById('victoryMenuBtn')?.addEventListener('click', () => {
            this.showMainMenu();
        });
        
        // ESC 키로 메뉴 토글
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.toggleMenu();
            }
        });
    }
    
    /**
     * UI 초기화
     */
    initializeUI() {
        this.updateScore(0);
        this.updateCoins(0);
        this.updateHealth(100, 100);
        this.updateWeaponLevel(1, 5);
        this.showMainMenu();
    }
    
    /**
     * 메인 업데이트 (게임 루프에서 호출)
     */
    update(deltaTime) {
        this.updateAnimations(deltaTime);
        this.updateCounters(deltaTime);
        this.updateEffects(deltaTime);
    }
    
    /**
     * 애니메이션 업데이트
     */
    updateAnimations(deltaTime) {
        // 데미지 인디케이터
        if (this.animations.damageIndicator.active) {
            const elapsed = performance.now() - this.animations.damageIndicator.startTime;
            const progress = elapsed / this.animations.damageIndicator.duration;
            
            if (progress >= 1) {
                this.animations.damageIndicator.active = false;
                this.elements.damageIndicator.classList.remove('active');
            }
        }
        
        // 픽업 알림
        if (this.animations.pickupNotification.active) {
            const elapsed = performance.now() - this.animations.pickupNotification.startTime;
            const progress = elapsed / this.animations.pickupNotification.duration;
            
            if (progress >= 1) {
                this.hidePickupNotification();
                this.processNotificationQueue();
            }
        }
    }
    
    /**
     * 카운터 애니메이션 업데이트
     */
    updateCounters(deltaTime) {
        // 점수 카운터
        if (this.animations.scoreCounter.current !== this.animations.scoreCounter.target) {
            const diff = this.animations.scoreCounter.target - this.animations.scoreCounter.current;
            const increment = Math.sign(diff) * Math.min(Math.abs(diff), this.animations.scoreCounter.speed * deltaTime);
            this.animations.scoreCounter.current += increment;
            
            if (this.elements.score) {
                this.elements.score.textContent = Math.floor(this.animations.scoreCounter.current);
            }
        }
        
        // 코인 카운터
        if (this.animations.coinCounter.current !== this.animations.coinCounter.target) {
            const diff = this.animations.coinCounter.target - this.animations.coinCounter.current;
            const increment = Math.sign(diff) * Math.min(Math.abs(diff), this.animations.coinCounter.speed * deltaTime);
            this.animations.coinCounter.current += increment;
            
            if (this.elements.coinCount) {
                this.elements.coinCount.textContent = Math.floor(this.animations.coinCounter.current);
            }
        }
    }
    
    /**
     * 효과 업데이트
     */
    updateEffects(deltaTime) {
        // 크로스헤어 히트 마커
        if (this.crosshair.hitMarkerActive) {
            // 히트 마커는 짧은 시간 후 자동으로 사라짐
            setTimeout(() => {
                this.crosshair.hitMarkerActive = false;
                this.crosshair.element?.classList.remove('hit');
            }, 100);
        }
    }
    
    /**
     * 점수 업데이트
     */
    updateScore(score) {
        this.animations.scoreCounter.target = score;
        this.gameStats.totalScore = score;
    }
    
    /**
     * 코인 수 업데이트
     */
    updateCoins(coins) {
        this.animations.coinCounter.target = coins;
        this.gameStats.coinsCollected = coins;
    }
    
    /**
     * 체력 업데이트
     */
    updateHealth(current, max) {
        if (!this.elements.healthFill || !this.elements.healthText) return;
        
        const percentage = (current / max) * 100;
        this.elements.healthFill.style.width = `${percentage}%`;
        this.elements.healthText.textContent = Math.ceil(current);
        
        // 체력에 따른 색상 변화
        if (percentage > 70) {
            this.elements.healthFill.style.background = 'linear-gradient(90deg, #00FF00, #66FF66)';
        } else if (percentage > 30) {
            this.elements.healthFill.style.background = 'linear-gradient(90deg, #FFFF00, #FFFF66)';
        } else {
            this.elements.healthFill.style.background = 'linear-gradient(90deg, #FF0000, #FF6B6B)';
        }
        
        // 체력이 낮을 때 깜빡임 효과
        if (percentage < 20) {
            this.elements.healthFill.style.animation = 'healthCritical 1s infinite';
        } else {
            this.elements.healthFill.style.animation = 'none';
        }
    }
    
    /**
     * 무기 레벨 업데이트
     */
    updateWeaponLevel(level, maxLevel) {
        if (!this.elements.powerFill || !this.elements.powerLevel) return;
        
        const percentage = (level / maxLevel) * 100;
        this.elements.powerFill.style.width = `${percentage}%`;
        this.elements.powerLevel.textContent = level;
        
        // 레벨에 따른 색상 변화
        const colors = [
            'linear-gradient(90deg, #8A2BE2, #DDA0DD)', // 레벨 1
            'linear-gradient(90deg, #00FFFF, #66FFFF)', // 레벨 2
            'linear-gradient(90deg, #FFD700, #FFFF66)', // 레벨 3
            'linear-gradient(90deg, #FF6B6B, #FF9999)', // 레벨 4
            'linear-gradient(90deg, #00FF00, #66FF66)'  // 레벨 5
        ];
        
        this.elements.powerFill.style.background = colors[level - 1] || colors[0];
    }
    
    /**
     * 오버히트 상태 업데이트
     */
    updateOverheat(heat, maxHeat, overheated) {
        // 오버히트 UI 구현 (필요시 추가)
        if (overheated) {
            // 화면에 오버히트 경고 표시
            console.log('🔥 무기 과열!');
        }
    }
    
    /**
     * 데미지 인디케이터 표시
     */
    showDamageIndicator() {
        if (!this.elements.damageIndicator) return;
        
        this.animations.damageIndicator.active = true;
        this.animations.damageIndicator.startTime = performance.now();
        this.elements.damageIndicator.classList.add('active');
        
        // 크로스헤어도 빨갛게
        this.crosshair.element?.classList.add('damage');
        setTimeout(() => {
            this.crosshair.element?.classList.remove('damage');
        }, 300);
    }
    
    /**
     * 픽업 알림 표시
     */
    showPickupNotification(type, value) {
        const message = this.notificationMessages[type] || '아이템 획득!';
        const displayText = value ? `${message} +${value}` : message;
        
        // 큐에 추가
        this.animations.pickupNotification.queue.push({
            text: displayText,
            type: type
        });
        
        // 현재 표시 중이 아니면 즉시 표시
        if (!this.animations.pickupNotification.active) {
            this.processNotificationQueue();
        }
    }
    
    /**
     * 알림 큐 처리
     */
    processNotificationQueue() {
        if (this.animations.pickupNotification.queue.length === 0) {
            return;
        }
        
        const notification = this.animations.pickupNotification.queue.shift();
        this.displayPickupNotification(notification);
    }
    
    /**
     * 픽업 알림 실제 표시
     */
    displayPickupNotification(notification) {
        if (!this.elements.pickupNotification) return;
        
        this.elements.pickupNotification.textContent = notification.text;
        this.elements.pickupNotification.className = `pickup-notification show ${notification.type.toLowerCase()}`;
        
        this.animations.pickupNotification.active = true;
        this.animations.pickupNotification.startTime = performance.now();
    }
    
    /**
     * 픽업 알림 숨기기
     */
    hidePickupNotification() {
        if (!this.elements.pickupNotification) return;
        
        this.elements.pickupNotification.classList.remove('show');
        this.animations.pickupNotification.active = false;
    }
    
    /**
     * 히트 마커 표시
     */
    showHitMarker() {
        if (!this.crosshair.element) return;
        
        this.crosshair.element.classList.add('hit');
        this.crosshair.hitMarkerActive = true;
    }
    
    /**
     * 게임 시작
     */
    startGame() {
        this.hideAllScreens();
        this.gameStats.startTime = performance.now();
        
        if (this.gameManager) {
            this.gameManager.startGame();
        }
    }
    
    /**
     * 게임 재시작
     */
    restartGame() {
        this.hideAllScreens();
        this.resetStats();
        this.initializeUI();
        
        if (this.gameManager) {
            this.gameManager.restartGame();
        }
    }
    
    /**
     * 메인 메뉴 표시
     */
    showMainMenu() {
        this.hideAllScreens();
        if (this.elements.mainMenu) {
            this.elements.mainMenu.style.display = 'flex';
        }
        
        // 포인터 락 해제
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }
    
    /**
     * 게임 오버 화면 표시
     */
    showGameOver() {
        this.hideAllScreens();
        this.gameStats.endTime = performance.now();
        
        // 최종 통계 업데이트
        if (this.elements.finalCoins) {
            this.elements.finalCoins.textContent = this.gameStats.coinsCollected;
        }
        if (this.elements.finalScore) {
            this.elements.finalScore.textContent = this.gameStats.totalScore;
        }
        if (this.elements.enemiesKilled) {
            this.elements.enemiesKilled.textContent = this.gameStats.enemiesKilled;
        }
        
        if (this.elements.gameOverScreen) {
            this.elements.gameOverScreen.style.display = 'flex';
        }
        
        // 포인터 락 해제
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }
    
    /**
     * 승리 화면 표시
     */
    showVictory() {
        this.hideAllScreens();
        this.gameStats.endTime = performance.now();
        
        const completionTime = (this.gameStats.endTime - this.gameStats.startTime) / 1000;
        const minutes = Math.floor(completionTime / 60);
        const seconds = Math.floor(completionTime % 60);
        
        // 승리 통계 업데이트
        if (this.elements.victoryCoins) {
            this.elements.victoryCoins.textContent = this.gameStats.coinsCollected;
        }
        if (this.elements.victoryScore) {
            this.elements.victoryScore.textContent = this.gameStats.totalScore;
        }
        if (this.elements.completionTime) {
            this.elements.completionTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        if (this.elements.victoryScreen) {
            this.elements.victoryScreen.style.display = 'flex';
        }
        
        // 포인터 락 해제
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }
    
    /**
     * 튜토리얼 표시
     */
    showTutorial() {
        alert(`🎮 게임 튜토리얼

⚡ 미로의 전기 총 소녀가 되어 모험을 떠나보세요!

🎯 목표:
• 🪙 코인을 수집하여 점수를 얻으세요
• ⚡ 전기 큐브로 총을 업그레이드하세요
• 👹 악당들을 물리치세요

🎮 조작법:
• WASD / 방향키: 이동
• 마우스: 시점 회전
• 스페이스: 점프
• 클릭: 전기 총 발사
• ESC: 메뉴

💡 팁:
• 점프로 높은 곳의 아이템을 획득하세요
• 전기 큐브로 총을 강화하면 새로운 능력이 해금됩니다
• 적들마다 다른 행동 패턴을 가지고 있어요`);
    }
    
    /**
     * 메뉴 토글
     */
    toggleMenu() {
        if (this.gameManager && this.gameManager.isPlaying()) {
            this.showMainMenu();
            this.gameManager.pauseGame();
        }
    }
    
    /**
     * 모든 화면 숨기기
     */
    hideAllScreens() {
        const screens = [
            this.elements.mainMenu,
            this.elements.gameOverScreen,
            this.elements.victoryScreen
        ];
        
        screens.forEach(screen => {
            if (screen) {
                screen.style.display = 'none';
            }
        });
    }
    
    /**
     * 통계 리셋
     */
    resetStats() {
        this.gameStats = {
            startTime: 0,
            endTime: 0,
            coinsCollected: 0,
            enemiesKilled: 0,
            totalScore: 0
        };
        
        this.animations.scoreCounter.current = 0;
        this.animations.scoreCounter.target = 0;
        this.animations.coinCounter.current = 0;
        this.animations.coinCounter.target = 0;
    }
    
    /**
     * 적 처치 기록
     */
    recordEnemyKill() {
        this.gameStats.enemiesKilled++;
        this.showPickupNotification('ENEMY_KILL', null);
    }
    
    /**
     * 레벨업 알림
     */
    showLevelUpNotification() {
        this.showPickupNotification('LEVEL_UP', null);
    }
    
    /**
     * UI 가시성 설정
     */
    setUIVisibility(visible) {
        const hud = document.querySelector('.hud');
        const crosshair = document.querySelector('.crosshair');
        
        if (hud) hud.style.display = visible ? 'flex' : 'none';
        if (crosshair) crosshair.style.display = visible ? 'block' : 'none';
    }
    
    /**
     * 현재 상태 반환
     */
    getState() {
        return {
            gameStats: { ...this.gameStats },
            isMenuVisible: this.elements.mainMenu?.style.display !== 'none',
            currentScore: this.animations.scoreCounter.current,
            currentCoins: this.animations.coinCounter.current
        };
    }
}

// 추가 CSS 애니메이션을 동적으로 추가
const uiStyles = document.createElement('style');
uiStyles.textContent = `
    .crosshair.hit {
        color: #FF0000 !important;
        transform: translate(-50%, -50%) scale(1.3);
        transition: all 0.1s ease;
    }
    
    .crosshair.damage {
        color: #FF6666 !important;
        filter: drop-shadow(0 0 5px #FF0000);
    }
    
    .pickup-notification.coin {
        border-color: #FFD700;
        color: #FFD700;
    }
    
    .pickup-notification.power_cube {
        border-color: #00FFFF;
        color: #00FFFF;
    }
    
    .pickup-notification.health_pack {
        border-color: #FF6B6B;
        color: #FF6B6B;
    }
    
    @keyframes healthCritical {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
    
    .hud {
        transition: all 0.3s ease;
    }
    
    .hud.hidden {
        opacity: 0;
        transform: translateY(-20px);
    }
`;
document.head.appendChild(uiStyles);