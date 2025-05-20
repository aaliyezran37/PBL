document.addEventListener('DOMContentLoaded', function () {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    console.log('[DOM Ready] Canvas created:', canvas);
    console.log('[DOM Ready] 2D context:', ctx);
    document.body.appendChild(canvas);
    const restartOverlay = document.getElementById('restart-overlay');
    const gameOverDisplay = document.getElementById('game-over');
    const fullscreenButton = document.getElementById('fullscreen-button');

    // Set initial canvas style to blurred
    canvas.style.filter = 'blur(5px)';
    canvas.style.transition = 'filter 0.3s ease';
    canvas.width = 1300;
    canvas.height = 700;

    // Loot types
    const LOOT_TYPES = {
        COIN: { name: 'Coin', value: 1, color: 'gold', sprite: 'coin' },
        COIN_BAG: { name: 'Coin Bag', value: 5, color: 'gold', sprite: 'coin_bag' },
        HEALTH_POTION: { name: 'Health Potion', value: 25, color: 'red', sprite: 'potion' },
        ARMOR: { name: 'Armor', value: 10, color: 'silver', sprite: 'armor' }
    };

    const POTION_EFFECTS = {
        REGENERATION: {
            duration: 10000, // 10 seconds
            color: '#FF69B4',
            sprite: 'assets/animations/potions/regen-potion.gif',
            apply: (player) => {
                const healInterval = setInterval(() => {
                    player.health = Math.min(player.maxHealth, player.health + 2);
                    updateUI();
                }, 1000);
                return () => clearInterval(healInterval);
            }
        },
        WEAKNESS: {
            duration: 8000, // 8 seconds
            color: '#808080',
            sprite: 'assets/animations/potions/weakness-potion.gif',
            apply: (player) => {
                player.damageMultiplier = 0.5;
                return () => { player.damageMultiplier = 1.0; };
            }
        },
        STRENGTH: {
            duration: 12000, // 12 seconds
            color: '#FF4500',
            sprite: 'assets/animations/potions/strength-potion.gif',
            apply: (player) => {
                player.damageMultiplier = 2.0;
                return () => { player.damageMultiplier = 1.0; };
            }
        },
        SPEED: {
            duration: 10000, // 10 seconds
            color: '#00BFFF',
            sprite: 'assets/animations/potions/speed-potion.gif',
            apply: (player) => {
                const originalSpeed = player.speed;
                player.speed *= 1.75;
                return () => { player.speed = originalSpeed; };
            }
        },
        POISON: {
            duration: 15000, // 15 seconds
            color: '#32CD32',
            sprite: 'assets/animations/potions/poison-potion.gif',
            apply: (player) => {
                const damageInterval = setInterval(() => {
                    player.health = Math.max(1, player.health - 1);
                    updateUI();
                }, 1000);
                return () => clearInterval(damageInterval);
            }
        },
        SLOW_FALL: {
            duration: 15000, // 15 seconds
            color: '#9370DB',
            sprite: 'assets/animations/potions/slow-fall-potion.gif',
            apply: (player) => {
                const originalGravity = gameState.gravity;
                gameState.gravity *= 0.3;
                return () => { gameState.gravity = originalGravity; };
            }
        },
        JUMP_BOOST: {
            duration: 10000, // 10 seconds
            color: '#FFD700',
            sprite: 'assets/animations/potions/jump-boost-potion.gif',
            apply: (player) => {
                const originalJump = player.baseJumpPower;
                player.baseJumpPower *= 1.8;
                return () => { player.baseJumpPower = originalJump; };
            }
        },
        SLOWNESS: {
            duration: 10000, // 10 seconds
            color: '#A9A9A9',
            sprite: 'assets/animations/potions/slowness-potion.gif',
            apply: (player) => {
                const originalSpeed = player.speed;
                player.speed *= 0.5;
                return () => { player.speed = originalSpeed; };
            }
        },
        FORTUNE: {
            duration: 20000, // 20 seconds
            color: '#FF8C00',
            sprite: 'assets/animations/potions/fortune-potion.gif',
            apply: (player) => {
                player.coinMultiplier = 2;
                return () => { player.coinMultiplier = 1; };
            }
        },
        INVISIBILITY: {
            duration: 15000, // 15 seconds
            color: '#F0F8FF',
            sprite: 'assets/animations/potions/invisibility-potion.gif',
            apply: (player) => {
                player.visible = false;
                player.invulnerable = true;
                return () => {
                    player.visible = true;
                    player.invulnerable = false;
                };
            }
        }
    };

    // Audio System - Add right after DOMContentLoaded
    // Audio library definition
const audio = {
    jump: { src: 'assets/soundfx/jumping.mp3', instances: [] },
    coin: { src: 'assets/soundfx/coin-collect.mp3', instances: [] },
    damage: { src: 'assets/soundfx/damaged.mp3', instances: [] },
    attack: { src: 'assets/soundfx/sword-attack.mp3', instances: [] },
    shoot: { src: 'assets/soundfx/bullet.mp3', instances: [] },
    walk: { src: 'assets/soundfx/walking.mp3', instances: [] },
    lava: { src: 'assets/soundfx/lava.mp3', instances: [] },
    bounce: { src: 'assets/soundfx/bounce.mp3', instances: [] },
    levelComplete: { src: 'assets/soundfx/level-complete.mp3', instances: [] },
    fail: { src: 'assets/soundfx/fail.mp3', instances: [] },
    chestOpen: { src: 'assets/soundfx/chest-open.mp3', instances: [] },
    armorEquip: { src: 'assets/soundfx/armor-equip.mp3', instances: [] },
    potionDrink: { src: 'assets/soundfx/potion-drink.mp3', instances: [] }
};

// Replace the initAudio function with this more robust version:
async function initAudio() {
    const audioElements = Object.keys(audio);
    let loadedCount = 0;
    
    for (const key of audioElements) {
        audio[key].instances = [];
        audio[key].available = false;
        
        try {
            // Create silent fallback instances
            for (let i = 0; i < 3; i++) {
                const silentSound = new Audio();
                silentSound.muted = true;
                audio[key].instances.push(silentSound);
            }
            
            // Try loading the actual sound
            const testSound = new Audio(audio[key].src);
            await new Promise((resolve) => {
                testSound.addEventListener('canplaythrough', resolve);
                testSound.addEventListener('error', resolve); // Don't reject on error
                setTimeout(resolve, 1000); // Timeout after 1 second
                testSound.load();
            });
            
            // Replace instances if loaded successfully
            if (testSound.readyState > 0) {
                audio[key].instances = [];
                for (let i = 0; i < 3; i++) {
                    const sound = new Audio(audio[key].src);
                    audio[key].instances.push(sound);
                }
                audio[key].available = true;
                loadedCount++;
                console.log(`[Audio] Loaded: ${key}`);
            } else {
                console.warn(`[Audio] Failed to load: ${key}, using silent fallback`);
            }
        } catch (error) {
            console.warn(`[Audio] Error loading ${key}:`, error.message);
            // Silent instances already created above
        }
    }
    
    console.log(`[Audio] Loaded ${loadedCount}/${audioElements.length} sounds`);
    return loadedCount;
}

// Play sound effect
function playSound(soundKey, volume = 0.7, loop = false) {
    if (!audio[soundKey] || !audio[soundKey].available) return;

    try {
        const instance = audio[soundKey].instances.find(i => i.paused);
        if (instance) {
            instance.volume = Math.min(1, Math.max(0, volume));
            instance.loop = loop;
            instance.currentTime = 0;
            instance.play().catch(e => console.warn('Play failed:', e));
        }
    } catch (e) {
        console.warn('Audio error:', e);
    }
}

// Add this utility function to check audio status
// Check audio system status
function checkAudioStatus() {
    const status = {};
    let loadedCount = 0;
    let failedCount = 0;
    
    Object.keys(audio).forEach(key => {
        status[key] = {
            available: audio[key].available,
            path: audio[key].src,
            instances: audio[key].instances.length,
            loaded: audio[key].instances.filter(i => i.readyState > 0).length,
            lastError: audio[key].lastError
        };
        
        if (audio[key].available) loadedCount++;
        else failedCount++;
    });
    
    console.groupCollapsed('[Audio] Detailed Status');
    console.table(status);
    console.log(`Loaded: ${loadedCount}, Failed: ${failedCount}`);
    console.groupEnd();
    
    return status;
}

// Stop sound effect
function stopSound(soundKey) {
    if (!audio[soundKey]) return;
    
    audio[soundKey].instances.forEach(instance => {
        instance.pause();
        instance.currentTime = 0;
    });
}

    // Game state object with all requested changes
    const gameState = {
        gravity: 0.65, // Adjusted gravity
        groundHeight: 70,
        ground: canvas.height - 70 - 105,
        backgroundOffset: 0,
        backgroundSpeed: 3,
        backgroundImage: new Image(),
        player: {
            x: 100,
            y: canvas.height - 70 - 105 - 35, // Initial Y position (will be adjusted)
            width: 35, // Base width (can be adjusted per animation)
            baseHeight: 35, // Will be overridden by animation frames
            crouchHeight: 18.7, // Will be overridden by armored animations
            baseJumpPower: 13,         // Normal jump strength (increase for higher jumps)
            crouchJumpFactor: 0.6,     // 0.6 = 60% of normal jump (reduce for weaker crouch jumps)
            fastFallMultiplier: 1.53, // Added - fall acceleration when crouching mid-air
            color: '#297600',
            dy: 0,
            dx: 0,
            speed: 6, // Reduced by 125% (from 7.5 to 6)
            momentum: 0,
            maxMomentum: 2.25,
            jumping: false,
            crouching: false,
            falling: false,
            health: 100,
            maxHealth: 100,
            armor: 0,
            activeEffects: [],
            potionSprites: {},
            friction: 0.8,
            inventory: [],
            effectTexts: [],
            currentAnimation: 'standing',
            animationFrames: {},
            animationTimer: 0,
            currentFrame: 0,
            facingRight: true,
            invulnerable: false,
            invulnerableTimer: 0,
            invulnerableDuration: 1000 // 1 second
        },
        platforms: [],
        barriers: [],
        coins: [],
        enemies: [],
        checkpoints: [],
        chests: [],
        lootItems: [], // Add this line
        coinCount: 0,
        scrollingEnabled: true,
        keySequence: [],
        toggleScrollKeys: ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'n', 'm', 'Enter'],
        MIN_COINS_REQUIRED: 15,
        levelComplete: false,
        lastCheckpoint: 0,
        cameraOffset: 0,
        weapons: {
            gun: {
                damage: 40,
                cooldown: 1000,
                lastUsed: 0,
                range: 300,
                projectileSpeed: 15,
                sprite: new Image(),
                sound: audio.shoot
            },
            sword: {
                damage: 75,
                cooldown: 3000,
                lastUsed: 0,
                range: 50,
                sprite: new Image(),
                sound: audio.attack
            }
        },
        currentWeapon: null,
        armor: 0,
        maxArmor: 100,
        armorDurability: 1,
        projectiles: []
    };

    const LEVELS = {
        1: {
            name: "Forest Adventure",
            length: 8000,
            background: 'assets/sprites/level1.png',
            minCoins: 15,
            coins: 17,
            chests: 1
        },
        2: {
            name: "Lava Caverns",
            length: 10000,
            background: 'assets/sprites/level2.png',
            minCoins: 20,
            coins: 20,
            chests: [
                { x: 3980, y: 110, spawnRate: 100 }, // First chest always spawns
                { x: 6500, y: gameState.ground - 520, spawnRate: 100 } // Second chest always spawns
            ],
            hasLava: true,
            hasFallingGround: true
        },
        // In the LEVELS configuration object, update levels 3 and 4 with full configurations:

    3: {
        name: "Sky Fortress",
        length: 12000,
        background: 'assets/sprites/level3.png',
        minCoins: 25,
        coins: 25,
        chests: [
            { x: 2500, y: gameState.ground - 200, spawnRate: 100 }, // Always spawns
            { x: 5500, y: 150, spawnRate: 55 }, // 55% spawn chance
            { x: 8500, y: gameState.ground - 400, spawnRate: 100 } // Always spawns
        ],
        hasMovingPlatforms: true
    },
    4: {
        name: "Dark Abyss",
        length: 15000,
        background: 'assets/sprites/level4.png',
        minCoins: 30,
        coins: 30,
        chests: [
            { x: 3000, y: gameState.ground - 150, spawnRate: 100 }, // Always spawns
            { x: 6000, y: gameState.ground - 300, spawnRate: 100 }, // Always spawns
            { x: 9000, y: gameState.ground - 450, spawnRate: 75 }, // 75% spawn chance
            { x: 12000, y: gameState.ground - 600, spawnRate: 35 } // 35% spawn chance
        ],
        hasDarkness: true,
        visibilityRadius: 300
    }
    };

    // Game control flags
    let gameRunning = false;
    let gamePaused = false;
    let animationFrameId = null;

    
    // Create home screen
const homeScreen = document.createElement('div');
homeScreen.id = 'home-screen';
homeScreen.style.position = 'fixed';
homeScreen.style.top = '0';
homeScreen.style.left = '0';
homeScreen.style.width = '100%';
homeScreen.style.height = '100%';
homeScreen.style.backgroundImage = 'url("assets/images/village.png")';
homeScreen.style.backgroundSize = 'cover';
homeScreen.style.backgroundPosition = 'center';
homeScreen.style.display = 'flex';
homeScreen.style.flexDirection = 'column';
homeScreen.style.alignItems = 'center';
homeScreen.style.justifyContent = 'center';
homeScreen.style.zIndex = '1000';
document.body.appendChild(homeScreen);

// Create container for main menu (now shown by default)
const mainMenuContainer = document.createElement('div');
mainMenuContainer.id = 'main-menu';
mainMenuContainer.style.display = 'flex'; // Changed from 'none' to 'flex'
mainMenuContainer.style.flexDirection = 'column';
mainMenuContainer.style.alignItems = 'center';
mainMenuContainer.style.justifyContent = 'center';
mainMenuContainer.style.gap = '1rem';
mainMenuContainer.style.width = '100%';
homeScreen.appendChild(mainMenuContainer);



    // Title
    const title = document.createElement('h1');
    title.textContent = 'CHRONICLES OF THE SKYWARDS LEGENDS';
    title.style.fontFamily = '"Press Start 2P", monospace';
    title.style.color = '#fff';
    title.style.textShadow = '3px 3px 0 #000';
    title.style.fontSize = '1.5rem';
    title.style.marginBottom = '2rem';
    title.style.textAlign = 'center';
    title.style.lineHeight = '1.5';
    mainMenuContainer.appendChild(title);

    // Menu Container
    const menuContainer = document.createElement('div');
    menuContainer.style.display = 'flex';
    menuContainer.style.flexDirection = 'column';
    menuContainer.style.gap = '1rem';
    menuContainer.style.alignItems = 'center';
    homeScreen.appendChild(menuContainer);

    // Story Mode Button
    const storyButton = document.createElement('button');
    storyButton.textContent = 'STORY MODE';
    storyButton.style.fontFamily = '"Press Start 2P", monospace';
    storyButton.style.padding = '1rem 2rem';
    storyButton.style.color = 'white';
    storyButton.style.border = '2px solid white';
    storyButton.style.cursor = 'pointer';
    storyButton.style.fontSize = '1rem';
    storyButton.style.background = 'transparent';
    storyButton.style.textShadow = '2px 2px 0 #000';
    storyButton.addEventListener('click', () => {
        homeScreen.style.display = 'none';
        showStoryScreen();
    });
    mainMenuContainer.appendChild(storyButton);


    // Skip Story Button
    const skipStoryButton = document.createElement('button');
    skipStoryButton.textContent = 'SKIP STORY';
    skipStoryButton.style.fontFamily = '"Press Start 2P", monospace';
    skipStoryButton.style.padding = '1rem 2rem';
    skipStoryButton.style.color = 'white';
    skipStoryButton.style.border = '2px solid white';
    skipStoryButton.style.cursor = 'pointer';
    skipStoryButton.style.fontSize = '1rem';
    skipStoryButton.style.background = 'transparent';
    skipStoryButton.style.textShadow = '2px 2px 0 #000';
    skipStoryButton.addEventListener('click', () => {
        homeScreen.style.display = 'none';
        initGame(false);
    });
    mainMenuContainer.appendChild(skipStoryButton);

    // Credits Button
const creditsButton = document.createElement('button');
creditsButton.textContent = 'CREDITS';
creditsButton.style.fontFamily = '"Press Start 2P", monospace';
creditsButton.style.padding = '1rem 2rem';
creditsButton.style.color = 'white';
creditsButton.style.border = '2px solid white';
creditsButton.style.cursor = 'pointer';
creditsButton.style.fontSize = '1rem';
creditsButton.style.background = 'transparent';
creditsButton.style.textShadow = '2px 2px 0 #000';
creditsButton.addEventListener('click', () => {
    homeScreen.style.display = 'none';
    showCredits();
});
mainMenuContainer.appendChild(creditsButton);



// Create fullscreen button
function createFullscreenButton() {
    const fullscreenButton = document.createElement('button');
    fullscreenButton.id = 'fullscreen-btn';
    fullscreenButton.textContent = 'FULLSCREEN';
    fullscreenButton.style.position = 'fixed';
    fullscreenButton.style.bottom = '20px';
    fullscreenButton.style.right = '20px';
    fullscreenButton.style.padding = '10px 20px';
    fullscreenButton.style.backgroundColor = '#4CAF50';
    fullscreenButton.style.color = 'white';
    fullscreenButton.style.border = 'none';
    fullscreenButton.style.borderRadius = '5px';
    fullscreenButton.style.cursor = 'pointer';
    fullscreenButton.style.zIndex = '1000';
    fullscreenButton.style.fontFamily = '"Press Start 2P", monospace';
    fullscreenButton.style.fontSize = '14px';
    
    fullscreenButton.addEventListener('click', toggleFullscreen);
    document.body.appendChild(fullscreenButton);
    
    return fullscreenButton;
}

// Initialize fullscreen functionality
function initFullscreen() {
    createFullscreenButton();
    
    // Event listeners for fullscreen changes
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);
    
    // Make canvas focusable for keyboard controls
    canvas.setAttribute('tabindex', '0');
    canvas.style.outline = 'none';
    canvas.focus();
}

