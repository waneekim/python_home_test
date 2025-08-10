/**
 * ItemManager: 고급 아이템 관리 시스템
 * 
 * 핵심 기능:
 * - 코인 및 전기 큐브 생성 및 관리
 * - 동적 아이템 스폰 시스템
 * - 아이템 애니메이션 및 이펙트
 * - 수집 시 시각적/청각적 피드백
 * - 아이템별 특수 효과
 */
class ItemManager {
    constructor(scene, gameManager) {
        this.scene = scene;
        this.gameManager = gameManager;
        
        // 아이템 배열
        this.coins = [];
        this.powerCubes = [];
        this.specialItems = [];
        
        // 아이템 설정
        this.itemTypes = {
            COIN: {
                value: 10,
                color: 0xFFD700,
                size: 0.2,
                rotationSpeed: 2,
                bobSpeed: 3,
                bobHeight: 0.1,
                effectColor: 0xFFD700
            },
            POWER_CUBE: {
                value: 20,
                color: 0x00FFFF,
                size: 0.3,
                rotationSpeed: 1,
                bobSpeed: 2,
                bobHeight: 0.15,
                effectColor: 0x00FFFF
            }
        };
        
        this.init();
    }
    
    init() {
        this.createItemModels();
        this.setupInitialItems();
    }
    
    /**
     * 아이템 모델 생성
     */
    createItemModels() {
        // 코인 모델
        const coinGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 12);
        const coinMaterial = new THREE.MeshPhongMaterial({ 
            color: this.itemTypes.COIN.color,
            emissive: this.itemTypes.COIN.color * 0.2,
            shininess: 100
        });
        this.itemTypes.COIN.geometry = coinGeometry;
        this.itemTypes.COIN.material = coinMaterial;
        
