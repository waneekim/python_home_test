/**
 * Main.js: 게임 시스템 통합 및 초기화
 * 
 * 핵심 기능:
 * - 모든 시스템 모듈 연결
 * - 게임 시작 및 종료 관리
 * - 전역 이벤트 처리
 * - 성능 모니터링
 * - 오류 처리 및 디버깅
 */

// 전역 게임 인스턴스
let gameInstance = null;

// 게임 설정
const GAME_CONFIG = {
    debug: false,
    autoStart: false,
    maxFPS: 60,
    enableSounds: true,
    shadowQuality: 'medium',
    particleQuality: 'high'
};

/**
 * 메인 게임 클래스
 */
class MazeElectroGirl3DGame {
    constructor(config = {}) {
        this.config = { ...GAME_CONFIG, ...config };
        this.isInitialized = false;
        this.isRunning = false;
        
        // 시스템 참조들
        this.gameManager = null;
        
        // 성능 모니터링
        this.performance = {
            frameCount: 0,
            lastFPSUpdate: 0,
            currentFPS: 0,
            memoryUsage: 0
        };
        
        // 오류 핸들링
        this.errorHandler = new GameErrorHandler();
        
        console.log('🎮 미로의 전기 총 소녀: 3D FPS 어드벤처 게임 생성');
    }
    
    /**
     * 게임 초기화
     */
    async init() {
        try {
            console.log('🚀 게임 초기화 시작...');
            
            // 필수 요소 체크
            if (!this.checkRequirements()) {
                throw new Error('게임 실행 요구사항이 충족되지 않았습니다.');
            }
            
            // 게임 매니저 초기화
            this.gameManager = new GameManager();
            
            // 시스템 검증
            if (!this.validateSystems()) {
                throw new Error('시스템 초기화 중 오류가 발생했습니다.');
            }
            
            // 전역 이벤트 리스너 설정
            this.setupGlobalEventListeners();
            
            // 성능 모니터링 시작
            if (this.config.debug) {
                this.startPerformanceMonitoring();
            }
            
            this.isInitialized = true;
            console.log('✅ 게임 초기화 완료');
            
            // 자동 시작 설정이면 게임 시작
            if (this.config.autoStart) {
                this.start();
            }
            
            return true;
            
        } catch (error) {
            this.errorHandler.handleError(error, 'INIT_ERROR');
            return false;
        }
    }
    
