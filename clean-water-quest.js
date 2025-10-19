document.addEventListener('DOMContentLoaded', function() {
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

  // Difficulty settings
  const difficulties = {
    Easy:   { timeMultiplier: 1.3, scoreMultiplier: 0.7 },
    Normal: { timeMultiplier: 1.0, scoreMultiplier: 1.0 },
    Hard:   { timeMultiplier: 0.7, scoreMultiplier: 1.3 }
  };
  let currentDifficulty = 'Normal';

  // Audio
  const audioCollect = new Audio('177156__abstudios__water-drop.mp3');
  const audioFail = new Audio('181353__unfa__fail-jingle-layer-2.mp3');
  const audioWin = new Audio('397434__foolboymedia__crowd-cheer.wav');
  const audioBomb = new Audio('mixkit-8-bit-bomb-explosion-2811.wav');
  const audioCoin = new Audio('347174__davidsraba__coin-pickup-sound-v-0.wav');

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

    el.style.fontSize = '3.2rem';
    el.style.cursor = 'pointer';
    el.style.pointerEvents = 'auto';

    const areaRect = gameArea.getBoundingClientRect();
    const x = Math.random() * (areaRect.width - 60) + 12;
    el.style.left = x + 'px';
    el.style.top = '-48px';

    gameArea.appendChild(el);

    let fallSpeed = fallSpeedBase + Math.random() * 1.8;
    const tick = 20;
    const fallTimer = setInterval(()=>{
      if(!gameActive){ clearInterval(fallTimer); if(el.parentNode) el.remove(); return; }
      const top = parseFloat(el.style.top) || 0;
      el.style.top = (top + fallSpeed) + 'px';

      const pRect = player.getBoundingClientRect();
      const oRect = el.getBoundingClientRect();

      if(oRect.bottom >= pRect.top && oRect.left < pRect.right && oRect.right > pRect.left){
        const pts = parseInt(el.dataset.points,10) || 0;
        score += pts;
        showFeedback(el, (pts>0?`+${pts}`:`${pts}`));
        updateScore();
        // Play correct sound
        if (el.dataset.type === 'bomb') {
          audioBomb.currentTime = 0; audioBomb.play();
        } else if (el.dataset.type === 'coin') {
          audioCoin.currentTime = 0; audioCoin.play();
        } else {
          audioCollect.currentTime = 0; audioCollect.play();
        }
        clearInterval(fallTimer);
        el.remove();
        return;
      }

      if(top > areaRect.height){
        clearInterval(fallTimer);
        if(el.parentNode) el.remove();
        // Only play fail sound if game is still active
        if (gameActive) {
          audioFail.currentTime = 0; audioFail.play();
        }
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

  // Milestone messages
  const milestones = [
    { score: 10, msg: "💧 First Drop! Keep going!" },
    { score: 30, msg: "🌱 Water for a sprout! Nice!" },
    { score: 60, msg: "🚰 Clean water for a family!" },
    { score: 100, msg: "🏞️ Water for a whole village!" },
    { score: 150, msg: "🎉 You're a water hero!" }
  ];
  let shownMilestones = new Set();

  function showMilestone(msg) {
    let milestoneDiv = document.getElementById('milestoneMsg');
    if (!milestoneDiv) {
      milestoneDiv = document.createElement('div');
      milestoneDiv.id = 'milestoneMsg';
      milestoneDiv.style.position = 'fixed';
      milestoneDiv.style.top = '18%';
      milestoneDiv.style.left = '50%';
      milestoneDiv.style.transform = 'translateX(-50%)';
      milestoneDiv.style.background = '#fffbe6';
      milestoneDiv.style.color = '#222';
      milestoneDiv.style.fontSize = '1.4em';
      milestoneDiv.style.fontWeight = '700';
      milestoneDiv.style.padding = '18px 32px';
      milestoneDiv.style.borderRadius = '16px';
      milestoneDiv.style.boxShadow = '0 4px 24px #ffd60055';
      milestoneDiv.style.zIndex = '9999';
      milestoneDiv.style.display = 'block';
      document.body.appendChild(milestoneDiv);
    }
    milestoneDiv.textContent = msg;
    milestoneDiv.style.opacity = '1';
    milestoneDiv.style.display = 'block';
    setTimeout(() => {
      milestoneDiv.style.opacity = '0';
      setTimeout(() => { milestoneDiv.style.display = 'none'; }, 600);
    }, 1800);
  }

  function updateScore(){ 
    scoreDisplay.textContent = `Score: ${score}`;
    // Milestone check
    milestones.forEach(m => {
      if (score >= m.score && !shownMilestones.has(m.score)) {
        showMilestone(m.msg);
        shownMilestones.add(m.score);
      }
    });
    // Check for win condition
    if (score >= SCORE_OBJECTIVE && gameActive) {
      showCongrats();
      endGame(true);
    }
    updatePurityBar();
  }

  function updatePurityBar() {
    // Example: purity is percent of SCORE_OBJECTIVE, clamped 0-100
    const purityBar = document.getElementById('purityBar');
    let percent = Math.max(0, Math.min(100, Math.round((score / SCORE_OBJECTIVE) * 100)));
    purityBar.style.width = percent + '%';
    purityBar.style.background = percent > 70 ? '#009688' : percent > 40 ? '#ffd600' : '#e53935';
  }

  function updateScoreboard() {
      document.getElementById('score').textContent = `Score: ${score}`;
      document.getElementById('timer').textContent = `Time: ${timeLeft}`;
      document.getElementById('level').textContent = `Level: ${currentLevel + 1}`;
      // Show difficulty
      let diffLabel = document.getElementById('difficultyLabel');
      if (!diffLabel) {
        diffLabel = document.createElement('span');
        diffLabel.id = 'difficultyLabel';
        diffLabel.style.marginLeft = '12px';
        document.querySelector('.scoreboard').appendChild(diffLabel);
      }
      diffLabel.textContent = `Difficulty: ${currentDifficulty}`;
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
      // Apply difficulty modifiers
      const diff = difficulties[currentDifficulty];
      score = 0;
      timeLeft = Math.round(levels[currentLevel].timeLimit * diff.timeMultiplier);
      gameActive = true;
      collectedItems = {};
      // Adjust score required to win for this level
      levels[currentLevel].scoreToAdvanceAdjusted = Math.round(levels[currentLevel].scoreToAdvance * diff.scoreMultiplier);
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
              endGame(score >= levels[currentLevel].scoreToAdvanceAdjusted);
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

      // Show item summary using a loop
      let summaryArr = [];
      for (let item in collectedItems) {
          summaryArr.push(`${item} x${collectedItems[item]}`);
      }
      let summaryMsg = `Items collected: ${summaryArr.join('  ')}`;

      if (success) {
          // Play win sound and stop after 1.2 seconds
          audioWin.currentTime = 0; audioWin.play();
          setTimeout(() => {
              audioWin.pause();
              audioWin.currentTime = 0;
          }, 1200);

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
                      `🏆 Congratulations! You completed all levels on ${currentDifficulty} mode!<br>${summaryMsg}`;
              }
          }, 3500);
      } else {
          document.getElementById('gameOver').innerHTML =
              `⏰ Time's up!<br>${summaryMsg}<br>Try again!`;
          // Play fail sound
          audioFail.currentTime = 0; audioFail.play();
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

      el.style.fontSize = '3.2rem';
      el.style.cursor = 'pointer';
      el.style.pointerEvents = 'auto';

      gameArea.appendChild(el);

      let top = 0;
      const fallSpeed = 2 + currentLevel;
      const fallInterval = setInterval(() => {
          if (!gameActive) {
              el.remove();
              clearInterval(fallInterval);
              return;
          }
          top += fallSpeed;
          el.style.top = top + 'px';
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
              // Play collect sound
              audioCollect.currentTime = 0; audioCollect.play();
              el.remove();
              clearInterval(fallInterval);
          }
          if (top > gameArea.offsetHeight) {
              el.remove();
              clearInterval(fallInterval);
              // Only play fail sound if game is still active
              if (gameActive) {
                audioFail.currentTime = 0; audioFail.play();
              }
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
    if(target.classList && (target.classList.contains('object') || target.classList.contains('falling-item'))){
      // Move bucket under clicked object before collecting
      const areaRect = gameArea.getBoundingClientRect();
      const objRect = target.getBoundingClientRect();
      playerX = Math.max(6, Math.min(areaRect.width - player.offsetWidth - 6, objRect.left - areaRect.left + (objRect.width/2) - (player.offsetWidth/2)));
      player.style.left = playerX + 'px';

      if(target.classList.contains('object')){
        const pts = parseInt(target.dataset.points,10)||0;
        score += pts;
        showFeedback(target, (pts>0?`+${pts}`:`${pts}`));
        updateScore();
        // Play correct sound
        if (target.dataset.type === 'bomb') {
          audioBomb.currentTime = 0; audioBomb.play();
        } else if (target.dataset.type === 'coin') {
          audioCoin.currentTime = 0; audioCoin.play();
        } else {
          audioCollect.currentTime = 0; audioCollect.play();
        }
      } else if(target.classList.contains('falling-item')) {
        onScorePoint(target.textContent);
        audioCollect.currentTime = 0; audioCollect.play();
      }
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

  // Add difficulty selector to UI
  function addDifficultySelector() {
    if (document.getElementById('difficultySelector')) return;
    const header = document.querySelector('header');
    const selector = document.createElement('select');
    selector.id = 'difficultySelector';
    selector.style.margin = '8px 0';
    ['Easy','Normal','Hard'].forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      selector.appendChild(opt);
    });
    selector.value = currentDifficulty;
    selector.onchange = function() {
      currentDifficulty = selector.value;
      startLevel(0);
    };
    header.appendChild(selector);
  }
  addDifficultySelector();

  // On page load, show the start screen only
  window.onload = function() {
      addDifficultySelector();
  };

  // Hide main UI until game starts
  document.querySelector('header').style.display = 'none';
  document.querySelector('main').style.display = 'none';
  document.querySelector('footer').style.display = 'none';

  let gameInitialized = false;

  startBtn.addEventListener('click', () => {
    startScreen.style.display = 'none';
    document.querySelector('header').style.display = '';
    document.querySelector('main').style.display = '';
    document.querySelector('footer').style.display = '';
    if (!gameInitialized) {
      addDifficultySelector();
      resetSizes();
      spawnLoop();
      startTimer();
      startLevel(0);
      updatePurityBar();
      gameInitialized = true;
    }
  });

  // Show start screen on load
  startScreen.style.display = 'flex';
  document.querySelector('header').style.display = 'none';
  document.querySelector('main').style.display = 'none';
  document.querySelector('footer').style.display = 'none';
});