initFullscreen();

// Enter fullscreen mode
function enterFullscreen() {
    if (canvas.requestFullscreen) {
        canvas.requestFullscreen().catch(err => {
            console.error('Fullscreen error:', err);
            showMessage('Fullscreen not allowed');
        });
    } else if (canvas.webkitRequestFullscreen) {
        canvas.webkitRequestFullscreen();
    } else if (canvas.msRequestFullscreen) {
        canvas.msRequestFullscreen();
    }
    
    // Update UI
    homeScreen.style.display = 'none';
    canvas.style.display = 'block';
    gamePaused = false;
    
    // Start game if not running
    if (!gameRunning) {
        initGame(false);
    } else if (!animationFrameId) {
        gameLoop();
    }
}

// Exit fullscreen mode
function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }

    // Update UI
    homeScreen.style.display = 'flex';
    canvas.style.display = 'none';
    gamePaused = true;
    
    // Stop game loop
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

// Toggle fullscreen
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        enterFullscreen();
    } else {
        exitFullscreen();
    }
}


    function showStoryScreen() {
        const storyScreen = document.createElement('div');
        storyScreen.id = 'story-screen';
        storyScreen.style.position = 'fixed';
        storyScreen.style.top = '0';
        storyScreen.style.left = '0';
        storyScreen.style.width = '100%';
        storyScreen.style.height = '100%';
        storyScreen.style.backgroundColor = 'rgba(0,0,0,0.9)';
        storyScreen.style.display = 'flex';
        storyScreen.style.flexDirection = 'column';
        storyScreen.style.alignItems = 'center';
        storyScreen.style.justifyContent = 'center';
        storyScreen.style.zIndex = '1001';
        storyScreen.style.color = 'white';
        storyScreen.style.fontFamily = '"Press Start 2P", cursive';
        storyScreen.style.textAlign = 'center';
        storyScreen.style.padding = '2rem';
        document.body.appendChild(storyScreen);
    
        const video = document.createElement('video');
        video.src = 'assets/media/story.mp4';
        video.controls = false;
        video.autoplay = true;
        video.style.width = '80%';
        video.style.maxHeight = '80%';
        storyScreen.appendChild(video);
    
        const startButton = document.createElement('button');
        startButton.textContent = 'START GAME';
        startButton.style.fontFamily = '"Press Start 2P", cursive';
        startButton.style.padding = '1rem 2rem';
        startButton.style.backgroundColor = '#4CAF50';
        startButton.style.color = 'white';
        startButton.style.border = 'none';
        startButton.style.cursor = 'pointer';
        startButton.style.marginTop = '2rem';
        startButton.addEventListener('click', () => {
            storyScreen.remove();
            initGame(false);
        });
        storyScreen.appendChild(startButton);
    
        video.addEventListener('ended', () => {
            startButton.style.display = 'block';
        });
    }

    // Credits Screen
    function showCredits() {
        const creditsScreen = document.createElement('div');
        creditsScreen.id = 'credits-screen';
        creditsScreen.style.position = 'fixed';
        creditsScreen.style.top = '0';
        creditsScreen.style.left = '0';
        creditsScreen.style.width = '100%';
        creditsScreen.style.height = '100%';
        creditsScreen.style.backgroundColor = 'rgba(0,0,0,0.9)';
        creditsScreen.style.display = 'flex';
        creditsScreen.style.flexDirection = 'column';
        creditsScreen.style.alignItems = 'center';
        creditsScreen.style.justifyContent = 'center';
        creditsScreen.style.zIndex = '1001';
        creditsScreen.style.color = 'white';
        creditsScreen.style.fontFamily = '"Press Start 2P", monospace';
        creditsScreen.style.textAlign = 'center';
        creditsScreen.style.padding = '2rem';
        document.body.appendChild(creditsScreen);

        const creditsText = document.createElement('div');
        creditsText.innerHTML = `
            <h2>CREDITS</h2>
            <p>Game Developer: Aaliy Ezran</p>
            <p>Artwork: Shahrul Iqwan</p>
            <p>Music: Various</p>
            <p>Special Thanks: Madam Aishah and Sir Ameirul</p>
        `;
        creditsText.style.marginBottom = '2rem';
        creditsScreen.appendChild(creditsText);

        const backButton = document.createElement('button');
        backButton.textContent = 'BACK TO MENU';
        backButton.style.fontFamily = '"Press Start 2P", cursive';
        backButton.style.padding = '1rem 2rem';
        backButton.style.backgroundColor = '#2196F3';
        backButton.style.color = 'white';
        backButton.style.border = 'none';
        backButton.style.cursor = 'pointer';
        backButton.addEventListener('click', () => {
            creditsScreen.remove();
            homeScreen.style.display = 'flex';
        });
        creditsScreen.appendChild(backButton);
    }

    function showLevelTransition(levelNum) {
        const transitionScreen = document.createElement('div');
        transitionScreen.id = 'level-transition';
        transitionScreen.style.position = 'fixed';
        transitionScreen.style.top = '0';
        transitionScreen.style.left = '0';
        transitionScreen.style.width = '100%';
        transitionScreen.style.height = '100%';
        transitionScreen.style.backgroundColor = 'rgba(0,0,0,0.9)';
        transitionScreen.style.display = 'flex';
        transitionScreen.style.flexDirection = 'column';
        transitionScreen.style.alignItems = 'center';
        transitionScreen.style.justifyContent = 'center';
        transitionScreen.style.zIndex = '1001';
        transitionScreen.style.color = 'white';
        transitionScreen.style.fontFamily = '"Press Start 2P", cursive';
        transitionScreen.style.textAlign = 'center';
        document.body.appendChild(transitionScreen);
    
        const levelText = document.createElement('h1');
        levelText.textContent = `LEVEL ${levelNum}`;
        levelText.style.fontSize = '3rem';
        levelText.style.marginBottom = '2rem';
        transitionScreen.appendChild(levelText);
    
        const levelName = document.createElement('h2');
        levelName.textContent = LEVELS[levelNum].name;
        levelName.style.fontSize = '1.5rem';
        levelName.style.marginBottom = '2rem';
        transitionScreen.appendChild(levelName);
    
        const continueText = document.createElement('p');
        continueText.textContent = 'Press any key to continue';
        continueText.style.fontSize = '1rem';
        continueText.style.animation = 'blink 1s infinite';
        transitionScreen.appendChild(continueText);
    
        // Add CSS for blinking animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes blink {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    
        const continueHandler = () => {
            transitionScreen.remove();
            document.removeEventListener('keydown', continueHandler);
            document.removeEventListener('click', continueHandler);
            loadLevel(levelNum);
        };
    
        document.addEventListener('keydown', continueHandler);
        document.addEventListener('click', continueHandler);
    }

    // Make sure to hide the canvas initially
    canvas.style.display = 'none';

    // Modify your initGame function to show the canvas when starting the game
    async function initGame(resume = false) {
        console.log('[initGame] called, resume =', resume);
    homeScreen.style.display = 'none';
    canvas.style.display = 'block';
    
    // Initialize audio with error handling
    initAudio().then(() => {
        console.log('Audio initialized', checkAudioStatus());
    }).catch(e => {
        console.error('Audio initialization failed:', e);
    });

        loadPotionSprites();
        loadPlayerAnimations();
        loadEnemyAnimations();
        initAudio();

        // Initialize lootItems first thing
        gameState.lootItems = gameState.lootItems || [];

        if (!resume) {
            try {
                gameState.backgroundImage = new Image();
                gameState.backgroundImage.src = 'assets/sprites/level1.png';
                await new Promise((resolve, reject) => {
                    gameState.backgroundImage.onload = () => {
                        // Calculate the scale to fit canvas height
                        const scale = canvas.height / gameState.backgroundImage.height;
                        gameState.backgroundWidth = gameState.backgroundImage.width * scale;
                        gameState.backgroundHeight = canvas.height;

                        // Create a canvas for the tiled background
                        const bgCanvas = document.createElement('canvas');
                        bgCanvas.width = 8000; // Level width
                        bgCanvas.height = canvas.height;
                        const bgCtx = bgCanvas.getContext('2d');

                        // Tile the background image horizontally
                        let xPos = 0;
                        while (xPos < bgCanvas.width) {
                            bgCtx.drawImage(
                                gameState.backgroundImage,
                                0, 0,
                                gameState.backgroundImage.width, gameState.backgroundImage.height,
                                xPos, 0,
                                gameState.backgroundWidth, gameState.backgroundHeight
                            );
                            xPos += gameState.backgroundWidth;
                        }

                        gameState.backgroundCanvas = bgCanvas;
                        resolve();
                    };
                    gameState.backgroundImage.onerror = reject;
                });
            } catch (error) {
                console.warn('Using fallback background:', error.message);
                gameState.backgroundCanvas = createFallbackBackground();
            }


            // ▼ PUT ALL LEVEL 1 CONFIGURATIONS HERE ▼
            gameState.platforms = [
                { x: 200, y: 300, width: 100, height: 10 },
                { x: 300, y: 400, width: 100, height: 10 },
                { x: 475, y: 459, width: 100, height: 10 },
                { x: 400, y: 250, width: 100, height: 10 },
                { x: 600, y: 200, width: 100, height: 10 },
                { x: 900, y: 300, width: 120, height: 10 },
                { x: 1200, y: 250, width: 120, height: 10 },
                { x: 1500, y: 200, width: 130, height: 10 },
                { x: 1800, y: 300, width: 100, height: 10 },
                { x: 1100, y: 350, width: 80, height: 10 },
                { x: 1250, y: 370, width: 80, height: 10 },
                { x: 1400, y: 350, width: 80, height: 10 },
                { x: 1550, y: 400, width: 80, height: 10 },
                { x: 1700, y: 350, width: 80, height: 10 },
                { x: 2100, y: gameState.ground - 100, width: 150, height: 10 },
                { x: 2300, y: gameState.ground - 150, width: 150, height: 10 },
                { x: 2500, y: gameState.ground - 200, width: 150, height: 10 },
                { x: 2700, y: gameState.ground - 150, width: 150, height: 10 },
                { x: 2900, y: gameState.ground - 100, width: 150, height: 10 },
                { x: 2200, y: 200, width: 60, height: 10 },
                { x: 2400, y: 250, width: 60, height: 10 },
                { x: 2600, y: 200, width: 60, height: 10 },
                { x: 3100, y: gameState.ground - 250, width: 100, height: 10 },
                { x: 3200, y: gameState.ground - 350, width: 100, height: 10 },
                { x: 3300, y: gameState.ground - 450, width: 100, height: 10 },
                { x: 3400, y: gameState.ground - 550, width: 100, height: 10 },
                { x: 3150, y: gameState.ground - 150, width: 50, height: 10 },
                { x: 3350, y: gameState.ground - 250, width: 100, height: 10 },
                { x: 3550, y: gameState.ground - 350, width: 100, height: 10 },
                { x: 3800, y: 250, width: 200, height: 10 },
                { x: 4000, y: 160, width: 10, height: 100 },
                { x: 4100, y: 150, width: 200, height: 10 },
                { x: 4400, y: 250, width: 200, height: 10 },
                { x: 4700, y: 150, width: 200, height: 10 },
                { x: 4300, y: 200, width: 50, height: 10 },
                { x: 4600, y: 200, width: 50, height: 10 },
                { x: 5000, y: gameState.ground + 30, width: 200, height: 30 },
                { x: 5100, y: gameState.ground + 50, width: 200, height: 10 },
                { x: 5400, y: gameState.ground + 100, width: 200, height: 10 },
                { x: 5700, y: gameState.ground + 50, width: 200, height: 10 },
                { x: 5200, y: 100, width: 100, height: 10 },
                { x: 5500, y: 150, width: 100, height: 10 },
                { x: 5800, y: 100, width: 100, height: 10 },
                { x: 6200, y: gameState.ground - 300, width: 150, height: 10 },
                { x: 6400, y: gameState.ground - 400, width: 150, height: 10 },
                { x: 6600, y: gameState.ground - 500, width: 150, height: 10 },
                { x: 6800, y: gameState.ground - 400, width: 150, height: 10 },
                { x: 7000, y: gameState.ground - 300, width: 150, height: 10 },
                { x: 7200, y: 200, width: 80, height: 10 },
                { x: 7350, y: 150, width: 80, height: 10 },
                { x: 7500, y: 100, width: 80, height: 10 },
                { x: 7650, y: 150, width: 80, height: 10 },
                { x: 7700, y: gameState.ground - 600, width: 100, height: 10, isGoal: true }
            ];

            gameState.coins = [
                { x: 300, y: 270, width: 10, height: 10, color: 'yellow' },
                { x: 700, y: 170, width: 10, height: 10, color: 'yellow' },
                { x: 1120, y: 320, width: 10, height: 10, color: 'yellow' },
                { x: 1270, y: 370, width: 10, height: 10, color: 'yellow' },
                { x: 2150, y: gameState.ground - 150, width: 10, height: 10, color: 'yellow' },
                { x: 3250, y: gameState.ground - 400, width: 10, height: 10, color: 'yellow' },
                { x: 4750, y: 120, width: 10, height: 10, color: 'yellow' },
                { x: 5150, y: gameState.ground + 20, width: 10, height: 10, color: 'yellow' },
                { x: 5750, y: gameState.ground + 20, width: 10, height: 10, color: 'yellow' },
                { x: 7250, y: 170, width: 10, height: 10, color: 'yellow' },
                { x: 7750, y: gameState.ground - 650, width: 10, height: 10, color: 'yellow' }
            ];

            gameState.enemies = [
                { x: 800, y: gameState.ground - 20, radius: 32, dx: 2, minX: 700, maxX: 900, lastDamageTime: 0, color: '#df1400', },
                { x: 1600, y: gameState.ground - 20, radius: 18, dx: 2, minX: 1500, maxX: 1700, lastDamageTime: 0, color: '#df1400' },
                { x: 2300, y: gameState.ground - 170, radius: 20, dx: 1.5, minX: 2200, maxX: 2400, lastDamageTime: 0, color: '#df1400' },
                { x: 2700, y: gameState.ground - 170, radius: 20, dx: 1.5, minX: 2600, maxX: 2800, lastDamageTime: 0, color: '#df1400' },
                { x: 3300, y: gameState.ground - 470, radius: 15, dx: 1, minX: 3200, maxX: 3400, lastDamageTime: 0, color: '#df1400' },
                { x: 4400, y: 220, radius: 15, dx: 3, minX: 4300, maxX: 4500, lastDamageTime: 0, color: '#df1400' },
                { x: 5400, y: gameState.ground + 70, radius: 18, dx: 2, minX: 5300, maxX: 5500, lastDamageTime: 0, color: '#df1400' },
                { x: 6600, y: gameState.ground - 520, radius: 20, dx: 2.5, minX: 6500, maxX: 6700, lastDamageTime: 0, color: '#df1400' },
                { x: 7200, y: 170, radius: 15, dx: 2, minX: 7100, maxX: 7300, lastDamageTime: 0, color: '#df1400' }
            ];

            gameState.checkpoints = [
                { x: 2000, y: gameState.ground - 50, width: 30, height: 50, activated: false, color: '#00FF00' },
                { x: 4000, y: 100, width: 30, height: 50, activated: false, color: '#00FF00' },
                { x: 6000, y: gameState.ground + 30, width: 30, height: 50, activated: false, color: '#00FF00' }
            ];

            gameState.chests = [
                {
                    x: 3980,
                    y: 110,
                    width: 40,
                    height: 30,
                    color: '#D4A017',
                    collected: false
                }
            ];

            gameState.barriers = [
                { x: 0, y: 0, width: 1, height: canvas.height },
                { x: 8000 - 1, y: 0, width: 1, height: canvas.height },
                { x: 0, y: 0, width: 8000, height: 1 },
                { x: 0, y: canvas.height - 1, width: 8000, height: 1 }
            ];

            gameState.MIN_COINS_REQUIRED = 15;
            // ▲ END OF LEVEL 1 CONFIGURATIONS ▲

            gameState.lootItems = []; // Explicit initialization
        }

        // Reset player state
        gameState.player.x = 100;
        gameState.player.y = canvas.height - gameState.groundHeight - gameState.player.height;
        gameState.player.height = gameState.player.baseHeight;
        gameState.player.crouching = false;
        gameState.player.health = 100;
        gameState.lootItems = gameState.lootItems || []; // Additional safety check
        gameState.coinCount = 0;
        gameState.levelComplete = false;
        gameState.gameOver = false;
        gameState.nearChest = null;
        gameState.cameraOffset = 0;

        gameRunning = true;
        gamePaused = false;
        canvas.style.filter = 'none';
        restartOverlay.style.display = 'none';
        gameOverDisplay.style.display = 'none';
        fullscreenButton.style.display = 'none';

        /// Load chest assets
        gameState.chestImage = new Image();
        gameState.chestImage.src = 'assets/sprites/chest.png';
        gameState.chestOpeningAnimation = new Image();
        gameState.chestOpeningAnimation.src = 'assets/animations/chest-opening.gif';
        gameState.chestAnimationFrames = [];
        gameState.chestAnimationTimer = 0;
        gameState.chestAnimationSpeed = 15; // frames per second
        gameState.currentChest = null; // Track which chest is animating

        updateUI();

        if (!gamePaused) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            gameLoop();
        }
    }

    function createFallbackBackground() {
        const fallbackCanvas = document.createElement('canvas');
        fallbackCanvas.width = 8000; // Match level width
        fallbackCanvas.height = canvas.height;
        const ctx = fallbackCanvas.getContext('2d');
    
        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#87CEEB'); // Sky blue
        gradient.addColorStop(1, '#E0F7FA'); // Light cyan
    
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);
    
        return fallbackCanvas;
    }

    function loadPotionSprites() {
        Object.keys(POTION_EFFECTS).forEach(type => {
            const effect = POTION_EFFECTS[type];
            effect.spriteImage = new Image();
            effect.spriteImage.onerror = () => {
                console.error(`Failed to load potion sprite: ${effect.sprite}`);
                // Create fallback
                effect.spriteImage = createFallbackPotionSprite(effect.color);
            };
            effect.spriteImage.src = effect.sprite;
        });
    }

    function extractAnimationFrames(animationName) {
        const anim = gameState.player.animationFrames[animationName];
        if (!anim || !anim.image || !anim.image.complete) return;
    
        // Create a temporary canvas to extract frames
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = anim.image.width;
        tempCanvas.height = anim.image.height;
        const tempCtx = tempCanvas.getContext('2d');
    
        // Calculate frame dimensions (assuming frames are laid out horizontally)
        anim.originalWidth = anim.image.width / anim.frames;
        anim.originalHeight = anim.image.height;
        anim.frameDuration = 1 / anim.fps;
    
        anim.framesData = [];
        for (let i = 0; i < anim.frames; i++) {
            tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.drawImage(
                anim.image,
                i * anim.originalWidth,  // source x
                0,                      // source y
                anim.originalWidth,     // source width
                anim.originalHeight,    // source height
                0, 0,                   // destination x,y
                anim.originalWidth,     // destination width
                anim.originalHeight     // destination height
            );
    
            // Create a canvas for each frame
            const frameCanvas = document.createElement('canvas');
            frameCanvas.width = anim.originalWidth;
            frameCanvas.height = anim.originalHeight;
            frameCanvas.getContext('2d').drawImage(tempCanvas, 0, 0);
            anim.framesData.push(frameCanvas);
        }
    }

    // Replace the loadPlayerAnimations function with:
    function loadPlayerAnimations() {
        gameState.player.animationFrames = {
            // Normal animations
            'standing': {
                image: new Image(),
                frames: 3,       // Number of frames in GIF
                fps: 3,          // Animation speed (frames per second)
                path: 'assets/animations/people/david-standing.gif',
                width: 35,       // Display width
                height: 35,      // Display height
                loaded: false,   // Track loading status
                framesData: []   // Will store extracted frames
            },
            'walking': {
                image: new Image(),
                frames: 4,
                fps: 8,
                path: 'assets/animations/people/david-walking.gif',
                width: 35,
                height: 35,
                loaded: false,
                framesData: []
            },
            // Add other animations (jumping, crouching, etc.) with same structure
            
            // Armored animations
            'armor-standing': {
                image: new Image(),
                frames: 3,
                fps: 3,
                path: 'assets/animations/people/david-armor-standing.gif',
                width: 40,
                height: 40,
                loaded: false,
                framesData: []
            },
            // Add other armored animations
        };
    
        // Load all animations
        Object.keys(gameState.player.animationFrames).forEach(key => {
            const anim = gameState.player.animationFrames[key];
            anim.image.onload = () => {
                extractAnimationFrames(key);
                anim.loaded = true;
            };
            anim.image.onerror = () => {
                console.error(`Failed to load animation: ${anim.path}`);
                anim.loaded = false;
            };
            anim.image.src = anim.path;
        });
    }

    function loadEnemyAnimations() {
        gameState.enemies.forEach(enemy => {
            enemy.animation = {
                image: new Image(),
                frames: 8, // Reduced from 18 to match actual sprite sheet
                fps: 8,
                frameWidth: 64, // Explicit width for each frame
                frameHeight: 64, // Explicit height for each frame
                currentFrame: 0,
                frameTimer: 0,
                loaded: false,
                framesData: []
            };
    
            enemy.animation.image.onload = () => {
                enemy.animation.loaded = true;
                extractEnemyAnimationFrames(enemy);
            };
            enemy.animation.image.onerror = () => {
                console.error('Failed to load enemy animation');
                enemy.animation.loaded = false;
            };
            enemy.animation.image.src = 'assets/animations/people/xanthrian-walking.gif';
            
            // Set enemy radius based on frame dimensions
            enemy.radius = enemy.animation.frameWidth / 2;
        });
    }



    function extractEnemyAnimationFrames(enemy) {
        const anim = enemy.animation;
        // Use the predefined frame dimensions instead of calculating
        const frameWidth = anim.frameWidth;
        const frameHeight = anim.frameHeight;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = frameWidth;
        tempCanvas.height = frameHeight;
        const tempCtx = tempCanvas.getContext('2d');

        anim.framesData = [];
        for (let i = 0; i < anim.frames; i++) {
            tempCtx.clearRect(0, 0, frameWidth, frameHeight);
            tempCtx.drawImage(
                anim.image,
                i * frameWidth,  // x position of frame
                0,              // y position (always 0 for single row)
                frameWidth,
                frameHeight,
                0, 0,           // destination x,y
                frameWidth,
                frameHeight
            );

            const frameCanvas = document.createElement('canvas');
            frameCanvas.width = frameWidth;
            frameCanvas.height = frameHeight;
            frameCanvas.getContext('2d').drawImage(tempCanvas, 0, 0);
            anim.framesData.push(frameCanvas);
        }

        // Adjust enemy radius based on animation size if needed
        enemy.radius = frameHeight / 2;
    }

    

    // Replace extractEnemyAnimationFrames with:
    function extractEnemyAnimationFrames(enemy) {
        if (!enemy || !enemy.animation || !enemy.animation.image || !enemy.animation.image.complete) {
            return;
        }

        const anim = enemy.animation;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = anim.frameWidth;
        tempCanvas.height = anim.frameHeight;
        const tempCtx = tempCanvas.getContext('2d');

        anim.framesData = [];
        for (let i = 0; i < anim.frames; i++) {
            tempCtx.clearRect(0, 0, anim.frameWidth, anim.frameHeight);
            tempCtx.drawImage(
                anim.image,
                i * anim.frameWidth,
                0,
                anim.frameWidth,
                anim.frameHeight,
                0, 0,
                anim.frameWidth,
                anim.frameHeight
            );

            const frameCanvas = document.createElement('canvas');
            frameCanvas.width = anim.frameWidth;
            frameCanvas.height = anim.frameHeight;
            frameCanvas.getContext('2d').drawImage(tempCanvas, 0, 0);
            anim.framesData.push(frameCanvas);
        }

        anim.loaded = true;
    }

    // ADD THIS NEW FUNCTION AFTER loadPotionSprites():
    function createFallbackPotionSprite(color) {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');

        // Draw simple potion
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(8, 32);
        ctx.lineTo(24, 32);
        ctx.lineTo(24, 12);
        ctx.quadraticCurveTo(16, 4, 8, 12);
        ctx.closePath();
        ctx.fill();

        // Draw bottle neck
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(12, 4, 8, 8);

        return canvas;
    }

    function applyPotionEffect(potionType) {
        const effect = POTION_EFFECTS[potionType];
        if (!effect) return;

        // Cancel existing effect of same type
        cancelPotionEffect(potionType);

        // Apply new effect
        const cleanup = effect.apply(gameState.player);
        const effectEndTime = Date.now() + effect.duration;

        gameState.activeEffects.push({
            type: potionType,
            endTime: effectEndTime,
            cleanup: cleanup,
            color: effect.color
        });

        // Create in-game text effect
        createEffectText(effect.name, effect.color);
    }

    function createEffectText(text, color) {
        const effectText = {
            x: gameState.player.x - gameState.cameraOffset + gameState.player.width / 2,
            y: gameState.player.y - 30,
            text: text,
            color: color,
            alpha: 1,
            vy: -0.5,
            createdAt: Date.now()
        };

        gameState.effectTexts.push(effectText);
    }

    function cancelPotionEffect(type) {
        gameState.activeEffects = gameState.activeEffects.filter(effect => {
            if (effect.type === type) {
                effect.cleanup();
                return false;
            }
            return true;
        });
    }

    // Replace the toggleFullscreen function with this:


    // Handle fullscreen change events
