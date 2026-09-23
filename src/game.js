/**
 * Tungtungtung Sahur in the Backrooms - Core Game Controller
 * Manages game loop, stats decay, room navigation, feeding, poop generation,
 * neglect triggers (beating player / dying), and state saving.
 */

class TungGame {
  constructor() {
    this.stats = {
      hunger: 80,
      thirst: 75,
      hygiene: 90,
      energy: 85,
      sanity: 80,
      coins: 60,
      playerHp: 100
    };

    this.currentRoom = 'hallway'; // 'hallway', 'kitchen', 'bathroom', 'bedroom', 'arcade'
    this.isSleeping = false;
    this.isDead = false;
    this.isAttacking = false;
    this.poopList = []; // { id, room, x, y }

    // Timers
    this.lastTickTime = performance.now();
    this.poopCheckTimer = 0;
    this.speechTimer = null;
    this.amokTimer = 0;
    this.starveTimer = 0;

    // Dragging item
    this.draggedItem = null;

    // Initialize references
    this.initDOM();
    this.loadState();
    this.initCharacter();
    this.initCracksCanvas();
    this.setupEvents();
    this.updateRoomView();
    this.renderShelf();
    this.updateHUD();

    // Start game loop
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);

    // Auto-save every 5 seconds
    setInterval(() => this.saveState(), 5000);
  }

  initDOM() {
    this.viewport = document.getElementById('game-viewport');
    this.stage = document.getElementById('game-stage');
    this.characterCanvas = document.getElementById('character-canvas');
    this.crackCanvas = document.getElementById('screen-crack-canvas');
    this.speechBubble = document.getElementById('speech-bubble');
    this.poopContainer = document.getElementById('poop-layer');
    this.shelfTray = document.getElementById('items-tray');
    this.dragGhost = document.getElementById('drag-ghost');

    // Gauge fills
    this.gaugeHunger = document.getElementById('gauge-hunger');
    this.gaugeThirst = document.getElementById('gauge-thirst');
    this.gaugeHygiene = document.getElementById('gauge-hygiene');
    this.gaugeEnergy = document.getElementById('gauge-energy');
    this.gaugeSanity = document.getElementById('gauge-sanity');
    this.coinDisplay = document.getElementById('coin-count');

    // Modals
    this.attackModal = document.getElementById('modal-attack');
    this.deathModal = document.getElementById('modal-death');
    this.arcadeModal = document.getElementById('modal-arcade');

    // Buttons
    this.audioToggleBtn = document.getElementById('btn-audio-toggle');
    this.crtToggleBtn = document.getElementById('btn-crt-toggle');
  }

  initCharacter() {
    this.character = new TungSahurCharacter(this.characterCanvas);
    this.character.resize();
    window.addEventListener('resize', () => {
      this.character.resize();
      this.resizeCracks();
    });
  }

  initCracksCanvas() {
    this.crackCtx = this.crackCanvas.getContext('2d');
    this.resizeCracks();
  }

  resizeCracks() {
    this.crackCanvas.width = this.viewport.clientWidth;
    this.crackCanvas.height = this.viewport.clientHeight;
  }

  setupEvents() {
    // Sound unlock on first gesture
    const unlockAudio = () => {
      if (window.soundEngine) {
        window.soundEngine.init();
        window.soundEngine.startBackroomsHum();
      }
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    // Audio Mute Toggle
    this.audioToggleBtn.addEventListener('click', () => {
      const isMuted = window.soundEngine.toggleMute();
      this.audioToggleBtn.textContent = isMuted ? '🔇 Muted' : '🔊 Sound';
    });

    // CRT Toggle
    this.crtToggleBtn.addEventListener('click', () => {
      const crt = document.querySelector('.crt-overlay');
      if (crt) {
        crt.style.display = crt.style.display === 'none' ? 'block' : 'none';
      }
    });

    // Room Switcher
    document.querySelectorAll('.room-nav-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const targetRoom = btn.getAttribute('data-room');
        if (targetRoom) this.switchRoom(targetRoom);
      });
    });

    // Pet Tungtung directly when in stage
    this.characterCanvas.addEventListener('click', (e) => {
      if (this.isDead || this.isSleeping || this.isAttacking) return;
      this.showSpeech('TUNG! TUNG! TUNG! SAHURRR!', 1800);
      this.stats.sanity = Math.min(100, this.stats.sanity + 2);
      this.updateHUD();
    });

    // Lamp pull string for Bedroom
    const lampCord = document.getElementById('bedroom-lamp-cord');
    if (lampCord) {
      lampCord.addEventListener('click', () => this.toggleBedroomLight());
    }

    // Modal Action Buttons
    document.getElementById('btn-apologize-treat').addEventListener('click', () => {
      this.resolveAttack();
    });

    document.getElementById('btn-revive-ritual').addEventListener('click', () => {
      this.resurrectTungtung();
    });

    document.getElementById('btn-close-arcade').addEventListener('click', () => {
      this.closeArcade();
    });

    // Drag-and-drop item feeding system
    window.addEventListener('pointermove', (e) => {
      if (!this.draggedItem) return;
      this.dragGhost.style.left = `${e.clientX}px`;
      this.dragGhost.style.top = `${e.clientY}px`;

      // Check proximity to mouth
      const rect = this.characterCanvas.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;

      if (this.character.isPointInMouth(canvasX, canvasY)) {
        this.character.targetMouthOpen = 1.0;
      } else {
        this.character.targetMouthOpen = 0.0;
      }
    });

    window.addEventListener('pointerup', (e) => {
      if (!this.draggedItem) return;
      const rect = this.characterCanvas.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;

      if (this.character.isPointInMouth(canvasX, canvasY)) {
        this.feedItem(this.draggedItem);
      }

      this.character.targetMouthOpen = 0.0;
      this.dragGhost.style.display = 'none';
      this.draggedItem = null;
    });
  }

  switchRoom(room) {
    if (this.isAttacking) return;
    this.currentRoom = room;

    // Update active nav button
    document.querySelectorAll('.room-nav-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-room') === room);
    });

    this.updateRoomView();
    this.renderShelf();
    this.renderPoops();

    if (window.soundEngine) {
      window.soundEngine.playFlicker();
    }

    if (room === 'arcade') {
      this.openArcade();
    }
  }

  updateRoomView() {
    this.viewport.className = `room-${this.currentRoom} ${this.isSleeping ? 'lights-off' : ''}`;

    // Lamp cord only in bedroom
    const lampCord = document.getElementById('bedroom-lamp-cord');
    if (lampCord) {
      lampCord.style.display = this.currentRoom === 'bedroom' ? 'flex' : 'none';
    }

    // Room Label
    const levelTag = document.getElementById('room-tag-text');
    const roomNames = {
      hallway: 'LEVEL 0 - LORONG KUNING',
      kitchen: 'LEVEL 0 - PANTRY SAHUR',
      bathroom: 'LEVEL 0 - KAMAR MANDI BERJAMUR',
      bedroom: 'LEVEL 0 - BILIK TIDUR REMANG',
      arcade: 'LEVEL 0 - ARCADE PELARIAN'
    };
    if (levelTag) {
      levelTag.textContent = roomNames[this.currentRoom] || 'LEVEL 0';
    }
  }

  toggleBedroomLight() {
    if (this.currentRoom !== 'bedroom') return;
    this.isSleeping = !this.isSleeping;
    this.updateRoomView();

    if (window.soundEngine) {
      window.soundEngine.playFlicker();
      if (this.isSleeping) {
        window.soundEngine.playSnore();
      }
    }

    if (this.isSleeping) {
      this.character.setMood('sleeping');
      this.showSpeech('Zzz... Istirahat sahur...', 2500);
    } else {
      this.character.setMood('neutral');
      this.showSpeech('Bangun sahur!', 1800);
    }
  }

  renderShelf() {
    this.shelfTray.innerHTML = '';

    if (this.currentRoom === 'kitchen') {
      // Show Foods & Drinks
      const items = [...window.ITEMS_DB.foods, ...window.ITEMS_DB.drinks];
      items.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.title = `${item.name} - ${item.desc}`;
        card.innerHTML = `
          <div class="item-price-tag">$${item.cost}</div>
          <div class="item-icon-box">${item.icon}</div>
          <div class="item-name">${item.name}</div>
        `;

        card.addEventListener('pointerdown', (e) => {
          if (this.stats.coins < item.cost) {
            this.showSpeech('Koin Sahur tidak cukup!', 1500);
            return;
          }
          this.startDrag(item, e);
        });

        this.shelfTray.appendChild(card);
      });
    } else if (this.currentRoom === 'bathroom') {
      // Show Cleaning Tools
      window.ITEMS_DB.tools.forEach((tool) => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
          <div class="item-icon-box">
            ${tool.id === 'sponge' ? '🧽' : tool.id === 'mop' ? '🧹' : '🥢'}
          </div>
          <div class="item-name">${tool.name}</div>
        `;

        card.addEventListener('click', () => {
          if (tool.id === 'sponge') {
            this.useSponge();
          } else if (tool.id === 'mop') {
            this.cleanAllPoopsInRoom();
          } else {
            this.character.beatKentongan();
            if (window.soundEngine) window.soundEngine.playSahurRhythm();
          }
        });

        this.shelfTray.appendChild(card);
      });
    } else {
      // Hallway or Bedroom quick actions
      const petCard = document.createElement('div');
      petCard.className = 'item-card';
      petCard.innerHTML = `
        <div class="item-icon-box">🥢</div>
        <div class="item-name">Tabuh Kentongan</div>
      `;
      petCard.addEventListener('click', () => {
        this.character.beatKentongan();
        if (window.soundEngine) window.soundEngine.playSahurRhythm();
        this.showSpeech('TUNG TUNG TUNG SAHURRR!', 1800);
        this.stats.sanity = Math.min(100, this.stats.sanity + 5);
        this.updateHUD();
      });
      this.shelfTray.appendChild(petCard);

      const danceCard = document.createElement('div');
      danceCard.className = 'item-card';
      danceCard.innerHTML = `
        <div class="item-icon-box">💃</div>
        <div class="item-name">Ajak Joget</div>
      `;
      danceCard.addEventListener('click', () => {
        this.character.triggerPetting(this.character.x, this.character.y);
        this.showSpeech('Goyang Sahur Backrooms!', 1800);
        this.stats.sanity = Math.min(100, this.stats.sanity + 6);
        this.updateHUD();
      });
      this.shelfTray.appendChild(danceCard);
    }
  }

  startDrag(item, e) {
    if (this.isDead || this.isSleeping || this.isAttacking) return;
    this.draggedItem = item;
    this.dragGhost.innerHTML = item.icon;
    this.dragGhost.style.display = 'block';
    this.dragGhost.style.left = `${e.clientX}px`;
    this.dragGhost.style.top = `${e.clientY}px`;
  }

  feedItem(item) {
    if (this.stats.coins < item.cost) return;

    this.stats.coins -= item.cost;

    if (item.type === 'food') {
      this.stats.hunger = Math.min(100, this.stats.hunger + item.hunger);
      if (item.thirst) this.stats.thirst = Math.max(0, Math.min(100, this.stats.thirst + item.thirst));
      if (item.sanity) this.stats.sanity = Math.max(0, Math.min(100, this.stats.sanity + item.sanity));
      if (window.soundEngine) window.soundEngine.playChomp();
      this.showSpeech(`Nyam nyam! Enaknya ${item.name}!`, 1800);
    } else if (item.type === 'drink') {
      this.stats.thirst = Math.min(100, this.stats.thirst + item.thirst);
      if (item.hunger) this.stats.hunger = Math.min(100, this.stats.hunger + item.hunger);
      if (item.energy) this.stats.energy = Math.min(100, this.stats.energy + item.energy);
      if (item.sanity) this.stats.sanity = Math.min(100, this.stats.sanity + item.sanity);
      if (window.soundEngine) window.soundEngine.playGulp();
      this.showSpeech(`Seger banget! Haus sahur hilang!`, 1800);
    }

    this.character.setMood('happy');
    setTimeout(() => {
      if (!this.isDead && !this.isSleeping && !this.isAttacking) {
        this.evaluateMood();
      }
    }, 2000);

    this.updateHUD();
  }

  useSponge() {
    this.stats.hygiene = Math.min(100, this.stats.hygiene + 25);
    if (window.soundEngine) window.soundEngine.playScrub();

    // Spawn bubbles
    for (let i = 0; i < 6; i++) {
      const bubble = document.createElement('div');
      bubble.className = 'soap-bubble';
      bubble.style.left = `${this.character.x - 50 + Math.random() * 100}px`;
      bubble.style.top = `${this.character.y - 50 + Math.random() * 100}px`;
      this.stage.appendChild(bubble);
      setTimeout(() => bubble.remove(), 800);
    }

    this.showSpeech('Segar dan bersih!', 1500);
    this.updateHUD();
  }

  cleanAllPoopsInRoom() {
    const toRemove = this.poopList.filter((p) => p.room === this.currentRoom);
    if (toRemove.length === 0) {
      this.showSpeech('Lantai ruangan ini sudah bersih!', 1500);
      return;
    }

    this.poopList = this.poopList.filter((p) => p.room !== this.currentRoom);
    this.stats.hygiene = Math.min(100, this.stats.hygiene + 20 * toRemove.length);
    this.stats.coins += 5 * toRemove.length;

    if (window.soundEngine) {
      window.soundEngine.playScrub();
      window.soundEngine.playCoin();
    }

    this.showSpeech(`Lantai disapu bersih! +${5 * toRemove.length} Koin!`, 1800);
    this.renderPoops();
    this.updateHUD();
  }

  spawnPoop(room = null) {
    const targetRoom = room || ['hallway', 'kitchen', 'bathroom', 'bedroom'][Math.floor(Math.random() * 4)];
    const id = 'poop_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const x = 120 + Math.random() * (this.viewport.clientWidth - 240);
    const y = this.viewport.clientHeight - 200 + Math.random() * 60;

    this.poopList.push({ id, room: targetRoom, x, y });

    this.stats.hygiene = Math.max(0, this.stats.hygiene - 22);

    if (window.soundEngine) {
      window.soundEngine.playPoop();
    }

    if (this.currentRoom === targetRoom) {
      this.character.setMood('pooping');
      this.showSpeech('PLOP! Tungtungtung pup di lantai!', 2200);
      setTimeout(() => {
        if (!this.isDead && !this.isSleeping && !this.isAttacking) {
          this.evaluateMood();
        }
      }, 2000);
    }

    this.renderPoops();
    this.updateHUD();
  }

  renderPoops() {
    this.poopContainer.innerHTML = '';
    const roomPoops = this.poopList.filter((p) => p.room === this.currentRoom);

    roomPoops.forEach((p) => {
      const el = document.createElement('div');
      el.className = 'poop-entity';
      el.style.left = `${p.x}px`;
      el.style.top = `${p.y}px`;
      el.innerHTML = `
        <div class="steam-cloud">♨️</div>
        <svg viewBox="0 0 64 64" width="100%" height="100%">
          <ellipse cx="32" cy="46" rx="22" ry="10" fill="#451a03"/>
          <ellipse cx="32" cy="34" rx="16" ry="8" fill="#582405"/>
          <circle cx="32" cy="22" r="10" fill="#78350f"/>
          <circle cx="28" cy="22" r="3" fill="#fff"/>
          <circle cx="36" cy="22" r="3" fill="#fff"/>
          <circle cx="29" cy="22" r="1.5" fill="#000"/>
          <circle cx="37" cy="22" r="1.5" fill="#000"/>
          <path d="M30 26 Q32 28 34 26" stroke="#000" stroke-width="1.5" fill="none"/>
        </svg>
      `;

      el.addEventListener('click', () => {
        this.cleanSinglePoop(p.id);
      });

      this.poopContainer.appendChild(el);
    });
  }

  cleanSinglePoop(id) {
    this.poopList = this.poopList.filter((p) => p.id !== id);
    this.stats.hygiene = Math.min(100, this.stats.hygiene + 20);
    this.stats.coins += 5;

    if (window.soundEngine) {
      window.soundEngine.playScrub();
      window.soundEngine.playCoin();
    }

    this.showSpeech('Pup dibersihkan! +5 Koin!', 1500);
    this.renderPoops();
    this.updateHUD();
  }

  showSpeech(text, duration = 2000) {
    if (this.speechTimer) clearTimeout(this.speechTimer);
    this.speechBubble.textContent = text;
    this.speechBubble.classList.add('active');

    this.speechTimer = setTimeout(() => {
      this.speechBubble.classList.remove('active');
    }, duration);
  }

  evaluateMood() {
    if (this.isDead) {
      this.character.setMood('dead');
      return;
    }
    if (this.isSleeping) {
      this.character.setMood('sleeping');
      return;
    }
    if (this.isAttacking) {
      this.character.setMood('angry');
      return;
    }

    // Emotion hierarchy
    if (this.stats.hunger <= 0 || this.stats.thirst <= 0) {
      this.character.setMood('crying');
      if (Math.random() < 0.05 && window.soundEngine) {
        window.soundEngine.playCry();
      }
    } else if (this.stats.hunger < 25 || this.stats.thirst < 25 || this.stats.sanity < 25) {
      this.character.setMood('sad');
    } else if (this.stats.sanity > 65 && this.stats.hunger > 60 && this.stats.thirst > 60) {
      this.character.setMood('happy');
    } else {
      this.character.setMood('neutral');
    }
  }

  // Jumpscare Attack: Screen cracks, violently shakes, punches the player
  triggerAmokAttack() {
    if (this.isAttacking || this.isDead) return;
    this.isAttacking = true;
    this.character.setMood('angry');

    this.showSpeech('TUNGTUNGTUNG MARAH BESAR!!', 3000);

    // Audio cues
    if (window.soundEngine) {
      window.soundEngine.playAngryRoar();
    }

    this.viewport.classList.add('emergency-alarm', 'violent-screen-shake');

    // Deliver rapid punches with screen cracks
    let punches = 0;
    const punchInterval = setInterval(() => {
      punches++;
      this.character.beatKentongan();
      this.character.scaleX = 1.35;
      this.character.scaleY = 1.35;

      if (window.soundEngine) {
        window.soundEngine.playPunch();
      }

      this.addScreenCrack(
        this.viewport.clientWidth / 2 + (Math.random() * 200 - 100),
        this.viewport.clientHeight / 2 + (Math.random() * 150 - 75)
      );

      this.stats.playerHp = Math.max(0, this.stats.playerHp - 25);

      if (punches >= 4) {
        clearInterval(punchInterval);
        setTimeout(() => {
          this.viewport.classList.remove('violent-screen-shake');
          this.attackModal.classList.add('active');
        }, 600);
      }
    }, 400);
  }

  addScreenCrack(x, y) {
    const ctx = this.crackCtx;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 3;

    // Center impact crater
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.stroke();

    // Jagged radiating fracture rays
    const rays = 7 + Math.floor(Math.random() * 5);
    for (let i = 0; i < rays; i++) {
      const angle = (i / rays) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      let currX = x;
      let currY = y;
      const length = 70 + Math.random() * 140;
      const steps = 4;

      ctx.beginPath();
      ctx.moveTo(currX, currY);

      for (let s = 0; s < steps; s++) {
        const segDist = length / steps;
        currX += Math.cos(angle) * segDist + (Math.random() - 0.5) * 18;
        currY += Math.sin(angle) * segDist + (Math.random() - 0.5) * 18;
        ctx.lineTo(currX, currY);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  resolveAttack() {
    this.isAttacking = false;
    this.viewport.classList.remove('emergency-alarm');
    this.attackModal.classList.remove('active');

    // Clear cracks
    this.crackCtx.clearRect(0, 0, this.crackCanvas.width, this.crackCanvas.height);

    // Give emergency calming supplies
    this.stats.hunger = Math.max(this.stats.hunger, 50);
    this.stats.thirst = Math.max(this.stats.thirst, 50);
    this.stats.sanity = 60;
    this.stats.playerHp = 100;

    this.evaluateMood();
    this.updateHUD();
    this.showSpeech('Tungtung ditenangkan dengan Ransum Darurat...', 2500);
  }

  // Depression & Starvation Death
  triggerDeath() {
    if (this.isDead) return;
    this.isDead = true;
    this.character.setMood('dead');
    this.deathModal.classList.add('active');

    if (window.soundEngine) {
      window.soundEngine.playCry();
    }
  }

  resurrectTungtung() {
    this.isDead = false;
    this.deathModal.classList.remove('active');

    // Full revival with sacred sahur almond water
    this.stats.hunger = 80;
    this.stats.thirst = 80;
    this.stats.hygiene = 85;
    this.stats.energy = 90;
    this.stats.sanity = 85;

    this.evaluateMood();
    this.updateHUD();

    if (window.soundEngine) {
      window.soundEngine.playSahurRhythm();
    }

    this.showSpeech('ALMOND WATER AJAIB MEMBANGKITKAN TUNGTUNGTUNG SAHUR!!', 3000);
  }

  // Arcade Mini-Game Portal
  openArcade() {
    this.arcadeModal.classList.add('active');
    const container = document.getElementById('minigame-container');
    container.innerHTML = '';

    this.minigame = new BackroomsMiniGame(container, (result) => {
      this.stats.coins += result.coins;
      this.stats.sanity = Math.min(100, this.stats.sanity + 20);
      this.updateHUD();
      alert(`Permainan Selesai!\nSkor: ${result.score} m\nKoin Sahur Didapat: +${result.coins}`);
      this.closeArcade();
    });

    this.minigame.start();
  }

  closeArcade() {
    if (this.minigame) {
      this.minigame.stop();
      this.minigame = null;
    }
    this.arcadeModal.classList.remove('active');
    this.switchRoom('hallway');
  }

  updateHUD() {
    this.gaugeHunger.style.width = `${Math.max(0, this.stats.hunger)}%`;
    this.gaugeThirst.style.width = `${Math.max(0, this.stats.thirst)}%`;
    this.gaugeHygiene.style.width = `${Math.max(0, this.stats.hygiene)}%`;
    this.gaugeEnergy.style.width = `${Math.max(0, this.stats.energy)}%`;
    this.gaugeSanity.style.width = `${Math.max(0, this.stats.sanity)}%`;
    this.coinDisplay.textContent = this.stats.coins;

    // Toggle low warning pulsation
    this.gaugeHunger.classList.toggle('stat-low', this.stats.hunger < 25);
    this.gaugeThirst.classList.toggle('stat-low', this.stats.thirst < 25);
    this.gaugeHygiene.classList.toggle('stat-low', this.stats.hygiene < 25);
    this.gaugeSanity.classList.toggle('stat-low', this.stats.sanity < 25);
  }

  loop(currentTime) {
    const dt = Math.min((currentTime - this.lastTickTime) / 1000, 0.1);
    this.lastTickTime = currentTime;

    // Stats natural decay
    if (!this.isDead) {
      // Hunger decay (~1 pt every 3.5 seconds)
      this.stats.hunger = Math.max(0, this.stats.hunger - dt * 0.28);

      // Thirst decay (~1 pt every 2.8 seconds)
      this.stats.thirst = Math.max(0, this.stats.thirst - dt * 0.35);

      // Hygiene decay
      this.stats.hygiene = Math.max(0, this.stats.hygiene - dt * 0.15);

      // Energy
      if (this.isSleeping) {
        this.stats.energy = Math.min(100, this.stats.energy + dt * 1.5);
      } else {
        this.stats.energy = Math.max(0, this.stats.energy - dt * 0.2);
      }

      // Sanity responds to other stats
      if (this.stats.hunger < 20 || this.stats.thirst < 20 || this.stats.hygiene < 20) {
        this.stats.sanity = Math.max(0, this.stats.sanity - dt * 0.6);
      }

      // Periodic poop spawning check (every 45-75 seconds on average)
      this.poopCheckTimer += dt;
      if (this.poopCheckTimer > 35 && Math.random() < 0.003) {
        this.poopCheckTimer = 0;
        this.spawnPoop();
      }

      // Neglect consequences check
      if (this.stats.hunger <= 0 && this.stats.thirst <= 0 && this.stats.sanity <= 5) {
        this.starveTimer += dt;
        if (this.starveTimer > 18) {
          // Pass away from starvation & neglect
          this.triggerDeath();
        }
      } else {
        this.starveTimer = 0;
      }

      // Amok rage check: low sanity + starvation sparks fury!
      if (!this.isAttacking && (this.stats.hunger <= 0 || this.stats.thirst <= 0) && this.stats.sanity <= 15) {
        this.amokTimer += dt;
        if (this.amokTimer > 10) {
          this.amokTimer = 0;
          this.triggerAmokAttack();
        }
      } else {
        this.amokTimer = 0;
      }

      if (!this.isAttacking) {
        this.evaluateMood();
      }

      this.updateHUD();
    }

    // Update & draw character
    this.character.update(dt);
    this.character.draw();

    requestAnimationFrame(this.loop);
  }

  saveState() {
    const data = {
      stats: this.stats,
      poopList: this.poopList,
      isDead: this.isDead
    };
    try {
      localStorage.setItem('tung_sahur_save', JSON.stringify(data));
    } catch (e) {
      console.warn('Storage error:', e);
    }
  }

  loadState() {
    try {
      const saved = localStorage.getItem('tung_sahur_save');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.stats) this.stats = Object.assign(this.stats, parsed.stats);
        if (parsed.poopList) this.poopList = parsed.poopList;
        if (parsed.isDead !== undefined) this.isDead = parsed.isDead;
      }
    } catch (e) {
      console.warn('Load error:', e);
    }
  }
}

// Boot game on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.tungGame = new TungGame();
});
