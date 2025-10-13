// Clean Water Quest - single-file game
const gameArea = document.getElementById('gameArea');
const player = document.getElementById('player');
const scoreDisplay = document.getElementById('score');
const timerDisplay = document.getElementById('timer');
const gameOverDisplay = document.getElementById('gameOver');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const congratsMsg = document.getElementById('congratsMsg'); // new

// Level configuration: scoreToAdvance, timeLimit (seconds), spawnRate (ms), itemTypes
const levels = [
    { scoreToAdvance: 30, timeLimit: 65, spawnRate: 1200, itemTypes: ['💧'] }, // Easier Level 1
    { scoreToAdvance: 120, timeLimit: 55, spawnRate: 900, itemTypes: ['💧', '🍋'] }, // Level 2: water + lemons
    { scoreToAdvance: 160, timeLimit: 50, spawnRate: 700, itemTypes: ['💧', '🍋', '🧊'] }, // Level 3: water + lemons + ice
    // ...add more levels as desired...
];

let currentLevel = 0;
let score = 0;
let timeLeft = levels[currentLevel].timeLimit;
let timerInterval = null;
let spawnInterval = null;
let gameActive = true;
let collectedItems = {}; // { '💧': 0, '🍋': 0, ... }
let playerX = 0; // px relative to gameArea left
let speed = 8; // how many px the player moves per step
let spawnDelayMin = 500; // ms
let spawnDelayMax = 1400; // ms
let fallSpeedBase = 2.2; // base fall px per tick
let difficultyTimer = 0;
const SCORE_OBJECTIVE = 120; // set your win objective here

// Initialize sizes after DOM renders
function resetSizes(){
  const areaRect = gameArea.getBoundingClientRect();
  // place player centered within game area
  playerX = (areaRect.width - player.offsetWidth) / 2;
  player.style.left = playerX + 'px';
}
window.addEventListener('resize', resetSizes);
resetSizes();

// Keyboard controls
function handleKey(e){
  if(!gameActive) return;
  if(e.key === 'ArrowLeft' || e.key === 'a') movePlayer(-1);
  if(e.key === 'ArrowRight' || e.key === 'd') movePlayer(1);
}
document.addEventListener('keydown', handleKey);

// Touch / button controls
let leftHold=false, rightHold=false;
leftBtn.addEventListener('pointerdown', ()=>{leftHold=true});
leftBtn.addEventListener('pointerup', ()=>{leftHold=false});
leftBtn.addEventListener('pointerleave', ()=>{leftHold=false});
rightBtn.addEventListener('pointerdown', ()=>{rightHold=true});
rightBtn.addEventListener('pointerup', ()=>{rightHold=false});
rightBtn.addEventListener('pointerleave', ()=>{rightHold=false});

function movePlayer(dir){
  const areaRect = gameArea.getBoundingClientRect();
  playerX += dir * speed * 6; // quick jump when key pressed
  // clamp to area
  playerX = Math.max(6, Math.min(areaRect.width - player.offsetWidth - 6, playerX));
  player.style.left = playerX + 'px';
}

// continuous movement for touch hold
function touchMovementStep(){
  if(!gameActive) return;
  if(leftHold) { playerX -= speed; }
  if(rightHold) { playerX += speed; }
  const areaRect = gameArea.getBoundingClientRect();
  playerX = Math.max(6, Math.min(areaRect.width - player.offsetWidth - 6, playerX));
  player.style.left = playerX + 'px';
  requestAnimationFrame(touchMovementStep);
}
requestAnimationFrame(touchMovementStep);

// Spawn falling objects
function spawnLoop(){
  if(!gameActive) return;
  const delay = Math.random() * (spawnDelayMax - spawnDelayMin) + spawnDelayMin;
  setTimeout(()=>{
    spawnObject();
    // gradually increase difficulty over time
    difficultyTimer += 1;
    if(difficultyTimer % 6 === 0){
      spawnDelayMin = Math.max(250, spawnDelayMin - 40);
      spawnDelayMax = Math.max(700, spawnDelayMax - 60);
      fallSpeedBase += 0.14;
    }
    spawnLoop();
  }, delay);
}

