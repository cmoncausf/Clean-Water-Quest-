// Clean Water Quest - single-file game
const gameArea = document.getElementById('gameArea');
const player = document.getElementById('player');
const scoreDisplay = document.getElementById('score');
const timerDisplay = document.getElementById('timer');
const gameOverDisplay = document.getElementById('gameOver');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');

let score = 0;
let timeLeft = 30; // seconds
let gameActive = true;
let playerX = 0; // px relative to gameArea left
let speed = 8; // how many px the player moves per step
let spawnDelayMin = 500; // ms
let spawnDelayMax = 1400; // ms
let fallSpeedBase = 2.2; // base fall px per tick
let difficultyTimer = 0;

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

function updateScore(){ scoreDisplay.textContent = `Score: ${score}`; }

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

function endGame(){
  gameActive = false;
  gameOverDisplay.style.display = 'block';
  gameOverDisplay.textContent = `Game Over! Final Score: ${score}`;
  // remove remaining objects
  document.querySelectorAll('.object').forEach(n=>n.remove());
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
  updateScore(); timerDisplay.textContent = `Time: ${timeLeft}`; gameOverDisplay.style.display='none'; resetSizes(); spawnLoop(); startTimer();
});

// Reset button functionality
const resetBtn = document.getElementById('resetBtn');
resetBtn.setAttribute('tabindex', '-1');
resetBtn.addEventListener('click', () => {
  // reset state
  score=0; timeLeft=30; gameActive=true; difficultyTimer=0; spawnDelayMin=500; spawnDelayMax=1400; fallSpeedBase=2.2;
  updateScore(); timerDisplay.textContent = `Time: ${timeLeft}`; gameOverDisplay.style.display='none'; resetSizes(); spawnLoop(); startTimer();
  resetBtn.blur();
});
