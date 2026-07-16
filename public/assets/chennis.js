(function() {
  const canvas = document.getElementById('chennisCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const W = canvas.width;
  const H = canvas.height;
  const TILE = W / 8;

  const paddle = { w: 110, h: 16 };
  const player = { x: W / 2 - paddle.w / 2, y: H - 30 };
  const cpu = { x: W / 2 - paddle.w / 2, y: 14 };

  let ball = { x: W / 2, y: H / 2, vx: 4, vy: 4, r: 16, rot: 0 };
  let scores = { player: 0, cpu: 0 };
  let running = false;
  let lastBallSpeed = 5;
  let rainbowPhase = 0;

  const pieces = ['\u265E', '\u265C', '\u265D', '\u265B', '\u265A', '\u265F'];
  let currentPiece = pieces[0];

  const statusEl = document.getElementById('chennisStatus');
  const pScoreEl = document.getElementById('playerScore');
  const cScoreEl = document.getElementById('cpuScore');

  canvas.addEventListener('mousemove', function(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    player.x = Math.max(0, Math.min(W - paddle.w, mx - paddle.w / 2));
  });
  canvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    if (!e.touches[0]) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.touches[0].clientX - rect.left) * (W / rect.width);
    player.x = Math.max(0, Math.min(W - paddle.w, mx - paddle.w / 2));
  }, { passive: false });

  document.getElementById('startBtn').addEventListener('click', function() {
    if (!running) {
      running = true;
      resetBall(Math.random() > 0.5 ? 1 : -1);
      setStatus('CHENNIS IN PROGRESS (intense)');
    }
  });
  document.getElementById('resetBtn').addEventListener('click', function() {
    running = false;
    scores = { player: 0, cpu: 0 };
    updateScore();
    resetBall(1);
    setStatus('reset. press START to play chennis again');
  });

  function setStatus(s) {
    if (statusEl) statusEl.textContent = s;
  }

  function updateScore() {
    if (pScoreEl) pScoreEl.textContent = scores.player;
    if (cScoreEl) cScoreEl.textContent = scores.cpu;
  }

  function resetBall(dir) {
    ball.x = W / 2;
    ball.y = H / 2;
    const speed = 5;
    lastBallSpeed = speed;
    const angle = (Math.random() - 0.5) * 0.8;
    ball.vx = Math.sin(angle) * speed;
    ball.vy = Math.cos(angle) * speed * dir;
    ball.rot = 0;
    currentPiece = pieces[Math.floor(Math.random() * pieces.length)];
  }

  function drawBoard() {
    // chess checker pattern
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const dark = (r + c) % 2 === 0;
        ctx.fillStyle = dark ? '#b36b00' : '#ffdd88';
        ctx.fillRect(c * TILE, r * (H / 8), TILE, H / 8);
      }
    }
    // tennis court lines (white) on top, badly placed
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, W - 40, H - 40);
    ctx.beginPath();
    ctx.moveTo(20, H / 2);
    ctx.lineTo(W - 20, H / 2);
    ctx.stroke();
    // tennis "net"
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    for (let x = 0; x < W; x += 10) {
      ctx.fillRect(x, H / 2 - 3, 6, 6);
    }
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, H / 2 - 1, W, 2);
  }

  function drawPaddle(p, color) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = color;
    ctx.fillRect(p.x, p.y, paddle.w, paddle.h);
    ctx.restore();
    // racket strings
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(p.x + (paddle.w / 6) * i, p.y);
      ctx.lineTo(p.x + (paddle.w / 6) * i, p.y + paddle.h);
      ctx.stroke();
    }
  }

  function drawBall() {
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.rot);
    // rainbow aura
    rainbowPhase = (rainbowPhase + 6) % 360;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, ball.r + i * 2, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(' + ((rainbowPhase + i * 30) % 360) + ',90%,60%,' + (0.18 - i * 0.025) + ')';
      ctx.fill();
    }
    // actual chess piece as ball
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.font = (ball.r * 1.8) + 'px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentPiece, 0, 1);
    ctx.restore();
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);
    drawBoard();

    if (running) {
      ball.x += ball.vx;
      ball.y += ball.vy;
      ball.rot += 0.08 + Math.hypot(ball.vx, ball.vy) * 0.01;

      // walls
      if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = -ball.vx; }
      if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx = -ball.vx; }

      // player paddle
      if (ball.vy > 0 && ball.y + ball.r >= player.y && ball.y + ball.r <= player.y + paddle.h + ball.vy && ball.x >= player.x && ball.x <= player.x + paddle.w) {
        ball.y = player.y - ball.r;
        const hitPos = ((ball.x - player.x) / paddle.w - 0.5) * 2;
        const speed = Math.min(lastBallSpeed + 0.6, 14);
        lastBallSpeed = speed;
        ball.vx = hitPos * speed * 0.9;
        ball.vy = -Math.sqrt(Math.max(1, speed * speed - ball.vx * ball.vx));
        currentPiece = pieces[Math.floor(Math.random() * pieces.length)];
      }

      // cpu paddle
      if (ball.vy < 0 && ball.y - ball.r <= cpu.y + paddle.h && ball.y - ball.r >= cpu.y && ball.x >= cpu.x && ball.x <= cpu.x + paddle.w) {
        ball.y = cpu.y + paddle.h + ball.r;
        const hitPos = ((ball.x - cpu.x) / paddle.w - 0.5) * 2;
        const speed = Math.min(lastBallSpeed + 0.6, 14);
        lastBallSpeed = speed;
        ball.vx = hitPos * speed * 0.9;
        ball.vy = Math.sqrt(Math.max(1, speed * speed - ball.vx * ball.vx));
        currentPiece = pieces[Math.floor(Math.random() * pieces.length)];
      }

      // lazy cpu AI
      const cpuCenter = cpu.x + paddle.w / 2;
      const diff = ball.x - cpuCenter;
      const cpuSpeed = 4.2;
      cpu.x += Math.max(-cpuSpeed, Math.min(cpuSpeed, diff));
      cpu.x = Math.max(0, Math.min(W - paddle.w, cpu.x));

      // scoring
      if (ball.y - ball.r > H) {
        scores.cpu++;
        updateScore();
        setStatus('the cpu scored. devastating. (' + scores.cpu + ' to them)');
        running = false;
        resetBall(-1);
      } else if (ball.y + ball.r < 0) {
        scores.player++;
        updateScore();
        setStatus('u scored!! grade 8 piano with distinction!! (' + scores.player + ' to u)');
        running = false;
        resetBall(1);
      }
    }

    drawPaddle(cpu, '#ff00aa');
    drawPaddle(player, '#00ffcc');
    drawBall();

    if (!running) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, H / 2 - 30, W, 60);
      ctx.fillStyle = '#ffff00';
      ctx.font = 'bold 22px "Comic Neue", "Comic Sans MS", cursive';
      ctx.textAlign = 'center';
      ctx.fillText('press START to PLAY CHENNIS', W / 2, H / 2 + 7);
    }

    requestAnimationFrame(tick);
  }

  updateScore();
  tick();
})();
