const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b9ff);
scene.fog = new THREE.Fog(0x87b9ff, 18, 60);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 9, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();
const keys = {};
const pickups = [];
const enemies = [];
const arenaHalf = 28;

const scoreEl = document.getElementById('score');
const healthEl = document.getElementById('health');
const overlayEl = document.getElementById('overlay');
const startBtn = document.getElementById('start-btn');
const jumpBtn = document.getElementById('jump-btn');
const joystickContainer = document.getElementById('joystick-container');
const joystickStick = document.getElementById('joystick-stick');

let score = 0;
let wave = 1;
let started = false;
let gameOver = false;
let joystickX = 0;
let joystickY = 0;
let joystickActive = false;

const player = {
  x: 0,
  y: 1.5,
  z: 0,
  vy: 0,
  speed: 11,
  health: 100,
  radius: 1.2,
};

// Джойстик
function updateJoystickStick() {
  const radius = joystickContainer.offsetWidth / 2;
  const maxDistance = radius - 25;
  let x = joystickX;
  let y = joystickY;
  const distance = Math.hypot(x, y);

  if (distance > maxDistance) {
    const angle = Math.atan2(y, x);
    x = Math.cos(angle) * maxDistance;
    y = Math.sin(angle) * maxDistance;
  }

  joystickStick.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  joystickX = x;
  joystickY = y;
}

joystickContainer.addEventListener('touchstart', (e) => {
  joystickActive = true;
  const touch = e.touches[0];
  const rect = joystickContainer.getBoundingClientRect();
  joystickX = touch.clientX - rect.left - rect.width / 2;
  joystickY = touch.clientY - rect.top - rect.height / 2;
  updateJoystickStick();
});

joystickContainer.addEventListener('touchmove', (e) => {
  if (!joystickActive) return;
  e.preventDefault();
  const touch = e.touches[0];
  const rect = joystickContainer.getBoundingClientRect();
  joystickX = touch.clientX - rect.left - rect.width / 2;
  joystickY = touch.clientY - rect.top - rect.height / 2;
  updateJoystickStick();
});

joystickContainer.addEventListener('touchend', () => {
  joystickActive = false;
  joystickX = 0;
  joystickY = 0;
  updateJoystickStick();
});

joystickContainer.addEventListener('mousemove', (e) => {
  if (!e.buttons) return;
  const rect = joystickContainer.getBoundingClientRect();
  joystickX = e.clientX - rect.left - rect.width / 2;
  joystickY = e.clientY - rect.top - rect.height / 2;
  updateJoystickStick();
});

joystickContainer.addEventListener('mousedown', (e) => {
  joystickActive = true;
  const rect = joystickContainer.getBoundingClientRect();
  joystickX = e.clientX - rect.left - rect.width / 2;
  joystickY = e.clientY - rect.top - rect.height / 2;
  updateJoystickStick();
});

document.addEventListener('mouseup', () => {
  joystickActive = false;
  joystickX = 0;
  joystickY = 0;
  updateJoystickStick();
});

// Кнопка прыжка
jumpBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (started && !gameOver && player.y <= 1.5) {
    player.vy = 9.5;
  }
});

jumpBtn.addEventListener('click', (e) => {
  e.preventDefault();
  if (started && !gameOver && player.y <= 1.5) {
    player.vy = 9.5;
  }
});

// Клавиатура
window.addEventListener('keydown', (event) => {
  keys[event.code] = true;

  if (event.code === 'Space' && !event.repeat) {
    if (!started && !gameOver) {
      startGame();
    }
    if (started && player.y <= 1.5) {
      player.vy = 9.5;
    }
  }

  if (event.code === 'KeyR' && gameOver) {
    resetMatch();
    startGame();
  }
});

window.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

const playerGroup = new THREE.Group();
scene.add(playerGroup);

const body = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.8, 1.7, 6, 12),
  new THREE.MeshStandardMaterial({
    color: 0x4eb8ff,
    emissive: 0x152d53,
    roughness: 0.5,
  })
);
body.position.y = 1.3;
body.castShadow = true;
playerGroup.add(body);

