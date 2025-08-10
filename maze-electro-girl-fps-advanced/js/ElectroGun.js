/**
 * ElectroGun: 고급 전기 총 시스템
 * 
 * 핵심 기능:
 * - 다단계 업그레이드 시스템
 * - 전기 이펙트 및 파티클 시스템
 * - 차지 샷 및 특수 능력
 * - 사운드 및 시각적 피드백
 * - 쿨다운 및 오버히트 시스템
 */
class ElectroGun {
    constructor(scene, camera, gameManager) {
        this.scene = scene;
        this.camera = camera;
        this.gameManager = gameManager;
        
        // 총 레벨 및 업그레이드
        this.level = 1;
        this.maxLevel = 5;
        this.upgradePoints = 0;
        
        // 기본 발사 설정
        this.baseDamage = 25;
        this.baseFireRate = 0.5; // 초당 발사 횟수
        this.baseRange = 50;
        this.baseSpeed = 30;
        
        // 현재 능력치 (업그레이드에 따라 변함)
        this.damage = this.baseDamage;
        this.fireRate = this.baseFireRate;
        this.range = this.baseRange;
        this.speed = this.baseSpeed;
        
        // 발사 상태
        this.canShoot = true;
        this.lastShotTime = 0;
        this.ammunition = Infinity; // 무한 탄약 (전기 에너지)
        
        // 차지 샷 시스템
        this.chargeShot = {
            enabled: false,
            charging: false,
            chargeTime: 0,
            maxChargeTime: 2.0,
            damageMultiplier: 3.0,
            consumed: false
        };
        
        // 오버히트 시스템
        this.overheat = {
            enabled: false,
            heat: 0,
            maxHeat: 100,
            cooldownRate: 20, // 초당 열 감소량
            heatPerShot: 15,
            overheated: false,
            cooldownTime: 2.0,
            currentCooldown: 0
        };
        
        // 특수 능력
        this.abilities = {
            piercing: false,        // 관통 능력
            chainLightning: false, // 연쇄 번개
            explosive: false,      // 폭발 탄환
            homing: false,         // 유도 탄환
            rapid: false           // 연사 모드
        };
        
        // 총알 관리
        this.bullets = [];
        this.maxBullets = 50;
        
        // 이펙트 시스템
        this.effects = {
            muzzleFlash: null,
            sparks: [],
            lightningBolts: []
        };
        
        // 총 모델
        this.gunModel = null;
        this.gunLight = null;
        
        // 사운드 (웹 오디오 미구현 시 콘솔 로그)
        this.sounds = {
            shoot: 'electro_shot',
            charge: 'charge_buildup',
            overheat: 'overheat_warning'
        };
        
        this.init();
    }
    
    init() {
        this.createGunModel();
        this.setupUpgrades();
        this.createEffects();
    }
    