function handleFullscreenChange() {
    const isFullscreen = document.fullscreenElement || 
                        document.webkitFullscreenElement || 
                        document.msFullscreenElement;
    
    const fullscreenButton = document.getElementById('fullscreen-btn');
    
    if (!isFullscreen) {
        // Exited fullscreen
        fullscreenButton.textContent = 'FULLSCREEN';
        homeScreen.style.display = 'flex';
        canvas.style.display = 'none';
        gamePaused = true;
        
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    } else {
        // Entered fullscreen
        fullscreenButton.textContent = 'EXIT FULLSCREEN';
        homeScreen.style.display = 'none';
        canvas.style.display = 'block';
        
        if (!gameRunning) {
            initGame(false);
        } else {
            gamePaused = false;
            if (!animationFrameId) {
                gameLoop();
            }
        }
    }
}

    // Add these event listeners (should be near the end of your DOMContentLoaded handler)
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
document.addEventListener('msfullscreenchange', handleFullscreenChange);

    fullscreenButton.addEventListener('click', function (e) {
        e.preventDefault();
        console.log('[fullscreen-button] Clicked');
    
        // If we're already in fullscreen, exit and show home screen
        if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
            toggleFullscreen();
            return;
        }
    
        // Ensure game is initialized
        if (!gameRunning) {
            initGame(false);
            gameRunning = true;
        }
    
        toggleFullscreen();
        canvas.focus();
    
        // Start game loop if not already running
        if (!animationFrameId) {
            gameLoop();
        }
    });

    canvas.setAttribute('tabindex', '0');
    canvas.style.outline = 'none';

    function update() {


        // Add this at the start
        if (gameState.player.health <= 0 && !gameState.gameOver) {
            console.log("Health reached 0 unexpectedly!");
            console.trace(); // This will show where the health was modified
            gameState.player.health = 1; // Prevent immediate game over
        }

        // In the update() function, add this at the start:
        if (gameState.player.health <= 0 && !gameState.gameOver) {
            gameState.gameOver = true;
            gameRunning = false;
            cancelAnimationFrame(animationFrameId);
            gameOverDisplay.style.display = 'block';
            restartOverlay.style.display = 'block';
            playSound(audio.fail);
            return; // Stop further updatesf
        }


        // Single, robust check at the start
        gameState.lootItems = Array.isArray(gameState.lootItems) ? gameState.lootItems : [];

        if (gamePaused) return;

        // ▼ REPLACE the gravity line with this ▼
        if (gameState.player.crouching && gameState.player.falling) {
            gameState.player.dy += gameState.gravity * gameState.player.fastFallMultiplier; // Fast fall
        } else {
            gameState.player.dy += gameState.gravity; // Normal gravity
        }
        // ▲ END OF REPLACEMENT ▲

        gameState.player.y += gameState.player.dy;
        gameState.player.x += gameState.player.dx;

        // Apply friction
        if (gameState.player.dx > 0) {
            gameState.player.dx = Math.max(gameState.player.dx - gameState.player.friction * 0.1, 0);
        } else if (gameState.player.dx < 0) {
            gameState.player.dx = Math.min(gameState.player.dx + gameState.player.friction * 0.1, 0);
        }

        // Platform collision
        let onPlatform = false;
        gameState.platforms.forEach(platform => {
            // Check if player is above platform and falling
            if (gameState.player.dy >= 0 &&
                gameState.player.x + gameState.player.width > platform.x &&
                gameState.player.x < platform.x + platform.width &&
                gameState.player.y + gameState.player.height <= platform.y + 5 &&
                gameState.player.y + gameState.player.height + gameState.player.dy >= platform.y) {

                gameState.player.y = platform.y - gameState.player.height;
                gameState.player.dy = 0;
                gameState.player.jumping = false;
                gameState.player.falling = false;
                onPlatform = true;

                // ▼ ADD THIS BLOCK ▼
                if (gameState.player.crouching) {
                    gameState.player.height = gameState.player.normalHeight;
                    gameState.player.y -= (gameState.player.normalHeight - gameState.player.crouchHeight); // Fix typo: crouchheight → crouchHeight
                    gameState.player.crouching = false;
                }
                // ▲ END OF ADDED BLOCK ▲

            }
            // Check if player hits platform from below
            else if (gameState.player.dy < 0 &&
                gameState.player.x + gameState.player.width > platform.x &&
                gameState.player.x < platform.x + platform.width &&
                gameState.player.y <= platform.y + platform.height &&
                gameState.player.y + gameState.player.height >= platform.y + platform.height) {

                gameState.player.y = platform.y + platform.height;
                gameState.player.dy = 0;
            }
        });

        // Barrier collision
        gameState.barriers.forEach(barrier => {
            if (isColliding(gameState.player, barrier)) {
                // Left barrier
                if (barrier.x === 0) {
                    gameState.player.x = barrier.width;
                    gameState.player.dx = Math.max(0, gameState.player.dx);
                }
                // Right barrier
                else if (barrier.x + barrier.width >= 8000) {
                    gameState.player.x = barrier.x - gameState.player.width;
                    gameState.player.dx = Math.min(0, gameState.player.dx);
                }
                // Top barrier
                else if (barrier.y === 0) {
                    gameState.player.y = barrier.height;
                    gameState.player.dy = 0;
                }
                // Bottom barrier
                else if (barrier.y + barrier.height >= canvas.height) {
                    gameState.player.y = barrier.y - gameState.player.height;
                    gameState.player.dy = 0;
                }
            }
        });

        // Prevent player from going beyond level edges
        if (gameState.player.x < 0) {
            gameState.player.x = 0;
            gameState.player.dx = 0;
        }
        if (gameState.player.x + gameState.player.width > 8000) {
            gameState.player.x = 8000 - gameState.player.width;
            gameState.player.dx = 0;
        }

        // Ground collision
        if (gameState.player.y + gameState.player.height > gameState.ground) {
            gameState.player.y = gameState.ground - gameState.player.height;
            gameState.player.dy = 0;
            gameState.player.jumping = false;
            gameState.player.falling = false;
            onPlatform = true;

            // Return to normal height when landing while crouched
            if (gameState.player.crouching) {
                gameState.player.height = gameState.player.normalHeight;
                gameState.player.y -= (gameState.player.normalHeight - gameState.player.crouchHeight);
                gameState.player.crouching = false;
            }
        }

        if (!onPlatform) {
            gameState.player.falling = true;
        }

        // Add this momentum application right after movement calculations
        if (gameState.player.jumping || gameState.player.falling) {
            // Apply momentum
            gameState.player.dx *= (1 + gameState.player.momentum * 0.075);
        } else {
            // Reset momentum when grounded
            gameState.player.momentum = 0;
        }

        // Coin collection
        gameState.coins = gameState.coins.filter(coin => {
            const collected = gameState.player.x + gameState.player.width > coin.x &&
                gameState.player.x < coin.x + coin.width &&
                gameState.player.y + gameState.player.height > coin.y &&
                gameState.player.y < coin.y + coin.height;

            if (collected) {
                gameState.coinCount++;
                updateUI();
                return false;
            }
            return true;
        });

        // Minimum 5px from level start

        // Scrolling logic - canvas relative
        const rightScrollEdge = canvas.width * 12 / 13; // 70% from left
        const leftScrollEdge = canvas.width * 1 / 13; // 30% from left
        const maxCameraOffset = 8000 - canvas.width;
        const minCameraOffset = 0;

        // Right scroll
        if (gameState.player.x - gameState.cameraOffset > rightScrollEdge) {
            const desiredOffset = gameState.player.x - rightScrollEdge;
            gameState.cameraOffset = Math.min(desiredOffset, maxCameraOffset);
            gameState.player.dx = Math.max(gameState.player.dx, 0); // Add this line
        }

        // Left scroll
        if (gameState.player.x - gameState.cameraOffset < leftScrollEdge) {
            const desiredOffset = gameState.player.x - leftScrollEdge;
            gameState.cameraOffset = Math.max(desiredOffset, minCameraOffset);
            gameState.player.dx = Math.min(gameState.player.dx, 0); // Add this line
        }

        // Keep player within canvas bounds when not scrolling
        if (gameState.cameraOffset <= minCameraOffset) {
            gameState.player.x = Math.max(gameState.player.x, leftScrollEdge);
        } else if (gameState.cameraOffset >= maxCameraOffset) {
            gameState.player.x = Math.min(gameState.player.x, maxCameraOffset + rightScrollEdge);
        }

        // Enemy movement
        gameState.enemies.forEach((enemy) => {
            enemy.x += enemy.dx;

            if (enemy.x >= enemy.maxX) {
                enemy.x = enemy.maxX;
                enemy.dx = -Math.abs(enemy.dx);
            } else if (enemy.x <= enemy.minX) {
                enemy.x = enemy.minX;
                enemy.dx = Math.abs(enemy.dx);
            }
        });

        // Replace enemy collision code with:
        // Replace the handleEnemyCollision function with this:
        function handleEnemyCollision() {
            const now = Date.now();
            
            // Handle health regeneration
            if (gameState.player.lastDamagedTime && now - gameState.player.lastDamagedTime > 5700) {
                if (!gameState.player.healthRegenInterval) {
                    gameState.player.healthRegenInterval = setInterval(() => {
                        if (gameState.player.health < gameState.player.maxHealth) {
                            gameState.player.health = Math.min(gameState.player.maxHealth, gameState.player.health + 1);
                            updateUI();
                        } else {
                            clearInterval(gameState.player.healthRegenInterval);
                            gameState.player.healthRegenInterval = null;
                        }
                    }, 178); // 178ms = ~5.6 times per second (1 health per tick)
                }
            }
        
            if (gameState.player.invulnerable) {
                if (now - gameState.player.invulnerableTimer > gameState.player.invulnerableDuration) {
                    gameState.player.invulnerable = false;
                }
                return;
            }
        
            gameState.enemies.forEach((enemy) => {
                // Calculate distance between player and enemy
                const dx = enemy.x - (gameState.player.x + gameState.player.width/2);
                const dy = enemy.y - (gameState.player.y + gameState.player.height/2);
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Check if collision occurs (using enemy radius and player dimensions)
                if (distance < enemy.radius + Math.max(gameState.player.width, gameState.player.height)/2) {
                    if (now - enemy.lastDamageTime > 500) { // 500ms cooldown between damage
                        const damage = 7; // Fixed damage of 7
                        
                        // Apply damage considering armor
                        const armorReduction = Math.min(damage * 0.5, gameState.player.armor);
                        const healthDamage = damage - armorReduction;
                        
                        gameState.player.health -= healthDamage;
                        gameState.player.armor = Math.max(0, gameState.player.armor - armorReduction);
                        enemy.lastDamageTime = now;
                        gameState.player.lastDamagedTime = now;
                        
                        // Clear any existing regen interval
                        if (gameState.player.healthRegenInterval) {
                            clearInterval(gameState.player.healthRegenInterval);
                            gameState.player.healthRegenInterval = null;
                        }
                        
                        playSound(audio.damage);
                        updateUI();
        
                        // Knockback effect
                        const knockbackDirection = gameState.player.x < enemy.x ? -1 : 1;
                        gameState.player.dx = knockbackDirection * 15; // Horizontal knockback
                        gameState.player.dy = -8; // Vertical knockback
        
                        // Set invulnerability
                        gameState.player.invulnerable = true;
                        gameState.player.invulnerableTimer = now;
        
                        // Visual feedback (flashing)
                        gameState.player.flashing = true;
                        gameState.player.flashTimer = now;
                    }
                }
            });
        }

        // Check chest interaction
        gameState.nearChest = null;
        gameState.chests.forEach(chest => {
            if (!chest.collected &&
                Math.abs(gameState.player.x - chest.x) < 50 &&
                Math.abs(gameState.player.y - chest.y) < 50) {
                gameState.nearChest = chest;
            }
        });

        if (gameState.player.dy > Math.PI) {
            gameState.player.falling = true;
        } else {
            gameState.player.falling = false;
        }

        // Correct:
        if (gameState.player.crouching) {
            gameState.player.height = gameState.player.crouchHeight;
        } else if (gameState.player.jumping) {
            gameState.player.height = gameState.player.normalHeight; // or whatever jump height you want
        } else {
            gameState.player.height = gameState.player.normalHeight;
        }

        // Safe filtering of lootItems
        gameState.lootItems = gameState.lootItems.filter(loot => {
            if (!loot || loot.collected) return false;

            if (isColliding(gameState.player, loot)) {
                collectLoot(loot);
                return false;
            }
            return true;
        });

        // Process effect texts
        gameState.effectTexts = Array.isArray(gameState.effectTexts)
            ? gameState.effectTexts.filter(text => {
                if (!text) return false;
                text.y += text.vy;
                text.alpha -= 0.01;
                return text.alpha > 0 && now - text.createdAt < 2000;
            })
            : [];

        gameState.lootItems = Array.isArray(gameState.lootItems)
            ? gameState.lootItems.filter(loot => {
                if (!loot || loot.collected) return false;
                if (isColliding(gameState.player, loot)) {
                    collectLoot(loot);
                    return false;
                }
                return true;
            })
            : [];

        // Add to update():
        function updateProjectiles() {
            gameState.projectiles = gameState.projectiles.filter(proj => {
                proj.x += proj.dx;

                // Check enemy hits
                const hitEnemy = gameState.enemies.some(enemy => {
                    if (isColliding(proj, enemy)) {
                        enemy.health -= proj.damage;
                        createEffectText(`${proj.damage}`, '#FF0000', enemy.x, enemy.y);
                        return true;
                    }
                    return false;
                });

                // Check if out of bounds
                return !hitEnemy &&
                    proj.x > 0 &&
                    proj.x < gameState.levels[gameState.currentLevel].length;
            });
        }

        // Replace the updateHazards function with this:
        function updateHazards() {
            if (!gameState.currentLevel) return; // Safety check

            // Add to updateHazards() function]
            if (!gameState.lavaSoundPlaying) {
                playSound(audio.lava, 0.3, true);
                gameState.lavaSoundPlaying = true;
            }

            // Trampolines
            gameState.platforms.forEach(platform => {
                if (platform.bouncePower && isColliding(gameState.player, platform)) {
                    gameState.player.dy = -platform.bouncePower * gameState.player.baseJumpPower;
                    playSound(audio.bounce);
                }
            });

            // Falling platforms
            gameState.platforms.forEach(platform => {
                if (platform.fallOnTouch && isColliding(gameState.player, platform)) {
                    setTimeout(() => {
                        platform.falling = true;
                    }, platform.fallDelay);
                }

                if (platform.falling) {
                    platform.y += 5;
                }
            });

            // Moving blocks (level 3)
            if (gameState.movingBlocks) {
                gameState.movingBlocks.forEach(block => {
                    block.y += block.dy;
                    if (block.y >= block.maxY || block.y <= block.minY) {
                        block.dy *= -1;
                    }
                });
            }
        }

        // Check game status (win/lose conditions)
        handleEnemyCollision();
        checkGameStatus();
        // Add these calls in order:
        updateProjectiles();
        updateHazards();
    }

    // Replace both existing isColliding functions with this one (around line 1000)
    function isColliding(obj1, obj2) {
        // Circle-circle collision
        if (obj1.radius && obj2.radius) {
            const dx = obj1.x - obj2.x;
            const dy = obj1.y - obj2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < obj1.radius + obj2.radius;
        }
        
        // Circle-rect collision
        if (obj1.radius) {
            const circle = obj1;
            const rect = obj2;
            const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
            const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
            const distanceX = circle.x - closestX;
            const distanceY = circle.y - closestY;
            return (distanceX * distanceX + distanceY * distanceY) < (circle.radius * circle.radius);
        }
        
        // Rect-rect collision
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }

    function updateUI() {
        const healthEl = document.getElementById('health-display');
        const coinEl = document.getElementById('coin-display');

        if (healthEl) {
            healthEl.textContent = `Health: ${gameState.player.health}%`;
        }

        if (coinEl) {
            coinEl.textContent = `Coins: ${gameState.coinCount}/${gameState.MIN_COINS_REQUIRED}`;
        }
    }

    function generateLoot(chest) {
        if (!gameState.lootItems) gameState.lootItems = [];
        if (!Array.isArray(gameState.lootItems)) {
            console.warn('lootItems was not an array, resetting');
            gameState.lootItems = [];
        }

        const lootCount = Math.floor(Math.random() * 4) + 2;
        const angleStep = (Math.PI * 2) / lootCount;
        const spawnRadius = 60;

        for (let i = 0; i < lootCount; i++) {
            const angle = angleStep * i;
            const xOffset = Math.cos(angle) * spawnRadius;
            const yOffset = Math.sin(angle) * spawnRadius;

            const lootRoll = Math.random() * 100;
            let lootType;

            // Coin drops (65% total - 55% single coins, 10% bags)
            if (lootRoll < 55) {
                // Single coins with weighted distribution
                const coinRoll = Math.random() * 100;
                let coinValue;

                if (coinRoll < 35) coinValue = 1;      // 35%
                else if (coinRoll < 65) coinValue = 2; // 30%
                else if (coinRoll < 85) coinValue = 3; // 20%
                else if (coinRoll < 95) coinValue = 4; // 10%
                else coinValue = 5;                    // 5%

                lootType = {
                    name: 'Coin',
                    value: coinValue,
                    color: 'gold',
                    sprite: 'coin'
                };
            }
            if (lootRoll < 10) { // Coin bags (10%)
                const bagValue = 4 + Math.floor(Math.random() * 4); // 4-7 coins
                lootType = {
                    name: 'Coin Bag',
                    value: bagValue,
                    color: 'gold',
                    sprite: 'coin_bag'
                };
            }
            if (lootRoll < 20) { // Armor (20%)
                lootType = {
                    name: 'Armor',
                    value: 10,
                    color: 'silver',
                    sprite: 'assets/sprites/chestplate.png'
                };
            }
            if (lootRoll < 10) { // Weapons (10%)
                const weaponRoll = Math.random();
                lootType = {
                    name: weaponRoll < 0.33 ? 'Pistol' : 'Sword',
                    type: weaponRoll < 0.33 ? 'gun' : 'sword',
                    color: weaponRoll < 0.33 ? '#333' : '#555',
                    sprite: weaponRoll < 0.33 ? 'gun' : 'sword'
                };
            }
            if (lootRoll < 5) { // Potions (5%)
                const potionRoll = Math.random() * 100;
                let potionType;

                if (potionRoll < 15) potionType = 'REGENERATION';
                else if (potionRoll < 30) potionType = 'WEAKNESS';
                else if (potionRoll < 42.5) potionType = 'STRENGTH';
                else if (potionRoll < 55) potionType = 'SPEED';
                else if (potionRoll < 65) potionType = 'POISON';
                else if (potionRoll < 75) potionType = 'SLOW_FALL';
                else if (potionRoll < 85) potionType = 'JUMP_BOOST';
                else if (potionRoll < 95) potionType = 'SLOWNESS';
                else if (potionRoll < 99) potionType = 'FORTUNE';
                else potionType = 'INVISIBILITY';

                const effect = POTION_EFFECTS[potionType];
                lootType = {
                    name: effect.name,
                    effectType: potionType,
                    color: effect.color,
                    sprite: 'potion'
                };
            }

            // Create and add the loot item
            gameState.lootItems.push({
                type: lootType,
                x: chest.x + chest.width / 2 + xOffset - 12.5,
                y: chest.y + yOffset - 12.5,
                width: 25,
                height: 25,
                collected: false,
                bounce: 0,
                bounceDirection: 1,
                initialY: chest.y + yOffset - 12.5
            });
        }
    }

    fullscreenButton.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('[fullscreen-button] Clicked');
        
        // Show all menu elements
        title.style.display = 'block';
        mainMenuContainer.style.display = 'flex';
        
        // Remove the initial button
        initialButtonContainer.remove();
        
        // Initialize game if not already running
        if (!gameRunning) {
            initGame(false);
            gameRunning = true;
        }
        
        toggleFullscreen();
        canvas.focus();
        
        // Start game loop if not already running
        if (!animationFrameId) {
            gameLoop();
        }
    });


    // Add sound effects to collectLoot 
    // function:
    function collectLoot(loot) {
        if (!loot || !gameState.lootItems || !Array.isArray(gameState.lootItems)) return;

        loot.collected = true;
        let message = "";
        let color = '#FFFFFF';

        if (loot.type.name.includes('Coin')) {
            gameState.coinCount += loot.type.value * gameState.player.coinMultiplier;
            message = `+${loot.type.value} coins!`;
            color = loot.type.color;
            playSound(audio.coin);
        }
        else if (loot.type.sprite === 'armor') {
            gameState.player.armor += loot.type.value;
            message = `Armor +${loot.type.value}!`;
            color = loot.type.color;
            playSound(audio.armorEquip);
        }
        else if (loot.type.sprite === 'potion') {
            applyPotionEffect(loot.type.effectType);
            playSound(audio.potionDrink);
            return;
        }
        else if (loot.type.name === 'Pistol' || loot.type.name === 'Sword') {
            gameState.player.currentWeapon = loot.type.type.toLowerCase();
            message = `Equipped ${loot.type.name}!`;
            color = loot.type.color;
            playSound(audio.armorEquip); // or create a new weapon equip sound
        }

        if (message) {
            createEffectText(message, color);
        }
        updateUI();
    }

    function drawPlayerFallback() {
        // Calculate dimensions based on player state
        const width = gameState.player.crouching ? 35 : 35;
        const height = gameState.player.crouching ? 20 : 35;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(
            gameState.player.x - gameState.cameraOffset + 3,
            gameState.player.y + 3,
            width,
            height
        );

        // Player body
        ctx.fillStyle = gameState.player.color;
        ctx.fillRect(
            gameState.player.x - gameState.cameraOffset,
            gameState.player.y,
            width,
            height
        );

        // Simple face to indicate direction
        ctx.fillStyle = 'white';
        if (gameState.player.facingRight) {
            ctx.fillRect(
                gameState.player.x - gameState.cameraOffset + width - 10,
                gameState.player.y + 10,
                5, 5
            );
        } else {
            ctx.fillRect(
                gameState.player.x - gameState.cameraOffset + 5,
                gameState.player.y + 10,
                5, 5
            );
        }

        // Armor indicator
        if (gameState.player.armor > 0) {
            ctx.strokeStyle = 'rgba(100, 100, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                gameState.player.x - gameState.cameraOffset - 2,
                gameState.player.y - 2,
                width + 4,
                height + 4
            );
        }

        if (Math.abs(gameState.player.dx)>0){
            playSound(audio.walk);
        }
    }
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background with parallax - FIXED DIRECTION
        if (gameState.backgroundCanvas) {
            const bgOffset = gameState.cameraOffset * 0.5; // Parallax effect (background moves slower)
            
            // Calculate the X position to draw (fixed direction)
            const bgX = bgOffset % gameState.backgroundCanvas.width;
            
            // Draw main segment
            ctx.drawImage(
                gameState.backgroundCanvas,
                bgX, 0,
                Math.min(canvas.width, gameState.backgroundCanvas.width - bgX), 
                canvas.height,
                0, 0,
                Math.min(canvas.width, gameState.backgroundCanvas.width - bgX), 
                canvas.height
            );
            
            // Draw additional segment if needed (for seamless tiling)
            if (bgX + canvas.width > gameState.backgroundCanvas.width) {
                ctx.drawImage(
                    gameState.backgroundCanvas,
                    0, 0,
                    canvas.width - (gameState.backgroundCanvas.width - bgX), 
                    canvas.height,
                    gameState.backgroundCanvas.width - bgX, 
                    0,
                    canvas.width - (gameState.backgroundCanvas.width - bgX), 
                    canvas.height
                );
            }
        }
    

        // Draw ground
        ctx.fillStyle = '#3a2c0f';
        ctx.fillRect(0, gameState.ground, canvas.width, gameState.groundHeight);

        // In the draw() function, replace the platform drawing code with:
        gameState.platforms.forEach(platform => {
            const screenX = platform.x - gameState.cameraOffset;
            if (screenX + platform.width > 0 && screenX < canvas.width) {
                // Shadow effect
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.fillRect(
                    screenX + 3,  // Changed from platformLeft to screenX
                    platform.y + 3,
                    platform.width,
                    platform.height
                );

                // Platform main color
                ctx.fillStyle = platform.isGoal ? '#d4af37' : '#8B4513';
                ctx.fillRect(
                    screenX,  // Changed from platformLeft to screenX
                    platform.y,
                    platform.width,
                    platform.height
                );

                // Platform details
                if (platform.width > 80) {
                    ctx.fillStyle = platform.isGoal ? '#f5d76e' : '#a0522d';
                    for (let x = screenX + 5; x < screenX + platform.width; x += 15) {  // Changed from platformLeft to screenX
                        ctx.fillRect(x, platform.y + 2, 10, 2);
                    }
                }
            }
        });

        // Draw barriers with camera offset
        gameState.barriers.forEach((barrier) => {
            const barrierLeft = barrier.x - gameState.cameraOffset;
            if (barrierLeft + barrier.width > 0 && barrierLeft < canvas.width) {
                ctx.fillStyle = 'rgba(100,100,100,0.7)';
                ctx.fillRect(barrierLeft, barrier.y, barrier.width, barrier.height);
            }
        });

        // Draw coins
        // Draw coins
        gameState.coins.forEach((coin) => {
            const coinScreenX = coin.x - gameState.cameraOffset;  // Calculate screen position

            // Only draw if coin is visible on screen
            if (coinScreenX + coin.width > 0 && coinScreenX < canvas.width) {
                // Shadow
                ctx.fillStyle = 'rgba(255,255,255,0.8)';
                ctx.beginPath();
                ctx.arc(
                    coinScreenX + coin.width / 2,  // Use screen position
                    coin.y + coin.height / 2,
                    coin.width / 3,
                    0,
                    Math.PI * 2
                );
                ctx.fill();

                // Coin body
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.arc(
                    coinScreenX + coin.width / 2,  // Use screen position
                    coin.y + coin.height / 2,
                    coin.width / 2,
                    0,
                    Math.PI * 2
                );
                ctx.fill();

                // Coin outline
                ctx.strokeStyle = '#daa520';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(
                    coinScreenX + coin.width / 2,  // Use screen position
                    coin.y + coin.height / 2,
                    coin.width / 2,
                    0,
                    Math.PI * 2
                );
                ctx.stroke();
            }
        });

        // Draw chests
        gameState.chests.forEach((chest) => {
            if (chest.x + chest.width < gameState.cameraOffset ||
                chest.x > gameState.cameraOffset + canvas.width) {
                return; // Skip if not visible
            }

            const screenX = chest.x - gameState.cameraOffset;

            if (chest.opened) {
                // Draw opened chest
                if (chest === gameState.currentChest && gameState.chestAnimationFrames.length > 0) {
                    // Calculate current frame based on timer and fps
                    const frameTime = 1 / gameState.chestAnimationSpeed;
                    const frameIndex = Math.min(
                        Math.floor(gameState.chestAnimationTimer / frameTime),
                        gameState.chestAnimationFrames.length - 1
                    );

                    ctx.drawImage(
                        gameState.chestAnimationFrames[frameIndex],
                        screenX,
                        chest.y,
                        chest.width,
                        chest.height
                    );

                    // Advance timer
                    if (frameIndex < gameState.chestAnimationFrames.length - 1) {
                        gameState.chestAnimationTimer += 1 / 60; // assuming 60fps game loop
                    }
                } else {
                    // Draw final opened frame
                    ctx.fillStyle = '#5e3a1a';
                    ctx.fillRect(screenX, chest.y + 15, chest.width, chest.height - 15);
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(screenX, chest.y, chest.width, 15);
                }
            } else {
                // Draw closed chest
                if (gameState.chestImage.complete) {
                    ctx.drawImage(gameState.chestImage, screenX, chest.y, chest.width, chest.height);
                } else {
                    // Fallback
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(screenX, chest.y, chest.width, chest.height);
                    ctx.fillStyle = '#daa520';
                    ctx.beginPath();
                    ctx.arc(
                        screenX + chest.width / 2,
                        chest.y + 15,
                        5,
                        0,
                        Math.PI * 2
                    );
                    ctx.fill();
                }
            }
        });

        // Draw loot items (with Array.isArray check)
        // Safe loot items drawing
        if (Array.isArray(gameState.lootItems)) {
            gameState.lootItems.forEach((loot) => {
                if (!loot || loot.collected) return;

                loot.bounce = Math.sin(Date.now() * 0.005) * 5;
                loot.y = loot.initialY + loot.bounce;
                if (loot.bounce > 0.5 || loot.bounce < -0.5) {
                    loot.bounceDirection *= -1;
                }

                // Shadow
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.beginPath();
                ctx.ellipse(
                    loot.x + loot.width / 2 - gameState.cameraOffset,
                    loot.y + loot.height + 3,
                    loot.width / 2,
                    loot.height / 4,
                    0, 0, Math.PI * 2
                );
                ctx.fill();

                ctx.fillStyle = loot.type.color;

                switch (loot.type.sprite) {
                    case 'coin':
                    case 'coin_bag':
                        ctx.beginPath();
                        ctx.arc(
                            loot.x + loot.width / 2,
                            loot.y + loot.height / 2 + loot.bounce,
                            loot.width / 2,
                            0,
                            Math.PI * 2
                        );
                        ctx.fill();

                        ctx.fillStyle = 'rgba(255,255,255,0.7)';
                        ctx.beginPath();
                        ctx.arc(
                            loot.x + loot.width / 2 + 3,
                            loot.y + loot.height / 2 - 3 + loot.bounce,
                            loot.width / 4,
                            0,
                            Math.PI * 2
                        );
                        ctx.fill();
                        break;

                    case 'potion':
                        const effect = POTION_EFFECTS[loot.type.effectType];
                        if (effect?.spriteImage?.complete) {
                            ctx.drawImage(
                                effect.spriteImage,
                                loot.x - gameState.cameraOffset,
                                loot.y + loot.bounce,
                                loot.width,
                                loot.height
                            );
                        } else {
                            // Fallback
                            ctx.fillStyle = loot.type.color;
                            ctx.fillRect(
                                loot.x - gameState.cameraOffset,
                                loot.y + loot.bounce,
                                loot.width,
                                loot.height
                            );
                        }
                        break;

                    case 'armor':
                        if (loot.type.image?.complete) {
                            ctx.drawImage(
                                loot.type.image,
                                loot.x - gameState.cameraOffset,
                                loot.y + loot.bounce,
                                loot.width,
                                loot.height
                            );
                        } else {
                            // Fallback drawing
                            ctx.fillStyle = loot.type.color;
                            ctx.fillRect(
                                loot.x - gameState.cameraOffset,
                                loot.y + loot.bounce,
                                loot.width,
                                loot.height
                            );

                            // Draw armor details
                            ctx.fillStyle = '#555';
                            ctx.fillRect(
                                loot.x - gameState.cameraOffset + 5,
                                loot.y + loot.bounce + 5,
                                loot.width - 10,
                                5
                            );
                            ctx.fillRect(
                                loot.x - gameState.cameraOffset + 5,
                                loot.y + loot.bounce + 15,
                                loot.width - 10,
                                5
                            );
                        }
                        break;
                }
            });

            /// Draw enemies with animations if available
gameState.enemies.forEach((enemy) => {
    const screenX = enemy.x - gameState.cameraOffset;
    
    // Only draw if enemy is visible on screen
    if (screenX + enemy.radius * 2 > 0 && screenX - enemy.radius < canvas.width) {
        if (enemy.animation?.loaded && enemy.animation.framesData?.length > 0) {
            // Draw animated enemy
            const anim = enemy.animation;
            anim.frameTimer += 1/60; // assuming 60fps
            
            if (anim.frameTimer >= 1/anim.fps) {
                anim.currentFrame = (anim.currentFrame + 1) % anim.frames;
                anim.frameTimer = 0;
            }
            
            ctx.save();
            if (enemy.dx < 0) { // Flip if moving left
                ctx.translate(screenX + anim.frameWidth, 0);
                ctx.scale(-1, 1);
            }
            
            ctx.drawImage(
                anim.framesData[anim.currentFrame],
                enemy.dx < 0 ? 0 : screenX,
                enemy.y - enemy.radius,
                anim.frameWidth,
                anim.frameHeight
            );
            ctx.restore();
        } else {
            // Fallback: draw simple circle
            ctx.fillStyle = enemy.color || '#df1400';
            ctx.beginPath();
            ctx.arc(
                screenX,
                enemy.y,
                enemy.radius,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
        
        // Debug collision circle
        if (debugMode) {
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(
                screenX,
                enemy.y,
                enemy.radius,
                0,
                Math.PI * 2
            );
            ctx.stroke();
        }
    }
});
            // In the draw() function, replace the player drawing code with:

            // In the draw() function, replace the animation update code with:
            function updatePlayerAnimation() {
                let animationName;

                // Determine animation state with fallbacks
                if (gameState.player.armor > 0) {
                    if (gameState.player.crouching) {
                        animationName = gameState.player.animationFrames['armor-crouching'] ? 'armor-crouching' : 'crouching';
                    } else if (gameState.player.jumping || gameState.player.falling) {
                        animationName = gameState.player.animationFrames['armor-jumping'] ? 'armor-jumping' : 'jumping';
                    } else if (Math.abs(gameState.player.dx) > 0.1) {
                        animationName = gameState.player.animationFrames['armor-walking'] ? 'armor-walking' : 'walking';
                    } else {
                        animationName = gameState.player.animationFrames['armor-standing'] ? 'armor-standing' : 'standing';
                    }
                } else {
                    if (gameState.player.crouching) {
                        animationName = 'crouching';
                    } else if (gameState.player.jumping || gameState.player.falling) {
                        animationName = 'jumping';
                    } else if (Math.abs(gameState.player.dx) > 0.1) {
                        animationName = 'walking';
                    } else {
                        animationName = 'standing';
                    }
                }

                // Update current animation if changed
                if (gameState.player.currentAnimation !== animationName) {
                    gameState.player.currentAnimation = animationName;
                    gameState.player.animationTimer = 0;
                    gameState.player.currentFrame = 0;

                    // Only update dimensions if animation exists and is loaded
                    const anim = gameState.player.animationFrames[animationName];
                    if (anim && anim.loaded) {
                        const prevHeight = gameState.player.height;
                        gameState.player.width = anim.width;
                        gameState.player.height = anim.height;
                        gameState.player.y += (prevHeight - gameState.player.height);
                    }
                }

                // Advance animation frame only if animation exists and is loaded
                const anim = gameState.player.animationFrames[gameState.player.currentAnimation];
                if (anim && anim.loaded) {
                    gameState.player.animationTimer += 1 / 60;
                    if (gameState.player.animationTimer >= anim.frameDuration) {
                        gameState.player.currentFrame = (gameState.player.currentFrame + 1) % anim.frames;
                        gameState.player.animationTimer = 0;
                    }
                }
            }

            // Update player animation state first
            updatePlayerAnimation();

            // Add this near the top of your draw function, before it's used
            function drawPlayerFallback() {
                // Calculate dimensions based on player state
                const width = gameState.player.crouching ? 35 : 35;
                const height = gameState.player.crouching ? 20 : 35;


                // Player body
                ctx.fillStyle = gameState.player.color;
                ctx.fillRect(
                    gameState.player.x - gameState.cameraOffset,
                    gameState.player.y,
                    width,
                    height
                );

                // Simple face to indicate direction
                ctx.fillStyle = 'white';
                if (gameState.player.facingRight) {
                    ctx.fillRect(
                        gameState.player.x - gameState.cameraOffset + width - 10,
                        gameState.player.y + 10,
                        5, 5
                    );
                } else {
                    ctx.fillRect(
                        gameState.player.x - gameState.cameraOffset + 5,
                        gameState.player.y + 10,
                        5, 5
                    );
                }

                // Armor indicator
                if (gameState.player.armor > 0) {
                    ctx.strokeStyle = 'rgba(100, 100, 255, 0.5)';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(
                        gameState.player.x - gameState.cameraOffset - 2,
                        gameState.player.y - 2,
                        width + 4,
                        height + 4
                    );
                }
            }

            // In the draw function, replace the player animation drawing code with:
            // Replace the player drawing code with this safer version:
            // Replace the player drawing code with this safer version:
            // In the draw function, replace the player drawing code with:
            const currentAnim = gameState.player.animationFrames[gameState.player.currentAnimation];
            if (currentAnim && currentAnim.loaded && currentAnim.framesData && currentAnim.framesData.length > 0) {
                // Draw shadow based on desired dimensions
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath();
                ctx.ellipse(
                    gameState.player.x - gameState.cameraOffset + currentAnim.width / 2,
                    gameState.player.y + currentAnim.height + 5,
                    currentAnim.width / 2 * 0.8,
                    currentAnim.height / 6,
                    0, 0, Math.PI * 2
                );
                ctx.fill();

                ctx.save();

                // Flip horizontally if facing left
                const drawX = gameState.player.x - gameState.cameraOffset;
                if (!gameState.player.facingRight) {
                    ctx.translate(drawX + currentAnim.width, 0);
                    ctx.scale(-1, 1);
                }

                // Draw current animation frame with consistent dimensions
                const frame = currentAnim.framesData[gameState.player.currentFrame];
                const scaleX = currentAnim.width / currentAnim.originalWidth;
                const scaleY = currentAnim.height / currentAnim.originalHeight;

                ctx.drawImage(
                    frame,
                    0, 0,
                    currentAnim.originalWidth, currentAnim.originalHeight,
                    gameState.player.facingRight ? drawX : 0,
                    gameState.player.y,
                    currentAnim.width,
                    currentAnim.height
                );

                ctx.restore();

                // Draw armor effect overlay if equipped
                if (gameState.player.armor > 0) {
                    ctx.fillStyle = 'rgba(100, 100, 255, 0.3)';
                    ctx.fillRect(
                        gameState.player.x - gameState.cameraOffset - 2,
                        gameState.player.y - 2,
                        currentAnim.width + 4,
                        currentAnim.height + 4
                    );
                }
            } else {
                // Fallback drawing when animations aren't loaded
                drawPlayerFallback();
            }


            // Draw UI
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(10, 10, 200, 80);

            ctx.fillStyle = '#333';
            ctx.fillRect(20, 20, 150, 20);
            ctx.fillStyle = gameState.player.health > 30 ? '#4CAF50' : '#f44336';
            ctx.fillRect(20, 20, 150 * (gameState.player.health / 100), 20);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.strokeRect(20, 20, 150, 20);

            ctx.fillStyle = 'white';
            ctx.font = '14px "Press Start 2P"';
            ctx.fillText(`HP: ${gameState.player.health}%`, 25, 38);

            ctx.fillStyle = '#FFD700';
            ctx.font = '14px "Press Start 2P"';
            ctx.fillText(`Coins: ${gameState.coinCount}/${gameState.MIN_COINS_REQUIRED}`, 20, 65);

            if (gameState.player.armor > 0) {
                ctx.fillStyle = '#C0C0C0';
                ctx.font = '14px "Press Start 2P"';
                ctx.fillText(`Armor: ${gameState.player.armor}`, 20, 85);
            }

            if (gameState.player.x > 4900 && gameState.player.x < 5200 && !gameState.player.crouching) {
                ctx.fillStyle = 'rgba(255,0,0,0.5)';
                ctx.fillRect(5000, 0, 200, gameState.ground + 30 - 21.3);
                ctx.fillStyle = 'white';
                ctx.font = '16px "Press Start 2P"';
                ctx.fillText('CROUCH TO ENTER', 5020, gameState.ground + 30 - 25);
            }

            if (gamePaused) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = 'white';
                ctx.font = '48px "Press Start 2P"';
                ctx.textAlign = 'center';
                ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
                ctx.font = '24px "Press Start 2P"';
                ctx.fillText('Press ESC to resume', canvas.width / 2, canvas.height / 2 + 50);
                ctx.textAlign = 'left';
            }

            // Draw game over screen if needed
            if (gameState.gameOver) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = 'white';
                ctx.font = '48px "Press Start 2P"';
                ctx.textAlign = 'center';
                ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);
                ctx.font = '24px "Press Start 2P"';
                ctx.fillText('Press R to restart', canvas.width / 2, canvas.height / 2 + 50);
                ctx.textAlign = 'left';
            }

            // Draw level complete screen if needed
            if (gameState.levelComplete) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = 'white';
                ctx.font = '48px "Press Start 2P"';
                ctx.textAlign = 'center';
                ctx.fillText('LEVEL COMPLETE!', canvas.width / 2, canvas.height / 2 - 50);
                ctx.font = '24px "Press Start 2P"';
                ctx.fillText(`Final Score: ${gameState.coinCount} coins`, canvas.width / 2, canvas.height / 2 + 20);
                ctx.fillText('Press R to restart', canvas.width / 2, canvas.height / 2 + 70);
                ctx.textAlign = 'left';
            }
        }

        function drawPlayer() {
            drawPlayerShadow();
            const anim = gameState.player.animationFrames[gameState.player.currentAnimation];
            const now = Date.now();
            
            // Skip drawing if player is invulnerable and in blink state
            if (gameState.player.invulnerable && Math.floor(now / 100) % 2 === 0) {
                return;
            }
        
            // Draw shadow first
    const displayWidth = anim?.width || gameState.player.width;
    const displayHeight = anim?.height || gameState.player.height;
    const playerX = gameState.player.x - gameState.cameraOffset;
    const playerY = gameState.player.y;
    
    drawPlayerShadow(playerX, playerY, displayWidth, displayHeight);
        
            // Draw player with animation if available, otherwise fallback
            if (anim && anim.loaded && anim.framesData && anim.framesData.length > 0) {
                ctx.save();
        
                // Flip if facing left
                if (!gameState.player.facingRight) {
                    ctx.translate(playerX + displayWidth, 0);
                    ctx.scale(-1, 1);
                }
        
                // Draw current frame
                ctx.drawImage(
                    anim.framesData[gameState.player.currentFrame],
                    gameState.player.facingRight ? playerX : 0,
                    playerY,
                    displayWidth,
                    displayHeight
                );
        
                ctx.restore();
            } else {
                // Fallback drawing when animations aren't loaded
                ctx.fillStyle = gameState.player.color;
                ctx.fillRect(
                    playerX,
                    playerY,
                    displayWidth,
                    displayHeight
                );
        
                // Simple face indicator
                ctx.fillStyle = 'white';
                if (gameState.player.facingRight) {
                    ctx.fillRect(
                        playerX + displayWidth - 10,
                        playerY + 10,
                        5, 5
                    );
                } else {
                    ctx.fillRect(
                        playerX + 5,
                        playerY + 10,
                        5, 5
                    );
                }
            }
        
            // Draw armor effect if equipped
            if (gameState.player.armor > 0) {
                ctx.strokeStyle = 'rgba(100, 100, 255, 0.5)';
                ctx.lineWidth = 2;
                ctx.strokeRect(
                    playerX - 2,
                    playerY - 2,
                    displayWidth + 4,
                    displayHeight + 4
                );
            }
        
            // Draw damage effect if recently hit
            if (gameState.player.invulnerable) {
                ctx.fillStyle = 'rgba(255,0,0,0.3)';
                ctx.fillRect(
                    playerX - 5,
                    playerY - 5,
                    displayWidth + 10,
                    displayHeight + 10
                );
            }
        }
        function drawPlayerShadow() {
            const shadowX = gameState.player.x - gameState.cameraOffset + gameState.player.width/2;
            const shadowY = gameState.player.y + gameState.player.height;
            const shadowWidth = gameState.player.width * (1 + Math.abs(gameState.player.dx) * 0.1);
            const shadowHeight = gameState.player.height * 0.15;
            
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(
                shadowX,
                shadowY,
                shadowWidth/2,
                shadowHeight,
                0, 0, Math.PI * 2
            );
            ctx.fill();
            ctx.restore();
        }
        function drawPlayerIndicators() {
            // Weapon indicator
            if (gameState.player.currentWeapon) {
                ctx.fillStyle = 'white';
                ctx.font = '12px "Press Start 2P"';
                ctx.fillText(`Weapon: ${gameState.player.currentWeapon.toUpperCase()}`, 20, 140);
            }
        
            // Health warning
            if (gameState.player.health < 30) {
                ctx.fillStyle = 'red';
                ctx.font = '16px "Press Start 2P"';
                ctx.textAlign = 'center';
                ctx.fillText('LOW HEALTH!', canvas.width/2, 30);
                ctx.textAlign = 'left';
            }
        
            // Effect indicators
            gameState.activeEffects.forEach((effect, i) => {
                const timeLeft = (effect.endTime - Date.now()) / 1000;
                ctx.fillStyle = effect.color;
                ctx.fillRect(20 + (i * 25), 160, 20, 20);
                ctx.fillStyle = 'white';
                ctx.font = '10px "Press Start 2P"';
                ctx.fillText(Math.ceil(timeLeft), 25 + (i * 25), 175);
            });
        }
        drawPlayerIndicators(); 
        
        function drawPotion(loot) {
            const effect = POTION_EFFECTS[loot.type.type];
            if (!effect) return;

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.ellipse(
                loot.x + loot.width / 2 - gameState.cameraOffset,
                loot.y + loot.height + 3,
                loot.width / 2,
                loot.height / 4,
                0, 0, Math.PI * 2
            );
            ctx.fill();

            // Potion sprite
            if (effect.spriteImage?.complete) {
                ctx.drawImage(
                    effect.spriteImage,
                    loot.x - gameState.cameraOffset,
                    loot.y + loot.bounce,
                    loot.width,
                    loot.height
                );
            } else {
                // Fallback
                ctx.fillStyle = effect.color;
                ctx.fillRect(
                    loot.x - gameState.cameraOffset,
                    loot.y + loot.bounce,
                    loot.width,
                    loot.height
                );
            }
        }

        // Draw effect texts
        gameState.effectTexts.forEach(text => {
            ctx.save();
            ctx.font = '16px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillStyle = `rgba(${hexToRgb(text.color)},${text.alpha})`;
            ctx.fillText(text.text, text.x, text.y);
            ctx.restore();
        });

        // Add to draw function:
        function drawWeaponUI() {
            if (gameState.player.currentWeapon) {
                const weapon = gameState.player.weapons[gameState.player.currentWeapon];
                const cooldown = Math.min(1,
                    (Date.now() - weapon.lastUsed) / weapon.cooldown
                );

                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(20, 90, 150, 10);
                ctx.fillStyle = cooldown === 1 ? '#00FF00' : '#FF0000';
                ctx.fillRect(20, 90, 150 * cooldown, 10);
                ctx.fillStyle = 'white';
                ctx.font = '12px "Press Start 2P"';
                ctx.fillText(
                    `${gameState.player.currentWeapon.toUpperCase()} ${cooldown === 1 ? 'READY' : 'LOADING'}`,
                    25,
                    100
                );
            }
        }

        function drawArmorUI() {
            if (gameState.player.armor > 0) {
                ctx.fillStyle = '#333';
                ctx.fillRect(20, 110, 150, 20);
                ctx.fillStyle = '#C0C0C0';
                ctx.fillRect(20, 110, 150 * (gameState.player.armor / 100), 20);
                ctx.strokeStyle = '#000';
                ctx.strokeRect(20, 110, 150, 20);
                ctx.fillStyle = 'white';
                ctx.font = '12px "Press Start 2P"';
                ctx.fillText(`ARMOR: ${Math.floor(gameState.player.armor)}%`, 25, 125);
            }
        }

        function drawDarkness() {
            if (LEVELS[gameState.currentLevel]?.hasDarkness) {
                const radius = LEVELS[gameState.currentLevel].visibilityRadius || 300;
                const centerX = gameState.player.x - gameState.cameraOffset + gameState.player.width/2;
                const centerY = gameState.player.y + gameState.player.height/2;
                
                // Create gradient
                const gradient = ctx.createRadialGradient(
                    centerX, centerY, radius * 0.7,
                    centerX, centerY, radius
                );
                gradient.addColorStop(0, 'rgba(0,0,0,0)');
                gradient.addColorStop(1, 'rgba(0,0,0,0.9)');
                
                // Draw darkness
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Draw vignette
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.globalCompositeOperation = 'destination-out';
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
            }
        }
        
        // Call this at the end of your draw function, before drawing UI elements
        drawDarkness();
        // Add these calls:
        drawWeaponUI();
        drawArmorUI();
        drawPlayer();
    }

    function showMessage(text) {
        let message = document.getElementById('game-message');
        if (!message) {
            message = document.createElement('div');
            message.id = 'game-message';
            message.style.position = 'absolute';
            message.style.top = '50%';
            message.style.left = '50%';
            message.style.transform = 'translate(-50%, -50%)';
            message.style.backgroundColor = 'rgba(0,0,0,0.8)';
            message.style.color = 'white';
            message.style.padding = '20px';
            message.style.borderRadius = '10px';
            message.style.zIndex = '100';
            document.body.appendChild(message);
        }
        message.textContent = text;
        setTimeout(() => message.remove(), 2000);
    }

    function gameLoop() {
        if (gameRunning && !gamePaused) {
            try {
                update();
                draw();
                animationFrameId = requestAnimationFrame(gameLoop);
            } catch (error) {
                console.error('Game loop error:', error);
                // Fallback to simple rendering
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                drawPlayerFallback();
                animationFrameId = requestAnimationFrame(gameLoop);
            }
        }
    }

    function checkGameStatus() {
        // Check if player fell off the world
        if (gameState.player.y > canvas.height + 100) {
            gameState.player.health = 0;
        }

        // Check if player health is depleted
        if (gameState.player.health <= 0) {
            gameState.player.health = 0;
            gameState.gameOver = true;
            gameRunning = false;
            cancelAnimationFrame(animationFrameId);
            gameOverDisplay.style.display = 'block';
            restartOverlay.style.display = 'block';
        }

        // Check if player reached the goal
    const goalPlatform = gameState.platforms.find(p => p.isGoal);
    if (goalPlatform &&
        gameState.player.x + gameState.player.width > goalPlatform.x &&
        gameState.player.x < goalPlatform.x + goalPlatform.width &&
        gameState.player.y + gameState.player.height >= goalPlatform.y &&
        gameState.player.y < goalPlatform.y + goalPlatform.height) {

        if (gameState.coinCount >= gameState.MIN_COINS_REQUIRED) {
            gameState.levelComplete = true;
            gameRunning = false;
            cancelAnimationFrame(animationFrameId);
            playSound(audio.levelComplete);
            
            if (gameState.currentLevel < 4) {
                setTimeout(() => showLevelTransition(gameState.currentLevel + 1), 2000);
            } else {
                // Game complete
                showGameCompleteScreen();
            }
        } else {
            showMessage(`Collect ${gameState.MIN_COINS_REQUIRED - gameState.coinCount} more coins!`);
        }
    }
}