const head = new THREE.Mesh(
  new THREE.SphereGeometry(0.48, 18, 18),
  new THREE.MeshStandardMaterial({ color: 0xf3fbff, roughness: 0.7 })
);
head.position.y = 2.35;
head.castShadow = true;
playerGroup.add(head);

const leftEye = new THREE.Mesh(
  new THREE.SphereGeometry(0.08, 10, 10),
  new THREE.MeshStandardMaterial({ color: 0x0b233c })
);
leftEye.position.set(-0.15, 2.37, 0.42);
const rightEye = leftEye.clone();
rightEye.position.x = 0.15;
playerGroup.add(leftEye, rightEye);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.MeshStandardMaterial({ color: 0x73c36a, roughness: 0.9 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const ambient = new THREE.AmbientLight(0xeaf6ff, 0.8);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(8, 16, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);

const sunGlow = new THREE.Mesh(
  new THREE.SphereGeometry(1.8, 26, 26),
  new THREE.MeshBasicMaterial({ color: 0xffef95 })
);
sunGlow.position.set(-16, 18, -18);
scene.add(sunGlow);

function randomInsideArena() {
  return {
    x: (Math.random() - 0.5) * arenaHalf * 1.6,
    z: (Math.random() - 0.5) * arenaHalf * 1.6,
  };
}

function createPickup(x, z) {
  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.7, 0),
    new THREE.MeshStandardMaterial({
      color: 0x7cf0ff,
      emissive: 0x1a9bb6,
      metalness: 0.2,
      roughness: 0.2,
    })
  );
  crystal.position.set(x, 1.2, z);
  crystal.castShadow = true;
  crystal.userData.baseY = 1.2;
  scene.add(crystal);
  pickups.push(crystal);
}

function createEnemy(x, z, speed) {
  const enemy = new THREE.Group();

  const bodyMesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.9, 0),
    new THREE.MeshStandardMaterial({
      color: 0xff5b76,
      emissive: 0x3b0e1e,
      roughness: 0.5,
    })
  );
  bodyMesh.castShadow = true;
  enemy.add(bodyMesh);

  const eye1 = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
  );
  eye1.position.set(-0.2, 0.15, 0.8);
  const eye2 = eye1.clone();
  eye2.position.x = 0.2;
  enemy.add(eye1, eye2);

  enemy.position.set(x, 1.2, z);
  enemy.userData.speed = speed;
  enemy.userData.radius = 1.2;
  scene.add(enemy);
  enemies.push(enemy);
}

function clearObjects() {
  for (const item of pickups) {
    scene.remove(item);
  }
  pickups.length = 0;

  for (const enemy of enemies) {
    scene.remove(enemy);
  }
  enemies.length = 0;
}

function resetWorld() {
  clearObjects();

  for (let i = 0; i < 12; i++) {
    const pos = randomInsideArena();
    createPickup(pos.x, pos.z);
  }

  for (let i = 0; i < 3; i++) {
    const pos = randomInsideArena();
    createEnemy(pos.x, pos.z, 2 + Math.random() * 1.5 + score * 0.02);
  }
}

function updateHUD() {
  scoreEl.textContent = String(score);
  healthEl.textContent = String(Math.max(0, Math.round(player.health)));
}

function startGame() {
  if (gameOver) {
    resetMatch();
  }

  started = true;
  gameOver = false;
  overlayEl.classList.add('hidden');
}

function resetMatch() {
  score = 0;
  wave = 1;
  player.health = 100;
  player.x = 0;
  player.z = 0;
  player.y = 1.5;
  player.vy = 0;
  playerGroup.position.set(0, 0, 0);
  updateHUD();
  resetWorld();
}

