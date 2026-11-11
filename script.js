(() => {
  'use strict';

  const canvas = document.getElementById('court');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayCopy = document.getElementById('overlay-copy');
  const playButton = document.getElementById('play-button');
  const statusLabel = document.getElementById('status');
  const playerScoreLabel = document.getElementById('player-score');
  const computerScoreLabel = document.getElementById('computer-score');

  const WIDTH = 800;
  const HEIGHT = 500;
  const PADDLE_WIDTH = 12;
  const PADDLE_HEIGHT = 88;
  const BALL_RADIUS = 8;
  const WIN_SCORE = 5;
  const PLAYER_X = 34;
  const COMPUTER_X = WIDTH - 34 - PADDLE_WIDTH;
  const PLAYER_SPEED = 440;
  const COMPUTER_SPEED = 335;
  const COLORS = { mint: '#8bf0cb', violet: '#a99bff', line: '#293344', ball: '#f5f7fc' };

  const player = { x: PLAYER_X, y: (HEIGHT - PADDLE_HEIGHT) / 2, score: 0 };
  const computer = { x: COMPUTER_X, y: (HEIGHT - PADDLE_HEIGHT) / 2, score: 0 };
  const ball = { x: WIDTH / 2, y: HEIGHT / 2, vx: 0, vy: 0, speed: 380 };
  const keys = new Set();
  let state = 'ready';
  let lastTime = 0;
  let launchTimer = 0;
  let serveDirection = Math.random() < 0.5 ? -1 : 1;
  let dpr = 1;

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#111722';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.save();
    ctx.setLineDash([7, 11]);
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2, 0);
    ctx.lineTo(WIDTH / 2, HEIGHT);
    ctx.stroke();
    ctx.restore();

    drawPaddle(player, COLORS.mint);
    drawPaddle(computer, COLORS.violet);
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.ball;
    ctx.shadowColor = '#f5f7fc88';
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function drawPaddle(paddle, color) {
    ctx.fillStyle = color;
    ctx.shadowColor = `${color}66`;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(paddle.x, paddle.y, PADDLE_WIDTH, PADDLE_HEIGHT, 5);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function updateScore() {
    playerScoreLabel.textContent = String(player.score);
    computerScoreLabel.textContent = String(computer.score);
  }

  function showOverlay(title, copy, buttonText) {
    overlayTitle.textContent = title;
    overlayCopy.textContent = copy;
    playButton.innerHTML = `${buttonText} <span aria-hidden="true">→</span>`;
    overlay.classList.remove('hidden');
  }

  function hideOverlay() { overlay.classList.add('hidden'); }

  function resetBall(direction) {
    ball.x = WIDTH / 2;
    ball.y = HEIGHT / 2;
    ball.speed = 380;
    ball.vx = 0;
    ball.vy = 0;
    serveDirection = direction;
    launchTimer = 0.75;
    state = 'serve';
    statusLabel.textContent = 'GET READY';
  }

  function launchBall() {
    const angle = (Math.random() * 0.8 - 0.4);
    ball.vx = Math.cos(angle) * ball.speed * serveDirection;
    ball.vy = Math.sin(angle) * ball.speed;
    state = 'playing';
    statusLabel.textContent = 'IN PLAY';
  }

  function startGame() {
    if (state === 'paused') {
      state = 'playing';
      statusLabel.textContent = 'IN PLAY';
      hideOverlay();
      return;
    }
    if (state === 'over') {
      player.score = 0;
      computer.score = 0;
      updateScore();
      player.y = computer.y = (HEIGHT - PADDLE_HEIGHT) / 2;
    }
    hideOverlay();
    resetBall(Math.random() < 0.5 ? -1 : 1);
  }

  function resetGame() {
    player.score = 0;
    computer.score = 0;
    player.y = computer.y = (HEIGHT - PADDLE_HEIGHT) / 2;
    updateScore();
    statusLabel.textContent = 'READY';
    resetBall(Math.random() < 0.5 ? -1 : 1);
    state = 'ready';
    showOverlay('Your serve.', 'Move your mouse or use ↑ and ↓ to play', 'START GAME');
    draw();
  }

  function scorePoint(scorer) {
    if (scorer === 'player') {
      player.score += 1;
      serveDirection = 1;
    } else {
      computer.score += 1;
      serveDirection = -1;
    }
    updateScore();
    ball.x = WIDTH / 2;
    ball.y = HEIGHT / 2;
    ball.vx = ball.vy = 0;

    if (player.score >= WIN_SCORE || computer.score >= WIN_SCORE) {
      state = 'over';
      const playerWon = player.score > computer.score;
      statusLabel.textContent = playerWon ? 'VICTORY' : 'GAME OVER';
      showOverlay(playerWon ? 'You win!' : 'Computer wins!', 'First to five — want another round?', 'PLAY AGAIN');
      return;
    }
    state = 'serve';
    launchTimer = 0.85;
    statusLabel.textContent = 'POINT SCORED';
  }

  function clampPaddles() {
    player.y = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, player.y));
    computer.y = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, computer.y));
  }

  function movePlayer(delta) {
    let direction = 0;
    if (keys.has('ArrowUp')) direction -= 1;
    if (keys.has('ArrowDown')) direction += 1;
    player.y += direction * PLAYER_SPEED * delta;
  }

  function moveComputer(delta) {
    const target = ball.y - PADDLE_HEIGHT / 2;
    const difference = target - computer.y;
    const movement = Math.max(-COMPUTER_SPEED * delta, Math.min(COMPUTER_SPEED * delta, difference));
    computer.y += movement;
  }

  function hitPaddle(paddle, direction) {
    const overlapsY = ball.y + BALL_RADIUS > paddle.y && ball.y - BALL_RADIUS < paddle.y + PADDLE_HEIGHT;
    const crossesFace = direction < 0
      ? ball.x - BALL_RADIUS <= paddle.x + PADDLE_WIDTH && ball.x > paddle.x
      : ball.x + BALL_RADIUS >= paddle.x && ball.x < paddle.x + PADDLE_WIDTH;
    return overlapsY && crossesFace;
  }

  function bounceFromPaddle(paddle, direction) {
    const relativeHit = (ball.y - (paddle.y + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
    const angle = relativeHit * (Math.PI / 3);
    ball.speed = Math.min(ball.speed + 22, 680);
    ball.vx = Math.cos(angle) * ball.speed * direction;
    ball.vy = Math.sin(angle) * ball.speed;
    ball.x = direction > 0 ? paddle.x + PADDLE_WIDTH + BALL_RADIUS : paddle.x - BALL_RADIUS;
  }

  function update(delta) {
    movePlayer(delta);
    moveComputer(delta);
    clampPaddles();

    if (state === 'serve') {
      launchTimer -= delta;
      if (launchTimer <= 0) launchBall();
      return;
    }
    if (state !== 'playing') return;

    ball.x += ball.vx * delta;
    ball.y += ball.vy * delta;

    if (ball.y - BALL_RADIUS <= 0) {
      ball.y = BALL_RADIUS;
      ball.vy = Math.abs(ball.vy);
    } else if (ball.y + BALL_RADIUS >= HEIGHT) {
      ball.y = HEIGHT - BALL_RADIUS;
      ball.vy = -Math.abs(ball.vy);
    }

    if (ball.vx < 0 && hitPaddle(player, -1)) bounceFromPaddle(player, 1);
    else if (ball.vx > 0 && hitPaddle(computer, 1)) bounceFromPaddle(computer, -1);

    if (ball.x + BALL_RADIUS < 0) scorePoint('computer');
    else if (ball.x - BALL_RADIUS > WIDTH) scorePoint('player');
  }

  function frame(timestamp) {
    const delta = Math.min((timestamp - (lastTime || timestamp)) / 1000, 0.03);
    lastTime = timestamp;
    update(delta);
    draw();
    window.requestAnimationFrame(frame);
  }

  function pointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleY = HEIGHT / rect.height;
    player.y = (event.clientY - rect.top) * scaleY - PADDLE_HEIGHT / 2;
    clampPaddles();
    if (state === 'ready') draw();
  }

  canvas.addEventListener('pointermove', pointerMove);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      keys.add(event.key);
      if (state === 'ready') startGame();
    } else if (event.key === ' ' && (state === 'playing' || state === 'paused')) {
      event.preventDefault();
      if (state === 'playing') {
        state = 'paused';
        statusLabel.textContent = 'PAUSED';
        showOverlay('Taking a breather?', 'Press space or resume when you’re ready', 'RESUME');
      } else startGame();
    }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.key));
  window.addEventListener('blur', () => keys.clear());
  playButton.addEventListener('click', startGame);
  document.getElementById('reset-button').addEventListener('click', resetGame);
  window.addEventListener('resize', resizeCanvas);

  resizeCanvas();
  updateScore();
  window.requestAnimationFrame(frame);
})();
