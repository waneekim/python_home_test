/**
 * EnemyAI: 고급 적 AI 시스템
 * 
 * 핵심 기능:
 * - 다양한 적 타입 및 행동 패턴
 * - 지능적인 길찾기 및 추적
 * - 전투 AI 및 공격 패턴
 * - 체력 및 피격 시스템
 * - 그룹 행동 및 협력
 */
class EnemyAI {
    constructor(scene, gameManager) {
        this.scene = scene;
        this.gameManager = gameManager;
        
        // 적 관리
        this.enemies = [];
        this.maxEnemies = 15;
        this.spawnTimer = 0;
        this.spawnInterval = 5.0; // 5초마다 스폰
        
        // 적 타입 정의
        this.enemyTypes = {
            GRUNT: {
                name: '그런트',
                health: 50,
                speed: 2.0,
                damage: 15,
                attackRange: 2.0,
                detectionRange: 8.0,
                color: 0xFF4444,
                size: { width: 0.6, height: 1.2, depth: 0.6 },
                behavior: 'aggressive'
            },
            SCOUT: {
                name: '스카우트',
                health: 30,
                speed: 3.5,
                damage: 10,
                attackRange: 1.5,
                detectionRange: 12.0,
                color: 0xFF8844,
                size: { width: 0.5, height: 1.0, depth: 0.5 },
                behavior: 'hit_and_run'
            },
            HEAVY: {
                name: '헤비',
                health: 120,
                speed: 1.2,
                damage: 30,
                attackRange: 2.5,
                detectionRange: 6.0,
                color: 0x884444,
                size: { width: 0.8, height: 1.5, depth: 0.8 },
                behavior: 'tank'
            },
            SNIPER: {
                name: '스나이퍼',
                health: 40,
                speed: 1.5,
                damage: 35,
                attackRange: 15.0,
                detectionRange: 20.0,
                color: 0x448844,
                size: { width: 0.5, height: 1.1, depth: 0.5 },
                behavior: 'ranged'
            }
        };
        
        // 스폰 포인트들
        this.spawnPoints = [
            new THREE.Vector3(13, 1, 13),
            new THREE.Vector3(1, 1, 13),
            new THREE.Vector3(13, 1, 1),
            new THREE.Vector3(7, 1, 13),
            new THREE.Vector3(13, 1, 7)
        ];
        
        // 전역 AI 상태
        this.globalAlertLevel = 0; // 0: 평상시, 1: 경계, 2: 전투
        this.lastPlayerSeen = null;
        this.playerLastKnownPosition = null;
    }
    
    /**
     * 적 생성
     */
    createEnemy(type, position) {
        const enemyType = this.enemyTypes[type];
        if (!enemyType) return null;
        
        // 적 모델 생성
        const enemy = this.createEnemyModel(enemyType);
        enemy.position.copy(position);
        
        // 적 데이터
        enemy.userData = {
            type: type,
            health: enemyType.health,
            maxHealth: enemyType.health,
            speed: enemyType.speed,
            damage: enemyType.damage,
            attackRange: enemyType.attackRange,
            detectionRange: enemyType.detectionRange,
            behavior: enemyType.behavior,
            
            // AI 상태
            state: 'patrol',
            target: null,
            lastSeenPlayer: 0,
            alertLevel: 0,
            
            // 이동 및 전투
            destination: position.clone(),
            patrolPoints: this.generatePatrolPoints(position),
            currentPatrolIndex: 0,
            attackCooldown: 0,
            
            // 물리
            velocity: new THREE.Vector3(),
            onGround: true,
            
            // 애니메이션
            animationMixer: null,
            currentAnimation: 'idle',
            
            // 사운드 및 이펙트
            footstepTimer: 0,
            lastDamageTime: 0
        };
        
        this.enemies.push(enemy);
        this.scene.add(enemy);
        
        // 걷기 애니메이션 설정
        this.setupEnemyAnimation(enemy);
        
        return enemy;
    }
    