function spawnObject(){
  if(!gameActive) return;
  const types = [
    {emoji:'💧', type:'clean', points:10},
    {emoji:'💰', type:'coin', points:5},
    {emoji:'🧪', type:'polluted', points:-6},
    {emoji:'💣', type:'bomb', points:-12}
  ];
  // weighted spawn: more clean water and coins than bombs
  const weights = [0.45, 0.3, 0.15, 0.1];
  let r = Math.random();
  let idx = 0; let cum=0;
  for(let i=0;i<weights.length;i++){ cum+=weights[i]; if(r<=cum){idx=i;break} }

  const obj = types[idx];
  const el = document.createElement('div');
  el.className = 'object';
  el.textContent = obj.emoji;
  el.dataset.type = obj.type;
  el.dataset.points = obj.points;

  const areaRect = gameArea.getBoundingClientRect();
  const x = Math.random() * (areaRect.width - 60) + 12; // padding
  el.style.left = x + 'px';
  el.style.top = '-48px';

  gameArea.appendChild(el);

  // animate fall with interval for collision checks
  let fallSpeed = fallSpeedBase + Math.random() * 1.8; // px per tick
  const tick = 20; // ms
  const fallTimer = setInterval(()=>{
    if(!gameActive){ clearInterval(fallTimer); if(el.parentNode) el.remove(); return; }
    const top = parseFloat(el.style.top) || 0;
    el.style.top = (top + fallSpeed) + 'px';

    // simple collision box between player and object
    const pRect = player.getBoundingClientRect();
    const oRect = el.getBoundingClientRect();

    if(oRect.bottom >= pRect.top && oRect.left < pRect.right && oRect.right > pRect.left){
      // caught
      const pts = parseInt(el.dataset.points,10) || 0;
      score += pts;
      // add brief feedback
      showFeedback(el, (pts>0?`+${pts}`:`${pts}`));
      updateScore();
      clearInterval(fallTimer);
      el.remove();
      return;
    }

    // remove if passed bottom
    if(top > areaRect.height){
      clearInterval(fallTimer);
      if(el.parentNode) el.remove();
    }
  }, tick);
}

function showFeedback(el, text){
  const f = document.createElement('div');
  f.textContent = text;
  f.style.position='absolute';
  f.style.left = el.style.left;
  f.style.top = (parseFloat(el.style.top)-8)+'px';
  f.style.fontSize='1rem';
  f.style.fontWeight='700';
  f.style.color = text.startsWith('+')? 'var(--success)' : 'var(--danger)';
  f.style.zIndex=9;
  gameArea.appendChild(f);
  setTimeout(()=>{ f.style.transform='translateY(-18px)'; f.style.opacity='0'; }, 40);
  setTimeout(()=>{ if(f.parentNode) f.remove(); }, 900);
}

function updateScore(){ 
  scoreDisplay.textContent = `Score: ${score}`;
  // Check for win condition
  if (score >= SCORE_OBJECTIVE && gameActive) {
    showCongrats();
    endGame(true);
  }
}

function updateScoreboard() {
    document.getElementById('score').textContent = `Score: ${score}`;
    document.getElementById('timer').textContent = `Time: ${timeLeft}`;
    document.getElementById('level').textContent = `Level: ${currentLevel + 1}`;
}

// Timer
function startTimer(){
  const timer = setInterval(()=>{
    if(timeLeft <= 0){
      clearInterval(timer);
      endGame();
      return;
    }
    timeLeft -= 1;
    timerDisplay.textContent = `Time: ${timeLeft}`;
  }, 1000);
}

function startLevel(levelIdx) {
    currentLevel = levelIdx;
    score = 0;
    timeLeft = levels[currentLevel].timeLimit;
    gameActive = true;
    collectedItems = {};
    levels[currentLevel].itemTypes.forEach(type => collectedItems[type] = 0);
    updateScoreboard();
    document.getElementById('gameOver').textContent = '';
    document.getElementById('congratsMsg').style.display = 'none';
    // ...reset player and game area as needed...

    // Remove any leftover items from previous level
    document.querySelectorAll('.falling-item').forEach(el => el.remove());

    // Start timer
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!gameActive) return;
        timeLeft--;
        updateScoreboard();
        if (timeLeft <= 0) {
            endGame(score >= levels[currentLevel].scoreToAdvance);
        }
    }, 1000);

    // Start spawning items with difficulty
    if (spawnInterval) clearInterval(spawnInterval);
    spawnInterval = setInterval(spawnFallingItem, levels[currentLevel].spawnRate);
}

function showConfetti() {
    // Simple confetti animation using emojis
    const confettiContainer = document.createElement('div');
    confettiContainer.style.position = 'fixed';
    confettiContainer.style.left = 0;
    confettiContainer.style.top = 0;
    confettiContainer.style.width = '100vw';
    confettiContainer.style.height = '100vh';
    confettiContainer.style.pointerEvents = 'none';
    confettiContainer.style.zIndex = 9999;
    document.body.appendChild(confettiContainer);

    const confettiEmojis = ['🎉', '✨', '🎊', '💦'];
    const confettiCount = 40;
    for (let i = 0; i < confettiCount; i++) {
        const conf = document.createElement('div');
        conf.textContent = confettiEmojis[Math.floor(Math.random() * confettiEmojis.length)];
        conf.style.position = 'absolute';
        conf.style.left = Math.random() * 100 + 'vw';
        conf.style.top = '-2em';
        conf.style.fontSize = (1.5 + Math.random() * 1.5) + 'em';
        conf.style.transition = 'top 2.2s cubic-bezier(.23,1.02,.64,1)';
        confettiContainer.appendChild(conf);
        setTimeout(() => {
            conf.style.top = (80 + Math.random() * 15) + 'vh';
        }, 10);
    }
    setTimeout(() => {
        confettiContainer.remove();
    }, 2400);
}

