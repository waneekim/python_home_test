/**
 * EffectsManager: 고급 시각적 효과 및 사운드 시스템
 * 
 * 핵심 기능:
 * - 파티클 시스템
 * - 전기 이펙트
 * - 폭발 및 충격 효과
 * - 환경 이펙트 (번개, 스파크)
 * - 사운드 관리 (웹 오디오 미구현 시 콘솔)
 */
class EffectsManager {
    constructor(scene, gameManager) {
        this.scene = scene;
        this.gameManager = gameManager;
        
        // 파티클 시스템
        this.particleSystems = {
            sparks: [],
            explosions: [],
            electricity: [],
            ambient: [],
            smoke: []
        };
        
        // 이펙트 풀 (성능 최적화용)
        this.effectPools = {
            sparkParticles: [],
            electricBolts: [],
            explosionFragments: []
        };
        
        // 환경 이펙트
        this.environmentEffects = {
            ambientLightning: {
                enabled: true,
                timer: 0,
                interval: 10, // 10초마다
                duration: 0.2
            },
            atmosphericParticles: {
                enabled: true,
                particles: [],
                count: 50
            }
        };
        
        // 오디오 시스템 (웹 오디오 미구현 시 콘솔 로그)
        this.audioSystem = {
            sounds: {},
            volume: 0.7,
            enabled: true
        };
        
        // 이펙트 설정
        this.settings = {
            particleQuality: 'high', // 'low', 'medium', 'high'
            maxParticles: 500,
            electricityIntensity: 1.0,
            explosionScale: 1.0
        };
        
        this.init();
    }
    
    init() {
        this.setupParticleMaterials();
        this.createAmbientEffects();
        this.preloadSounds();
    }
    
    /**
     * 파티클 재료 설정
     */
    setupParticleMaterials() {
        // 스파크 재료
        this.materials = {
            spark: new THREE.PointsMaterial({
                color: 0xFFD700,
                size: 0.1,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending
            }),
            
            electricity: new THREE.LineBasicMaterial({
                color: 0x00FFFF,
                transparent: true,
                opacity: 0.9,
                linewidth: 3
            }),
            
            explosion: new THREE.PointsMaterial({
                color: 0xFF4444,
                size: 0.2,
                transparent: true,
                opacity: 1.0,
                blending: THREE.AdditiveBlending
            }),
            
            smoke: new THREE.PointsMaterial({
                color: 0x444444,
                size: 0.5,
                transparent: true,
                opacity: 0.3,
                blending: THREE.NormalBlending
            })
        };
    }
    
    /**
     * 주변 환경 이펙트 생성
     */
    createAmbientEffects() {
        if (this.environmentEffects.atmosphericParticles.enabled) {
            this.createAtmosphericParticles();
        }
    }
    
