/**
 * Backrooms Runner Mini-Game: "Escape The Smiler"
 * Player guides Tungtung through endless yellow corridors, collecting Sahur Coins
 * and blasting creepy Smiler entities with the Kentongan Sahur sound blast!
 */

class BackroomsMiniGame {
  constructor(container, onGameOver) {
    this.container = container;
    this.onGameOver = onGameOver;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.className = 'minigame-canvas';
    this.container.appendChild(this.canvas);

    this.isRunning = false;
    this.score = 0;
    this.coinsCollected = 0;
    this.speed = 4;
    this.lastTime = 0;

    // Player in minigame
    this.player = {
      x: 80,
      y: 200,
      vy: 0,
      width: 44,
      height: 52,
      isGrounded: true,
      canBlast: true,
      blastTimer: 0
    };

    // Obstacles & Pickups
    this.entities = []; // Smilers and Mold Puddles
    this.pickups = []; // Coins & Almond water
    this.shockwaves = [];

    this.spawnTimer = 0;
    this.coinSpawnTimer = 0;

    this.setupInputs();
    this.resize();
  }

  resize() {
    this.canvas.width = this.container.clientWidth || 600;
    this.canvas.height = this.container.clientHeight || 400;
    this.groundY = this.canvas.height - 70;
    this.player.y = this.groundY - this.player.height;
  }

  setupInputs() {
    this.handleKeyDown = (e) => {
      if (!this.isRunning) return;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w') {
        this.jump();
      }
      if (e.code === 'KeyX' || e.code === 'KeyF' || e.code === 'Enter') {
        this.blastKentongan();
      }
    };
    window.addEventListener('keydown', this.handleKeyDown);