function endGame() {
  started = false;
  gameOver = true;

  overlayEl.classList.remove('hidden');
  overlayEl.innerHTML = `
    <div class="card">
      <h1>Game Over</h1>
      <p>Ты набрал <strong>${score}</strong> очков.</p>
      <p>Нажми кнопку ниже, чтобы начать заново.</p>
      <button id="start-btn">Играть снова</button>
    </div>
  `;

  document.getElementById('start-btn').addEventListener('click', () => {
    resetMatch();
    startGame();
  });
}

startBtn.addEventListener('click', () => {
  startGame();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function updatePlayer(dt) {
  // Джойстик
  const maxDistance = 40;
  const joyDist = Math.hypot(joystickX, joystickY);
  let moveX = 0;
  let moveZ = 0;

  if (joyDist > 5) {
    moveX = (joystickX / maxDistance) * 1.5;
    moveZ = (joystickY / maxDistance) * 1.5;
  }

  // Клавиатура
  moveX += (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  moveZ += (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);

  let dx = moveX;
  let dz = moveZ;
  const length = Math.hypot(dx, dz) || 1;
  dx /= length;
  dz /= length;

  player.x += dx * player.speed * dt;
  player.z += dz * player.speed * dt;

  player.x = Math.max(-arenaHalf, Math.min(arenaHalf, player.x));
  player.z = Math.max(-arenaHalf, Math.min(arenaHalf, player.z));

  player.vy -= 22 * dt;
  player.y += player.vy * dt;

  if (player.y <= 1.5) {
    player.y = 1.5;
    player.vy = 0;
  }

  playerGroup.position.set(player.x, player.y, player.z);
}

function updatePickups() {
  for (const crystal of pickups) {
    crystal.rotation.y += 0.04;
    crystal.rotation.x += 0.03;
    crystal.position.y = crystal.userData.baseY + Math.sin(performance.now() * 0.004 + crystal.position.x) * 0.35;

    const dx = crystal.position.x - player.x;
    const dz = crystal.position.z - player.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 1.8) {
      score += 1;
      wave = 1 + Math.floor(score / 8);
      const pos = randomInsideArena();
      crystal.position.set(pos.x, 1.2, pos.z);
      crystal.userData.baseY = 1.2;
      updateHUD();
    }
  }
}

function updateEnemies(dt) {
  for (const enemy of enemies) {
    const dx = player.x - enemy.position.x;
    const dz = player.z - enemy.position.z;
    const dist = Math.hypot(dx, dz) || 0.001;

    const speedBoost = 1 + score * 0.02;
    enemy.position.x += (dx / dist) * enemy.userData.speed * speedBoost * dt;
    enemy.position.z += (dz / dist) * enemy.userData.speed * speedBoost * dt;
    enemy.rotation.y = Math.atan2(dx, dz);
    enemy.rotation.x += dt * 2.2;

    if (dist < player.radius + enemy.userData.radius + 0.4) {
      player.health -= 20 * dt;
      if (player.health <= 0) {
        player.health = 0;
        updateHUD();
        endGame();
      }
    }
  }
}

function updateDifficulty() {
  while (enemies.length < 3 + wave) {
    const pos = randomInsideArena();
    createEnemy(pos.x, pos.z, 2 + Math.random() * 1.5 + score * 0.02);
  }

  if (score > 0 && score % 12 === 0) {
    const pos = randomInsideArena();
    createEnemy(pos.x, pos.z, 3 + Math.random() * 1.4 + score * 0.025);
  }
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.033);

  if (started && !gameOver) {
    updatePlayer(dt);
    updatePickups();
    updateEnemies(dt);
    updateDifficulty();
    updateHUD();
  }

  camera.position.x += (player.x - camera.position.x) * 0.08;
  camera.position.z += (player.z + 10 - camera.position.z) * 0.08;
  camera.position.y += (8.5 + Math.max(0, player.y - 1.5) * 0.6 - camera.position.y) * 0.08;
  camera.lookAt(player.x, 2.2, player.z);

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

resetMatch();
updateHUD();
requestAnimationFrame(tick);
