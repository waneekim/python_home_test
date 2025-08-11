class MazeGame {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.player = null;
        
        this.gameState = {
            playing: false,
            score: 0,
            power: 0,
            health: 100,
            coins: 0
        };
        
        this.maze = [];
        this.coins = [];
        this.powerCubes = [];
        this.enemies = [];
        this.bullets = [];
        
        this.keys = {
            left: false,
            right: false,
            up: false,
            down: false,
            space: false
        };
        
        this.playerVelocity = { x: 0, y: 0, z: 0 };
        this.isJumping = false;
        this.canShoot = true;
        
        // FPS 컨트롤을 위한 변수들
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseSensitivity = 0.002;
        this.pointerLocked = false;
        
        this.init();
    }
    
    init() {
        this.setupScene();
        this.createMaze();
        this.setupPlayer();
        this.setupLights();
        this.setupEventListeners();
        this.animate();
        
        this.showInstructions();
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        // 밝은 낮 분위기의 하늘색 배경으로 설정
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 10, 50);
        
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(1.5, 2, 1.5);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        document.getElementById('gameContainer').appendChild(this.renderer.domElement);
        
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    createMaze() {
        const mazeLayout = [
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
        
        // 주변을 더 잘 볼 수 있도록 밝은 색상으로 조정
        const wallMaterial = new THREE.MeshLambertMaterial({ color: 0xb0b0b0 });
        const floorMaterial = new THREE.MeshLambertMaterial({ color: 0xe0e0e0 });
        const coinMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xFFD700,
            emissive: 0x332200,
            shininess: 100
        });
        const powerMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x00FFFF,
            emissive: 0x003333,
            shininess: 100
        });
        const enemyMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xFF0000,
            emissive: 0x330000
        });
        
        const floorGeometry = new THREE.PlaneGeometry(15, 15);
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        this.scene.add(floor);
        
        for (let z = 0; z < mazeLayout.length; z++) {
            this.maze[z] = [];
            for (let x = 0; x < mazeLayout[z].length; x++) {
                this.maze[z][x] = mazeLayout[z][x];
                
                if (mazeLayout[z][x] === 1) {
                    const wallGeometry = new THREE.BoxGeometry(1, 3, 1);
                    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                    wall.position.set(x, 1.5, z);
                    wall.castShadow = true;
                    this.scene.add(wall);
                } else if (mazeLayout[z][x] === 2) {
                    const coinGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 8);
                    const coin = new THREE.Mesh(coinGeometry, coinMaterial);
                    coin.position.set(x, 0.5, z);
                    coin.userData = { type: 'coin', value: 10 };
                    this.coins.push(coin);
                    this.scene.add(coin);
                } else if (mazeLayout[z][x] === 3) {
                    const cubeGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
                    const powerCube = new THREE.Mesh(cubeGeometry, powerMaterial);
                    powerCube.position.set(x, 0.5, z);
                    powerCube.userData = { type: 'power', value: 20 };
                    this.powerCubes.push(powerCube);
                    this.scene.add(powerCube);
                } else if (mazeLayout[z][x] === 4) {
                    const enemyGeometry = new THREE.BoxGeometry(0.6, 1.2, 0.6);
                    const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
                    enemy.position.set(x, 0.6, z);
                    enemy.userData = { type: 'enemy', health: 50, maxHealth: 50 };
                    this.enemies.push(enemy);
                    this.scene.add(enemy);
                }
            }
        }
    }
    
    setupPlayer() {
        this.player = {
            position: new THREE.Vector3(1.5, 2, 1.5),
            rotation: new THREE.Euler(0, 0, 0)
        };

        // 플레이어 캐릭터 모델 생성
        this.createPlayerModel();

        // 초기 카메라 위치를 플레이어 뒤쪽으로 설정
        this.updateCameraPosition();
    }
    
    createPlayerModel() {
        // 6살 소녀 캐릭터 그룹
        this.playerModel = new THREE.Group();
        
        // 머리 (노란 머리카락)
        const headGeometry = new THREE.SphereGeometry(0.15, 8, 6);
        const headMaterial = new THREE.MeshPhongMaterial({ color: 0xFFDBB5 }); // 살색
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(0, 0.4, 0);
        head.castShadow = true;
        this.playerModel.add(head);
        
        // 노란 머리카락
        const hairGeometry = new THREE.SphereGeometry(0.16, 8, 6);
        const hairMaterial = new THREE.MeshPhongMaterial({ color: 0xFFD700 });
        const hair = new THREE.Mesh(hairGeometry, hairMaterial);
        hair.position.set(0, 0.42, 0);
        hair.scale.set(1, 0.8, 1.2); // 긴 머리 모양
        hair.castShadow = true;
        this.playerModel.add(hair);
        
        // 몸통 (분홍색 옷)
        const bodyGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.3, 6);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xFFB6C1 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.set(0, 0.1, 0);
        body.castShadow = true;
        this.playerModel.add(body);
        
        // 팔 (왼쪽)
        const armGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6);
        const armMaterial = new THREE.MeshPhongMaterial({ color: 0xFFDBB5 });
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.12, 0.15, 0);
        leftArm.rotation.z = 0.3;
        leftArm.castShadow = true;
        this.playerModel.add(leftArm);
        
        // 팔 (오른쪽)
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.12, 0.15, 0);
        rightArm.rotation.z = -0.3;
        rightArm.castShadow = true;
        this.playerModel.add(rightArm);
        
        // 다리 (왼쪽)
        const legGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.25, 6);
        const legMaterial = new THREE.MeshPhongMaterial({ color: 0x4169E1 }); // 파란 바지
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.05, -0.15, 0);
        leftLeg.castShadow = true;
        this.playerModel.add(leftLeg);
        
        // 다리 (오른쪽)
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.05, -0.15, 0);
        rightLeg.castShadow = true;
        this.playerModel.add(rightLeg);
        
        // 신발 (왼쪽)
        const shoeGeometry = new THREE.BoxGeometry(0.08, 0.04, 0.12);
        const shoeMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 }); // 갈색
        const leftShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        leftShoe.position.set(-0.05, -0.28, 0.02);
        leftShoe.castShadow = true;
        this.playerModel.add(leftShoe);
        
        // 신발 (오른쪽)
        const rightShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        rightShoe.position.set(0.05, -0.28, 0.02);
        rightShoe.castShadow = true;
        this.playerModel.add(rightShoe);
        
        // 플레이어 모델을 씬에 추가하고 플레이어 위치에 맞춤
        this.playerModel.position.copy(this.player.position);
        this.playerModel.position.y -= 0.3;
        this.scene.add(this.playerModel);
    }
    
    setupLights() {
        // 더 밝은 환경을 위해 주변광과 방향광의 세기를 높임
        const ambientLight = new THREE.AmbientLight(0xffffff, 1);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        this.playerLight = new THREE.PointLight(0xffffff, 1, 10);
        this.playerLight.position.copy(this.player.position);
        this.scene.add(this.playerLight);
    }
    
    setupEventListeners() {
        // 키보드 이벤트 - WASD + 방향키 지원
        document.addEventListener('keydown', (e) => {
            if (!this.gameState.playing) return;
            
            switch(e.code) {
                case 'ArrowLeft':
                case 'KeyA':
                    e.preventDefault();
                    this.keys.left = true;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    e.preventDefault();
                    this.keys.right = true;
                    break;
                case 'ArrowUp':
                case 'KeyW':
                    e.preventDefault();
                    this.keys.up = true;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    e.preventDefault();
                    this.keys.down = true;
                    break;
                case 'Space':
                    e.preventDefault();
                    this.keys.space = true;
                    if (!this.isJumping) {
                        this.jump();
                    }
                    break;
            }
        });
        
        document.addEventListener('keyup', (e) => {
            switch(e.code) {
                case 'ArrowLeft':
                case 'KeyA':
                    this.keys.left = false;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.keys.right = false;
                    break;
                case 'ArrowUp':
                case 'KeyW':
                    this.keys.up = false;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.keys.down = false;
                    break;
                case 'Space':
                    this.keys.space = false;
                    break;
            }
        });
        
        // 마우스 이벤트
        document.addEventListener('click', (e) => {
            if (this.gameState.playing) {
                // 포인터 락 요청
                if (!this.pointerLocked) {
                    this.renderer.domElement.requestPointerLock();
                }
                
                // 총 발사
                if (this.canShoot && this.gameState.power > 0) {
                    this.shoot();
                }
            }
        });
        
        // 포인터 락 이벤트
        document.addEventListener('pointerlockchange', () => {
            this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
        });
        
        // 마우스 움직임 (FPS 시점 회전)
        document.addEventListener('mousemove', (e) => {
            if (this.gameState.playing && this.pointerLocked) {
                this.mouseX += e.movementX * this.mouseSensitivity;
                this.mouseY += e.movementY * this.mouseSensitivity;
                
                // Y축 회전 제한 (위아래 시점)
                this.mouseY = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.mouseY));
                
                // 카메라 회전 적용
                this.camera.rotation.order = 'YXZ';
                this.camera.rotation.x = this.mouseY;
                this.camera.rotation.y = this.mouseX;
            }
        });
        
        // 버튼 이벤트
        document.getElementById('startBtn').addEventListener('click', () => {
            console.log('시작 버튼 클릭됨');
            this.startGame();
        });
        
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
    }
    
    startGame() {
        console.log('게임 시작!');
        this.gameState.playing = true;
        document.getElementById('instructions').style.display = 'none';
        document.body.style.cursor = 'none';
    }
    
    restartGame() {
        location.reload();
    }

    updateCameraPosition() {
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        const cameraPos = this.player.position.clone().add(forward.clone().multiplyScalar(-2));
        cameraPos.y += 1;
        this.camera.position.copy(cameraPos);
    }
    
    updatePlayer() {
        if (!this.gameState.playing) return;

        const moveSpeed = 0.1;
        const right = new THREE.Vector3();
        const forward = new THREE.Vector3();

        // 카메라의 현재 방향 벡터들 계산
        this.camera.getWorldDirection(forward);
        right.crossVectors(forward, this.camera.up).normalize();

        // Y축 움직임 제거 (수평 이동만)
        forward.y = 0;
        forward.normalize();

        const newPosition = this.player.position.clone();

        // 카메라 방향 기준 이동
        if (this.keys.up) {
            newPosition.add(forward.clone().multiplyScalar(moveSpeed));
        }
        if (this.keys.down) {
            newPosition.add(forward.clone().multiplyScalar(-moveSpeed));
        }
        if (this.keys.left) {
            newPosition.add(right.clone().multiplyScalar(-moveSpeed));
        }
        if (this.keys.right) {
            newPosition.add(right.clone().multiplyScalar(moveSpeed));
        }

        // 벽 충돌 검사
        if (!this.checkWallCollision(newPosition)) {
            this.player.position.copy(newPosition);

            // 플레이어 모델 위치 업데이트
            if (this.playerModel) {
                this.playerModel.position.copy(this.player.position);
                this.playerModel.position.y -= 0.3; // 발이 바닥에 닿도록
                this.playerModel.rotation.y = this.camera.rotation.y;
            }
        }

        // 점프와 중력 처리
        if (this.isJumping) {
            this.playerVelocity.y -= 0.02; // 중력
            this.player.position.y += this.playerVelocity.y;

            if (this.player.position.y <= 2) {
                this.player.position.y = 2;
                this.isJumping = false;
                this.playerVelocity.y = 0;
            }

            if (this.playerModel) {
                this.playerModel.position.y = this.player.position.y - 0.3;
            }
        }

        // 카메라와 조명 위치 업데이트
        this.updateCameraPosition();
        this.playerLight.position.copy(this.player.position);
    }
    
    jump() {
        if (!this.isJumping) {
            this.isJumping = true;
            this.playerVelocity.y = 0.3;
        }
    }
    
    checkWallCollision(position) {
        const x = Math.round(position.x);
        const z = Math.round(position.z);
        
        if (x < 0 || x >= 15 || z < 0 || z >= 15) {
            return true;
        }
        
        return this.maze[z] && this.maze[z][x] === 1;
    }
    
    checkCollectibles() {
        const playerPos = this.player.position;
        
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            const distance = playerPos.distanceTo(coin.position);
            
            if (distance < 0.8) {
                this.gameState.score += coin.userData.value;
                this.gameState.coins++;
                this.scene.remove(coin);
                this.coins.splice(i, 1);
                console.log('동전 수집!');
            }
        }
        
        for (let i = this.powerCubes.length - 1; i >= 0; i--) {
            const cube = this.powerCubes[i];
            const distance = playerPos.distanceTo(cube.position);
            
            if (distance < 0.8) {
                this.gameState.power += cube.userData.value;
                this.gameState.score += cube.userData.value;
                this.scene.remove(cube);
                this.powerCubes.splice(i, 1);
                console.log('전력 충전!');
                document.body.classList.add('power-boost');
                setTimeout(() => {
                    document.body.classList.remove('power-boost');
                }, 500);
            }
        }
    }
    
    shoot() {
        if (!this.canShoot || this.gameState.power <= 0) return;
        
        this.canShoot = false;
        this.gameState.power -= 5;
        
        const bulletGeometry = new THREE.SphereGeometry(0.1);
        const bulletMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x00FFFF,
            emissive: 0x004444
        });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

        // 플레이어 앞에서 시작
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        const startPos = this.player.position.clone();
        startPos.y += 0.5;
        startPos.add(direction.clone().multiplyScalar(0.5));
        bullet.position.copy(startPos);
        
        bullet.userData = {
            velocity: direction.clone().normalize(),
            life: 100
        };
        
        this.bullets.push(bullet);
        this.scene.add(bullet);
        
        setTimeout(() => {
            this.canShoot = true;
        }, 300);
    }
    
    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            bullet.position.add(bullet.userData.velocity.clone().multiplyScalar(0.5));
            bullet.userData.life--;
            
            if (bullet.userData.life <= 0) {
                this.scene.remove(bullet);
                this.bullets.splice(i, 1);
                continue;
            }
            
            if (this.checkWallCollision(bullet.position)) {
                this.scene.remove(bullet);
                this.bullets.splice(i, 1);
                continue;
            }
            
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                const distance = bullet.position.distanceTo(enemy.position);
                
                if (distance < 0.5) {
                    enemy.userData.health -= 25;
                    this.scene.remove(bullet);
                    this.bullets.splice(i, 1);
                    
                    if (enemy.userData.health <= 0) {
                        this.scene.remove(enemy);
                        this.enemies.splice(j, 1);
                        this.gameState.score += 50;
                    } else {
                        enemy.material.color.setHex(0xFF6666);
                        setTimeout(() => {
                            enemy.material.color.setHex(0xFF0000);
                        }, 200);
                    }
                    break;
                }
            }
        }
    }
    
    updateEnemies() {
        const playerPos = this.player.position;
        
        for (const enemy of this.enemies) {
            const direction = new THREE.Vector3();
            direction.subVectors(playerPos, enemy.position).normalize();
            
            const newPos = enemy.position.clone();
            newPos.add(direction.multiplyScalar(0.02));
            
            if (!this.checkWallCollision(newPos)) {
                enemy.position.copy(newPos);
            }
            
            const distance = playerPos.distanceTo(enemy.position);
            if (distance < 1) {
                this.gameState.health -= 1;
                if (this.gameState.health <= 0) {
                    this.gameOver();
                }
                
                document.body.classList.add('hit-effect');
                setTimeout(() => {
                    document.body.classList.remove('hit-effect');
                }, 300);
            }
        }
    }
    
    animateObjects() {
        const time = Date.now() * 0.005;
        
        this.coins.forEach(coin => {
            coin.rotation.y = time;
            coin.position.y = 0.5 + Math.sin(time * 2) * 0.1;
        });
        
        this.powerCubes.forEach(cube => {
            cube.rotation.x = time;
            cube.rotation.y = time;
            cube.position.y = 0.5 + Math.sin(time * 3) * 0.1;
        });
        
        this.enemies.forEach(enemy => {
            enemy.rotation.y = Math.sin(time) * 0.1;
        });
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.gameState.score;
        document.getElementById('power').textContent = this.gameState.power;
        document.getElementById('health').textContent = Math.max(0, this.gameState.health);
    }
    
    gameOver() {
        this.gameState.playing = false;
        document.getElementById('finalScore').textContent = this.gameState.score;
        document.getElementById('finalCoins').textContent = this.gameState.coins;
        document.getElementById('gameOverScreen').style.display = 'block';
        document.body.style.cursor = 'default';
    }
    
    showInstructions() {
        document.getElementById('instructions').style.display = 'block';
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.updatePlayer();
        this.checkCollectibles();
        this.updateBullets();
        this.updateEnemies();
        this.animateObjects();
        this.updateUI();
        
        if (this.coins.length === 0 && this.enemies.length === 0) {
            this.gameState.score += 200;
            this.gameOver();
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

// 게임 초기화
window.addEventListener('load', () => {
    console.log('페이지 로드됨, 게임 초기화 시작');
    const game = new MazeGame();
    window.game = game; // 디버깅용
});