    this.canvas.addEventListener('pointerdown', (e) => {
      if (!this.isRunning) return;
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      if (clickX > this.canvas.width * 0.65) {
        this.blastKentongan();
      } else {
        this.jump();
      }
    });
  }

  jump() {
    if (this.player.isGrounded) {
      this.player.vy = -12;
      this.player.isGrounded = false;
      if (window.soundEngine) window.soundEngine.playTung(1.3);
    }
  }

  blastKentongan() {
    if (!this.player.canBlast) return;
    this.player.canBlast = false;
    this.player.blastTimer = 1.2; // Cooldown seconds

    // Spawn sound shockwave that destroys entities
    this.shockwaves.push({
      x: this.player.x + this.player.width,
      y: this.player.y + this.player.height / 2,
      radius: 10,
      maxRadius: 160,
      alpha: 1.0
    });

    if (window.soundEngine) {
      window.soundEngine.playTung(0.8);
      window.soundEngine.playSahurRhythm();
    }
  }

  start() {
    this.resize();
    this.isRunning = true;
    this.score = 0;
    this.coinsCollected = 0;
    this.speed = 4.5;
    this.entities = [];
    this.pickups = [];
    this.shockwaves = [];
    this.player.y = this.groundY - this.player.height;
    this.player.vy = 0;
    this.player.isGrounded = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    this.isRunning = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }

  loop(currentTime) {
    if (!this.isRunning) return;
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.update(dt);
    this.draw();

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    this.score += Math.floor(dt * 15);
    this.speed += dt * 0.05; // gradually accelerate

    // Player gravity
    this.player.y += this.player.vy;
    this.player.vy += 28 * dt; // gravity

    if (this.player.y >= this.groundY - this.player.height) {
      this.player.y = this.groundY - this.player.height;
      this.player.vy = 0;
      this.player.isGrounded = true;
    }

    // Blast Cooldown
    if (!this.player.canBlast) {
      this.player.blastTimer -= dt;
      if (this.player.blastTimer <= 0) {
        this.player.canBlast = true;
      }
    }

    // Spawn Enemies (Smiler or Liquid Mold)
    this.spawnTimer += dt;
    if (this.spawnTimer > Math.max(1.1, 2.4 - this.speed * 0.12)) {
      this.spawnTimer = 0;
      const isSmiler = Math.random() < 0.65;
      this.entities.push({
        type: isSmiler ? 'smiler' : 'mold',
        x: this.canvas.width + 40,
        y: isSmiler ? this.groundY - 90 - Math.random() * 40 : this.groundY - 18,
        width: isSmiler ? 45 : 55,
        height: isSmiler ? 45 : 18,
        passed: false
      });
    }

    // Spawn Pickups (Sahur Coins)
    this.coinSpawnTimer += dt;
    if (this.coinSpawnTimer > 1.3) {
      this.coinSpawnTimer = 0;
      this.pickups.push({
        type: 'coin',
        x: this.canvas.width + 20,
        y: this.groundY - 50 - Math.random() * 60,
        radius: 12
      });
    }

    // Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.x += 8;
      sw.radius += 180 * dt;
      sw.alpha -= dt * 1.8;
      if (sw.alpha <= 0) {
        this.shockwaves.splice(i, 1);
        continue;
      }

      // Shockwave hits entities
      for (let j = this.entities.length - 1; j >= 0; j--) {
        const ent = this.entities[j];
        const dist = Math.hypot(sw.x - ent.x, sw.y - ent.y);
        if (dist < sw.radius + 20) {
          // Entity destroyed!
          this.entities.splice(j, 1);
          this.coinsCollected += 2;
          if (window.soundEngine) window.soundEngine.playCoin();
        }
      }
    }

    // Update Entities
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const ent = this.entities[i];
      ent.x -= this.speed * 60 * dt;

      // Collision with player
      if (
        this.player.x < ent.x + ent.width &&
        this.player.x + this.player.width > ent.x &&
        this.player.y < ent.y + ent.height &&
        this.player.y + this.player.height > ent.y
      ) {
        // Hit! Game over
        this.gameOver();
        return;
      }

      if (ent.x < -60) {
        this.entities.splice(i, 1);
      }
    }

    // Update Pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.x -= this.speed * 60 * dt;

      // Pickup collision
      const pDist = Math.hypot(
        (this.player.x + this.player.width / 2) - p.x,
        (this.player.y + this.player.height / 2) - p.y
      );

      if (pDist < p.radius + 24) {
        this.coinsCollected += 1;
        this.score += 50;
        if (window.soundEngine) window.soundEngine.playCoin();
        this.pickups.splice(i, 1);
        continue;
      }

      if (p.x < -30) {
        this.pickups.splice(i, 1);
      }
    }
  }

  gameOver() {
    this.isRunning = false;
    if (window.soundEngine) {
      window.soundEngine.playPunch();
    }
    if (this.onGameOver) {
      this.onGameOver({
        score: this.score,
        coins: this.coinsCollected
      });
    }
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. Mono-yellow Backrooms hallway background
    ctx.fillStyle = '#bda84d';
    ctx.fillRect(0, 0, w, h);

    // Ceiling fluorescent lights strip
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(0, 10, w, 14);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(0, 0, w, 60);

    // Wallpaper stripes (Perspective runners)
    ctx.strokeStyle = '#a38f38';
    ctx.lineWidth = 1.5;
    for (let x = (this.score * -2) % 40; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 40);
      ctx.lineTo(x, this.groundY);
      ctx.stroke();
    }

    // 2. Damp carpet floor
    ctx.fillStyle = '#655421';
    ctx.fillRect(0, this.groundY, w, h - this.groundY);
    ctx.fillStyle = '#493c16';
    ctx.fillRect(0, this.groundY, w, 6);

    // 3. Shockwaves
    for (const sw of this.shockwaves) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(254, 240, 138, ${sw.alpha})`;
      ctx.lineWidth = 6;
      ctx.shadowColor = '#fef08a';
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.restore();
    }

    // 4. Entities (Smilers & Mold)
    for (const ent of this.entities) {
      if (ent.type === 'smiler') {
        // Creepy floating Smiler entity with glowing grin and white eyes
        ctx.save();
        ctx.fillStyle = '#050505';
        ctx.beginPath();
        ctx.arc(ent.x + ent.width / 2, ent.y + ent.height / 2, ent.width / 2, 0, Math.PI * 2);
        ctx.fill();

        // Glowing white smile
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(ent.x + ent.width / 2, ent.y + ent.height / 2 - 2, ent.width * 0.35, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();

        // White glowing eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ent.x + ent.width * 0.32, ent.y + ent.height * 0.35, 4, 0, Math.PI * 2);
        ctx.arc(ent.x + ent.width * 0.68, ent.y + ent.height * 0.35, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Damp Mold Puddle
        ctx.fillStyle = '#1e291e';
        ctx.beginPath();
        ctx.ellipse(ent.x + ent.width / 2, ent.y + ent.height / 2, ent.width / 2, ent.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(ent.x + ent.width * 0.4, ent.y + 4, 3, 0, Math.PI * 2);
        ctx.arc(ent.x + ent.width * 0.7, ent.y + 6, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 5. Pickups (Sahur Coins)
    for (const p of this.pickups) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#eab308';
      ctx.shadowColor = '#fde047';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#a16207';
      ctx.stroke();

      ctx.fillStyle = '#713f12';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', p.x, p.y);
      ctx.restore();
    }

    // 6. Player (Mini Tungtung Sahur running)
    ctx.save();
    const px = this.player.x;
    const py = this.player.y;
    const pw = this.player.width;
    const ph = this.player.height;

    // Body
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 14);
    ctx.fillStyle = '#a36d2e';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#271404';
    ctx.stroke();

    // Kentongan slit
    ctx.fillStyle = '#1a0b02';
    ctx.fillRect(px + pw / 2 - 2, py + ph / 2, 4, 16);

    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px + pw * 0.35, py + 16, 5, 0, Math.PI * 2);
    ctx.arc(px + pw * 0.7, py + 16, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(px + pw * 0.35 + 2, py + 16, 2.5, 0, Math.PI * 2);
    ctx.arc(px + pw * 0.7 + 2, py + 16, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Drumstick in hand
    ctx.fillStyle = '#e76f51';
    ctx.beginPath();
    ctx.arc(px + pw + 4, py + 14, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3b2207';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px + pw, py + 24);
    ctx.lineTo(px + pw + 4, py + 14);
    ctx.stroke();

    ctx.restore();

    // 7. HUD (Score & Coins & Blast cooldown)
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 16px monospace';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(`Skor: ${this.score} m`, 16, 32);
    ctx.fillText(`Koin Sahur: +${this.coinsCollected}`, 16, 54);

    // Blast Button hint
    const blastColor = this.player.canBlast ? '#22c55e' : '#64748b';
    ctx.fillStyle = blastColor;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(
      this.player.canBlast ? '[X / Tap Kanan] Suara Sahur (READY)' : '[X] Recharging...',
      w - 240,
      32
    );
  }
}

window.BackroomsMiniGame = BackroomsMiniGame;