    /**
     * 적 모델 생성
     */
    createEnemyModel(enemyType) {
        const group = new THREE.Group();
        const size = enemyType.size;
        
        // 몸통
        const bodyGeometry = new THREE.BoxGeometry(size.width, size.height * 0.6, size.depth);
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: enemyType.color,
            emissive: enemyType.color * 0.1
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = size.height * 0.3;
        body.castShadow = true;
        group.add(body);
        
        // 머리
        const headGeometry = new THREE.BoxGeometry(size.width * 0.7, size.height * 0.3, size.depth * 0.7);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.y = size.height * 0.75;
        head.castShadow = true;
        group.add(head);
        
        // 눈 (빨간 점)
        const eyeGeometry = new THREE.SphereGeometry(0.03, 4, 4);
        // MeshBasicMaterial does not support emissive properties.
        // Use MeshPhongMaterial so the eyes can glow without throwing errors.
        const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0xFF0000, emissive: 0x440000 });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-size.width * 0.15, size.height * 0.75, size.depth * 0.35);
        group.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(size.width * 0.15, size.height * 0.75, size.depth * 0.35);
        group.add(rightEye);
        
        // 팔 (간단한 형태)
        const armGeometry = new THREE.BoxGeometry(size.width * 0.2, size.height * 0.4, size.depth * 0.2);
        const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
        leftArm.position.set(-size.width * 0.6, size.height * 0.3, 0);
        leftArm.castShadow = true;
        group.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
        rightArm.position.set(size.width * 0.6, size.height * 0.3, 0);
        rightArm.castShadow = true;
        group.add(rightArm);
        
        // 다리
        const legGeometry = new THREE.BoxGeometry(size.width * 0.25, size.height * 0.4, size.depth * 0.25);
        const leftLeg = new THREE.Mesh(legGeometry, bodyMaterial);
        leftLeg.position.set(-size.width * 0.2, -size.height * 0.2, 0);
        leftLeg.castShadow = true;
        group.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, bodyMaterial);
        rightLeg.position.set(size.width * 0.2, -size.height * 0.2, 0);
        rightLeg.castShadow = true;
        group.add(rightLeg);
        
        // 타입별 특수 장식
        if (enemyType.name === '스나이퍼') {
            // 안테나 추가
            const antennaGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.3, 4);
            const antennaMaterial = new THREE.MeshBasicMaterial({ color: 0x00FF00 });
            const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
            antenna.position.y = size.height + 0.15;
            group.add(antenna);
        }
        
        return group;
    }
    
    /**
     * 순찰 지점 생성
     */
    generatePatrolPoints(center) {
        const points = [];
        const radius = 3;
        const numPoints = 4;
        
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const point = new THREE.Vector3(
                center.x + Math.cos(angle) * radius,
                center.y,
                center.z + Math.sin(angle) * radius
            );
            points.push(point);
        }
        
        return points;
    }
    
    /**
     * 적 애니메이션 설정
     */
    setupEnemyAnimation(enemy) {
        // 간단한 걷기 애니메이션을 위한 초기값 저장
        enemy.userData.walkAnimation = {
            timer: 0,
            leftLeg: enemy.children[5], // 왼쪽 다리
            rightLeg: enemy.children[6], // 오른쪽 다리
            leftArm: enemy.children[3], // 왼쪽 팔
            rightArm: enemy.children[4]  // 오른쪽 팔
        };
    }
    
    /**
     * 메인 업데이트
     */
    update(deltaTime) {
        this.updateSpawning(deltaTime);
        this.updateGlobalAI(deltaTime);
        
        // 각 적 업데이트
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (enemy.userData.health <= 0) {
                this.removeEnemy(i);
                continue;
            }
            
            this.updateEnemyAI(enemy, deltaTime);
            this.updateEnemyMovement(enemy, deltaTime);
            this.updateEnemyAnimation(enemy, deltaTime);
        }
    }
    
    /**
     * 적 스폰 관리
     */
    updateSpawning(deltaTime) {
        if (this.enemies.length >= this.maxEnemies) return;
        
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnRandomEnemy();
        }
    }
    
    /**
     * 랜덤 적 스폰
     */
    spawnRandomEnemy() {
        const types = Object.keys(this.enemyTypes);
        const randomType = types[Math.floor(Math.random() * types.length)];
        const spawnPoint = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
        
        // 스폰 포인트 근처에 플레이어가 있으면 스폰 안함
        if (this.gameManager.playerController) {
            const playerPos = this.gameManager.playerController.position;
            if (playerPos.distanceTo(spawnPoint) < 5) {
                return;
            }
        }
        
        this.createEnemy(randomType, spawnPoint);
    }
    
    /**
     * 전역 AI 상태 업데이트
     */
    updateGlobalAI(deltaTime) {
        let maxAlertLevel = 0;
        let playerVisible = false;
        
        // 모든 적의 경계 수준 확인
        this.enemies.forEach(enemy => {
            maxAlertLevel = Math.max(maxAlertLevel, enemy.userData.alertLevel);
            if (enemy.userData.target && enemy.userData.lastSeenPlayer > performance.now() - 2000) {
                playerVisible = true;
                this.playerLastKnownPosition = enemy.userData.target.position.clone();
            }
        });
        
        this.globalAlertLevel = maxAlertLevel;
        
        // 전역 경계 상태가 높으면 스폰 간격 단축
        if (this.globalAlertLevel >= 2) {
            this.spawnInterval = 3.0;
        } else {
            this.spawnInterval = 5.0;
        }
    }
    
    /**
     * 개별 적 AI 업데이트
     */
    updateEnemyAI(enemy, deltaTime) {
        const data = enemy.userData;
        const playerController = this.gameManager.playerController;
        
        if (!playerController) return;
        
        const playerPos = playerController.position;
        const enemyPos = enemy.position;
        const distanceToPlayer = enemyPos.distanceTo(playerPos);
        
        // 플레이어 감지
        const canSeePlayer = this.canSeePlayer(enemy, playerPos);
        
        if (canSeePlayer && distanceToPlayer <= data.detectionRange) {
            data.target = playerController;
            data.lastSeenPlayer = performance.now();
            data.alertLevel = Math.max(2, data.alertLevel);
        } else if (performance.now() - data.lastSeenPlayer > 5000) {
            // 5초간 플레이어를 못 봤으면 타겟 해제
            data.target = null;
            data.alertLevel = Math.max(0, data.alertLevel - deltaTime * 0.5);
        }
        
        // 행동 상태 결정
        if (data.target && distanceToPlayer <= data.attackRange) {
            data.state = 'attack';
        } else if (data.target) {
            data.state = 'chase';
        } else if (data.alertLevel > 0) {
            data.state = 'search';
        } else {
            data.state = 'patrol';
        }
        
        // 상태별 행동
        switch (data.state) {
            case 'patrol':
                this.handlePatrol(enemy);
                break;
            case 'search':
                this.handleSearch(enemy);
                break;
            case 'chase':
                this.handleChase(enemy, playerPos);
                break;
            case 'attack':
                this.handleAttack(enemy, deltaTime);
                break;
        }
        
        // 쿨다운 업데이트
        if (data.attackCooldown > 0) {
            data.attackCooldown -= deltaTime;
        }
    }
    
    /**
     * 플레이어 가시성 체크
     */
    canSeePlayer(enemy, playerPos) {
        const raycaster = new THREE.Raycaster();
        raycaster.set(enemy.position, playerPos.clone().sub(enemy.position).normalize());
        
        const intersects = raycaster.intersectObjects(this.scene.children, true);
        
        // 첫 번째 충돌이 플레이어인지 확인
        for (const intersect of intersects) {
            if (intersect.object.parent === this.gameManager.playerController.playerModel) {
                return true;
            }
            // 벽에 막혔으면 못 봄
            if (intersect.object.userData.isWall) {
                return false;
            }
        }
        
        return false;
    }
    
    /**
     * 순찰 행동
     */
    handlePatrol(enemy) {
        const data = enemy.userData;
        const currentTarget = data.patrolPoints[data.currentPatrolIndex];
        
        if (enemy.position.distanceTo(currentTarget) < 1) {
            data.currentPatrolIndex = (data.currentPatrolIndex + 1) % data.patrolPoints.length;
        }
        
        data.destination = currentTarget.clone();
    }
    
    /**
     * 수색 행동
     */
    handleSearch(enemy) {
        const data = enemy.userData;
        
        if (this.playerLastKnownPosition) {
            data.destination = this.playerLastKnownPosition.clone();
            
            // 마지막 목격 지점에 도달했으면 주변 수색
            if (enemy.position.distanceTo(this.playerLastKnownPosition) < 2) {
                const searchRadius = 3;
                data.destination = new THREE.Vector3(
                    this.playerLastKnownPosition.x + (Math.random() - 0.5) * searchRadius,
                    this.playerLastKnownPosition.y,
                    this.playerLastKnownPosition.z + (Math.random() - 0.5) * searchRadius
                );
            }
        }
    }
    
    /**
     * 추적 행동
     */
    handleChase(enemy, playerPos) {
        const data = enemy.userData;
        
        // 행동 타입별 차별화
        switch (data.behavior) {
            case 'aggressive':
                data.destination = playerPos.clone();
                break;
                
            case 'hit_and_run':
                // 가까이 다가갔다가 도망
                const distance = enemy.position.distanceTo(playerPos);
                if (distance < 3) {
                    const fleeDirection = enemy.position.clone().sub(playerPos).normalize();
                    data.destination = enemy.position.clone().add(fleeDirection.multiplyScalar(5));
                } else {
                    data.destination = playerPos.clone();
                }
                break;
                
            case 'tank':
                // 천천히 직진
                data.destination = playerPos.clone();
                break;
                
            case 'ranged':
                // 일정 거리 유지
                const optimalRange = data.attackRange * 0.8;
                const currentDistance = enemy.position.distanceTo(playerPos);
                
                if (currentDistance < optimalRange) {
                    // 너무 가깝면 후퇴
                    const retreatDirection = enemy.position.clone().sub(playerPos).normalize();
                    data.destination = enemy.position.clone().add(retreatDirection.multiplyScalar(2));
                } else if (currentDistance > data.attackRange) {
                    // 너무 멀면 접근
                    data.destination = playerPos.clone();
                } else {
                    // 적정 거리면 정지
                    data.destination = enemy.position.clone();
                }
                break;
        }
    }
    
    /**
     * 공격 행동
     */
    handleAttack(enemy, deltaTime) {
        const data = enemy.userData;
        
        if (data.attackCooldown <= 0 && data.target) {
            // 공격 실행
            this.performAttack(enemy);
            
            // 쿨다운 설정 (타입별 차별화)
            switch (data.behavior) {
                case 'aggressive':
                    data.attackCooldown = 1.5;
                    break;
                case 'hit_and_run':
                    data.attackCooldown = 0.8;
                    break;
                case 'tank':
                    data.attackCooldown = 2.5;
                    break;
                case 'ranged':
                    data.attackCooldown = 3.0;
                    break;
            }
        }
    }
    
    /**
     * 실제 공격 수행
     */
    performAttack(enemy) {
        const data = enemy.userData;
        const target = data.target;
        
        if (!target) return;
        
        // 타입별 공격 방식
        switch (data.behavior) {
            case 'ranged':
                this.createEnemyProjectile(enemy, target.position);
                break;
            default:
                // 근접 공격
                if (enemy.position.distanceTo(target.position) <= data.attackRange) {
                    target.takeDamage(data.damage, enemy);
                }
                break;
        }
        
        // 공격 이펙트
        this.createAttackEffect(enemy);
        
        console.log(`${data.type}이(가) 공격! 데미지: ${data.damage}`);
    }
    
    /**
     * 적 투사체 생성 (원거리 공격용)
     */
    createEnemyProjectile(enemy, targetPos) {
        const projectileGeometry = new THREE.SphereGeometry(0.1, 6, 6);
        const projectileMaterial = new THREE.MeshBasicMaterial({ color: 0xFF4444 });
        const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
        
        projectile.position.copy(enemy.position);
        projectile.position.y += 0.5;
        
        const direction = targetPos.clone().sub(projectile.position).normalize();
        
        projectile.userData = {
            velocity: direction.multiplyScalar(15),
            damage: enemy.userData.damage,
            life: 3.0,
            owner: enemy
        };
        
        this.scene.add(projectile);
        
        // 프로젝타일 업데이트를 위한 배열에 추가
        if (!this.enemyProjectiles) this.enemyProjectiles = [];
        this.enemyProjectiles.push(projectile);
    }
    
    /**
     * 적 이동 업데이트
     */
    updateEnemyMovement(enemy, deltaTime) {
        const data = enemy.userData;
        const destination = data.destination;
        
        if (!destination) return;
        
        const direction = destination.clone().sub(enemy.position);
        direction.y = 0; // Y축 제거
        
        const distance = direction.length();
        
        if (distance > 0.1) {
            direction.normalize();
            
            // 속도 조절
            let moveSpeed = data.speed;
            if (data.state === 'chase' && data.behavior === 'hit_and_run') {
                moveSpeed *= 1.5; // 스카우트는 추적 시 빠름
            }
            
            const moveDistance = moveSpeed * deltaTime;
            const actualMove = Math.min(moveDistance, distance);
            
            const movement = direction.multiplyScalar(actualMove);
            
            // 충돌 검사
            const newPosition = enemy.position.clone().add(movement);
            if (!this.checkEnemyCollision(newPosition)) {
                enemy.position.add(movement);
                
                // 이동 방향으로 회전
                enemy.lookAt(enemy.position.clone().add(direction));
            }
        }
    }
    
    /**
     * 적 충돌 검사
     */
    checkEnemyCollision(position) {
        // 간단한 경계 검사 (실제 구현에서는 미로와 충돌 검사)
        if (position.x < 0 || position.x > 15 || position.z < 0 || position.z > 15) {
            return true;
        }
        
        // 미로와의 충돌 검사 (gameManager.maze 사용)
        if (this.gameManager.maze && this.gameManager.maze.checkCollision) {
            return this.gameManager.maze.checkCollision(position, 0.3);
        }
        
        return false;
    }
    
    /**
     * 적 애니메이션 업데이트
     */
    updateEnemyAnimation(enemy, deltaTime) {
        const data = enemy.userData;
        const anim = data.walkAnimation;
        
        if (!anim) return;
        
        // 이동 중일 때 걷기 애니메이션
        const isMoving = data.destination && enemy.position.distanceTo(data.destination) > 0.5;
        
        if (isMoving) {
            anim.timer += deltaTime * 6.0;
            
            const swing = Math.sin(anim.timer) * 0.2;
            
            // 다리 애니메이션
            if (anim.leftLeg && anim.rightLeg) {
                anim.leftLeg.rotation.x = swing;
                anim.rightLeg.rotation.x = -swing;
            }
            
            // 팔 애니메이션 (반대로)
            if (anim.leftArm && anim.rightArm) {
                anim.leftArm.rotation.x = -swing * 0.5;
                anim.rightArm.rotation.x = swing * 0.5;
            }
        } else {
            // 정지 시 원래 위치로
            if (anim.leftLeg) anim.leftLeg.rotation.x = 0;
            if (anim.rightLeg) anim.rightLeg.rotation.x = 0;
            if (anim.leftArm) anim.leftArm.rotation.x = 0;
            if (anim.rightArm) anim.rightArm.rotation.x = 0;
        }
    }
    
    /**
     * 적이 데미지를 받았을 때
     */
    damageEnemy(enemy, damage) {
        const data = enemy.userData;
        
        data.health -= damage;
        data.lastDamageTime = performance.now();
        
        // 피격 시 빨간색으로 번쩍
        const originalColor = enemy.children[0].material.color.getHex();
        enemy.children[0].material.color.setHex(0xFF6666);
        
        setTimeout(() => {
            if (enemy.children[0] && enemy.children[0].material) {
                enemy.children[0].material.color.setHex(originalColor);
            }
        }, 200);
        
        // 경계 상태로 전환
        data.alertLevel = 2;
        
        // 사망 처리
        if (data.health <= 0) {
            this.createDeathEffect(enemy);
            return true; // 사망
        }
        
        return false; // 생존
    }
    
    /**
     * 총알 충돌 검사 (ElectroGun에서 호출)
     */
    checkBulletCollision(bullet) {
        const bulletPos = bullet.position;
        
        for (const enemy of this.enemies) {
            const enemyPos = enemy.position;
            const distance = bulletPos.distanceTo(enemyPos);
            
            // 적의 크기를 고려한 충돌 검사
            const collisionRadius = Math.max(
                enemy.userData.type === 'HEAVY' ? 0.8 : 0.5
            );
            
            if (distance < collisionRadius) {
                return { enemy, distance };
            }
        }
        
        return null;
    }
    
    /**
     * 공격 이펙트 생성
     */
    createAttackEffect(enemy) {
        // 공격 시 잠깐 크기 증가
        enemy.scale.setScalar(1.2);
        setTimeout(() => {
            if (enemy.scale) enemy.scale.setScalar(1.0);
        }, 100);
    }
    
    /**
     * 사망 이펙트 생성
     */
    createDeathEffect(enemy) {
        // 간단한 사망 애니메이션
        enemy.rotation.z = Math.PI / 2; // 쓰러짐
        enemy.position.y -= 0.3;
        
        // 색상 변경
        enemy.children.forEach(child => {
            if (child.material) {
                child.material.color.setHex(0x444444);
                child.material.transparent = true;
                child.material.opacity = 0.5;
            }
        });
    }
    
    /**
     * 적 제거
     */
    removeEnemy(index) {
        const enemy = this.enemies[index];
        if (enemy) {
            this.scene.remove(enemy);
            this.enemies.splice(index, 1);
            
            // 점수 추가
            if (this.gameManager.uiManager) {
                this.gameManager.uiManager.recordEnemyKill();
            }
        }
    }
    
    /**
     * 살아있는 적들 반환
     */
    getAliveEnemies() {
        return this.enemies.filter(enemy => enemy.userData.health > 0);
    }
    
    /**
     * 모든 적 제거 (게임 리셋 시)
     */
    clearAllEnemies() {
        this.enemies.forEach(enemy => {
            this.scene.remove(enemy);
        });
        this.enemies = [];
        
        if (this.enemyProjectiles) {
            this.enemyProjectiles.forEach(projectile => {
                this.scene.remove(projectile);
            });
            this.enemyProjectiles = [];
        }
    }
    
    /**
     * 현재 상태 반환
     */
    getState() {
        return {
            enemyCount: this.enemies.length,
            maxEnemies: this.maxEnemies,
            globalAlertLevel: this.globalAlertLevel,
            aliveEnemies: this.getAliveEnemies().length
        };
    }
}