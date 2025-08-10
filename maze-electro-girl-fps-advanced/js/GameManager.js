/**
 * GameManager: 핵심 게임 상태 관리 시스템
 * 
 * 핵심 기능:
 * - 전체 게임 루프 및 상태 관리
 * - 시스템 간 상호작용 조율
 * - 3D 미로 환경 생성
 * - 게임 진행 및 승리/패배 조건
 * - 저장/로드 시스템
 */
class GameManager {
    constructor() {
        // 게임 상태
        this.gameState = 'menu'; // 'menu', 'playing', 'paused', 'gameOver', 'victory'
        this.isInitialized = false;
        
        // Three.js 핵심 요소들
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        // 게임 시스템들
        this.playerController = null;
        this.electroGun = null;
        this.enemyManager = null;
        this.itemManager = null;
        this.uiManager = null;
        this.effectsManager = null;
        
        // 미로 시스템
        this.maze = {
            layout: null,
            walls: [],
            floors: [],
            size: { width: 15, height: 15 }
        };
        
        // 게임 설정
        this.settings = {
            difficulty: 'normal', // 'easy', 'normal', 'hard'
            renderDistance: 100,
            shadowQuality: 'medium',
            particleCount: 'high'
        };
        
        // 성능 모니터링
        this.performance = {
            fps: 60,
            frameTime: 0,
            lastFrameTime: 0
        };
        
        // 게임 타이머
        this.gameTimer = {
            startTime: 0,
            currentTime: 0,
            deltaTime: 0
        };
        
        // 승리 조건
        this.winConditions = {
            coinsRequired: 10, // 최소 수집해야 할 코인 수
            enemiesRequired: 5, // 최소 처치해야 할 적 수
            timeLimit: 300 // 5분 시간 제한 (선택사항)
        };
        
        this.init();
    }
    
    /**
     * 게임 초기화
     */
    init() {
        this.initThreeJS();
        this.createMaze();
        this.initSystems();
        this.setupLighting();
        this.startGameLoop();
        
        this.isInitialized = true;
        console.log('🎮 게임 매니저 초기화 완료');
    }
    
    /**
     * Three.js 초기화
     */
    initThreeJS() {
        // Scene 생성
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x001122);
        this.scene.fog = new THREE.Fog(0x001122, 10, this.settings.renderDistance);
        