    /**
     * 시스템 요구사항 체크
     */
    checkRequirements() {
        // WebGL 지원 체크
        if (!window.WebGLRenderingContext) {
            alert('이 브라우저는 WebGL을 지원하지 않습니다. 최신 브라우저를 사용해주세요.');
            return false;
        }
        
        // Three.js 로드 체크
        if (typeof THREE === 'undefined') {
            console.error('Three.js가 로드되지 않았습니다.');
            return false;
        }
        
        // 필수 HTML 요소들 체크
        const requiredElements = [
            'gameContainer',
            'mainMenu',
            'gameOverScreen',
            'victoryScreen',
            'hud'
        ];
        
        for (const elementId of requiredElements) {
            if (!document.getElementById(elementId)) {
                console.error(`필수 요소가 없습니다: ${elementId}`);
                return false;
            }
        }
        
        // 필수 클래스들 체크
        const classChecks = [
            ['GameManager', typeof GameManager !== 'undefined'],
            ['PlayerController', typeof PlayerController !== 'undefined'],
            ['ElectroGun', typeof ElectroGun !== 'undefined'],
            ['EnemyAI', typeof EnemyAI !== 'undefined'],
            ['ItemManager', typeof ItemManager !== 'undefined'],
            ['UIManager', typeof UIManager !== 'undefined'],
            ['EffectsManager', typeof EffectsManager !== 'undefined'],
        ];

        for (const [className, isLoaded] of classChecks) {
            if (!isLoaded) {
                console.error(`필수 클래스가 로드되지 않았습니다: ${className}`);
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * 시스템 검증
     */
    validateSystems() {
        if (!this.gameManager) {
            console.error('GameManager 초기화 실패');
            return false;
        }
        
        if (!this.gameManager.isInitialized) {
            console.error('GameManager가 제대로 초기화되지 않았습니다');
            return false;
        }
        
        // 각 시스템이 제대로 연결되었는지 확인
        const systems = [
            'playerController',
            'electroGun', 
            'enemyManager',
            'itemManager',
            'uiManager',
            'effectsManager'
        ];
        
        for (const system of systems) {
            if (!this.gameManager[system]) {
                console.error(`시스템 초기화 실패: ${system}`);
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * 전역 이벤트 리스너 설정
     */
    setupGlobalEventListeners() {
        // 윈도우 포커스/블러 이벤트
        window.addEventListener('focus', () => {
            if (this.isRunning && this.gameManager.isPlaying()) {
                console.log('🎮 게임 포커스 복구');
            }
        });
        
        window.addEventListener('blur', () => {
            if (this.isRunning && this.gameManager.isPlaying()) {
                this.gameManager.pauseGame();
                console.log('⏸️ 게임 자동 일시정지 (윈도우 블러)');
            }
        });
        
        // 비포언로드 이벤트 (게임 저장/정리)
        window.addEventListener('beforeunload', (e) => {
            if (this.isRunning) {
                this.cleanup();
            }
        });
        
        // 오류 처리
        window.addEventListener('error', (e) => {
            this.errorHandler.handleError(e.error, 'RUNTIME_ERROR');
        });
        
        window.addEventListener('unhandledrejection', (e) => {
            this.errorHandler.handleError(e.reason, 'PROMISE_REJECTION');
        });
        
        // 키보드 단축키
        document.addEventListener('keydown', (e) => {
            this.handleGlobalKeydown(e);
        });
        
        // 터치 기기 지원
        if ('ontouchstart' in window) {
            this.setupTouchControls();
        }
    }
    
    /**
     * 전역 키보드 이벤트 처리
     */
    handleGlobalKeydown(e) {
        // 디버그 모드 토글 (F12)
        if (e.key === 'F12') {
            e.preventDefault();
            this.toggleDebugMode();
        }
        
        // 전체화면 토글 (F11)
        if (e.key === 'F11') {
            e.preventDefault();
            this.toggleFullscreen();
        }
        
        // 게임 일시정지 (P)
        if (e.key === 'p' || e.key === 'P') {
            if (this.gameManager && this.gameManager.isPlaying()) {
                this.gameManager.pauseGame();
            } else if (this.gameManager && this.gameManager.isPaused()) {
                this.gameManager.resumeGame();
            }
        }
        
        // 스크린샷 (F9)
        if (e.key === 'F9') {
            e.preventDefault();
            this.takeScreenshot();
        }
    }
    
    /**
     * 터치 컨트롤 설정
     */
    setupTouchControls() {
        console.log('📱 터치 기기 감지 - 터치 컨트롤 설정');
        
        // 터치 전용 UI 요소들 활성화
        document.body.classList.add('touch-device');
        
        // 가상 조이스틱 생성 (필요시)
        // this.createVirtualJoystick();
    }
    
    /**
     * 게임 시작
     */
    start() {
        if (!this.isInitialized) {
            console.error('게임이 초기화되지 않았습니다. init()을 먼저 호출하세요.');
            return false;
        }
        
        if (this.isRunning) {
            console.warn('게임이 이미 실행 중입니다.');
            return false;
        }
        
        try {
            console.log('🎬 게임 시작');
            
            this.isRunning = true;
            
            // UI 초기화
            if (this.gameManager.uiManager) {
                this.gameManager.uiManager.showMainMenu();
            }
            
            // 성능 모니터링 시작
            this.startPerformanceMonitoring();
            
            return true;
            
        } catch (error) {
            this.errorHandler.handleError(error, 'START_ERROR');
            return false;
        }
    }
    
    /**
     * 게임 중지
     */
    stop() {
        if (!this.isRunning) {
            return;
        }
        
        console.log('⏹️ 게임 중지');
        
        this.isRunning = false;
        
        if (this.gameManager) {
            this.gameManager.gameState = 'menu';
        }
        
        // 성능 모니터링 중지
        this.stopPerformanceMonitoring();
    }
    
    /**
     * 게임 재시작
     */
    restart() {
        console.log('🔄 게임 재시작');
        
        if (this.gameManager) {
            this.gameManager.restartGame();
        }
    }
    
    /**
     * 성능 모니터링 시작
     */
    startPerformanceMonitoring() {
        if (this.performanceInterval) return;
        
        this.performanceInterval = setInterval(() => {
            this.updatePerformanceMetrics();
        }, 1000);
        
        console.log('📊 성능 모니터링 시작');
    }
    
    /**
     * 성능 모니터링 중지
     */
    stopPerformanceMonitoring() {
        if (this.performanceInterval) {
            clearInterval(this.performanceInterval);
            this.performanceInterval = null;
        }
    }
    
    /**
     * 성능 메트릭 업데이트
     */
    updatePerformanceMetrics() {
        const now = performance.now();
        
        // FPS 계산
        this.performance.frameCount++;
        if (now - this.performance.lastFPSUpdate >= 1000) {
            this.performance.currentFPS = this.performance.frameCount;
            this.performance.frameCount = 0;
            this.performance.lastFPSUpdate = now;
        }
        
        // 메모리 사용량 (지원되는 브라우저에서)
        if (performance.memory) {
            this.performance.memoryUsage = performance.memory.usedJSHeapSize / (1024 * 1024); // MB
        }
        
        // 디버그 모드일 때 콘솔에 출력
        if (this.config.debug) {
            console.log(`📊 FPS: ${this.performance.currentFPS}, 메모리: ${this.performance.memoryUsage.toFixed(1)}MB`);
        }
    }
    
    /**
     * 디버그 모드 토글
     */
    toggleDebugMode() {
        this.config.debug = !this.config.debug;
        
        if (this.config.debug) {
            console.log('🔧 디버그 모드 활성화');
            this.showDebugInfo();
        } else {
            console.log('🔧 디버그 모드 비활성화');
            this.hideDebugInfo();
        }
    }
    
    /**
     * 디버그 정보 표시
     */
    showDebugInfo() {
        if (!this.debugPanel) {
            this.createDebugPanel();
        }
        
        this.debugPanel.style.display = 'block';
        
        // 디버그 정보 업데이트
        this.updateDebugPanel();
    }
    
    /**
     * 디버그 정보 숨기기
     */
    hideDebugInfo() {
        if (this.debugPanel) {
            this.debugPanel.style.display = 'none';
        }
    }
    
    /**
     * 디버그 패널 생성
     */
    createDebugPanel() {
        this.debugPanel = document.createElement('div');
        this.debugPanel.id = 'debugPanel';
        this.debugPanel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            z-index: 10000;
            min-width: 200px;
        `;
        
        document.body.appendChild(this.debugPanel);
    }
    
    /**
     * 디버그 패널 업데이트
     */
    updateDebugPanel() {
        if (!this.debugPanel || !this.gameManager) return;
        
        const debugInfo = this.gameManager.getDebugInfo();
        
        this.debugPanel.innerHTML = `
            <div><strong>🎮 게임 디버그 정보</strong></div>
            <div>FPS: ${this.performance.currentFPS}</div>
            <div>메모리: ${this.performance.memoryUsage.toFixed(1)}MB</div>
            <div>상태: ${debugInfo.gameState}</div>
            <div>게임 시간: ${debugInfo.gameTime}초</div>
            <div>플레이어 위치: ${debugInfo.playerPosition ? 
                `(${debugInfo.playerPosition.x.toFixed(1)}, ${debugInfo.playerPosition.z.toFixed(1)})` : 
                'N/A'}</div>
            <div>적 수: ${debugInfo.enemyCount}</div>
            <div>아이템 수: ${debugInfo.itemCount}</div>
        `;
        
        // 1초마다 업데이트
        setTimeout(() => {
            if (this.config.debug) {
                this.updateDebugPanel();
            }
        }, 1000);
    }
    
    /**
     * 전체화면 토글
     */
    toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
            console.log('🔳 전체화면 종료');
        } else {
            document.documentElement.requestFullscreen();
            console.log('🔲 전체화면 활성화');
        }
    }
    
    /**
     * 스크린샷 촬영
     */
    takeScreenshot() {
        if (!this.gameManager || !this.gameManager.renderer) {
            console.warn('스크린샷을 촬영할 수 없습니다.');
            return;
        }
        
        try {
            // 렌더러에서 이미지 데이터 추출
            const dataURL = this.gameManager.renderer.domElement.toDataURL('image/png');
            
            // 다운로드 링크 생성
            const link = document.createElement('a');
            link.download = `maze-electro-girl-${new Date().getTime()}.png`;
            link.href = dataURL;
            link.click();
            
            console.log('📸 스크린샷 저장됨');
            
        } catch (error) {
            console.error('스크린샷 촬영 실패:', error);
        }
    }
    
    /**
     * 게임 상태 반환
     */
    getState() {
        return {
            isInitialized: this.isInitialized,
            isRunning: this.isRunning,
            config: { ...this.config },
            performance: { ...this.performance },
            gameState: this.gameManager ? this.gameManager.gameState : null
        };
    }
    
    /**
     * 설정 업데이트
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // 게임 매니저에도 설정 전달
        if (this.gameManager) {
            this.gameManager.updateSettings(newConfig);
        }
        
        console.log('⚙️ 게임 설정 업데이트:', newConfig);
    }
    
    /**
     * 정리 작업
     */
    cleanup() {
        console.log('🧹 게임 정리 작업 시작');
        
        this.stop();
        
        // 성능 모니터링 정리
        this.stopPerformanceMonitoring();
        
        // 게임 매니저 정리
        if (this.gameManager) {
            this.gameManager.dispose();
            this.gameManager = null;
        }
        
        // 디버그 패널 제거
        if (this.debugPanel) {
            document.body.removeChild(this.debugPanel);
            this.debugPanel = null;
        }
        
        // 이벤트 리스너 제거
        // (필요에 따라 추가)
        
        this.isInitialized = false;
        this.isRunning = false;
        
        console.log('✅ 게임 정리 완료');
    }
}

/**
 * 게임 오류 처리 클래스
 */
class GameErrorHandler {
    constructor() {
        this.errorCount = 0;
        this.maxErrors = 10;
    }
    
    handleError(error, type = 'UNKNOWN_ERROR') {
        this.errorCount++;
        
        console.error(`🚨 게임 오류 [${type}]:`, error);
        
        // 오류가 너무 많으면 게임 중단
        if (this.errorCount >= this.maxErrors) {
            console.error('🚫 치명적 오류 - 게임을 중단합니다.');
            this.showFatalErrorMessage();
            return;
        }
        
        // 오류 타입별 처리
        switch (type) {
            case 'INIT_ERROR':
                this.showInitErrorMessage();
                break;
            case 'RUNTIME_ERROR':
                this.showRuntimeErrorMessage();
                break;
            case 'WEBGL_ERROR':
                this.showWebGLErrorMessage();
                break;
            default:
                this.showGenericErrorMessage();
                break;
        }
    }
    
    showInitErrorMessage() {
        alert('게임 초기화 중 오류가 발생했습니다.\n페이지를 새로고침한 후 다시 시도해주세요.');
    }
    
    showRuntimeErrorMessage() {
        console.warn('게임 실행 중 오류가 발생했지만 게임을 계속 진행합니다.');
    }
    
    showWebGLErrorMessage() {
        alert('WebGL 오류가 발생했습니다.\n브라우저를 업데이트하거나 다른 브라우저를 사용해보세요.');
    }
    
    showGenericErrorMessage() {
        console.warn('알 수 없는 오류가 발생했습니다.');
    }
    
    showFatalErrorMessage() {
        alert('치명적인 오류가 발생하여 게임을 중단합니다.\n페이지를 새로고침해주세요.');
    }
}

/**
 * 게임 초기화 및 시작
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🌟 미로의 전기 총 소녀: 3D FPS 어드벤처');
    console.log('📝 게임 제작: Claude Code AI');
    console.log('⚡ Three.js 기반 WebGL 게임');
    
    try {
        // 게임 인스턴스 생성
        gameInstance = new MazeElectroGirl3DGame({
            debug: false,
            autoStart: false,
            shadowQuality: 'medium',
            particleQuality: 'high'
        });
        
        // 게임 초기화
        const success = await gameInstance.init();
        
        if (success) {
            // 게임 시작
            gameInstance.start();
            
            console.log('🎉 게임 준비 완료! 즐거운 게임 되세요!');
            console.log('📖 조작법:');
            console.log('  • WASD / 방향키: 이동');
            console.log('  • 마우스: 시점 회전');
            console.log('  • 스페이스: 점프');
            console.log('  • 클릭: 전기 총 발사');
            console.log('  • ESC: 메뉴');
            console.log('  • P: 일시정지');
            console.log('  • F11: 전체화면');
            console.log('  • F12: 디버그 모드');
            
        } else {
            throw new Error('게임 초기화 실패');
        }
        
    } catch (error) {
        console.error('🚨 게임 시작 실패:', error);
        alert('게임을 시작할 수 없습니다.\n페이지를 새로고침한 후 다시 시도해주세요.');
    }
});

// 전역 액세스를 위한 게임 인스턴스 참조
window.MazeElectroGirl3D = {
    game: () => gameInstance,
    start: () => gameInstance?.start(),
    stop: () => gameInstance?.stop(),
    restart: () => gameInstance?.restart(),
    getState: () => gameInstance?.getState(),
    toggleDebug: () => gameInstance?.toggleDebugMode()
};

// 개발자 콘솔용 유틸리티
window.gameDebug = {
    info: () => gameInstance?.getState(),
    performance: () => gameInstance?.performance,
    config: () => gameInstance?.config,
    systems: () => gameInstance?.gameManager,
    screenshot: () => gameInstance?.takeScreenshot()
};

console.log('🎮 게임 스크립트 로드 완료');