        // 전기 큐브 모델
        const cubeGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const cubeMaterial = new THREE.MeshPhongMaterial({ 
            color: this.itemTypes.POWER_CUBE.color,
            emissive: this.itemTypes.POWER_CUBE.color * 0.3,
            transparent: true,
            opacity: 0.9
        });
        this.itemTypes.POWER_CUBE.geometry = cubeGeometry;
        this.itemTypes.POWER_CUBE.material = cubeMaterial;
    }
    
    /**
     * 초기 아이템 배치
     */
    setupInitialItems() {
        // 코인 위치
        const coinPositions = [
            new THREE.Vector3(2, 0.5, 2),
            new THREE.Vector3(5, 0.5, 3),
            new THREE.Vector3(8, 0.5, 6),
            new THREE.Vector3(11, 0.5, 4),
            new THREE.Vector3(6, 0.5, 9),
            new THREE.Vector3(3, 0.5, 12),
            new THREE.Vector3(13, 0.5, 8),
            new THREE.Vector3(9, 0.5, 13),
            new THREE.Vector3(4, 0.5, 7),
            new THREE.Vector3(12, 0.5, 11)
        ];
        
        // 전기 큐브 위치
        const cubePositions = [
            new THREE.Vector3(13, 0.5, 3),
            new THREE.Vector3(3, 0.5, 10),
            new THREE.Vector3(10, 0.5, 13),
            new THREE.Vector3(7, 0.5, 5)
        ];
        
        // 코인 생성
        coinPositions.forEach(pos => {
            this.createItem('COIN', pos);
        });
        
        // 전기 큐브 생성
        cubePositions.forEach(pos => {
            this.createItem('POWER_CUBE', pos);
        });
    }
    
    /**
     * 아이템 생성
     */
    createItem(type, position) {
        const itemType = this.itemTypes[type];
        if (!itemType) return null;
        
        const item = new THREE.Mesh(itemType.geometry, itemType.material.clone());
        item.position.copy(position);
        item.castShadow = true;
        
        // 아이템 데이터
        item.userData = {
            type: type,
            value: itemType.value,
            collected: false,
            animationTimer: Math.random() * Math.PI * 2,
            originalY: position.y
        };
        
        // 글로우 이펙트 추가
        const glowGeometry = itemType.geometry.clone();
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: itemType.effectColor,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.scale.setScalar(1.2);
        item.add(glow);
        item.userData.glow = glow;
        
        // 포인트 라이트 추가
        const light = new THREE.PointLight(itemType.effectColor, 0.5, 3);
        light.position.set(0, 0, 0);
        item.add(light);
        item.userData.light = light;
        
        this.scene.add(item);
        
        // 타입별 배열에 추가
        if (type === 'COIN') {
            this.coins.push(item);
        } else if (type === 'POWER_CUBE') {
            this.powerCubes.push(item);
        }
        
        return item;
    }
    
    /**
     * 메인 업데이트
     */
    update(deltaTime) {
        this.updateItemAnimations(deltaTime);
        this.checkItemCollection();
    }
    
    /**
     * 아이템 애니메이션 업데이트
     */
    updateItemAnimations(deltaTime) {
        const allItems = [...this.coins, ...this.powerCubes];
        
        allItems.forEach(item => {
            if (item.userData.collected) return;
            
            const type = item.userData.type;
            const itemType = this.itemTypes[type];
            
            // 애니메이션 타이머 업데이트
            item.userData.animationTimer += deltaTime;
            
            // 회전 애니메이션
            item.rotation.y += itemType.rotationSpeed * deltaTime;
            
            // 상하 부유 애니메이션
            const bobOffset = Math.sin(item.userData.animationTimer * itemType.bobSpeed) * itemType.bobHeight;
            item.position.y = item.userData.originalY + bobOffset;
            
            // 글로우 효과 애니메이션
            if (item.userData.glow) {
                const glowPulse = Math.sin(item.userData.animationTimer * 4) * 0.2 + 0.8;
                item.userData.glow.material.opacity = glowPulse * 0.3;
                item.userData.glow.scale.setScalar(1.2 + glowPulse * 0.1);
            }
            
            // 라이트 강도 변화
            if (item.userData.light) {
                const lightPulse = Math.sin(item.userData.animationTimer * 3) * 0.3 + 0.7;
                item.userData.light.intensity = lightPulse * 0.5;
            }
        });
    }
    
    /**
     * 아이템 수집 체크
     */
    checkItemCollection() {
        if (!this.gameManager.playerController) return;
        
        const playerPos = this.gameManager.playerController.position;
        const collectRange = 0.8;
        
        const allItems = [...this.coins, ...this.powerCubes];
        
        allItems.forEach(item => {
            if (item.userData.collected) return;
            
            const distance = playerPos.distanceTo(item.position);
            if (distance < collectRange) {
                this.collectItem(item);
            }
        });
    }
    
    /**
     * 아이템 수집 처리
     */
    collectItem(item) {
        if (item.userData.collected) return;
        
        item.userData.collected = true;
        const type = item.userData.type;
        const value = item.userData.value;
        
        // 타입별 처리
        if (type === 'COIN') {
            this.handleCoinCollection(value);
        } else if (type === 'POWER_CUBE') {
            this.handlePowerCubeCollection(value);
        }
        
        // 수집 이펙트
        this.createCollectionEffect(item);
        
        // UI 알림
        if (this.gameManager.uiManager) {
            this.gameManager.uiManager.showPickupNotification(type, value);
        }
        
        // 아이템 제거
        this.removeItem(item);
    }
    
    /**
     * 코인 수집 처리
     */
    handleCoinCollection(value) {
        if (this.gameManager.uiManager) {
            const currentCoins = this.gameManager.uiManager.gameStats.coinsCollected + 1;
            const currentScore = this.gameManager.uiManager.gameStats.totalScore + value;
            this.gameManager.uiManager.updateCoins(currentCoins);
            this.gameManager.uiManager.updateScore(currentScore);
        }
        console.log(`🪙 코인 획득! +${value}점`);
    }
    
    /**
     * 전기 큐브 수집 처리
     */
    handlePowerCubeCollection(value) {
        // 전기 총 업그레이드
        if (this.gameManager.electroGun) {
            const upgraded = this.gameManager.electroGun.upgrade(value);
            if (upgraded) {
                console.log('⚡ 전기 총 레벨 업!');
                if (this.gameManager.uiManager) {
                    this.gameManager.uiManager.showLevelUpNotification();
                }
            }
        }
        
        // 점수도 추가
        if (this.gameManager.uiManager) {
            const currentScore = this.gameManager.uiManager.gameStats.totalScore + value;
            this.gameManager.uiManager.updateScore(currentScore);
        }
        
        console.log(`⚡ 전기 큐브 획득! 전력 +${value}`);
    }
    
    /**
     * 수집 이펙트 생성
     */
    createCollectionEffect(item) {
        const position = item.position.clone();
        const color = this.itemTypes[item.userData.type].effectColor;
        
        // 간단한 링 확산 이펙트
        this.createRingEffect(position, color);
    }
    
    /**
     * 링 확산 이펙트
     */
    createRingEffect(position, color) {
        const ringGeometry = new THREE.RingGeometry(0.1, 0.2, 16);
        const ringMaterial = new THREE.MeshBasicMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(position);
        ring.rotation.x = -Math.PI / 2;
        
        this.scene.add(ring);
        
        // 애니메이션
        const startTime = performance.now();
        const duration = 500; // 0.5초
        
        const animateRing = () => {
            const elapsed = performance.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress < 1) {
                ring.scale.setScalar(1 + progress * 3);
                ring.material.opacity = 0.8 * (1 - progress);
                requestAnimationFrame(animateRing);
            } else {
                this.scene.remove(ring);
            }
        };
        
        animateRing();
    }
    
    /**
     * 아이템 제거
     */
    removeItem(item) {
        const type = item.userData.type;
        
        // 배열에서 제거
        if (type === 'COIN') {
            const coinIndex = this.coins.indexOf(item);
            if (coinIndex > -1) this.coins.splice(coinIndex, 1);
        } else if (type === 'POWER_CUBE') {
            const cubeIndex = this.powerCubes.indexOf(item);
            if (cubeIndex > -1) this.powerCubes.splice(cubeIndex, 1);
        }
        
        // 씬에서 제거
        this.scene.remove(item);
    }
    
    /**
     * 모든 아이템 제거 (게임 리셋)
     */
    clearAllItems() {
        [...this.coins, ...this.powerCubes].forEach(item => {
            this.scene.remove(item);
        });
        
        this.coins = [];
        this.powerCubes = [];
    }
    
    /**
     * 게임 리셋
     */
    reset() {
        this.clearAllItems();
        this.setupInitialItems();
    }
    
    /**
     * 현재 상태 반환
     */
    getState() {
        return {
            coinCount: this.coins.length,
            powerCubeCount: this.powerCubes.length,
            totalItems: this.coins.length + this.powerCubes.length
        };
    }
}