/**
 * Tungtungtung Sahur - Character Engine & Renderer
 * Handles procedural rendering, expressions, physics, mouth collision, and animations.
 */

class TungSahurCharacter {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Physical Position & Dimensions
    this.x = canvas.width / 2;
    this.y = canvas.height / 2 + 30;
    this.baseRadius = 110;
    this.scaleX = 1;
    this.scaleY = 1;

    // Movement & Physics
    this.vx = 0;
    this.vy = 0;
    this.targetX = this.x;
    this.targetY = this.y;
    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    // Head / Eye Tracking
    this.mousePos = { x: this.x, y: this.y - 100 };
    this.eyeLookX = 0;
    this.eyeLookY = 0;

    // Expressions & Emotions: 'happy', 'neutral', 'sad', 'crying', 'angry', 'pooping', 'eating', 'sleeping', 'dead'
    this.mood = 'neutral';
    this.mouthOpenAmount = 0; // 0 (closed) to 1 (wide open)
    this.targetMouthOpen = 0;

    // Animation timers
    this.animTime = 0;
    this.blinkTimer = 0;
    this.isBlinking = false;
    this.armBeatAngle = 0;
    this.isBeatingKentongan = false;

    // Particle FX (tears, hearts, musical notes, angry steam)
    this.particles = [];

    // Poop state
    this.poopStrain = 0;

