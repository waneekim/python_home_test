/**
 * PlayerController: 고급 1인칭 FPS 플레이어 컨트롤러
 *
 * 핵심 기능:
 * - 부드러운 1인칭 시점 제어 (마우스 루킹)
 * - 물리 기반 이동 시스템 (관성, 마찰력)
 * - 반응형 점프 시스템
 * - 아이템 수집 및 상호작용
 * - 피격 및 체력 관리
 * - 발소리 및 움직임 피드백
 */

// Polyfill for THREE.CapsuleGeometry when using older versions of Three.js
if (!THREE.CapsuleGeometry) {
    console.warn('THREE.CapsuleGeometry is not available. Applying polyfill.');

    THREE.CapsuleGeometry = function (radius = 1, length = 1, capSegments = 4, radialSegments = 8) {
        const cylinder = new THREE.CylinderGeometry(radius, radius, length, radialSegments, 1, true);
        const cap = new THREE.SphereGeometry(radius, radialSegments, capSegments, 0, Math.PI * 2, 0, Math.PI / 2);

        const capTop = cap.clone();
        capTop.translate(0, length / 2, 0);

        const capBottom = cap.clone();
        capBottom.rotateX(Math.PI);
        capBottom.translate(0, -length / 2, 0);

        const geometry = THREE.BufferGeometryUtils.mergeBufferGeometries(
            [cylinder, capTop, capBottom],
            false
        );

        geometry.computeVertexNormals();
        return geometry;
    };
}

class PlayerController {
    constructor(scene, camera, gameManager) {
        this.scene = scene;
        this.camera = camera;
        this.gameManager = gameManager;
        
        // 플레이어 상태
        this.health = 100;
        this.maxHealth = 100;
        this.isAlive = true;
        this.invulnerable = false;
        this.invulnerabilityTime = 1000; // 1초간 무적
        
        // 물리적 속성
        this.position = new THREE.Vector3(1.5, 2, 1.5);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.acceleration = new THREE.Vector3(0, 0, 0);
        
        // 이동 설정
        this.moveSpeed = 5.0;
        this.runMultiplier = 1.5;
        this.friction = 0.85;
        this.airFriction = 0.95;
        
        // 점프 설정
        this.jumpForce = 8.0;
        this.gravity = -25.0;
        this.isGrounded = false;
        this.groundCheckDistance = 0.1;
        this.coyoteTime = 0.1; // 코요테 타임
        this.coyoteTimer = 0;
        
        // 마우스 컨트롤
        this.mouseSensitivity = 0.002;
        this.mouseX = 0;
        this.mouseY = 0;
        this.verticalLookLimit = Math.PI / 2 - 0.1;
        this.pointerLocked = false;
        
        // 키 상태
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            run: false
        };
        
        // 헤드 밥 (걸을 때 카메라 흔들림)
        this.headBob = {
            enabled: true,
            intensity: 0.05,
            frequency: 10.0,
            timer: 0
        };
        
        // 카메라 셰이크
        this.cameraShake = {
            intensity: 0,
            decay: 0.95,
            offset: new THREE.Vector3()
        };
        
        // 플레이어 콜라이더 (캡슐 형태)
        this.collider = {
            radius: 0.3,
            height: 1.8,
            center: new THREE.Vector3()
        };
        
        // 상호작용 시스템
        this.interactionRange = 2.0;
        this.pickupRange = 1.5;
        
        // 플레이어 모델 (그림자 및 3인칭 시 사용)
        this.playerModel = null;
        