        // Camera 생성
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            this.settings.renderDistance
        );
        
        // Renderer 생성
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        
        // DOM에 추가
        const container = document.getElementById('gameContainer');
        if (container) {
            container.appendChild(this.renderer.domElement);
        }
        
        // 리사이즈 이벤트
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    /**
     * 3D 미로 생성
     */
    createMaze() {
        // 미로 레이아웃 (1=벽, 0=길, 2=코인 위치, 3=전기큐브 위치, 4=적 스폰)
        this.maze.layout = [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,2,0,1,0,0,0,1,0,0,2,0,0,1],
            [1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],
            [1,0,0,0,0,0,1,0,0,0,1,0,3,0,1],
            [1,1,1,1,0,1,1,1,1,0,1,0,1,0,1],
            [1,0,0,2,0,0,0,0,0,0,1,0,0,0,1],
            [1,0,1,1,1,1,1,0,1,1,1,1,1,0,1],
            [1,0,0,0,0,0,1,0,0,0,0,0,1,4,1],
            [1,0,1,1,1,0,1,0,1,1,1,0,1,0,1],
            [1,2,1,0,0,0,0,0,1,0,3,0,0,0,1],
            [1,0,1,0,1,1,1,1,1,0,1,1,1,0,1],
            [1,0,0,0,1,0,0,0,0,0,1,0,4,0,1],
            [1,1,1,0,1,0,1,1,1,0,1,0,1,1,1],
            [1,0,2,0,0,0,1,0,0,0,0,0,0,2,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ];
        
        this.generateMazeGeometry();
    }
    
    /**
     * 미로 지오메트리 생성
     */
    generateMazeGeometry() {
        // 재료 생성
        const wallMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x4a4a4a,
            map: this.createWallTexture()
        });
        
        const floorMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x333333,
            map: this.createFloorTexture()
        });
        
        const ceilingMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x222222
        });
        
        // 바닥 생성
        const floorGeometry = new THREE.PlaneGeometry(this.maze.size.width, this.maze.size.height);
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        floor.userData.isFloor = true;
        this.scene.add(floor);
        
        // 천장 생성
        const ceiling = new THREE.Mesh(floorGeometry, ceilingMaterial);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = 4;
        ceiling.userData.isCeiling = true;
        this.scene.add(ceiling);
        
        // 벽 생성
        for (let z = 0; z < this.maze.layout.length; z++) {
            for (let x = 0; x < this.maze.layout[z].length; x++) {
                if (this.maze.layout[z][x] === 1) {
                    this.createWallBlock(x, z, wallMaterial);
                }
            }
        }
    }
    
    /**
     * 벽 블록 생성
     */
    createWallBlock(x, z, material) {
        const wallGeometry = new THREE.BoxGeometry(1, 3, 1);
        const wall = new THREE.Mesh(wallGeometry, material);
        wall.position.set(x, 1.5, z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        wall.userData.isWall = true;
        wall.userData.gridPosition = { x, z };
        
        this.maze.walls.push(wall);
        this.scene.add(wall);
    }
    
    /**
     * 벽 텍스처 생성 (간단한 절차적 텍스처)
     */
    createWallTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // 벽돌 패턴
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(0, 0, 256, 256);
        
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        
        // 수직선
        for (let i = 0; i < 256; i += 32) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, 256);
            ctx.stroke();
        }
        
        // 수평선
        for (let i = 0; i < 256; i += 32) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(256, i);
            ctx.stroke();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        
        return texture;
    }
    
    /**
     * 바닥 텍스처 생성
     */
    createFloorTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // 체크무늬 패턴
        for (let x = 0; x < 8; x++) {
            for (let y = 0; y < 8; y++) {
                ctx.fillStyle = (x + y) % 2 === 0 ? '#444' : '#333';
                ctx.fillRect(x * 32, y * 32, 32, 32);
            }
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);
        
        return texture;
    }
    
    /**
     * 시스템들 초기화
     */
    initSystems() {
        // UI 매니저 (가장 먼저)
        this.uiManager = new UIManager(this);
        
        // 플레이어 컨트롤러
        this.playerController = new PlayerController(this.scene, this.camera, this);
        
        // 전기 총
        this.electroGun = new ElectroGun(this.scene, this.camera, this);
        
        // 적 매니저
        this.enemyManager = new EnemyAI(this.scene, this);
        
        // 아이템 매니저
        this.itemManager = new ItemManager(this.scene, this);
        
        // 이펙트 매니저
        this.effectsManager = new EffectsManager(this.scene, this);
        
        // 시스템 간 참조 설정
        this.setupSystemReferences();
    }
    
    /**
     * 시스템 간 참조 설정
     */
    setupSystemReferences() {
        // 플레이어 컨트롤러에 총 참조 추가
        if (this.playerController && this.electroGun) {
            this.playerController.electroGun = this.electroGun;
        }
        
        // 적 매니저에 플레이어 참조 추가
        if (this.enemyManager && this.playerController) {
            this.enemyManager.playerController = this.playerController;
        }
    }
    
    /**
     * 조명 설정
     */
    setupLighting() {
        // 주변광
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        // 주 방향광
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        
        // 그림자 설정
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -15;
        directionalLight.shadow.camera.right = 15;
        directionalLight.shadow.camera.top = 15;
        directionalLight.shadow.camera.bottom = -15;
        
        this.scene.add(directionalLight);
        
        // 미로 중앙 스팟라이트
        const spotLight = new THREE.SpotLight(0xffffff, 0.5, 20, Math.PI * 0.3, 0.3, 1);
        spotLight.position.set(7.5, 8, 7.5);
        spotLight.target.position.set(7.5, 0, 7.5);
        spotLight.castShadow = true;
        this.scene.add(spotLight);
        this.scene.add(spotLight.target);
    }
    
    /**
     * 게임 루프 시작
     */
    startGameLoop() {
        this.gameTimer.lastFrameTime = performance.now();
        this.animate();
    }
    
    /**
     * 메인 게임 루프
     */
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // 델타 타임 계산
        const currentTime = performance.now();
        this.gameTimer.deltaTime = (currentTime - this.gameTimer.lastFrameTime) / 1000;
        this.gameTimer.lastFrameTime = currentTime;
        this.gameTimer.currentTime += this.gameTimer.deltaTime;
        
        // FPS 계산
        this.performance.fps = 1 / this.gameTimer.deltaTime;
        
        // 게임이 진행 중일 때만 업데이트
        if (this.gameState === 'playing') {
            this.updateSystems(this.gameTimer.deltaTime);
            this.checkWinConditions();
            this.checkLoseConditions();
        }
        
        // UI는 항상 업데이트
        if (this.uiManager) {
            this.uiManager.update(this.gameTimer.deltaTime);
        }
        
        // 렌더링
        this.renderer.render(this.scene, this.camera);
    }
    
    /**
     * 시스템들 업데이트
     */
    updateSystems(deltaTime) {
        // 플레이어 업데이트
        if (this.playerController) {
            this.playerController.update(deltaTime);
        }
        
        // 전기 총 업데이트
        if (this.electroGun) {
            this.electroGun.update(deltaTime);
        }
        
        // 적 매니저 업데이트
        if (this.enemyManager) {
            this.enemyManager.update(deltaTime);
        }
        
        // 아이템 매니저 업데이트
        if (this.itemManager) {
            this.itemManager.update(deltaTime);
        }
        
        // 이펙트 매니저 업데이트
        if (this.effectsManager) {
            this.effectsManager.update(deltaTime);
        }
    }
    
    /**
     * 승리 조건 체크
     */
    checkWinConditions() {
        if (!this.uiManager) return;
        
        const stats = this.uiManager.getState().gameStats;
        
        // 모든 코인 수집했는지 체크
        const allCoinsCollected = this.itemManager && this.itemManager.coins.length === 0;
        
        // 최소 조건 만족했는지 체크
        const minCoinsCollected = stats.coinsCollected >= this.winConditions.coinsRequired;
        const minEnemiesKilled = stats.enemiesKilled >= this.winConditions.enemiesRequired;
        
        if (allCoinsCollected && minCoinsCollected && minEnemiesKilled) {
            this.victory();
        }
    }
    
    /**
     * 패배 조건 체크
     */
    checkLoseConditions() {
        // 플레이어 사망
        if (this.playerController && !this.playerController.isAlive) {
            this.gameOver();
            return;
        }
        
        // 시간 제한 (선택사항)
        if (this.winConditions.timeLimit > 0) {
            if (this.gameTimer.currentTime > this.winConditions.timeLimit) {
                this.gameOver();
                return;
            }
        }
    }
    
    /**
     * 게임 시작
     */
    startGame() {
        this.gameState = 'playing';
        this.gameTimer.startTime = performance.now();
        this.gameTimer.currentTime = 0;
        
        // 시스템들 리셋
        if (this.playerController) this.playerController.reset();
        if (this.electroGun) this.electroGun.reset();
        if (this.enemyManager) this.enemyManager.clearAllEnemies();
        if (this.itemManager) this.itemManager.reset();
        if (this.effectsManager) this.effectsManager.reset();
        
        console.log('🚀 게임 시작!');
    }
    
    /**
     * 게임 일시정지
     */
    pauseGame() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
        }
    }
    
    /**
     * 게임 재개
     */
    resumeGame() {
        if (this.gameState === 'paused') {
            this.gameState = 'playing';
        }
    }
    
    /**
     * 게임 재시작
     */
    restartGame() {
        this.gameState = 'playing';
        this.gameTimer.startTime = performance.now();
        this.gameTimer.currentTime = 0;
        
        // 모든 시스템 리셋
        if (this.playerController) this.playerController.reset();
        if (this.electroGun) this.electroGun.reset();
        if (this.enemyManager) this.enemyManager.clearAllEnemies();
        if (this.itemManager) this.itemManager.reset();
        if (this.effectsManager) this.effectsManager.reset();
        if (this.uiManager) this.uiManager.resetStats();
        
        console.log('🔄 게임 재시작!');
    }
    
    /**
     * 게임 오버
     */
    gameOver() {
        this.gameState = 'gameOver';
        
        if (this.uiManager) {
            this.uiManager.showGameOver();
        }
        
        console.log('💀 게임 오버!');
    }
    
    /**
     * 승리
     */
    victory() {
        this.gameState = 'victory';
        
        if (this.uiManager) {
            this.uiManager.showVictory();
        }
        
        // 승리 이펙트
        if (this.effectsManager) {
            this.effectsManager.createVictoryEffect();
        }
        
        console.log('🎉 승리!');
    }
    
    /**
     * 미로 충돌 검사
     */
    checkMazeCollision(position, radius = 0.3) {
        const x = Math.floor(position.x + 0.5);
        const z = Math.floor(position.z + 0.5);
        
        // 경계 체크
        if (x < 0 || x >= this.maze.size.width || z < 0 || z >= this.maze.size.height) {
            return true;
        }
        
        // 벽 체크
        return this.maze.layout[z] && this.maze.layout[z][x] === 1;
    }
    
    /**
     * 총알 벽 충돌 검사
     */
    checkBulletWallCollision(position) {
        return this.checkMazeCollision(position, 0.1);
    }
    
    /**
     * 미로 위치가 벽인지 체크
     */
    isWall(x, z) {
        if (x < 0 || x >= this.maze.size.width || z < 0 || z >= this.maze.size.height) {
            return true;
        }
        return this.maze.layout[z][x] === 1;
    }
    
    /**
     * 윈도우 리사이즈 처리
     */
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    /**
     * 게임 상태 확인
     */
    isPlaying() {
        return this.gameState === 'playing';
    }
    
    isPaused() {
        return this.gameState === 'paused';
    }
    
    isGameOver() {
        return this.gameState === 'gameOver';
    }
    
    isVictory() {
        return this.gameState === 'victory';
    }
    
    /**
     * 게임 설정 변경
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        
        // 설정에 따른 렌더러 업데이트
        if (newSettings.shadowQuality) {
            this.updateShadowQuality(newSettings.shadowQuality);
        }
        
        if (newSettings.renderDistance) {
            this.camera.far = newSettings.renderDistance;
            this.camera.updateProjectionMatrix();
            this.scene.fog.far = newSettings.renderDistance;
        }
    }
    
    /**
     * 그림자 품질 업데이트
     */
    updateShadowQuality(quality) {
        const shadowMaps = {
            'low': 512,
            'medium': 1024,
            'high': 2048,
            'ultra': 4096
        };
        
        const mapSize = shadowMaps[quality] || 1024;
        
        this.scene.traverse((object) => {
            if (object.isLight && object.shadow) {
                object.shadow.mapSize.width = mapSize;
                object.shadow.mapSize.height = mapSize;
            }
        });
    }
    
    /**
     * 디버그 정보 출력
     */
    getDebugInfo() {
        return {
            gameState: this.gameState,
            fps: Math.round(this.performance.fps),
            gameTime: Math.round(this.gameTimer.currentTime),
            playerPosition: this.playerController ? this.playerController.position.clone() : null,
            enemyCount: this.enemyManager ? this.enemyManager.enemies.length : 0,
            itemCount: this.itemManager ? this.itemManager.getState().totalItems : 0
        };
    }
    
    /**
     * 정리 (게임 종료 시)
     */
    dispose() {
        // 이벤트 리스너 제거
        window.removeEventListener('resize', this.onWindowResize);
        
        // Three.js 객체들 정리
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        this.scene.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
        
        console.log('🧹 게임 매니저 정리 완료');
    }
}