    // Setup events
    this.setupEvents();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.x = this.canvas.width / 2;
    this.y = this.canvas.height / 2 + 40;
    this.targetX = this.x;
    this.targetY = this.y;
  }

  setupEvents() {
    window.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos.x = e.clientX - rect.left;
      this.mousePos.y = e.clientY - rect.top;

      if (this.isDragging) {
        this.targetX = this.mousePos.x - this.dragOffsetX;
        this.targetY = this.mousePos.y - this.dragOffsetY;
      }
    });

    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const dist = Math.hypot(mx - this.x, my - this.y);

      if (dist < this.baseRadius * 1.1) {
        if (this.mood === 'dead') return;
        this.isDragging = true;
        this.dragOffsetX = mx - this.x;
        this.dragOffsetY = my - this.y;
        this.triggerPetting(mx, my);
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.targetX = this.canvas.width / 2;
      this.targetY = this.canvas.height / 2 + 40;
    });

    // Touch support for mobile / responsive
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const mx = touch.clientX - rect.left;
        const my = touch.clientY - rect.top;
        this.mousePos.x = mx;
        this.mousePos.y = my;
        const dist = Math.hypot(mx - this.x, my - this.y);
        if (dist < this.baseRadius * 1.1) {
          if (this.mood === 'dead') return;
          this.isDragging = true;
          this.dragOffsetX = mx - this.x;
          this.dragOffsetY = my - this.y;
          this.triggerPetting(mx, my);
        }
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        this.mousePos.x = touch.clientX - rect.left;
        this.mousePos.y = touch.clientY - rect.top;
        if (this.isDragging) {
          this.targetX = this.mousePos.x - this.dragOffsetX;
          this.targetY = this.mousePos.y - this.dragOffsetY;
        }
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
      this.targetX = this.canvas.width / 2;
      this.targetY = this.canvas.height / 2 + 40;
    });
  }

  triggerPetting(mx, my) {
    if (this.mood === 'sleeping' || this.mood === 'dead') return;
    // Jiggle squash & stretch
    this.scaleX = 1.15;
    this.scaleY = 0.88;

    // Emit heart particle
    this.particles.push({
      x: mx + (Math.random() * 40 - 20),
      y: my - 30,
      vx: (Math.random() - 0.5) * 2,
      vy: -2 - Math.random() * 2,
      type: 'heart',
      alpha: 1.0,
      scale: 0.8 + Math.random() * 0.5
    });

    if (window.soundEngine) {
      window.soundEngine.playTung(1.1);
    }
    this.beatKentongan();
  }

  beatKentongan() {
    this.isBeatingKentongan = true;
    this.armBeatAngle = -45;
    setTimeout(() => {
      this.armBeatAngle = 30;
      setTimeout(() => {
        this.armBeatAngle = 0;
        this.isBeatingKentongan = false;
      }, 120);
    }, 100);
  }

  setMood(mood) {
    this.mood = mood;
  }

  isPointInMouth(px, py) {
    const mouthX = this.x;
    const mouthY = this.y + 15;
    const dist = Math.hypot(px - mouthX, py - mouthY);
    return dist < 65;
  }

  update(dt) {
    this.animTime += dt;

    // Return to center physics spring
    this.x += (this.targetX - this.x) * 0.15;
    this.y += (this.targetY - this.y) * 0.15;

    // Return scale to 1
    this.scaleX += (1 - this.scaleX) * 0.1;
    this.scaleY += (1 - this.scaleY) * 0.1;

    // Eye tracking smoothing
    const dx = this.mousePos.x - this.x;
    const dy = this.mousePos.y - (this.y - 20);
    const angle = Math.atan2(dy, dx);
    const dist = Math.min(Math.hypot(dx, dy) * 0.05, 12);
    this.eyeLookX += (Math.cos(angle) * dist - this.eyeLookX) * 0.2;
    this.eyeLookY += (Math.sin(angle) * dist - this.eyeLookY) * 0.2;

    // Mouth lerping
    this.mouthOpenAmount += (this.targetMouthOpen - this.mouthOpenAmount) * 0.25;

    // Blinking logic
    this.blinkTimer += dt;
    if (this.blinkTimer > 3.5 + Math.random() * 2) {
      this.isBlinking = true;
      if (this.blinkTimer > 3.7 + Math.random() * 2) {
        this.isBlinking = false;
        this.blinkTimer = 0;
      }
    }

    // Mood-specific particle spawners
    if (this.mood === 'crying' && Math.random() < 0.5) {
      this.particles.push({
        x: this.x + (Math.random() < 0.5 ? -35 : 35) + (Math.random() * 14 - 7),
        y: this.y - 10,
        vx: (Math.random() - 0.5) * 3,
        vy: 3 + Math.random() * 5,
        type: 'tear',
        alpha: 1.0,
        scale: 0.8 + Math.random() * 0.6
      });
    }

    if (this.mood === 'sick' && Math.random() < 0.3) {
      this.particles.push({
        x: this.x + (Math.random() * 70 - 35),
        y: this.y - 45 - Math.random() * 30,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -1 - Math.random() * 1.5,
        type: 'germ',
        alpha: 0.9,
        scale: 0.7 + Math.random() * 0.5
      });
      // Sweat drop
      if (Math.random() < 0.3) {
        this.particles.push({
          x: this.x + (Math.random() < 0.5 ? -45 : 45),
          y: this.y - 40,
          vx: 0,
          vy: 2 + Math.random() * 2,
          type: 'sweat',
          alpha: 1.0,
          scale: 0.7
        });
      }
    }

    if (this.mood === 'angry' && Math.random() < 0.25) {
      this.particles.push({
        x: this.x + (Math.random() * 80 - 40),
        y: this.y - 70,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -1.5 - Math.random() * 2,
        type: 'steam',
        alpha: 0.8,
        scale: 0.8 + Math.random() * 0.6
      });
    }

    if (this.mood === 'sleeping' && Math.random() < 0.04) {
      this.particles.push({
        x: this.x + 30,
        y: this.y - 50,
        vx: 0.8 + Math.random() * 0.5,
        vy: -1.2,
        type: 'zzz',
        alpha: 1.0,
        scale: 0.8
      });
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= dt * 0.9;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();

    // Dead state / Ghost
    if (this.mood === 'dead') {
      this.drawDeadState();
      this.ctx.restore();
      this.drawParticles();
      return;
    }

    // Idle breathing & shaking when angry or pooping
    let breathY = Math.sin(this.animTime * 2.5) * 4;
    let shakeX = 0;
    let shakeY = 0;

    if (this.mood === 'angry') {
      shakeX = (Math.random() - 0.5) * 6;
      shakeY = (Math.random() - 0.5) * 6;
    } else if (this.mood === 'pooping') {
      shakeX = (Math.random() - 0.5) * 4;
      shakeY = (Math.random() - 0.5) * 4;
    } else if (this.mood === 'sick') {
      // Shivering with fever & stomach ache
      shakeX = (Math.random() - 0.5) * 3.5;
      shakeY = (Math.random() - 0.5) * 3.5;
    } else if (this.mood === 'sleeping') {
      breathY = Math.sin(this.animTime * 1.2) * 6;
    }

    // Shadow on the yellow carpet
    this.ctx.beginPath();
    this.ctx.ellipse(this.x, this.y + this.baseRadius * 0.95, this.baseRadius * 0.85 * this.scaleX, 22 * this.scaleY, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(40, 35, 10, 0.45)';
    this.ctx.fill();

    // Apply character transform
    this.ctx.translate(this.x + shakeX, this.y + breathY + shakeY);
    this.ctx.scale(this.scaleX, this.scaleY);

    // 1. Draw Body (Wood Carved Kentongan Sahur shape)
    this.drawBody();

    // 2. Draw Kentongan Slit & Traditional Carvings
    this.drawCarvings();

    // 3. Draw Eyes & Brows
    this.drawEyes();

    // 4. Draw Cheeks
    this.drawCheeks();

    // 5. Draw Mouth
    this.drawMouth();

    // 6. Draw Hands & Wooden Stick (Pemukul Kentongan)
    this.drawHands();

    // 7. Draw Fever Cooling Patch if sick
    if (this.mood === 'sick') {
      this.drawFeverPatch();
    }

    this.ctx.restore();

    // 7. Draw overlay particles
    this.drawParticles();
  }

  drawBody() {
    const r = this.baseRadius;
    const ctx = this.ctx;

    // Body shape: Organic rounded triangle/egg Pou-like silhouette with wooden warmth
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.15);
    // Right curve down
    ctx.bezierCurveTo(r * 0.85, -r * 0.85, r * 1.1, r * 0.3, r * 0.85, r * 0.95);
    // Bottom curve
    ctx.bezierCurveTo(r * 0.4, r * 1.12, -r * 0.4, r * 1.12, -r * 0.85, r * 0.95);
    // Left curve up
    ctx.bezierCurveTo(-r * 1.1, r * 0.3, -r * 0.85, -r * 0.85, 0, -r * 1.15);
    ctx.closePath();

    // Wood Grain & Ambient Lighting Gradient
    const grad = ctx.createRadialGradient(-25, -35, 15, 0, 0, r * 1.2);
    if (this.mood === 'angry') {
      grad.addColorStop(0, '#e06040');
      grad.addColorStop(0.5, '#992211');
      grad.addColorStop(1, '#4a0808');
    } else if (this.mood === 'pooping') {
      grad.addColorStop(0, '#d97706');
      grad.addColorStop(0.7, '#854d0e');
      grad.addColorStop(1, '#451a03');
    } else if (this.mood === 'sick') {
      // Sickly pale green / fever wood
      grad.addColorStop(0, '#bef264');
      grad.addColorStop(0.45, '#65a30d');
      grad.addColorStop(0.85, '#365314');
      grad.addColorStop(1, '#1a2e05');
    } else {
      // Classic rich Teak / Jackfruit Wood (Kayu Kentongan)
      grad.addColorStop(0, '#c99452');
      grad.addColorStop(0.4, '#a36d2e');
      grad.addColorStop(0.85, '#6d4314');
      grad.addColorStop(1, '#3b2207');
    }

    ctx.fillStyle = grad;
    ctx.fill();

    // Wooden Rim Stroke
    ctx.lineWidth = 6;
    ctx.strokeStyle = this.mood === 'angry' ? '#7f1d1d' : '#271404';
    ctx.stroke();

    // Subtle Wood Ring Growth Lines
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(50, 25, 5, 0.15)';
    ctx.lineWidth = 3;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.ellipse(-10, -20, r * 0.28 * i, r * 0.38 * i, 0.1, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawCarvings() {
    const ctx = this.ctx;
    // Central Slit Drum Opening (Lubang Suara Kentongan)
    // Placed on belly area
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-10, 48, 20, 44, 9);
    ctx.fillStyle = '#1e0f03';
    ctx.fill();
    ctx.strokeStyle = '#4a2800';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Slit inner depth shadow
    ctx.beginPath();
    ctx.roundRect(-7, 50, 14, 40, 6);
    ctx.fillStyle = '#0a0501';
    ctx.fill();

    // Traditional carved ornamental notches
    ctx.strokeStyle = 'rgba(255, 230, 180, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-32, 60); ctx.lineTo(-20, 70); ctx.lineTo(-32, 80);
    ctx.moveTo(32, 60); ctx.lineTo(20, 70); ctx.lineTo(32, 80);
    ctx.stroke();
    ctx.restore();
  }

  drawEyes() {
    const ctx = this.ctx;
    const eyeSpacing = 42;
    const eyeY = -35;
    const eyeRadius = 24;

    [-1, 1].forEach((side) => {
      const ex = side * eyeSpacing;
      const ey = eyeY;

      // Eyeball base
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(ex, ey, eyeRadius, eyeRadius * 1.12, 0, 0, Math.PI * 2);

      if (this.mood === 'angry') {
        ctx.fillStyle = '#fee2e2';
      } else {
        ctx.fillStyle = '#ffffff';
      }
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#231204';
      ctx.stroke();
      ctx.clip(); // clip pupil to eye socket

      // Sleeping or Blinking: Closed Eyes
      if (this.mood === 'sleeping' || this.isBlinking) {
        ctx.restore();
        ctx.beginPath();
        ctx.arc(ex, ey + 4, eyeRadius * 0.7, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.strokeStyle = '#231204';
        ctx.lineWidth = 5;
        ctx.stroke();
        return;
      }

      // Pupils & Irises
      const pupilX = ex + this.eyeLookX;
      const pupilY = ey + this.eyeLookY;

      ctx.beginPath();
      if (this.mood === 'angry') {
        // Red glowing demonic sahur eyes
        ctx.arc(pupilX, pupilY, 13, 0, Math.PI * 2);
        ctx.fillStyle = '#dc2626';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pupilX, pupilY, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#7f1d1d';
        ctx.fill();

        // Bloodshot veins
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ex - side * 15, ey - 10);
        ctx.lineTo(ex - side * 6, ey - 2);
        ctx.moveTo(ex - side * 12, ey + 10);
        ctx.lineTo(ex - side * 4, ey + 4);
        ctx.stroke();
      } else if (this.mood === 'sick') {
        // Dizzy spinning spiral eyes (@_@)
        const rot = this.animTime * 3.5 * side;
        ctx.save();
        ctx.translate(pupilX, pupilY);
        ctx.rotate(rot);
        ctx.strokeStyle = '#365314';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 3.5; a += 0.25) {
          const rSp = 2 + a * 2.5;
          const sx = Math.cos(a) * rSp;
          const sy = Math.sin(a) * rSp;
          if (a === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        ctx.restore();
      } else if (this.mood === 'crying') {
        // Big teary glossy pupil with flooded waterline
        ctx.arc(pupilX, pupilY, 16, 0, Math.PI * 2);
        ctx.fillStyle = '#0284c7';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pupilX, pupilY, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();

        // Shiny reflective tear gloss
        ctx.beginPath();
        ctx.arc(pupilX - 5, pupilY - 5, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fill();
      } else {
        // Normal / Happy Pou-style giant expressive pupil
        ctx.arc(pupilX, pupilY, 14, 0, Math.PI * 2);
        ctx.fillStyle = '#1e1106';
        ctx.fill();
      }

      // Eye Gleam / Highlight sparkles (for non-sick)
      if (this.mood !== 'sick') {
        ctx.beginPath();
        ctx.arc(pupilX - 4, pupilY - 4, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pupilX + 4, pupilY + 4, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Eyebrows based on emotion
      ctx.beginPath();
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = '#271404';
      ctx.lineCap = 'round';

      if (this.mood === 'angry') {
        // Sharp inward furrowed rage brows
        ctx.moveTo(ex - side * 22, ey - 22);
        ctx.lineTo(ex + side * 18, ey - 32);
      } else if (this.mood === 'sick') {
        // Distressed wavy fever brows
        ctx.moveTo(ex - side * 18, ey - 22);
        ctx.quadraticCurveTo(ex - side * 4, ey - 30, ex + side * 16, ey - 23);
      } else if (this.mood === 'sad' || this.mood === 'crying') {
        // Slanted downward sorrow brows
        ctx.moveTo(ex - side * 20, ey - 32);
        ctx.lineTo(ex + side * 18, ey - 22);
      } else if (this.mood === 'happy') {
        // High curved joyful brows
        ctx.arc(ex, ey - 26, 16, Math.PI * 1.15, Math.PI * 1.85);
      } else if (this.mood === 'pooping') {
        // Straining wavy brows
        ctx.moveTo(ex - side * 18, ey - 24);
        ctx.quadraticCurveTo(ex, ey - 29, ex + side * 18, ey - 24);
      } else {
        // Neutral gentle brow
        ctx.arc(ex, ey - 26, 15, Math.PI * 1.25, Math.PI * 1.75);
      }
      ctx.stroke();
    });
  }

  drawCheeks() {
    const ctx = this.ctx;
    if (this.mood === 'dead' || this.mood === 'angry') return;

    // Rosy cute cheeks or pale greenish when sick
    const cheekY = -12;
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.ellipse(side * 52, cheekY, 12, 7, 0, 0, Math.PI * 2);
      if (this.mood === 'sick') {
        ctx.fillStyle = 'rgba(101, 163, 13, 0.4)';
      } else {
        ctx.fillStyle = this.mood === 'happy' ? 'rgba(244, 63, 94, 0.45)' : 'rgba(239, 68, 68, 0.25)';
      }
      ctx.fill();

      // Tear streams cascading down cheeks when crying (Mengnaigs!)
      if (this.mood === 'crying') {
        ctx.beginPath();
        ctx.moveTo(side * 42, -15);
        ctx.quadraticCurveTo(side * 46, 15, side * 40, 45);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    });
  }

  drawMouth() {
    const ctx = this.ctx;
    const my = 12;

    ctx.save();
    ctx.translate(0, my);

    if (this.mouthOpenAmount > 0.1 || this.mood === 'eating') {
      // Open mouth for chomping food or wide happy roar
      const openH = 15 + this.mouthOpenAmount * 25;
      const openW = 28 + this.mouthOpenAmount * 16;

      ctx.beginPath();
      ctx.ellipse(0, openH * 0.35, openW * 0.7, openH * 0.8, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#450a0a';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#271404';
      ctx.stroke();
      ctx.clip();

      // Tongue
      ctx.beginPath();
      ctx.arc(0, openH * 0.85, openW * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = '#f43f5e';
      ctx.fill();

      // Small cute teeth
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.roundRect(-10, -5, 8, 8, 2);
      ctx.roundRect(2, -5, 8, 8, 2);
      ctx.fill();
    } else if (this.mood === 'happy') {
      // Joyful broad smile
      ctx.beginPath();
      ctx.arc(0, -6, 26, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.strokeStyle = '#271404';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Little dimples
      ctx.beginPath();
      ctx.moveTo(-22, 10); ctx.lineTo(-24, 7);
      ctx.moveTo(22, 10); ctx.lineTo(24, 7);
      ctx.stroke();
    } else if (this.mood === 'sick') {
      // Shivering wobbly sickly mouth with thermometer
      ctx.beginPath();
      ctx.moveTo(-18, 10);
      ctx.quadraticCurveTo(-8, 3, 0, 11);
      ctx.quadraticCurveTo(8, 18, 18, 8);
      ctx.strokeStyle = '#274e0d';
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Clinical Thermometer sticking out of mouth
      ctx.save();
      ctx.translate(6, 10);
      ctx.rotate(0.32);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(0, -3.5, 32, 7, 3);
      ctx.fill();
      ctx.stroke();
      // Red mercury tip
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(30, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (this.mood === 'sad') {
      // Downturned sad frown
      ctx.beginPath();
      ctx.arc(0, 22, 22, 1.25 * Math.PI, 1.75 * Math.PI);
      ctx.strokeStyle = '#271404';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.stroke();
    } else if (this.mood === 'crying') {
      // Big trembling crying wail (Mengnaigs!)
      ctx.beginPath();
      ctx.ellipse(0, 14, 22, 18, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#26110b';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#271404';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 20, 12, 0, Math.PI * 2);
      ctx.fillStyle = '#e11d48';
      ctx.fill();
    } else if (this.mood === 'angry') {
      // Sharp jagged grimace
      ctx.beginPath();
      ctx.moveTo(-24, 6);
      ctx.lineTo(-14, 12);
      ctx.lineTo(-4, 4);
      ctx.lineTo(6, 12);
      ctx.lineTo(16, 4);
      ctx.lineTo(24, 8);
      ctx.strokeStyle = '#450a0a';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.stroke();
    } else if (this.mood === 'pooping') {
      // Strained clamped 'o' mouth
      ctx.beginPath();
      ctx.ellipse(0, 6, 9, 12, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#3b1c0b';
      ctx.fill();
      ctx.strokeStyle = '#271404';
      ctx.lineWidth = 3.5;
      ctx.stroke();
    } else {
      // Neutral calm line
      ctx.beginPath();
      ctx.moveTo(-16, 8);
      ctx.quadraticCurveTo(0, 12, 16, 8);
      ctx.strokeStyle = '#271404';
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    ctx.restore();
  }

  drawHands() {
    const ctx = this.ctx;
    const r = this.baseRadius;

    // Left Hand (clutches belly if sick or pooping, otherwise rests on hip)
    ctx.save();
    ctx.beginPath();
    if (this.mood === 'sick' || this.mood === 'pooping') {
      ctx.ellipse(-r * 0.28, 68, 18, 14, 0.4, 0, Math.PI * 2);
    } else {
      ctx.ellipse(-r * 0.75, 45, 16, 20, -0.2, 0, Math.PI * 2);
    }
    ctx.fillStyle = '#8b5a2b';
    ctx.fill();
    ctx.strokeStyle = '#271404';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // Right Hand (holds wooden drumstick / Pemukul Kentongan)
    ctx.save();
    ctx.translate(r * 0.72, 40);
    ctx.rotate((this.armBeatAngle * Math.PI) / 180);

    // Hand palm
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 20, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#8b5a2b';
    ctx.fill();
    ctx.strokeStyle = '#271404';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Wooden Beater Stick (Kayu Pemukul Sahur)
    ctx.beginPath();
    ctx.roundRect(-5, -60, 10, 85, 4);
    ctx.fillStyle = '#d4a373';
    ctx.fill();
    ctx.strokeStyle = '#4a2800';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Beater head bulb
    ctx.beginPath();
    ctx.arc(0, -62, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#e76f51';
    ctx.fill();
    ctx.strokeStyle = '#271404';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.restore();
  }

  drawFeverPatch() {
    const ctx = this.ctx;
    // Blue cooling gel sheet (koyo demam) on forehead
    ctx.save();
    ctx.translate(0, -this.baseRadius * 0.78);
    ctx.beginPath();
    ctx.roundRect(-32, -10, 64, 20, 6);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.5;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DEMAM SAHUR', 0, 4);
    ctx.restore();
  }

  drawDeadState() {
    const ctx = this.ctx;
    const hoverY = Math.sin(this.animTime * 2) * 8;

    // Ghostly Floating Soul
    ctx.save();
    ctx.translate(this.x, this.y - 30 + hoverY);

    // Halo
    ctx.beginPath();
    ctx.ellipse(0, -95, 38, 12, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.9)';
    ctx.lineWidth = 5;
    ctx.shadowColor = '#fef08a';
    ctx.shadowBlur = 15;
    ctx.stroke();

    // Ghost body silhouette
    ctx.beginPath();
    ctx.moveTo(0, -75);
    ctx.bezierCurveTo(55, -60, 65, 20, 50, 65);
    // Wavy ghost tail
    ctx.quadraticCurveTo(35, 50, 20, 70);
    ctx.quadraticCurveTo(0, 50, -20, 70);
    ctx.quadraticCurveTo(-35, 50, -50, 65);
    ctx.bezierCurveTo(-65, 20, -55, -60, 0, -75);
    ctx.closePath();

    ctx.fillStyle = 'rgba(226, 232, 240, 0.75)';
    ctx.shadowColor = '#94a3b8';
    ctx.shadowBlur = 25;
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Dead "X" eyes
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    [-24, 24].forEach((ex) => {
      ctx.beginPath();
      ctx.moveTo(ex - 8, -25 - 8); ctx.lineTo(ex + 8, -25 + 8);
      ctx.moveTo(ex + 8, -25 - 8); ctx.lineTo(ex - 8, -25 + 8);
      ctx.stroke();
    });

    // Sad ghostly mouth
    ctx.beginPath();
    ctx.ellipse(0, 5, 8, 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#475569';
    ctx.fill();

    ctx.restore();

    // Gravestone in Backrooms
    ctx.save();
    ctx.translate(this.x, this.y + 70);
    ctx.beginPath();
    ctx.roundRect(-55, -45, 110, 60, [15, 15, 0, 0]);
    ctx.fillStyle = '#475569';
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('R.I.P', 0, -22);
    ctx.font = '10px monospace';
    ctx.fillText('TUNGTUNG SAHUR', 0, -6);
    ctx.fillText('Level 0 Backrooms', 0, 8);
    ctx.restore();
  }

  drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.translate(p.x, p.y);
      ctx.scale(p.scale, p.scale);

      if (p.type === 'heart') {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.bezierCurveTo(-10, -8, -18, 5, 0, 20);
        ctx.bezierCurveTo(18, 5, 10, -8, 0, 5);
        ctx.fill();
      } else if (p.type === 'tear') {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.quadraticCurveTo(8, 0, 8, 8);
        ctx.arc(0, 8, 8, 0, Math.PI);
        ctx.quadraticCurveTo(-8, 0, 0, -10);
        ctx.fill();
      } else if (p.type === 'steam') {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'germ') {
        ctx.fillStyle = 'rgba(132, 204, 22, 0.85)';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#365314';
        ctx.beginPath();
        ctx.arc(-2, -1, 1.5, 0, Math.PI * 2);
        ctx.arc(2, 2, 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'sweat') {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.quadraticCurveTo(4, 0, 4, 4);
        ctx.arc(0, 4, 4, 0, Math.PI);
        ctx.quadraticCurveTo(-4, 0, 0, -6);
        ctx.fill();
      } else if (p.type === 'zzz') {
        ctx.fillStyle = '#93c5fd';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText('Z', 0, 0);
      }

      ctx.restore();
    }
  }
}

// Global reference
window.TungSahurCharacter = TungSahurCharacter;