function showGameCompleteScreen() {
    const completeScreen = document.createElement('div');
    completeScreen.id = 'game-complete';
    completeScreen.style.position = 'fixed';
    completeScreen.style.top = '0';
    completeScreen.style.left = '0';
    completeScreen.style.width = '100%';
    completeScreen.style.height = '100%';
    completeScreen.style.backgroundColor = 'rgba(0,0,0,0.9)';
    completeScreen.style.display = 'flex';
    completeScreen.style.flexDirection = 'column';
    completeScreen.style.alignItems = 'center';
    completeScreen.style.justifyContent = 'center';
    completeScreen.style.zIndex = '1001';
    completeScreen.style.color = 'white';
    completeScreen.style.fontFamily = '"Press Start 2P", cursive';
    completeScreen.style.textAlign = 'center';
    document.body.appendChild(completeScreen);

    const title = document.createElement('h1');
    title.textContent = 'GAME COMPLETE!';
    title.style.fontSize = '3rem';
    title.style.marginBottom = '2rem';
    completeScreen.appendChild(title);

    const scoreText = document.createElement('h2');
    scoreText.textContent = `Final Score: ${gameState.totalCoins} coins`;
    scoreText.style.fontSize = '1.5rem';
    scoreText.style.marginBottom = '2rem';
    completeScreen.appendChild(scoreText);

    const restartButton = document.createElement('button');
    restartButton.textContent = 'PLAY AGAIN';
    restartButton.style.fontFamily = '"Press Start 2P", cursive';
    restartButton.style.padding = '1rem 2rem';
    restartButton.style.backgroundColor = '#4CAF50';
    restartButton.style.color = 'white';
    restartButton.style.border = 'none';
    restartButton.style.cursor = 'pointer';
    restartButton.style.marginTop = '2rem';
    restartButton.addEventListener('click', () => {
        completeScreen.remove();
        initGame(false);
    });
    completeScreen.appendChild(restartButton);
    }

    // Helper function (add to your utilities):
    function hexToRgb(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `${r},${g},${b}`;
    }

    if (!Array.isArray(gameState.lootItems)) {
        console.warn('lootItems was not an array, resetting');
        gameState.lootItems = [];
    }

    function loadChestAnimation() {
        gameState.chestOpeningAnimation = new Image();
        gameState.chestOpeningAnimation.onload = () => {
            extractGifFrames();
        };
        gameState.chestOpeningAnimation.onerror = () => {
            console.error('Failed to load chest animation');
        };
        gameState.chestOpeningAnimation.src = 'assets/animations/chest-opening.gif';
    }

    function extractGifFrames() {
        const frameWidth = gameState.chestOpeningAnimation.width / 10;
        const frameHeight = gameState.chestOpeningAnimation.height;

        gameState.chestAnimationFrames = [];
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = frameWidth;
        tempCanvas.height = frameHeight;
        const tempCtx = tempCanvas.getContext('2d');

        for (let i = 0; i < 10; i++) {
            tempCtx.clearRect(0, 0, frameWidth, frameHeight);
            tempCtx.drawImage(
                gameState.chestOpeningAnimation,
                i * frameWidth, 0, frameWidth, frameHeight,
                0, 0, frameWidth, frameHeight
            );

            const frameCanvas = document.createElement('canvas');
            frameCanvas.width = frameWidth;
            frameCanvas.height = frameHeight;
            frameCanvas.getContext('2d').drawImage(tempCanvas, 0, 0);
            gameState.chestAnimationFrames.push(frameCanvas);
        }
    }

    function handleAttack() {
            if (!gameState.player.currentWeapon) return;
        
            const weapon = gameState.weapons[gameState.player.currentWeapon];
            const now = Date.now();
        
            if (now - weapon.lastUsed > weapon.cooldown) {
                weapon.lastUsed = now;
                playSound(weapon.sound); // This plays either attack or shoot sound

            if (gameState.player.currentWeapon === 'gun') {
                gameState.projectiles.push({
                    x: gameState.player.x + (gameState.player.facingRight ? gameState.player.width : 0),
                    y: gameState.player.y + gameState.player.height / 2,
                    dx: gameState.player.facingRight ? weapon.projectileSpeed : -weapon.projectileSpeed,
                    damage: weapon.damage,
                    width: 10,
                    height: 5
                });
            } else {
                gameState.enemies.forEach(enemy => {
                    if (Math.abs(enemy.x - gameState.player.x) < weapon.range) {
                        enemy.health -= weapon.damage;
                        createEffectText(`${weapon.damage}`, '#FF0000', enemy.x, enemy.y);
                    }
                });
            }
        }
    }

    function loadLevel(levelNum) {
        gameState.currentLevel = levelNum;
        const level = LEVELS[levelNum];
    
        // Reset player position
        gameState.player.x = 100;
        gameState.player.y = gameState.ground - gameState.player.height;
    
        // Update game state
        gameState.MIN_COINS_REQUIRED = level.minCoins;
        gameState.coinCount = 0;
        gameState.levelComplete = false;
        
        // Clear existing level elements
        gameState.platforms = [];
        gameState.coins = [];
        gameState.enemies = [];
        gameState.checkpoints = [];
        gameState.chests = [];
        gameState.lootItems = [];
        gameState.hazards = [];
    
        // Load background
        gameState.backgroundImage.src = level.background;
    
        // Configure level-specific elements
        configureLevel(levelNum);
    
        // Update UI
        updateUI();
    
        console.log(`Loaded level ${levelNum}: ${level.name}`);
    }
    
    function configureLevel(levelNum) {
        const level = LEVELS[levelNum];
        
        switch(levelNum) {
            case 1:
                // ▼ PUT ALL LEVEL 1 CONFIGURATIONS HERE ▼
            gameState.platforms = [
                { x: 200, y: 300, width: 100, height: 10 },
                { x: 300, y: 400, width: 100, height: 10 },
                { x: 475, y: 459, width: 100, height: 10 },
                { x: 400, y: 250, width: 100, height: 10 },
                { x: 600, y: 200, width: 100, height: 10 },
                { x: 900, y: 300, width: 120, height: 10 },
                { x: 1200, y: 250, width: 120, height: 10 },
                { x: 1500, y: 200, width: 130, height: 10 },
                { x: 1800, y: 300, width: 100, height: 10 },
                { x: 1100, y: 350, width: 80, height: 10 },
                { x: 1250, y: 370, width: 80, height: 10 },
                { x: 1400, y: 350, width: 80, height: 10 },
                { x: 1550, y: 400, width: 80, height: 10 },
                { x: 1700, y: 350, width: 80, height: 10 },
                { x: 2100, y: gameState.ground - 100, width: 150, height: 10 },
                { x: 2300, y: gameState.ground - 150, width: 150, height: 10 },
                { x: 2500, y: gameState.ground - 200, width: 150, height: 10 },
                { x: 2700, y: gameState.ground - 150, width: 150, height: 10 },
                { x: 2900, y: gameState.ground - 100, width: 150, height: 10 },
                { x: 2200, y: 200, width: 60, height: 10 },
                { x: 2400, y: 250, width: 60, height: 10 },
                { x: 2600, y: 200, width: 60, height: 10 },
                { x: 3100, y: gameState.ground - 250, width: 100, height: 10 },
                { x: 3200, y: gameState.ground - 350, width: 100, height: 10 },
                { x: 3300, y: gameState.ground - 450, width: 100, height: 10 },
                { x: 3400, y: gameState.ground - 550, width: 100, height: 10 },
                { x: 3150, y: gameState.ground - 150, width: 50, height: 10 },
                { x: 3350, y: gameState.ground - 250, width: 100, height: 10 },
                { x: 3550, y: gameState.ground - 350, width: 100, height: 10 },
                { x: 3800, y: 250, width: 200, height: 10 },
                { x: 4000, y: 160, width: 10, height: 100 },
                { x: 4100, y: 150, width: 200, height: 10 },
                { x: 4400, y: 250, width: 200, height: 10 },
                { x: 4700, y: 150, width: 200, height: 10 },
                { x: 4300, y: 200, width: 50, height: 10 },
                { x: 4600, y: 200, width: 50, height: 10 },
                { x: 5000, y: gameState.ground + 30, width: 200, height: 30 },
                { x: 5100, y: gameState.ground + 50, width: 200, height: 10 },
                { x: 5400, y: gameState.ground + 100, width: 200, height: 10 },
                { x: 5700, y: gameState.ground + 50, width: 200, height: 10 },
                { x: 5200, y: 100, width: 100, height: 10 },
                { x: 5500, y: 150, width: 100, height: 10 },
                { x: 5800, y: 100, width: 100, height: 10 },
                { x: 6200, y: gameState.ground - 300, width: 150, height: 10 },
                { x: 6400, y: gameState.ground - 400, width: 150, height: 10 },
                { x: 6600, y: gameState.ground - 500, width: 150, height: 10 },
                { x: 6800, y: gameState.ground - 400, width: 150, height: 10 },
                { x: 7000, y: gameState.ground - 300, width: 150, height: 10 },
                { x: 7200, y: 200, width: 80, height: 10 },
                { x: 7350, y: 150, width: 80, height: 10 },
                { x: 7500, y: 100, width: 80, height: 10 },
                { x: 7650, y: 150, width: 80, height: 10 },
                { x: 7700, y: gameState.ground - 600, width: 100, height: 10, isGoal: true }
            ];

            gameState.coins = [
                { x: 300, y: 270, width: 10, height: 10, color: 'yellow' },
                { x: 700, y: 170, width: 10, height: 10, color: 'yellow' },
                { x: 1120, y: 320, width: 10, height: 10, color: 'yellow' },
                { x: 1270, y: 370, width: 10, height: 10, color: 'yellow' },
                { x: 2150, y: gameState.ground - 150, width: 10, height: 10, color: 'yellow' },
                { x: 3250, y: gameState.ground - 400, width: 10, height: 10, color: 'yellow' },
                { x: 4750, y: 120, width: 10, height: 10, color: 'yellow' },
                { x: 5150, y: gameState.ground + 20, width: 10, height: 10, color: 'yellow' },
                { x: 5750, y: gameState.ground + 20, width: 10, height: 10, color: 'yellow' },
                { x: 7250, y: 170, width: 10, height: 10, color: 'yellow' },
                { x: 7750, y: gameState.ground - 650, width: 10, height: 10, color: 'yellow' }
            ];

            gameState.enemies = [
                { x: 800, y: gameState.ground - 20, radius: 32, dx: 2, minX: 700, maxX: 900, lastDamageTime: 0, color: '#df1400', },
                { x: 1600, y: gameState.ground - 20, radius: 18, dx: 2, minX: 1500, maxX: 1700, lastDamageTime: 0, color: '#df1400' },
                { x: 2300, y: gameState.ground - 170, radius: 20, dx: 1.5, minX: 2200, maxX: 2400, lastDamageTime: 0, color: '#df1400' },
                { x: 2700, y: gameState.ground - 170, radius: 20, dx: 1.5, minX: 2600, maxX: 2800, lastDamageTime: 0, color: '#df1400' },
                { x: 3300, y: gameState.ground - 470, radius: 15, dx: 1, minX: 3200, maxX: 3400, lastDamageTime: 0, color: '#df1400' },
                { x: 4400, y: 220, radius: 15, dx: 3, minX: 4300, maxX: 4500, lastDamageTime: 0, color: '#df1400' },
                { x: 5400, y: gameState.ground + 70, radius: 18, dx: 2, minX: 5300, maxX: 5500, lastDamageTime: 0, color: '#df1400' },
                { x: 6600, y: gameState.ground - 520, radius: 20, dx: 2.5, minX: 6500, maxX: 6700, lastDamageTime: 0, color: '#df1400' },
                { x: 7200, y: 170, radius: 15, dx: 2, minX: 7100, maxX: 7300, lastDamageTime: 0, color: '#df1400' }
            ];

            gameState.checkpoints = [
                { x: 2000, y: gameState.ground - 50, width: 30, height: 50, activated: false, color: '#00FF00' },
                { x: 4000, y: 100, width: 30, height: 50, activated: false, color: '#00FF00' },
                { x: 6000, y: gameState.ground + 30, width: 30, height: 50, activated: false, color: '#00FF00' }
            ];

            gameState.chests = [
                {
                    x: 3980,
                    y: 110,
                    width: 40,
                    height: 30,
                    color: '#D4A017',
                    collected: false
                }
            ];


            gameState.MIN_COINS_REQUIRED = 15;
            // ▲ END OF LEVEL 1 CONFIGURATIONS ▲;
                break;
                
            case 2: // Lava Caverns
                gameState.platforms = [
                    { x: 200, y: 300, width: 100, height: 10 },
                    { x: 400, y: 250, width: 100, height: 10, fallOnTouch: true, fallDelay: 1000 },
                    { x: 600, y: 200, width: 100, height: 10, fallOnTouch: true, fallDelay: 1500 },
                    { x: 900, y: 300, width: 120, height: 10 },
                    { x: 1200, y: 250, width: 120, height: 10, fallOnTouch: true, fallDelay: 2000 },
                    { x: 1500, y: 200, width: 130, height: 10 },
                    { x: 1800, y: 300, width: 100, height: 10 },
                    { x: 2100, y: gameState.ground - 100, width: 150, height: 10 },
                    { x: 2300, y: gameState.ground - 150, width: 150, height: 10 },
                    { x: 2500, y: gameState.ground - 200, width: 150, height: 10 },
                    { x: 2700, y: gameState.ground - 150, width: 150, height: 10 },
                    { x: 2900, y: gameState.ground - 100, width: 150, height: 10 },
                    { x: 3200, y: gameState.ground - 350, width: 100, height: 10 },
                    { x: 3400, y: gameState.ground - 550, width: 100, height: 10 },
                    { x: 3800, y: 250, width: 200, height: 10 },
                    { x: 4100, y: 150, width: 200, height: 10 },
                    { x: 4400, y: 250, width: 200, height: 10 },
                    { x: 4700, y: 150, width: 200, height: 10 },
                    { x: 5000, y: gameState.ground + 30, width: 200, height: 30 },
                    { x: 5400, y: gameState.ground + 100, width: 200, height: 10 },
                    { x: 5700, y: gameState.ground + 50, width: 200, height: 10 },
                    { x: 6200, y: gameState.ground - 300, width: 150, height: 10 },
                    { x: 6400, y: gameState.ground - 400, width: 150, height: 10 },
                    { x: 6600, y: gameState.ground - 500, width: 150, height: 10 },
                    { x: 6800, y: gameState.ground - 400, width: 150, height: 10 },
                    { x: 7000, y: gameState.ground - 300, width: 150, height: 10 },
                    { x: 10000, y: gameState.ground - 600, width: 100, height: 10, isGoal: true }
                ];
                
                gameState.coins = [
                    { x: 300, y: 270, width: 10, height: 10, color: 'yellow' },
                    { x: 700, y: 170, width: 10, height: 10, color: 'yellow' },
                    { x: 1120, y: 320, width: 10, height: 10, color: 'yellow' },
                    { x: 2150, y: gameState.ground - 150, width: 10, height: 10, color: 'yellow' },
                    { x: 3250, y: gameState.ground - 400, width: 10, height: 10, color: 'yellow' },
                    { x: 4750, y: 120, width: 10, height: 10, color: 'yellow' },
                    { x: 5750, y: gameState.ground + 20, width: 10, height: 10, color: 'yellow' },
                    { x: 7750, y: gameState.ground - 650, width: 10, height: 10, color: 'yellow' }
                ];
                
                gameState.enemies = [
                    { x: 800, y: gameState.ground - 20, radius: 32, dx: 2, minX: 700, maxX: 900, lastDamageTime: 0, color: '#df1400' },
                    { x: 1600, y: gameState.ground - 20, radius: 18, dx: 2, minX: 1500, maxX: 1700, lastDamageTime: 0, color: '#df1400' },
                    { x: 2300, y: gameState.ground - 170, radius: 20, dx: 1.5, minX: 2200, maxX: 2400, lastDamageTime: 0, color: '#df1400' },
                    { x: 2700, y: gameState.ground - 170, radius: 20, dx: 1.5, minX: 2600, maxX: 2800, lastDamageTime: 0, color: '#df1400' },
                    { x: 3300, y: gameState.ground - 470, radius: 15, dx: 1, minX: 3200, maxX: 3400, lastDamageTime: 0, color: '#df1400' },
                    { x: 4400, y: 220, radius: 15, dx: 3, minX: 4300, maxX: 4500, lastDamageTime: 0, color: '#df1400' },
                    { x: 5400, y: gameState.ground + 70, radius: 18, dx: 2, minX: 5300, maxX: 5500, lastDamageTime: 0, color: '#df1400' },
                    { x: 6600, y: gameState.ground - 520, radius: 20, dx: 2.5, minX: 6500, maxX: 6700, lastDamageTime: 0, color: '#df1400' }
                ];
                
                gameState.checkpoints = [
                    { x: 2000, y: gameState.ground - 50, width: 30, height: 50, activated: false, color: '#00FF00' },
                    { x: 4000, y: 100, width: 30, height: 50, activated: false, color: '#00FF00' },
                    { x: 6000, y: gameState.ground + 30, width: 30, height: 50, activated: false, color: '#00FF00' }
                ];
                
                // Lava hazards
                gameState.hazards = [
                    { x: 3000, y: gameState.ground, width: 500, height: 70, damage: 5, color: '#ff3300' },
                    { x: 4500, y: gameState.ground, width: 300, height: 70, damage: 5, color: '#ff3300' },
                    { x: 7000, y: gameState.ground, width: 400, height: 70, damage: 5, color: '#ff3300' }
                ];
                
                // Generate chests based on spawn rate
                level.chests.forEach(chestConfig => {
                    if (Math.random() * 100 <= chestConfig.spawnRate) {
                        gameState.chests.push({
                            x: chestConfig.x,
                            y: chestConfig.y,
                            width: 40,
                            height: 30,
                            color: '#D4A017',
                            collected: false
                        });
                    }
                    gameState.MIN_COINS_REQUIRED = 17;
                });
                break;
                
                
        case 3: // Sky Fortress
        gameState.platforms = [
            // Starting area
            { x: 200, y: gameState.ground - 100, width: 200, height: 20 },
            { x: 500, y: gameState.ground - 150, width: 150, height: 20 },
            { x: 800, y: gameState.ground - 200, width: 100, height: 20, moving: true, dx: 1.5, minX: 700, maxX: 1000 },
            
            // First tower section
            { x: 1200, y: gameState.ground - 300, width: 150, height: 20 },
            { x: 1500, y: gameState.ground - 350, width: 100, height: 20, moving: true, dy: 1, minY: gameState.ground - 400, maxY: gameState.ground - 300 },
            { x: 1800, y: gameState.ground - 400, width: 120, height: 20 },
            
            // Cloud platforms
            { x: 2200, y: gameState.ground - 500, width: 180, height: 20, bouncePower: 1.2 },
            { x: 2500, y: gameState.ground - 550, width: 150, height: 20 },
            { x: 2800, y: gameState.ground - 600, width: 120, height: 20, moving: true, dx: -1, minX: 2500, maxX: 3000 },
            
            // Mid-section with moving platforms
            { x: 3500, y: gameState.ground - 450, width: 200, height: 20 },
            { x: 4000, y: gameState.ground - 500, width: 150, height: 20, moving: true, dy: 1.2, minY: gameState.ground - 550, maxY: gameState.ground - 450 },
            { x: 4500, y: gameState.ground - 400, width: 180, height: 20 },
            
            // High altitude section
            { x: 5200, y: gameState.ground - 700, width: 200, height: 20 },
            { x: 5600, y: gameState.ground - 750, width: 150, height: 20, moving: true, dx: 2, minX: 5400, maxX: 5800 },
            { x: 6000, y: gameState.ground - 800, width: 120, height: 20 },
            
            // Descending section
            { x: 6500, y: gameState.ground - 700, width: 200, height: 20 },
            { x: 7000, y: gameState.ground - 650, width: 150, height: 20, moving: true, dy: -1.5, minY: gameState.ground - 700, maxY: gameState.ground - 600 },
            { x: 7500, y: gameState.ground - 600, width: 180, height: 20 },
            
            // Final ascent
            { x: 8000, y: gameState.ground - 700, width: 200, height: 20 },
            { x: 8500, y: gameState.ground - 750, width: 150, height: 20 },
            { x: 9000, y: gameState.ground - 800, width: 120, height: 20, moving: true, dx: -1, minX: 8800, maxX: 9200 },
            
            // Goal platform
            { x: 10000, y: gameState.ground - 850, width: 200, height: 20, isGoal: true }
        ];

        gameState.coins = [
            // Starting area coins
            { x: 300, y: gameState.ground - 150, width: 10, height: 10 },
            { x: 600, y: gameState.ground - 200, width: 10, height: 10 },
            { x: 900, y: gameState.ground - 250, width: 10, height: 10 },
            
            // First tower coins
            { x: 1300, y: gameState.ground - 350, width: 10, height: 10 },
            { x: 1600, y: gameState.ground - 400, width: 10, height: 10 },
            { x: 1900, y: gameState.ground - 450, width: 10, height: 10 },
            
            // Cloud platform coins
            { x: 2300, y: gameState.ground - 550, width: 10, height: 10 },
            { x: 2600, y: gameState.ground - 600, width: 10, height: 10 },
            { x: 2900, y: gameState.ground - 650, width: 10, height: 10 },
            
            // Mid-section coins
            { x: 3600, y: gameState.ground - 500, width: 10, height: 10 },
            { x: 4100, y: gameState.ground - 550, width: 10, height: 10 },
            { x: 4600, y: gameState.ground - 450, width: 10, height: 10 },
            
            // High altitude coins
            { x: 5300, y: gameState.ground - 750, width: 10, height: 10 },
            { x: 5700, y: gameState.ground - 800, width: 10, height: 10 },
            { x: 6100, y: gameState.ground - 850, width: 10, height: 10 },
            
            // Descending section coins
            { x: 6600, y: gameState.ground - 750, width: 10, height: 10 },
            { x: 7100, y: gameState.ground - 700, width: 10, height: 10 },
            { x: 7600, y: gameState.ground - 650, width: 10, height: 10 },
            
            // Final ascent coins
            { x: 8100, y: gameState.ground - 750, width: 10, height: 10 },
            { x: 8600, y: gameState.ground - 800, width: 10, height: 10 },
            { x: 9100, y: gameState.ground - 850, width: 10, height: 10 },
            
            // Goal area coins
            { x: 10100, y: gameState.ground - 900, width: 10, height: 10 }
        ];

        gameState.enemies = [
            // Flying enemies
            { x: 1000, y: gameState.ground - 300, radius: 20, dx: 2, minX: 800, maxX: 1200 },
            { x: 1700, y: gameState.ground - 400, radius: 25, dx: -1.5, minX: 1500, maxX: 1900 },
            { x: 2400, y: gameState.ground - 550, radius: 22, dx: 1.8, minX: 2200, maxX: 2600 },
            { x: 3800, y: gameState.ground - 500, radius: 20, dx: 2.2, minX: 3600, maxX: 4000 },
            { x: 5400, y: gameState.ground - 750, radius: 25, dx: -1.2, minX: 5200, maxX: 5600 },
            { x: 6800, y: gameState.ground - 700, radius: 20, dx: 1.5, minX: 6600, maxX: 7000 },
            { x: 8200, y: gameState.ground - 800, radius: 22, dx: -1.8, minX: 8000, maxX: 8400 }
        ];

        gameState.checkpoints = [
            { x: 2000, y: gameState.ground - 100, width: 30, height: 50 },
            { x: 5000, y: gameState.ground - 600, width: 30, height: 50 },
            { x: 8000, y: gameState.ground - 700, width: 30, height: 50 }
        ];

        // Generate chests based on spawn rate
        level.chests.forEach(chestConfig => {
            if (Math.random() * 100 <= chestConfig.spawnRate) {
                gameState.chests.push({
                    x: chestConfig.x,
                    y: chestConfig.y,
                    width: 40,
                    height: 30,
                    color: '#D4A017',
                    collected: false
                });
            }
        });
        
        gameState.MIN_COINS_REQUIRED = 25;
        break;
        
    case 4: // Dark Abyss
        gameState.platforms = [
            // Starting area
            { x: 200, y: gameState.ground - 100, width: 200, height: 20, glow: true },
            { x: 500, y: gameState.ground - 150, width: 150, height: 20, glow: true },
            { x: 800, y: gameState.ground - 200, width: 100, height: 20, glow: true },
            
            // First dark section
            { x: 1200, y: gameState.ground - 250, width: 150, height: 20 },
            { x: 1500, y: gameState.ground - 300, width: 100, height: 20 },
            { x: 1800, y: gameState.ground - 350, width: 120, height: 20 },
            
            // Underground cavern
            { x: 2200, y: gameState.ground - 400, width: 180, height: 20 },
            { x: 2500, y: gameState.ground - 450, width: 150, height: 20 },
            { x: 2800, y: gameState.ground - 500, width: 120, height: 20 },
            
            // Deep abyss section
            { x: 3500, y: gameState.ground - 550, width: 200, height: 20 },
            { x: 4000, y: gameState.ground - 600, width: 150, height: 20 },
            { x: 4500, y: gameState.ground - 650, width: 180, height: 20 },
            
            // Mid-level with glowing platforms
            { x: 5200, y: gameState.ground - 500, width: 200, height: 20, glow: true },
            { x: 5600, y: gameState.ground - 550, width: 150, height: 20, glow: true },
            { x: 6000, y: gameState.ground - 600, width: 120, height: 20, glow: true },
            
            // Deepest section
            { x: 6500, y: gameState.ground - 700, width: 200, height: 20 },
            { x: 7000, y: gameState.ground - 750, width: 150, height: 20 },
            { x: 7500, y: gameState.ground - 800, width: 180, height: 20 },
            
            // Final ascent
            { x: 8000, y: gameState.ground - 700, width: 200, height: 20, glow: true },
            { x: 8500, y: gameState.ground - 650, width: 150, height: 20, glow: true },
            { x: 9000, y: gameState.ground - 600, width: 120, height: 20, glow: true },
            
            // End section
            { x: 10000, y: gameState.ground - 550, width: 200, height: 20 },
            { x: 11000, y: gameState.ground - 500, width: 150, height: 20 },
            { x: 12000, y: gameState.ground - 450, width: 120, height: 20 },
            
            // Goal platform
            { x: 14000, y: gameState.ground - 400, width: 200, height: 20, isGoal: true, glow: true }
        ];

        gameState.coins = [
            // Starting area coins (glowing)
            { x: 300, y: gameState.ground - 150, width: 10, height: 10, glow: true },
            { x: 600, y: gameState.ground - 200, width: 10, height: 10, glow: true },
            { x: 900, y: gameState.ground - 250, width: 10, height: 10, glow: true },
            
            // First dark section coins
            { x: 1300, y: gameState.ground - 300, width: 10, height: 10 },
            { x: 1600, y: gameState.ground - 350, width: 10, height: 10 },
            { x: 1900, y: gameState.ground - 400, width: 10, height: 10 },
            
            // Underground cavern coins
            { x: 2300, y: gameState.ground - 450, width: 10, height: 10 },
            { x: 2600, y: gameState.ground - 500, width: 10, height: 10 },
            { x: 2900, y: gameState.ground - 550, width: 10, height: 10 },
            
            // Deep abyss coins
            { x: 3600, y: gameState.ground - 600, width: 10, height: 10 },
            { x: 4100, y: gameState.ground - 650, width: 10, height: 10 },
            { x: 4600, y: gameState.ground - 700, width: 10, height: 10 },
            
            // Mid-level glowing coins
            { x: 5300, y: gameState.ground - 550, width: 10, height: 10, glow: true },
            { x: 5700, y: gameState.ground - 600, width: 10, height: 10, glow: true },
            { x: 6100, y: gameState.ground - 650, width: 10, height: 10, glow: true },
            
            // Deepest section coins
            { x: 6600, y: gameState.ground - 750, width: 10, height: 10 },
            { x: 7100, y: gameState.ground - 800, width: 10, height: 10 },
            { x: 7600, y: gameState.ground - 850, width: 10, height: 10 },
            
            // Final ascent glowing coins
            { x: 8100, y: gameState.ground - 750, width: 10, height: 10, glow: true },
            { x: 8600, y: gameState.ground - 700, width: 10, height: 10, glow: true },
            { x: 9100, y: gameState.ground - 650, width: 10, height: 10, glow: true },
            
            // End section coins
            { x: 10100, y: gameState.ground - 600, width: 10, height: 10 },
            { x: 11100, y: gameState.ground - 550, width: 10, height: 10 },
            { x: 12100, y: gameState.ground - 500, width: 10, height: 10 },
            
            // Goal area coins
            { x: 14100, y: gameState.ground - 450, width: 10, height: 10, glow: true }
        ];

        gameState.enemies = [
            // Dark enemies (some glowing)
            { x: 1000, y: gameState.ground - 300, radius: 20, dx: 2, minX: 800, maxX: 1200, glow: false },
            { x: 1700, y: gameState.ground - 400, radius: 25, dx: -1.5, minX: 1500, maxX: 1900, glow: true },
            { x: 2400, y: gameState.ground - 500, radius: 22, dx: 1.8, minX: 2200, maxX: 2600, glow: false },
            { x: 3800, y: gameState.ground - 600, radius: 20, dx: 2.2, minX: 3600, maxX: 4000, glow: true },
            { x: 5400, y: gameState.ground - 700, radius: 25, dx: -1.2, minX: 5200, maxX: 5600, glow: false },
            { x: 6800, y: gameState.ground - 800, radius: 20, dx: 1.5, minX: 6600, maxX: 7000, glow: true },
            { x: 8200, y: gameState.ground - 700, radius: 22, dx: -1.8, minX: 8000, maxX: 8400, glow: false },
            { x: 10500, y: gameState.ground - 600, radius: 25, dx: 2, minX: 10300, maxX: 10700, glow: true },
            { x: 12500, y: gameState.ground - 500, radius: 30, dx: -1.5, minX: 12300, maxX: 12700, glow: true }
        ];

        gameState.checkpoints = [
            { x: 2000, y: gameState.ground - 100, width: 30, height: 50, glow: true },
            { x: 5000, y: gameState.ground - 550, width: 30, height: 50, glow: true },
            { x: 8000, y: gameState.ground - 650, width: 30, height: 50, glow: true },
            { x: 11000, y: gameState.ground - 450, width: 30, height: 50, glow: true }
        ];

        // Generate chests based on spawn rate
        level.chests.forEach(chestConfig => {
            if (Math.random() * 100 <= chestConfig.spawnRate) {
                gameState.chests.push({
                    x: chestConfig.x,
                    y: chestConfig.y,
                    width: 40,
                    height: 30,
                    color: '#D4A017',
                    collected: false,
                    glow: true // Chests glow in the dark level
                });
            }
        });
        
        gameState.MIN_COINS_REQUIRED = 30;
        break;
}
}


    

    // Add to level complete check:
    if (gameState.levelComplete) {
        playSound(audio.levelComplete);
        if (gameState.currentLevel < 3) {
            setTimeout(() => loadLevel(gameState.currentLevel + 1), 3000);
        } else {
            // Game complete
        }
    }

    let debugMode = false;

    function toggleDebug() {
        debugMode = !debugMode;
    }

    function drawDebugInfo() {
        if (!debugMode) return;

        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';

        // Player info
        ctx.fillText(`Position: (${Math.floor(gameState.player.x)}, ${Math.floor(gameState.player.y)})`, 20, 120);
        ctx.fillText(`Velocity: (${gameState.player.dx.toFixed(2)}, ${gameState.player.dy.toFixed(2)})`, 20, 140);
        ctx.fillText(`State: ${gameState.player.currentAnimation}`, 20, 160);

        // Collision boxes
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            gameState.player.x - gameState.cameraOffset,
            gameState.player.y,
            gameState.player.width,
            gameState.player.height
        );
    }

    // Enhanced keydown event handler