    /**
     * 대기 중 떠다니는 파티클 생성
     */
    createAtmosphericParticles() {
        const particleCount = this.environmentEffects.atmosphericParticles.count;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 30; // x
            positions[i + 1] = Math.random() * 10; // y
            positions[i + 2] = (Math.random() - 0.5) * 30; // z
            
            // 랜덤 색상 (어둡고 신비로운 톤)
            const intensity = 0.1 + Math.random() * 0.3;
            colors[i] = intensity; // r
            colors[i + 1] = intensity * 1.5; // g
            colors[i + 2] = intensity * 2; // b
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.02,
            transparent: true,
            opacity: 0.6,
            vertexColors: true,
            blending: THREE.AdditiveBlending
        });
        
        const particles = new THREE.Points(geometry, material);
        this.scene.add(particles);
        
        this.environmentEffects.atmosphericParticles.particles.push({
            mesh: particles,
            originalPositions: positions.slice(),
            time: 0
        });
    }
    
    /**
     * 사운드 미리 로드
     */
    preloadSounds() {
        // 실제 구현에서는 오디오 파일 로드
        this.audioSystem.sounds = {
            electricShot: 'electric_shot.mp3',
            explosion: 'explosion.mp3',
            spark: 'spark.mp3',
            powerUp: 'power_up.mp3',
            coinCollect: 'coin_collect.mp3',
            enemyHit: 'enemy_hit.mp3',
            playerHit: 'player_hit.mp3',
            ambientHum: 'ambient_hum.mp3'
        };
    }
    
    /**
     * 메인 업데이트
     */
    update(deltaTime) {
        this.updateParticleSystems(deltaTime);
        this.updateEnvironmentEffects(deltaTime);
        this.cleanupEffects();
    }
    
    /**
     * 파티클 시스템 업데이트
     */
    updateParticleSystems(deltaTime) {
        // 스파크 업데이트
        this.updateSparks(deltaTime);
        
        // 폭발 업데이트
        this.updateExplosions(deltaTime);
        
        // 전기 이펙트 업데이트
        this.updateElectricity(deltaTime);
        
        // 연기 업데이트
        this.updateSmoke(deltaTime);
    }
    
    /**
     * 환경 이펙트 업데이트
     */
    updateEnvironmentEffects(deltaTime) {
        // 주변 번개
        this.updateAmbientLightning(deltaTime);
        
        // 대기 파티클
        this.updateAtmosphericParticles(deltaTime);
    }
    
    /**
     * 스파크 업데이트
     */
    updateSparks(deltaTime) {
        for (let i = this.particleSystems.sparks.length - 1; i >= 0; i--) {
            const spark = this.particleSystems.sparks[i];
            
            // 물리 업데이트
            spark.velocity.y -= 9.8 * deltaTime; // 중력
            spark.position.add(spark.velocity.clone().multiplyScalar(deltaTime));
            
            // 생명 감소
            spark.life -= deltaTime;
            
            // 페이드 아웃
            if (spark.mesh) {
                spark.mesh.material.opacity = spark.life / spark.maxLife;
                spark.mesh.position.copy(spark.position);
            }
            
            // 생명 끝나면 제거
            if (spark.life <= 0) {
                if (spark.mesh) {
                    this.scene.remove(spark.mesh);
                }
                this.particleSystems.sparks.splice(i, 1);
            }
        }
    }
    
    /**
     * 폭발 업데이트
     */
    updateExplosions(deltaTime) {
        for (let i = this.particleSystems.explosions.length - 1; i >= 0; i--) {
            const explosion = this.particleSystems.explosions[i];
            
            explosion.time += deltaTime;
            const progress = explosion.time / explosion.duration;
            
            if (explosion.mesh) {
                // 확장 애니메이션
                const scale = 1 + progress * explosion.maxScale;
                explosion.mesh.scale.setScalar(scale);
                
                // 페이드 아웃
                explosion.mesh.material.opacity = 1 - progress;
            }
            
            // 완료되면 제거
            if (progress >= 1) {
                if (explosion.mesh) {
                    this.scene.remove(explosion.mesh);
                }
                this.particleSystems.explosions.splice(i, 1);
            }
        }
    }
    
    /**
     * 전기 이펙트 업데이트
     */
    updateElectricity(deltaTime) {
        for (let i = this.particleSystems.electricity.length - 1; i >= 0; i--) {
            const bolt = this.particleSystems.electricity[i];
            
            bolt.time += deltaTime;
            const progress = bolt.time / bolt.duration;
            
            if (bolt.mesh) {
                // 번개 깜빡임 효과
                const flicker = Math.sin(bolt.time * 20) * 0.5 + 0.5;
                bolt.mesh.material.opacity = (1 - progress) * flicker;
                
                // 랜덤한 지그재그 움직임
                if (bolt.segments) {
                    this.updateLightningSegments(bolt);
                }
            }
            
            // 완료되면 제거
            if (progress >= 1) {
                if (bolt.mesh) {
                    this.scene.remove(bolt.mesh);
                }
                this.particleSystems.electricity.splice(i, 1);
            }
        }
    }
    
    /**
     * 연기 업데이트
     */
    updateSmoke(deltaTime) {
        for (let i = this.particleSystems.smoke.length - 1; i >= 0; i--) {
            const smoke = this.particleSystems.smoke[i];
            
            // 위로 올라가면서 확산
            smoke.velocity.y += 2 * deltaTime;
            smoke.velocity.x += (Math.random() - 0.5) * deltaTime;
            smoke.velocity.z += (Math.random() - 0.5) * deltaTime;
            
            smoke.position.add(smoke.velocity.clone().multiplyScalar(deltaTime));
            smoke.life -= deltaTime;
            
            if (smoke.mesh) {
                smoke.mesh.position.copy(smoke.position);
                smoke.mesh.material.opacity = (smoke.life / smoke.maxLife) * 0.3;
                
                // 크기 증가
                const scale = 1 + (1 - smoke.life / smoke.maxLife) * 2;
                smoke.mesh.scale.setScalar(scale);
            }
            
            if (smoke.life <= 0) {
                if (smoke.mesh) {
                    this.scene.remove(smoke.mesh);
                }
                this.particleSystems.smoke.splice(i, 1);
            }
        }
    }
    
    /**
     * 주변 번개 업데이트
     */
    updateAmbientLightning(deltaTime) {
        const lightning = this.environmentEffects.ambientLightning;
        
        if (!lightning.enabled) return;
        
        lightning.timer += deltaTime;
        
        if (lightning.timer >= lightning.interval) {
            lightning.timer = 0;
            this.createAmbientLightning();
        }
    }
    
    /**
     * 대기 파티클 업데이트
     */
    updateAtmosphericParticles(deltaTime) {
        this.environmentEffects.atmosphericParticles.particles.forEach(particleSystem => {
            particleSystem.time += deltaTime;
            
            const positions = particleSystem.mesh.geometry.attributes.position.array;
            const originalPositions = particleSystem.originalPositions;
            
            for (let i = 0; i < positions.length; i += 3) {
                // 부드러운 떠다니는 움직임
                positions[i] = originalPositions[i] + Math.sin(particleSystem.time + i) * 0.5;
                positions[i + 1] = originalPositions[i + 1] + Math.cos(particleSystem.time * 0.5 + i) * 0.3;
                positions[i + 2] = originalPositions[i + 2] + Math.sin(particleSystem.time * 0.3 + i) * 0.4;
            }
            
            particleSystem.mesh.geometry.attributes.position.needsUpdate = true;
        });
    }
    
    /**
     * 스파크 생성
     */
    createSparks(position, count = 10, color = 0xFFD700) {
        for (let i = 0; i < count; i++) {
            const sparkGeometry = new THREE.SphereGeometry(0.02, 4, 4);
            const sparkMaterial = new THREE.MeshBasicMaterial({ 
                color: color,
                transparent: true,
                opacity: 1
            });
            
            const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
            spark.position.copy(position);
            
            const sparkData = {
                mesh: spark,
                position: position.clone(),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 6,
                    Math.random() * 4 + 2,
                    (Math.random() - 0.5) * 6
                ),
                life: 0.5 + Math.random() * 0.5,
                maxLife: 1.0
            };
            
            sparkData.maxLife = sparkData.life;
            
            this.particleSystems.sparks.push(sparkData);
            this.scene.add(spark);
        }
        
        this.playSound('spark');
    }
    
    /**
     * 폭발 생성
     */
    createExplosion(position, scale = 1.0, color = 0xFF4444) {
        // 메인 폭발 구
        const explosionGeometry = new THREE.SphereGeometry(0.5, 8, 6);
        const explosionMaterial = new THREE.MeshBasicMaterial({ 
            color: color,
            transparent: true,
            opacity: 1
        });
        
        const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
        explosion.position.copy(position);
        
        const explosionData = {
            mesh: explosion,
            time: 0,
            duration: 0.8,
            maxScale: scale * 3
        };
        
        this.particleSystems.explosions.push(explosionData);
        this.scene.add(explosion);
        
        // 폭발 스파크
        this.createSparks(position, 20, 0xFF6666);
        
        // 폭발 연기
        this.createSmoke(position, 5);
        
        this.playSound('explosion');
    }
    
    /**
     * 전기 볼트 생성 (두 점 사이)
     */
    createElectricBolt(startPos, endPos, segments = 8, color = 0x00FFFF) {
        const points = this.generateLightningPath(startPos, endPos, segments);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = this.materials.electricity.clone();
        material.color.setHex(color);
        
        const bolt = new THREE.Line(geometry, material);
        
        const boltData = {
            mesh: bolt,
            segments: points,
            time: 0,
            duration: 0.3
        };
        
        this.particleSystems.electricity.push(boltData);
        this.scene.add(bolt);
        
        this.playSound('electricShot');
    }
    
    /**
     * 번개 경로 생성 (지그재그)
     */
    generateLightningPath(start, end, segments) {
        const points = [start.clone()];
        
        for (let i = 1; i < segments; i++) {
            const progress = i / segments;
            const point = start.clone().lerp(end, progress);
            
            // 랜덤 오프셋 추가
            point.add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5
            ));
            
            points.push(point);
        }
        
        points.push(end.clone());
        return points;
    }
    
    /**
     * 번개 세그먼트 업데이트 (깜빡임)
     */
    updateLightningSegments(bolt) {
        const positions = bolt.mesh.geometry.attributes.position.array;
        
        for (let i = 3; i < positions.length - 3; i += 3) {
            // 중간 점들에 랜덤 지터 추가
            positions[i] += (Math.random() - 0.5) * 0.1;
            positions[i + 1] += (Math.random() - 0.5) * 0.1;
            positions[i + 2] += (Math.random() - 0.5) * 0.1;
        }
        
        bolt.mesh.geometry.attributes.position.needsUpdate = true;
    }
    
    /**
     * 연기 생성
     */
    createSmoke(position, count = 5) {
        for (let i = 0; i < count; i++) {
            const smokeGeometry = new THREE.SphereGeometry(0.2, 6, 4);
            const smokeMaterial = this.materials.smoke.clone();
            
            const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial);
            smoke.position.copy(position);
            smoke.position.add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                0,
                (Math.random() - 0.5) * 0.5
            ));
            
            const smokeData = {
                mesh: smoke,
                position: smoke.position.clone(),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 1,
                    1 + Math.random(),
                    (Math.random() - 0.5) * 1
                ),
                life: 2 + Math.random() * 2,
                maxLife: 4
            };
            
            smokeData.maxLife = smokeData.life;
            
            this.particleSystems.smoke.push(smokeData);
            this.scene.add(smoke);
        }
    }
    
    /**
     * 주변 번개 생성
     */
    createAmbientLightning() {
        // 미로 상공에 번개 생성
        const startPos = new THREE.Vector3(
            Math.random() * 15,
            8 + Math.random() * 2,
            Math.random() * 15
        );
        
        const endPos = new THREE.Vector3(
            startPos.x + (Math.random() - 0.5) * 5,
            startPos.y - 2 - Math.random() * 3,
            startPos.z + (Math.random() - 0.5) * 5
        );
        
        this.createElectricBolt(startPos, endPos, 12, 0x4444FF);
        
        // 번개와 함께 잠깐 밝아지는 효과
        const flash = new THREE.PointLight(0x4444FF, 2, 20);
        flash.position.copy(startPos);
        this.scene.add(flash);
        
        setTimeout(() => {
            this.scene.remove(flash);
        }, 200);
    }
    
    /**
     * 승리 이펙트
     */
    createVictoryEffect() {
        // 미로 중앙에서 대형 전기 폭발
        const centerPos = new THREE.Vector3(7.5, 2, 7.5);
        
        // 여러 단계 폭발
        setTimeout(() => this.createExplosion(centerPos, 2.0, 0xFFD700), 0);
        setTimeout(() => this.createExplosion(centerPos, 3.0, 0x00FFFF), 300);
        setTimeout(() => this.createExplosion(centerPos, 4.0, 0xFF66FF), 600);
        
        // 주변으로 번개 생성
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                const angle = (i / 8) * Math.PI * 2;
                const targetPos = new THREE.Vector3(
                    centerPos.x + Math.cos(angle) * 5,
                    centerPos.y,
                    centerPos.z + Math.sin(angle) * 5
                );
                this.createElectricBolt(centerPos, targetPos, 10, 0xFFD700);
            }, i * 100);
        }
    }
    
    /**
     * 총 발사 이펙트
     */
    createGunFireEffect(position, direction) {
        // 총구 섬광
        const muzzlePos = position.clone().add(direction.clone().multiplyScalar(0.3));
        this.createSparks(muzzlePos, 5, 0x00FFFF);
        
        // 총구 연기
        this.createSmoke(muzzlePos, 2);
    }
    
    /**
     * 적 피격 이펙트
     */
    createEnemyHitEffect(position) {
        this.createSparks(position, 8, 0xFF4444);
        this.createElectricBolt(
            position,
            position.clone().add(new THREE.Vector3(0, 1, 0)),
            5,
            0xFF6666
        );
        this.playSound('enemyHit');
    }
    
    /**
     * 플레이어 피격 이펙트
     */
    createPlayerHitEffect(position) {
        this.createSparks(position, 6, 0xFF0000);
        this.playSound('playerHit');
    }
    
    /**
     * 아이템 수집 이펙트
     */
    createItemCollectEffect(position, itemType) {
        const colors = {
            'COIN': 0xFFD700,
            'POWER_CUBE': 0x00FFFF,
            'HEALTH_PACK': 0xFF6B6B,
            'SPEED_BOOST': 0x00FF00,
            'SHIELD': 0x4169E1
        };
        
        const color = colors[itemType] || 0xFFFFFF;
        
        this.createSparks(position, 15, color);
        
        // 상승하는 링 이펙트
        this.createRisingRing(position, color);
        
        this.playSound('coinCollect');
    }
    
    /**
     * 상승하는 링 이펙트
     */
    createRisingRing(position, color) {
        const ringGeometry = new THREE.RingGeometry(0.1, 0.3, 16);
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
        const duration = 1000;
        
        const animateRing = () => {
            const elapsed = performance.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress < 1) {
                ring.position.y = position.y + progress * 2;
                ring.scale.setScalar(1 + progress * 2);
                ring.material.opacity = 0.8 * (1 - progress);
                requestAnimationFrame(animateRing);
            } else {
                this.scene.remove(ring);
            }
        };
        
        animateRing();
    }
    
    /**
     * 사운드 재생
     */
    playSound(soundName, volume = 1.0) {
        if (!this.audioSystem.enabled) return;
        
        console.log(`🔊 [${soundName}] 사운드 재생 (볼륨: ${volume * this.audioSystem.volume})`);
        
        // 실제 구현에서는 웹 오디오 API 사용
        /*
        if (this.audioSystem.sounds[soundName]) {
            const audio = new Audio(this.audioSystem.sounds[soundName]);
            audio.volume = volume * this.audioSystem.volume;
            audio.play().catch(e => console.warn('오디오 재생 실패:', e));
        }
        */
    }
    
    /**
     * 이펙트 정리
     */
    cleanupEffects() {
        // 파티클 수 제한
        const totalParticles = 
            this.particleSystems.sparks.length +
            this.particleSystems.explosions.length +
            this.particleSystems.electricity.length +
            this.particleSystems.smoke.length;
        
        if (totalParticles > this.settings.maxParticles) {
            // 오래된 파티클부터 제거
            this.removeOldestParticles();
        }
    }
    
    /**
     * 가장 오래된 파티클 제거
     */
    removeOldestParticles() {
        const systems = ['sparks', 'explosions', 'electricity', 'smoke'];
        
        systems.forEach(systemName => {
            const system = this.particleSystems[systemName];
            if (system.length > 0) {
                const oldest = system.shift();
                if (oldest && oldest.mesh) {
                    this.scene.remove(oldest.mesh);
                }
            }
        });
    }
    
    /**
     * 모든 이펙트 정리 (리셋 시)
     */
    reset() {
        // 모든 파티클 시스템 정리
        Object.values(this.particleSystems).forEach(system => {
            system.forEach(effect => {
                if (effect.mesh) {
                    this.scene.remove(effect.mesh);
                }
            });
            system.length = 0;
        });
        
        console.log('✨ 이펙트 시스템 리셋');
    }
    
    /**
     * 설정 업데이트
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        
        // 품질 설정에 따른 파티클 수 조정
        const qualityMultipliers = {
            'low': 0.3,
            'medium': 0.7,
            'high': 1.0
        };
        
        const multiplier = qualityMultipliers[this.settings.particleQuality] || 1.0;
        this.settings.maxParticles = Math.floor(500 * multiplier);
        this.environmentEffects.atmosphericParticles.count = Math.floor(50 * multiplier);
    }
    
    /**
     * 현재 상태 반환
     */
    getState() {
        const totalEffects = Object.values(this.particleSystems)
            .reduce((sum, system) => sum + system.length, 0);
        
        return {
            totalEffects,
            maxEffects: this.settings.maxParticles,
            particleQuality: this.settings.particleQuality,
            audioEnabled: this.audioSystem.enabled
        };
    }
}