        this.init();
    }
    
    init() {
        this.setupCamera();
        this.createPlayerModel();
        this.setupEventListeners();
        
        // 초기 위치 설정
        this.camera.position.copy(this.position);
        this.updateCollider();
    }
    
    /**
     * 카메라 초기 설정
     */
    setupCamera() {
        this.camera.fov = 75;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.near = 0.1;
        this.camera.far = 1000;
        this.camera.updateProjectionMatrix();
        
        // 카메라 회전 순서 설정
        this.camera.rotation.order = 'YXZ';
    }
    
    /**
     * 6살 소녀 플레이어 모델 생성 (개선된 디자인)
     */
    createPlayerModel() {
        this.playerModel = new THREE.Group();
        
        // 머리 (더 사실적인 비율)
        const headGeometry = new THREE.SphereGeometry(0.12, 16, 12);
        const skinMaterial = new THREE.MeshLambertMaterial({ color: 0xFFDBB5 });
        const head = new THREE.Mesh(headGeometry, skinMaterial);
        head.position.y = 0.35;
        head.castShadow = true;
        this.playerModel.add(head);
        
        // 노란 긴머리 (더 세밀하게)
        const hairFrontGeometry = new THREE.SphereGeometry(0.13, 16, 12);
        const hairMaterial = new THREE.MeshLambertMaterial({ color: 0xFFD700 });
        const hairFront = new THREE.Mesh(hairFrontGeometry, hairMaterial);
        hairFront.position.set(0, 0.37, 0);
        hairFront.scale.set(1, 0.9, 1.3);
        hairFront.castShadow = true;
        this.playerModel.add(hairFront);
        
        // 뒷머리 (긴 머리 표현)
        const hairBackGeometry = new THREE.SphereGeometry(0.1, 12, 8);
        const hairBack = new THREE.Mesh(hairBackGeometry, hairMaterial);
        hairBack.position.set(0, 0.25, -0.15);
        hairBack.scale.set(0.8, 1.5, 0.6);
        hairBack.castShadow = true;
        this.playerModel.add(hairBack);
        
        // 몸통 (아이 비율에 맞게)
        const bodyGeometry = new THREE.CapsuleGeometry(0.06, 0.25, 4, 8);
        const clothesMaterial = new THREE.MeshLambertMaterial({ color: 0xFFB6C1 });
        const body = new THREE.Mesh(bodyGeometry, clothesMaterial);
        body.position.y = 0.1;
        body.castShadow = true;
        this.playerModel.add(body);
        
        // 팔들
        const armGeometry = new THREE.CapsuleGeometry(0.025, 0.15, 3, 6);
        
        const leftArm = new THREE.Mesh(armGeometry, skinMaterial);
        leftArm.position.set(-0.09, 0.15, 0);
        leftArm.rotation.z = 0.2;
        leftArm.castShadow = true;
        this.playerModel.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, skinMaterial);
        rightArm.position.set(0.09, 0.15, 0);
        rightArm.rotation.z = -0.2;
        rightArm.castShadow = true;
        this.playerModel.add(rightArm);
        
        // 다리들
        const legGeometry = new THREE.CapsuleGeometry(0.03, 0.2, 3, 6);
        const pantsMaterial = new THREE.MeshLambertMaterial({ color: 0x4169E1 });
        
        const leftLeg = new THREE.Mesh(legGeometry, pantsMaterial);
        leftLeg.position.set(-0.04, -0.12, 0);
        leftLeg.castShadow = true;
        this.playerModel.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, pantsMaterial);
        rightLeg.position.set(0.04, -0.12, 0);
        rightLeg.castShadow = true;
        this.playerModel.add(rightLeg);
        
        // 신발
        const shoeGeometry = new THREE.BoxGeometry(0.06, 0.03, 0.1);
        const shoeMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        
        const leftShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        leftShoe.position.set(-0.04, -0.23, 0.02);
        leftShoe.castShadow = true;
        this.playerModel.add(leftShoe);
        
        const rightShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        rightShoe.position.set(0.04, -0.23, 0.02);
        rightShoe.castShadow = true;
        this.playerModel.add(rightShoe);
        
        // 모델을 씬에 추가
        this.playerModel.position.copy(this.position);
        this.playerModel.position.y -= 0.9; // 발이 바닥에 닿도록
        this.scene.add(this.playerModel);
        
        // 걷기 애니메이션용 초기 회전값 저장
        this.walkAnimation = {
            leftArm: { initialRotation: leftArm.rotation.clone() },
            rightArm: { initialRotation: rightArm.rotation.clone() },
            leftLeg: { initialRotation: leftLeg.rotation.clone() },
            rightLeg: { initialRotation: rightLeg.rotation.clone() },
            timer: 0
        };
    }
    
    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 키보드 이벤트
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        // 마우스 이벤트
        document.addEventListener('click', (e) => this.onMouseClick(e));
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        
        // 포인터 락 이벤트
        document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
        
        // 윈도우 리사이즈
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    /**
     * 키보드 입력 처리 (keydown)
     */
    onKeyDown(event) {
        if (!this.gameManager.isPlaying()) return;
        
        switch(event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.forward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.backward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.left = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.keys.right = true;
                break;
            case 'Space':
                event.preventDefault();
                this.keys.jump = true;
                break;
            case 'ShiftLeft':
                this.keys.run = true;
                break;
        }
    }
    
    /**
     * 키보드 입력 처리 (keyup)
     */
    onKeyUp(event) {
        switch(event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.forward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.backward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.left = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.keys.right = false;
                break;
            case 'Space':
                this.keys.jump = false;
                break;
            case 'ShiftLeft':
                this.keys.run = false;
                break;
        }
    }
    
    /**
     * 마우스 클릭 처리
     */
    onMouseClick(event) {
        if (!this.gameManager.isPlaying()) return;
        
        // 포인터 락 요청
        if (!this.pointerLocked) {
            document.body.requestPointerLock();
        }
    }
    
    /**
     * 마우스 움직임 처리 (FPS 시점)
     */
    onMouseMove(event) {
        if (!this.gameManager.isPlaying() || !this.pointerLocked) return;
        
        this.mouseX += event.movementX * this.mouseSensitivity;
        this.mouseY += event.movementY * this.mouseSensitivity;
        
        // 수직 시점 제한
        this.mouseY = Math.max(-this.verticalLookLimit, Math.min(this.verticalLookLimit, this.mouseY));
        
        // 카메라 회전 적용
        this.camera.rotation.x = this.mouseY;
        this.camera.rotation.y = this.mouseX;
    }
    
    /**
     * 포인터 락 상태 변경
     */
    onPointerLockChange() {
        this.pointerLocked = document.pointerLockElement === document.body;
    }
    
    /**
     * 윈도우 리사이즈 처리
     */
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }
    
    /**
     * 프레임마다 업데이트 (메인 게임 루프에서 호출)
     */
    update(deltaTime) {
        if (!this.isAlive) return;
        
        this.updateMovement(deltaTime);
        this.updatePhysics(deltaTime);
        this.updateGroundCheck();
        this.updateHeadBob(deltaTime);
        this.updateCameraShake();
        this.updatePlayerModel();
        this.updateWalkAnimation(deltaTime);
        
        // 무적 시간 처리
        if (this.invulnerable) {
            this.invulnerabilityTime -= deltaTime * 1000;
            if (this.invulnerabilityTime <= 0) {
                this.invulnerable = false;
                this.invulnerabilityTime = 1000;
            }
        }
    }
    
    /**
     * 이동 입력 처리 및 가속도 계산
     */
    updateMovement(deltaTime) {
        const moveVector = new THREE.Vector3();
        const forward = new THREE.Vector3();
        const right = new THREE.Vector3();
        
        // 카메라 방향 벡터 계산
        this.camera.getWorldDirection(forward);
        right.crossVectors(forward, this.camera.up).normalize();
        
        // Y축 제거 (수평 이동만)
        forward.y = 0;
        forward.normalize();
        
        // 이동 벡터 계산
        if (this.keys.forward) moveVector.add(forward);
        if (this.keys.backward) moveVector.add(forward.clone().negate());
        if (this.keys.left) moveVector.add(right.clone().negate());
        if (this.keys.right) moveVector.add(right);
        
        // 대각선 이동 시 속도 정규화
        if (moveVector.length() > 0) {
            moveVector.normalize();
            
            // 달리기 처리
            const currentSpeed = this.keys.run ? 
                this.moveSpeed * this.runMultiplier : this.moveSpeed;
            
            // 가속도 적용
            this.acceleration.copy(moveVector.multiplyScalar(currentSpeed));
        } else {
            this.acceleration.set(0, 0, 0);
        }
        
        // 점프 처리
        if (this.keys.jump && (this.isGrounded || this.coyoteTimer > 0)) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
            this.coyoteTimer = 0;
        }
    }
    
    /**
     * 물리 시뮬레이션
     */
    updatePhysics(deltaTime) {
        // 중력 적용
        if (!this.isGrounded) {
            this.velocity.y += this.gravity * deltaTime;
        }
        
        // 수평 속도 업데이트 (마찰력 적용)
        const friction = this.isGrounded ? this.friction : this.airFriction;
        this.velocity.x += this.acceleration.x * deltaTime;
        this.velocity.z += this.acceleration.z * deltaTime;
        this.velocity.x *= friction;
        this.velocity.z *= friction;
        
        // 위치 업데이트
        const deltaPosition = this.velocity.clone().multiplyScalar(deltaTime);
        const newPosition = this.position.clone().add(deltaPosition);
        
        // 충돌 검사 및 위치 보정
        this.handleCollisions(newPosition);
        
        // 카메라 위치 업데이트
        this.camera.position.copy(this.position);
        this.updateCollider();
    }
    
    /**
     * 지면 검사
     */
    updateGroundCheck() {
        const raycaster = new THREE.Raycaster();
        raycaster.set(this.position, new THREE.Vector3(0, -1, 0));
        raycaster.far = this.groundCheckDistance + 0.1;
        
        const intersects = raycaster.intersectObjects(this.scene.children, true);
        
        // 지면과의 거리 확인
        const wasGrounded = this.isGrounded;
        this.isGrounded = intersects.length > 0 && 
            intersects[0].distance <= this.groundCheckDistance;
        
        if (this.isGrounded) {
            // 지면에 닿았을 때 Y 위치 보정
            if (this.velocity.y <= 0) {
                this.position.y = intersects[0].point.y + this.groundCheckDistance;
                this.velocity.y = 0;
            }
            this.coyoteTimer = this.coyoteTime;
        } else {
            // 코요테 타임 감소
            this.coyoteTimer = Math.max(0, this.coyoteTimer - 1/60);
        }
    }
    
    /**
     * 충돌 처리 (벽과의 충돌)
     */
    handleCollisions(newPosition) {
        // 간단한 박스 충돌 검사 (추후 개선 가능)
        if (this.gameManager.maze && this.gameManager.maze.checkCollision) {
            const collision = this.gameManager.maze.checkCollision(newPosition, this.collider.radius);
            
            if (!collision.x) {
                this.position.x = newPosition.x;
            } else {
                this.velocity.x = 0;
            }
            
            if (!collision.z) {
                this.position.z = newPosition.z;
            } else {
                this.velocity.z = 0;
            }
            
            if (!collision.y) {
                this.position.y = newPosition.y;
            } else if (this.velocity.y < 0) {
                this.velocity.y = 0;
            }
        } else {
            // 기본 경계 검사
            this.position.copy(newPosition);
        }
    }
    
    /**
     * 헤드 밥 (걷기 시 카메라 흔들림)
     */
    updateHeadBob(deltaTime) {
        if (!this.headBob.enabled) return;
        
        const speed = new THREE.Vector2(this.velocity.x, this.velocity.z).length();
        
        if (this.isGrounded && speed > 0.1) {
            this.headBob.timer += deltaTime * this.headBob.frequency * speed;
            
            const bobOffset = Math.sin(this.headBob.timer) * this.headBob.intensity;
            this.camera.position.y = this.position.y + bobOffset;
        } else {
            this.headBob.timer = 0;
        }
    }
    
    /**
     * 카메라 셰이크
     */
    updateCameraShake() {
        if (this.cameraShake.intensity > 0) {
            this.cameraShake.offset.set(
                (Math.random() - 0.5) * this.cameraShake.intensity,
                (Math.random() - 0.5) * this.cameraShake.intensity,
                (Math.random() - 0.5) * this.cameraShake.intensity
            );
            
            this.camera.position.add(this.cameraShake.offset);
            this.cameraShake.intensity *= this.cameraShake.decay;
            
            if (this.cameraShake.intensity < 0.01) {
                this.cameraShake.intensity = 0;
            }
        }
    }
    
    /**
     * 플레이어 모델 업데이트
     */
    updatePlayerModel() {
        if (!this.playerModel) return;
        
        // 모델 위치 및 회전 동기화
        this.playerModel.position.copy(this.position);
        this.playerModel.position.y -= 0.9;
        this.playerModel.rotation.y = this.camera.rotation.y;
    }
    
    /**
     * 걷기 애니메이션
     */
    updateWalkAnimation(deltaTime) {
        if (!this.playerModel || !this.walkAnimation) return;
        
        const speed = new THREE.Vector2(this.velocity.x, this.velocity.z).length();
        
        if (this.isGrounded && speed > 0.1) {
            this.walkAnimation.timer += deltaTime * 8.0 * speed;
            
            const swing = Math.sin(this.walkAnimation.timer) * 0.3;
            
            // 팔 애니메이션
            const leftArm = this.playerModel.children[3];
            const rightArm = this.playerModel.children[4];
            if (leftArm && rightArm) {
                leftArm.rotation.x = this.walkAnimation.leftArm.initialRotation.x + swing;
                rightArm.rotation.x = this.walkAnimation.rightArm.initialRotation.x - swing;
            }
            
            // 다리 애니메이션
            const leftLeg = this.playerModel.children[5];
            const rightLeg = this.playerModel.children[6];
            if (leftLeg && rightLeg) {
                leftLeg.rotation.x = this.walkAnimation.leftLeg.initialRotation.x - swing;
                rightLeg.rotation.x = this.walkAnimation.rightLeg.initialRotation.x + swing;
            }
        }
    }
    
    /**
     * 콜라이더 위치 업데이트
     */
    updateCollider() {
        this.collider.center.copy(this.position);
    }
    
    /**
     * 피해 입기
     */
    takeDamage(amount, source) {
        if (!this.isAlive || this.invulnerable) return false;
        
        this.health = Math.max(0, this.health - amount);
        this.invulnerable = true;
        
        // 카메라 셰이크
        this.addCameraShake(0.3);
        
        // UI 업데이트
        if (this.gameManager.uiManager) {
            this.gameManager.uiManager.updateHealth(this.health, this.maxHealth);
            this.gameManager.uiManager.showDamageIndicator();
        }
        
        // 사망 체크
        if (this.health <= 0) {
            this.die();
        }
        
        return true;
    }
    
    /**
     * 체력 회복
     */
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        
        if (this.gameManager.uiManager) {
            this.gameManager.uiManager.updateHealth(this.health, this.maxHealth);
        }
    }
    
    /**
     * 카메라 셰이크 추가
     */
    addCameraShake(intensity) {
        this.cameraShake.intensity = Math.max(this.cameraShake.intensity, intensity);
    }
    
    /**
     * 사망 처리
     */
    die() {
        this.isAlive = false;
        this.velocity.set(0, 0, 0);
        
        // 게임 오버
        if (this.gameManager) {
            this.gameManager.gameOver();
        }
    }
    
    /**
     * 플레이어 리셋 (게임 재시작 시)
     */
    reset() {
        this.health = this.maxHealth;
        this.isAlive = true;
        this.invulnerable = false;
        this.position.set(1.5, 2, 1.5);
        this.velocity.set(0, 0, 0);
        this.acceleration.set(0, 0, 0);
        this.mouseX = 0;
        this.mouseY = 0;
        this.camera.rotation.set(0, 0, 0);
        this.camera.position.copy(this.position);
        this.cameraShake.intensity = 0;
        
        if (this.playerModel) {
            this.playerModel.position.copy(this.position);
            this.playerModel.position.y -= 0.9;
            this.playerModel.rotation.y = 0;
        }
    }
    
    /**
     * 현재 플레이어 상태 반환
     */
    getState() {
        return {
            position: this.position.clone(),
            health: this.health,
            maxHealth: this.maxHealth,
            isAlive: this.isAlive,
            isGrounded: this.isGrounded,
            velocity: this.velocity.clone()
        };
    }
}