    /**
     * 전기 총 모델 생성
     */
    createGunModel() {
        // 총 그룹
        this.gunModel = new THREE.Group();
        
        // 총신
        const barrelGeometry = new THREE.CylinderGeometry(0.02, 0.03, 0.3, 8);
        const barrelMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x444444,
            shininess: 100
        });
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0.1, -0.1, -0.2);
        this.gunModel.add(barrel);
        
        // 전기 코일 장식
        const coilGeometry = new THREE.TorusGeometry(0.04, 0.008, 4, 12);
        const coilMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x00FFFF,
            emissive: 0x001111
        });
        
        for (let i = 0; i < 3; i++) {
            const coil = new THREE.Mesh(coilGeometry, coilMaterial);
            coil.position.set(0.1, -0.1, -0.1 - (i * 0.08));
            coil.rotation.x = Math.PI / 2;
            this.gunModel.add(coil);
        }
        
        // 손잡이
        const gripGeometry = new THREE.BoxGeometry(0.08, 0.15, 0.04);
        const gripMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const grip = new THREE.Mesh(gripGeometry, gripMaterial);
        grip.position.set(0.1, -0.2, -0.05);
        this.gunModel.add(grip);
        
        // 전기 에너지 표시 크리스탈
        const crystalGeometry = new THREE.OctahedronGeometry(0.02, 0);
        const crystalMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x8A2BE2,
            emissive: 0x221144,
            transparent: true,
            opacity: 0.8
        });
        this.energyCrystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
        this.energyCrystal.position.set(0.1, -0.05, -0.1);
        this.gunModel.add(this.energyCrystal);
        
        // 총구 라이트
        this.gunLight = new THREE.PointLight(0x00FFFF, 0, 2);
        this.gunLight.position.set(0.1, -0.1, -0.35);
        this.gunModel.add(this.gunLight);
        
        // 카메라에 총 부착
        this.gunModel.position.set(0.3, -0.2, -0.5);
        this.camera.add(this.gunModel);
    }
    
    /**
     * 업그레이드 시스템 설정
     */
    setupUpgrades() {
        this.upgrades = {
            1: {
                damage: this.baseDamage,
                fireRate: this.baseFireRate,
                abilities: []
            },
            2: {
                damage: this.baseDamage * 1.3,
                fireRate: this.baseFireRate * 1.2,
                abilities: ['piercing']
            },
            3: {
                damage: this.baseDamage * 1.6,
                fireRate: this.baseFireRate * 1.5,
                abilities: ['piercing', 'chainLightning']
            },
            4: {
                damage: this.baseDamage * 2.0,
                fireRate: this.baseFireRate * 1.8,
                abilities: ['piercing', 'chainLightning', 'explosive']
            },
            5: {
                damage: this.baseDamage * 2.5,
                fireRate: this.baseFireRate * 2.2,
                abilities: ['piercing', 'chainLightning', 'explosive', 'homing', 'rapid']
            }
        };
        
        this.applyUpgrade();
    }
    
    /**
     * 이펙트 시스템 생성
     */
    createEffects() {
        // 총구 섬광
        const flashGeometry = new THREE.SphereGeometry(0.1, 8, 6);
        const flashMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00FFFF,
            transparent: true,
            opacity: 0
        });
        this.effects.muzzleFlash = new THREE.Mesh(flashGeometry, flashMaterial);
        this.effects.muzzleFlash.position.set(0.1, -0.1, -0.35);
        this.gunModel.add(this.effects.muzzleFlash);
    }
    
    /**
     * 메인 업데이트 함수
     */
    update(deltaTime) {
        this.updateCooldowns(deltaTime);
        this.updateBullets(deltaTime);
        this.updateEffects(deltaTime);
        this.updateGunAnimation(deltaTime);
        this.updateOverheat(deltaTime);
        this.updateChargeShot(deltaTime);
    }
    
    /**
     * 쿨다운 업데이트
     */
    updateCooldowns(deltaTime) {
        const currentTime = performance.now() / 1000;
        
        if (!this.canShoot && currentTime - this.lastShotTime >= 1 / this.fireRate) {
            this.canShoot = true;
        }
        
        if (this.overheat.overheated) {
            this.overheat.currentCooldown -= deltaTime;
            if (this.overheat.currentCooldown <= 0) {
                this.overheat.overheated = false;
                this.overheat.heat = 0;
            }
        }
    }
    
    /**
     * 총알 업데이트
     */
    updateBullets(deltaTime) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            // 총알 이동
            bullet.position.add(
                bullet.userData.velocity.clone().multiplyScalar(deltaTime)
            );
            
            // 수명 감소
            bullet.userData.life -= deltaTime;
            
            // 유도 기능 (homing)
            if (this.abilities.homing && bullet.userData.target) {
                this.updateHomingBullet(bullet, deltaTime);
            }
            
            // 수명 종료 또는 범위 초과
            if (bullet.userData.life <= 0) {
                this.destroyBullet(i);
                continue;
            }
            
            // 충돌 검사
            this.checkBulletCollisions(bullet, i);
        }
    }
    
    /**
     * 유도 총알 업데이트
     */
    updateHomingBullet(bullet, deltaTime) {
        if (!bullet.userData.target || !bullet.userData.target.userData.health) {
            return;
        }
        
        const targetPos = bullet.userData.target.position;
        const bulletPos = bullet.position;
        const direction = targetPos.clone().sub(bulletPos).normalize();
        
        // 현재 속도와 타겟 방향 보간
        const homingStrength = 5.0;
        bullet.userData.velocity.lerp(
            direction.multiplyScalar(this.speed),
            homingStrength * deltaTime
        );
    }
    
    /**
     * 총알 충돌 검사
     */
    checkBulletCollisions(bullet, bulletIndex) {
        // 적과의 충돌
        if (this.gameManager.enemyManager) {
            const hit = this.gameManager.enemyManager.checkBulletCollision(bullet);
            if (hit) {
                this.handleEnemyHit(hit.enemy, bullet, bulletIndex);
                return;
            }
        }
        
        // 벽과의 충돌
        if (this.gameManager.maze) {
            const wallHit = this.gameManager.maze.checkBulletCollision(bullet.position);
            if (wallHit) {
                this.handleWallHit(bullet, bulletIndex, wallHit.point, wallHit.normal);
            }
        }
    }
    
    /**
     * 적 피격 처리
     */
    handleEnemyHit(enemy, bullet, bulletIndex) {
        let damage = bullet.userData.damage;
        
        // 차지 샷 데미지 보너스
        if (bullet.userData.charged) {
            damage *= this.chargeShot.damageMultiplier;
        }
        
        // 적에게 데미지 적용
        const killed = enemy.takeDamage(damage);
        
        // 연쇄 번개 (chainLightning)
        if (this.abilities.chainLightning) {
            this.createChainLightning(bullet.position, enemy);
        }
        
        // 폭발 효과 (explosive)
        if (this.abilities.explosive) {
            this.createExplosion(bullet.position);
        }
        
        // 관통 능력이 없으면 총알 제거
        if (!this.abilities.piercing) {
            this.destroyBullet(bulletIndex);
        }
        
        // 타격 이펙트
        this.createHitEffect(bullet.position);
        
        // 점수 업데이트
        if (killed && this.gameManager.uiManager) {
            this.gameManager.uiManager.addEnemyKill();
        }
    }
    
    /**
     * 벽 충돌 처리
     */
    handleWallHit(bullet, bulletIndex, hitPoint, normal) {
        // 벽 타격 이펙트
        this.createWallHitEffect(hitPoint, normal);
        
        // 총알 제거 (관통 능력이 있어도 벽은 뚫지 못함)
        this.destroyBullet(bulletIndex);
    }
    
    /**
     * 발사 함수
     */
    shoot() {
        if (!this.canShoot || this.overheat.overheated) {
            return false;
        }
        
        // 오버히트 체크
        if (this.overheat.enabled && this.overheat.heat >= this.overheat.maxHeat) {
            this.overheat.overheated = true;
            this.overheat.currentCooldown = this.overheat.cooldownTime;
            this.playSound(this.sounds.overheat);
            return false;
        }
        
        // 총알 생성
        this.createBullet();
        
        // 발사 후 처리
        this.canShoot = false;
        this.lastShotTime = performance.now() / 1000;
        
        // 오버히트 증가
        if (this.overheat.enabled) {
            this.overheat.heat += this.overheat.heatPerShot;
        }
        
        // 이펙트 및 사운드
        this.createMuzzleFlash();
        this.playSound(this.sounds.shoot);
        
        // 카메라 셰이크
        if (this.gameManager.playerController) {
            this.gameManager.playerController.addCameraShake(0.1);
        }
        
        return true;
    }
    
    /**
     * 차지 샷 시작
     */
    startChargeShot() {
        if (!this.chargeShot.enabled) return;
        
        this.chargeShot.charging = true;
        this.chargeShot.chargeTime = 0;
        this.playSound(this.sounds.charge);
    }
    
    /**
     * 차지 샷 해제
     */
    releaseChargeShot() {
        if (!this.chargeShot.charging) return;
        
        if (this.chargeShot.chargeTime >= this.chargeShot.maxChargeTime) {
            // 완전 차지된 총알 발사
            this.createChargedBullet();
        } else {
            // 일반 발사
            this.shoot();
        }
        
        this.chargeShot.charging = false;
        this.chargeShot.chargeTime = 0;
    }
    
    /**
     * 일반 총알 생성
     */
    createBullet() {
        const bulletGeometry = new THREE.SphereGeometry(0.05, 8, 6);
        const bulletMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00FFFF,
            transparent: true,
            opacity: 0.8
        });
        
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        // 총구 위치에서 시작
        const muzzlePosition = new THREE.Vector3(0.1, -0.1, -0.35);
        muzzlePosition.applyMatrix4(this.camera.matrixWorld);
        bullet.position.copy(muzzlePosition);
        
        // 발사 방향
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        
        // 총알 데이터
        bullet.userData = {
            velocity: direction.multiplyScalar(this.speed),
            damage: this.damage,
            life: this.range / this.speed,
            charged: false,
            target: this.abilities.homing ? this.findNearestEnemy(bullet.position) : null
        };
        
        this.bullets.push(bullet);
        this.scene.add(bullet);
        
        // 전기 트레일 이펙트
        this.createElectricTrail(bullet);
    }
    
    /**
     * 차지된 총알 생성
     */
    createChargedBullet() {
        const bulletGeometry = new THREE.SphereGeometry(0.1, 12, 8);
        const bulletMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x8A2BE2,
            transparent: true,
            opacity: 0.9
        });
        
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        const muzzlePosition = new THREE.Vector3(0.1, -0.1, -0.35);
        muzzlePosition.applyMatrix4(this.camera.matrixWorld);
        bullet.position.copy(muzzlePosition);
        
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        
        bullet.userData = {
            velocity: direction.multiplyScalar(this.speed * 1.5),
            damage: this.damage,
            life: (this.range * 1.5) / (this.speed * 1.5),
            charged: true,
            target: this.abilities.homing ? this.findNearestEnemy(bullet.position) : null
        };
        
        this.bullets.push(bullet);
        this.scene.add(bullet);
        
        // 강화된 전기 이펙트
        this.createChargedElectricTrail(bullet);
    }
    
    /**
     * 가장 가까운 적 찾기 (유도탄용)
     */
    findNearestEnemy(position) {
        if (!this.gameManager.enemyManager) return null;
        
        const enemies = this.gameManager.enemyManager.getAliveEnemies();
        let nearest = null;
        let minDistance = Infinity;
        
        enemies.forEach(enemy => {
            const distance = position.distanceTo(enemy.position);
            if (distance < minDistance && distance < 20) { // 20m 범위 내
                minDistance = distance;
                nearest = enemy;
            }
        });
        
        return nearest;
    }
    
    /**
     * 총알 제거
     */
    destroyBullet(index) {
        const bullet = this.bullets[index];
        if (bullet) {
            this.scene.remove(bullet);
            this.bullets.splice(index, 1);
        }
    }
    
    /**
     * 업그레이드 적용
     */
    applyUpgrade() {
        if (!this.upgrades[this.level]) return;
        
        const upgrade = this.upgrades[this.level];
        this.damage = upgrade.damage;
        this.fireRate = upgrade.fireRate;
        
        // 능력 활성화
        Object.keys(this.abilities).forEach(ability => {
            this.abilities[ability] = upgrade.abilities.includes(ability);
        });
        
        // 차지 샷 활성화 (레벨 3부터)
        this.chargeShot.enabled = this.level >= 3;
        
        // 오버히트 시스템 활성화 (레벨 2부터)
        this.overheat.enabled = this.level >= 2;
        
        // 총 모델 업그레이드 시각화
        this.updateGunVisuals();
        
        console.log(`전기 총 레벨 ${this.level} 업그레이드 완료!`);
    }
    
    /**
     * 전기 큐브로 업그레이드
     */
    upgrade(cubeValue = 20) {
        this.upgradePoints += cubeValue;
        
        const pointsNeeded = this.level * 50; // 레벨당 필요 포인트 증가
        
        if (this.upgradePoints >= pointsNeeded && this.level < this.maxLevel) {
            this.upgradePoints -= pointsNeeded;
            this.level++;
            this.applyUpgrade();
            
            // UI 업데이트
            if (this.gameManager.uiManager) {
                this.gameManager.uiManager.updateWeaponLevel(this.level, this.maxLevel);
            }
            
            return true;
        }
        
        return false;
    }
    
    /**
     * 총 외형 업데이트
     */
    updateGunVisuals() {
        if (!this.energyCrystal) return;
        
        // 레벨에 따른 크리스탈 색상 변화
        const colors = [
            0x8A2BE2, // 보라
            0x00FFFF, // 시안
            0xFFD700, // 금색
            0xFF6B6B, // 빨강
            0x00FF00  // 초록
        ];
        
        this.energyCrystal.material.color.setHex(colors[this.level - 1] || colors[0]);
        this.energyCrystal.material.emissive.setHex((colors[this.level - 1] || colors[0]) * 0.3);
        
        // 크기 증가
        const scale = 1 + (this.level - 1) * 0.2;
        this.energyCrystal.scale.setScalar(scale);
    }
    
    /**
     * 이펙트 업데이트
     */
    updateEffects(deltaTime) {
        // 총구 섬광 페이드
        if (this.effects.muzzleFlash && this.effects.muzzleFlash.material.opacity > 0) {
            this.effects.muzzleFlash.material.opacity -= deltaTime * 10;
        }
        
        // 에너지 크리스탈 회전
        if (this.energyCrystal) {
            this.energyCrystal.rotation.x += deltaTime * 2;
            this.energyCrystal.rotation.y += deltaTime * 1.5;
        }
    }
    
    /**
     * 총 애니메이션 업데이트
     */
    updateGunAnimation(deltaTime) {
        if (!this.gunModel) return;
        
        // 반동 애니메이션 (발사 직후)
        const timeSinceShot = (performance.now() / 1000) - this.lastShotTime;
        if (timeSinceShot < 0.1) {
            const recoil = Math.max(0, 0.1 - timeSinceShot) * 5;
            this.gunModel.position.z = -0.5 + recoil * 0.05;
            this.gunModel.rotation.x = recoil * 0.1;
        } else {
            // 원래 위치로 복귀
            this.gunModel.position.z = -0.5;
            this.gunModel.rotation.x = 0;
        }
    }
    
    /**
     * 오버히트 업데이트
     */
    updateOverheat(deltaTime) {
        if (!this.overheat.enabled) return;
        
        // 열 자연 감소
        if (!this.overheat.overheated && this.overheat.heat > 0) {
            this.overheat.heat = Math.max(0, this.overheat.heat - this.overheat.cooldownRate * deltaTime);
        }
        
        // UI 업데이트
        if (this.gameManager.uiManager) {
            this.gameManager.uiManager.updateOverheat(
                this.overheat.heat, 
                this.overheat.maxHeat, 
                this.overheat.overheated
            );
        }
    }
    
    /**
     * 차지 샷 업데이트
     */
    updateChargeShot(deltaTime) {
        if (this.chargeShot.charging) {
            this.chargeShot.chargeTime += deltaTime;
            
            // 차징 이펙트
            this.updateChargingEffects();
        }
    }
    
    /**
     * 차징 이펙트 업데이트
     */
    updateChargingEffects() {
        if (!this.gunLight) return;
        
        const chargeRatio = Math.min(1, this.chargeShot.chargeTime / this.chargeShot.maxChargeTime);
        
        // 총구 라이트 강도 증가
        this.gunLight.intensity = chargeRatio * 2;
        
        // 완전 차지 시 색상 변화
        if (chargeRatio >= 1) {
            this.gunLight.color.setHex(0xFF00FF); // 마젠타
        } else {
            this.gunLight.color.setHex(0x00FFFF); // 시안
        }
    }
    
    /**
     * 총구 섬광 생성
     */
    createMuzzleFlash() {
        if (this.effects.muzzleFlash) {
            this.effects.muzzleFlash.material.opacity = 1;
        }
        
        if (this.gunLight) {
            this.gunLight.intensity = 1;
            setTimeout(() => {
                if (this.gunLight) this.gunLight.intensity = 0;
            }, 50);
        }
    }
    
    /**
     * 전기 트레일 이펙트 생성
     */
    createElectricTrail(bullet) {
        // 간단한 파티클 시스템으로 전기 효과 구현
        // 실제 게임에서는 더 복잡한 파티클 시스템 사용
    }
    
    /**
     * 차지된 전기 트레일 생성
     */
    createChargedElectricTrail(bullet) {
        // 더 강력한 전기 효과
    }
    
    /**
     * 타격 이펙트 생성
     */
    createHitEffect(position) {
        // 타격 지점에 전기 스파크 이펙트
    }
    
    /**
     * 벽 타격 이펙트
     */
    createWallHitEffect(position, normal) {
        // 벽에 전기 자국 이펙트
    }
    
    /**
     * 연쇄 번개 생성
     */
    createChainLightning(origin, firstTarget) {
        // 주변 적들에게 연쇄되는 번개 효과
    }
    
    /**
     * 폭발 생성
     */
    createExplosion(position) {
        // 전기 폭발 이펙트 및 범위 데미지
    }
    
    /**
     * 사운드 재생 (웹 오디오 미구현 시 콘솔)
     */
    playSound(soundName) {
        console.log(`🔊 ${soundName} 사운드 재생`);
    }
    
    /**
     * 총 상태 리셋
     */
    reset() {
        this.level = 1;
        this.upgradePoints = 0;
        this.overheat.heat = 0;
        this.overheat.overheated = false;
        this.chargeShot.charging = false;
        this.chargeShot.chargeTime = 0;
        
        // 모든 총알 제거
        this.bullets.forEach(bullet => {
            this.scene.remove(bullet);
        });
        this.bullets = [];
        
        this.applyUpgrade();
    }
    
    /**
     * 현재 상태 반환
     */
    getState() {
        return {
            level: this.level,
            upgradePoints: this.upgradePoints,
            damage: this.damage,
            fireRate: this.fireRate,
            abilities: { ...this.abilities },
            overheat: { ...this.overheat },
            bulletCount: this.bullets.length
        };
    }
}