function endGame(success) {
    gameActive = false;
    clearInterval(timerInterval);
    clearInterval(spawnInterval);

    // Show item summary
    let summary = Object.entries(collectedItems)
        .map(([item, count]) => `${item} x${count}`)
        .join('  ');
    let summaryMsg = `Items collected: ${summary}`;

    if (success) {
        showConfetti();
        document.getElementById('gameOver').textContent = '';
        document.getElementById('congratsMsg').innerHTML =
            `🎉 Level ${currentLevel + 1} Complete!<br>${summaryMsg}<br>Get ready for Level ${currentLevel + 2}!`;
        document.getElementById('congratsMsg').style.display = 'block';
        setTimeout(() => {
            document.getElementById('congratsMsg').style.display = 'none';
            if (currentLevel + 1 < levels.length) {
                startLevel(currentLevel + 1);
            } else {
                document.getElementById('gameOver').textContent =
                    `🏆 Congratulations! You completed all levels!<br>${summaryMsg}`;
            }
        }, 3500);
    } else {
        document.getElementById('gameOver').innerHTML =
            `⏰ Time's up!<br>${summaryMsg}<br>Try again!`;
    }
}

// Spawn a random item from current level's itemTypes
function spawnFallingItem() {
    if (!gameActive) return;
    const gameArea = document.getElementById('gameArea');
    const itemTypes = levels[currentLevel].itemTypes;
    const item = itemTypes[Math.floor(Math.random() * itemTypes.length)];
    const el = document.createElement('div');
    el.className = 'falling-item';
    el.textContent = item;
    el.style.position = 'absolute';
    el.style.left = Math.random() * (gameArea.offsetWidth - 32) + 'px';
    el.style.top = '0px';
    gameArea.appendChild(el);

    // Animate falling
    let top = 0;
    const fallSpeed = 2 + currentLevel; // Increase speed per level
    const fallInterval = setInterval(() => {
        if (!gameActive) {
            el.remove();
            clearInterval(fallInterval);
            return;
        }
        top += fallSpeed;
        el.style.top = top + 'px';
        // Collision with player
        const player = document.getElementById('player');
        const playerRect = player.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        if (
            elRect.bottom > playerRect.top &&
            elRect.left < playerRect.right &&
            elRect.right > playerRect.left &&
            elRect.top < playerRect.bottom
        ) {
            onScorePoint(item);
            el.remove();
            clearInterval(fallInterval);
        }
        // Remove if off screen
        if (top > gameArea.offsetHeight) {
            el.remove();
            clearInterval(fallInterval);
        }
    }, 16);
}

// Call this when player collects an item
function onScorePoint(item) {
    if (!gameActive) return;
    score++;
    if (collectedItems[item] !== undefined) collectedItems[item]++;
    updateScoreboard();
    if (score >= levels[currentLevel].scoreToAdvance) {
        endGame(true);
    }
}

// start
resetSizes();
spawnLoop();
startTimer();

// tiny game loop for continuous subtle movement
function gameLoop(){
  // if held keys, we already update via touchMovementStep; this loop can do gentle auto-centering if desired
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);

// Accessibility: allow clicking objects for quick testing (also works for mouse users)
gameArea.addEventListener('click',(ev)=>{
  if(!gameActive) return;
  const target = ev.target;
  if(target.classList && target.classList.contains('object')){
    const pts = parseInt(target.dataset.points,10)||0;
    score += pts;
    showFeedback(target, (pts>0?`+${pts}`:`${pts}`));
    updateScore();
    target.remove();
  }
});

// expose a small restart by double-clicking the game area when game over
gameArea.addEventListener('dblclick',()=>{
  if(gameActive) return;
  // reset state
  score=0; timeLeft=30; gameActive=true; difficultyTimer=0; spawnDelayMin=500; spawnDelayMax=1400; fallSpeedBase=2.2;
  updateScore(); timerDisplay.textContent = `Time: ${timeLeft}`; gameOverDisplay.style.display='none'; congratsMsg.style.display='none'; resetSizes(); spawnLoop(); startTimer();
  // Remove confetti if present
  let old = document.getElementById('confetti');
  if (old) old.remove();
});

// Reset button functionality
const resetBtn = document.getElementById('resetBtn');
resetBtn.setAttribute('tabindex', '-1');
resetBtn.addEventListener('click', () => {
  // reset state
  score=0; timeLeft=30; gameActive=true; difficultyTimer=0; spawnDelayMin=500; spawnDelayMax=1400; fallSpeedBase=2.2;
  updateScore(); timerDisplay.textContent = `Time: ${timeLeft}`; gameOverDisplay.style.display='none'; congratsMsg.style.display='none'; resetSizes(); spawnLoop(); startTimer();
  // Remove confetti if present
  let old = document.getElementById('confetti');
  if (old) old.remove();
  resetBtn.blur();
});

// Reset button handler
document.getElementById('resetBtn').onclick = function() {
    startLevel(0);
};

// On page load, start the first level
window.onload = function() {
    startLevel(0);
};