document.addEventListener('keydown', (e) => {

        console.log("void");
    // Pause gam
    if (e.key === 'Escape' || e.key === 'p') {
        gamePaused = !gamePaused;
        if (!gamePaused && gameRunning) {
            animationFrameId = requestAnimationFrame(gameLoop);
        } else if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        return;
    }

    // Restart game
    if ((e.key === 'r' || e.key === 'R') && (gameState.gameOver || gameState.levelComplete)) {
        initGame(false);
        return;
    }

    if (!gameRunning || gamePaused) return;

    // Jumping
    if ((e.key === 'ArrowUp' || e.key === 'w' ) && 
        !gameState.player.jumping && !gameState.player.falling) {
        gameState.player.jumping = true;
        const jumpPower = gameState.player.crouching
            ? gameState.player.baseJumpPower * gameState.player.crouchJumpFactor
            : gameState.player.baseJumpPower;
        gameState.player.dy = -jumpPower;
        
        // Add horizontal momentum when jumping while moving
        if (Math.abs(gameState.player.dx) > 0) {
            gameState.player.momentum = Math.min(
                gameState.player.maxMomentum,
                gameState.player.momentum + 0.25
            );
        }

        // Exit crouch state when jumping
        if (gameState.player.crouching) {
            gameState.player.height = gameState.player.normalHeight;
            gameState.player.y -= (gameState.player.normalHeight - gameState.player.crouchHeight);
            gameState.player.crouching = false;
        }

        playSound(audio.jump);
    }

    // Crouching
    if (e.key === 'ArrowDown' || e.key === 's') {
        if (!gameState.player.crouching) {
            gameState.player.crouching = true;
            gameState.player.height = gameState.player.crouchHeight;
            
            // Only adjust position if on ground
            if (!gameState.player.jumping && !gameState.player.falling) {
                gameState.player.y += (gameState.player.normalHeight - gameState.player.crouchHeight);
            }
        }
    }

    // Movement left
    if (e.key === 'ArrowLeft' || e.key === 'a') {
        gameState.player.dx = -gameState.player.speed;
        gameState.player.facingRight = false;
        playSound(audio.walk);
    }

    // Movement right
    if (e.key === 'ArrowRight' || e.key === 'd') {
        gameState.player.dx = gameState.player.speed;
        gameState.player.facingRight = true;
        playSound(audio.walk);
    }

    // Attack
    if (e.key === ' ' || e.key === 0) {
        handleAttack();
    }

    // Interact (chests, items)
    if (e.key === 'e' || e.key === 'E') {
        handleInteraction();
    }

    // Konami code detection
    gameState.keySequence.push(e.key);
    if (gameState.keySequence.length > gameState.toggleScrollKeys.length) {
        gameState.keySequence.shift();
    }

    if (gameState.keySequence.join(',') === gameState.toggleScrollKeys.join(',')) {
        gameState.scrollingEnabled = !gameState.scrollingEnabled;
        showMessage(`Scrolling ${gameState.scrollingEnabled ? 'ENABLED' : 'DISABLED'}`);
    }
}
);

// Enhanced keyup event handler
document.addEventListener('keyup', (e) => {
    if (!gameRunning || gamePaused) return;

    // Stop crouching
    if ((e.key === 'ArrowDown' || e.key === 's') && gameState.player.crouching) {
        gameState.player.crouching = false;
        gameState.player.height = gameState.player.normalHeight;
        
        // Only adjust position if on ground
        if (!gameState.player.jumping && !gameState.player.falling) {
            gameState.player.y -= (gameState.player.normalHeight - gameState.player.crouchHeight);
        }
    }

    // Stop left movement
    if ((e.key === 'ArrowLeft' || e.key === 'a') && gameState.player.dx < 0) {
        gameState.player.dx = 0;
    }
    
    // Stop right movement
    if ((e.key === 'ArrowRight' || e.key === 'd') && gameState.player.dx > 0) {
        gameState.player.dx = 0;
    }
});

    
    
});