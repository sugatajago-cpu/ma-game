/**
 * Tungtungtung Sahur in The Backrooms - Friends & Global Multiplayer System
 * Supports Local Storage simulation and real-time Firebase Firestore global synchronization.
 */

class FriendManager {
  constructor() {
    this.game = null;
    this.storageKey = 'tung_sahur_friends_v1';
    this.profileKey = 'tung_sahur_profile_v1';
    this.fbConfigKey = 'tung_sahur_fb_config';

    // Player Identity
    this.myProfile = {
      id: '',
      name: 'Penjelajah Sahur',
      petName: 'Tungtung Sahur',
      daysSurvived: 1,
      createdAt: Date.now()
    };

    // Friends list & state
    this.friends = [];
    this.pendingGifts = [];
    this.discoverList = [];
    this.activeVisitingFriend = null;

    // Firebase state
    this.firebaseConfig = null;
    this.firebaseApp = null;
    this.firestoreDb = null;
    this.isFirebaseActive = false;
    this.unsubscribeGifts = null;

    this.initProfile();
    this.loadFriendsData();
    this.loadFirebaseConfig();
  }

  init(gameInstance) {
    this.game = gameInstance;
    this.initDOM();
    this.setupEvents();
    this.renderFriendsList();
    this.renderDiscoverList();
    this.renderProfileTab();
    this.updateBadge();
    this.checkAutoSyncProfile();

    // Auto-sync profile to cloud/local every 20 seconds
    setInterval(() => {
      this.syncMyLiveStats();
    }, 20000);
  }

  // ----------------------------------------------------
  // PROFILE & IDENTITY
  // ----------------------------------------------------
  initProfile() {
    try {
      const saved = localStorage.getItem(this.profileKey);
      if (saved) {
        this.myProfile = Object.assign(this.myProfile, JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Error reading profile:', e);
    }

    if (!this.myProfile.id) {
      // Generate unique player Friend Code: SAHUR-XXXX
      const randNum = Math.floor(1000 + Math.random() * 9000);
      this.myProfile.id = `SAHUR-${randNum}`;
      this.myProfile.name = `Penjelajah #${randNum}`;
      this.saveProfile();
    }
  }

  saveProfile() {
    try {
      localStorage.setItem(this.profileKey, JSON.stringify(this.myProfile));
    } catch (e) {
      console.warn('Error saving profile:', e);
    }
  }

  updateProfile(newName, newPetName) {
    if (newName && newName.trim()) {
      this.myProfile.name = newName.trim();
    }
    if (newPetName && newPetName.trim()) {
      this.myProfile.petName = newPetName.trim();
    }
    this.saveProfile();
    this.syncMyLiveStats();
    this.showAlert('Profil berhasil disimpan!', 'success');
  }

  // ----------------------------------------------------
  // FRIENDS DATA & STORAGE
  // ----------------------------------------------------
  loadFriendsData() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.friends = parsed.friends || [];
        this.pendingGifts = parsed.pendingGifts || [];
      }
    } catch (e) {
      console.warn('Error loading friends:', e);
    }

    // Pre-populate with realistic Backrooms friends if empty
    if (!this.friends || this.friends.length === 0) {
      this.friends = [
        {
          id: 'SAHUR-1001',
          name: 'Kang Kentongan Subuh',
          petName: 'Tungtung Muklis',
          status: 'Online • Sedang Menabuh Kentongan',
          mood: 'happy',
          stats: { hunger: 88, thirst: 82, hygiene: 92, energy: 85, sanity: 90 },
          lastSeen: 'Baru saja',
          isOnline: true,
          badgeColor: '#10b981'
        },
        {
          id: 'SAHUR-4420',
          name: 'Smiler Whisperer',
          petName: 'Tungtung Glap',
          status: 'Lapar Meringis di Lorong Gelap',
          mood: 'sad',
          stats: { hunger: 32, thirst: 45, hygiene: 55, energy: 60, sanity: 35 },
          lastSeen: '5 menit lalu',
          isOnline: true,
          badgeColor: '#ef4444'
        },
        {
          id: 'SAHUR-7789',
          name: 'Warga Bilik Level 0',
          petName: 'Tungtung Bambang',
          status: 'Tertidur Zzz di Bilik Remang',
          mood: 'sleeping',
          stats: { hunger: 70, thirst: 65, hygiene: 85, energy: 95, sanity: 80 },
          lastSeen: '30 menit lalu',
          isOnline: false,
          badgeColor: '#eab308'
        }
      ];

      // Sample starter gift
      this.pendingGifts = [
        {
          id: 'gift_welcome',
          fromName: 'Kang Kentongan Subuh',
          fromId: 'SAHUR-1001',
          item: 'Kurma Sahur & Almond Water',
          coins: 30,
          hunger: 20,
          thirst: 20,
          time: 'Baru saja'
        }
      ];

      this.saveFriendsData();
    }

    // Default discoverable wanderers
    this.discoverList = [
      {
        id: 'SAHUR-8802',
        name: 'Penjaga Ransum Backrooms',
        petName: 'Tungtung Ransum',
        mood: 'happy',
        desc: 'Sering membagikan ransum lezat di Level 0'
      },
      {
        id: 'SAHUR-5519',
        name: 'Kolektor Almond Water',
        petName: 'Tungtung Bening',
        mood: 'neutral',
        desc: 'Menjelajahi pipa-pipa misterius Backrooms'
      },
      {
        id: 'SAHUR-9934',
        name: 'Pendekar Sahur Subuh',
        petName: 'Tungtung Jawara',
        mood: 'happy',
        desc: 'Membangunkan entitas di seluruh level'
      },
      {
        id: 'SAHUR-2231',
        name: 'Si Gesit Lari dari Smiler',
        petName: 'Tungtung Gesit',
        mood: 'sad',
        desc: 'Baru saja lolos dari kejaran Smiler di lorong gelap'
      }
    ];
  }

  saveFriendsData() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        friends: this.friends,
        pendingGifts: this.pendingGifts
      }));
    } catch (e) {
      console.warn('Error saving friends data:', e);
    }
    this.updateBadge();
  }

  // ----------------------------------------------------
  // ADD & REMOVE FRIENDS
  // ----------------------------------------------------
  async addFriendByCode(rawCode) {
    if (!rawCode) {
      this.showAlert('Masukkan ID Sahabat terlebih dahulu!', 'error');
      return false;
    }

    const code = rawCode.trim().toUpperCase();

    if (code === this.myProfile.id) {
      this.showAlert('Kamu tidak bisa menambahkan ID dirimu sendiri!', 'error');
      return false;
    }

    if (this.friends.some(f => f.id === code)) {
      this.showAlert('ID ini sudah ada di dalam daftar sahabatmu!', 'warning');
      return false;
    }

    // Check if Firebase is active
    if (this.isFirebaseActive && this.firestoreDb) {
      try {
        this.showAlert('Mencari sahabat di Firebase Firestore...', 'info');
        const userDoc = await this.firestoreDb.collection('tung_players').doc(code).get();

        if (userDoc.exists) {
          const data = userDoc.data();
          const newFriend = {
            id: code,
            name: data.name || `Penjelajah ${code}`,
            petName: data.petName || 'Tungtung',
            status: data.status || 'Online • Di Backrooms',
            mood: data.mood || 'happy',
            stats: data.stats || { hunger: 80, thirst: 80, hygiene: 80, energy: 80, sanity: 80 },
            lastSeen: 'Baru saja',
            isOnline: true
          };

          this.friends.unshift(newFriend);
          this.saveFriendsData();

          // Also save in user's friends subcollection in Firestore
          await this.firestoreDb
            .collection('tung_players')
            .doc(this.myProfile.id)
            .collection('friends')
            .doc(code)
            .set({
              friendId: code,
              addedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

          this.renderFriendsList();
          this.showAlert(`Berhasil menambahkan ${newFriend.name} dari Firebase!`, 'success');
          if (window.soundEngine) window.soundEngine.playCoin();
          return true;
        } else {
          // If not found in firestore, allow adding as manual friend/mock
          this.showAlert(`ID ${code} belum terdaftar di Firebase, ditambahkan ke kontak lokal!`, 'warning');
        }
      } catch (err) {
        console.error('Firebase search error:', err);
        this.showAlert('Gagal mencari di Firebase, menambahkan secara lokal...', 'warning');
      }
    }

    // Local / Offline addition
    const discovered = this.discoverList.find(d => d.id === code);
    const newFriend = {
      id: code,
      name: discovered ? discovered.name : `Penjelajah ${code}`,
      petName: discovered ? discovered.petName : 'Tungtung Sahur',
      status: 'Online • Baru Berteman',
      mood: discovered ? discovered.mood : 'happy',
      stats: {
        hunger: 65 + Math.floor(Math.random() * 30),
        thirst: 65 + Math.floor(Math.random() * 30),
        hygiene: 70 + Math.floor(Math.random() * 25),
        energy: 70 + Math.floor(Math.random() * 25),
        sanity: 75 + Math.floor(Math.random() * 25)
      },
      lastSeen: 'Baru saja',
      isOnline: true,
      badgeColor: '#10b981'
    };

    this.friends.unshift(newFriend);
    this.saveFriendsData();
    this.renderFriendsList();
    this.showAlert(`Berhasil menambahkan ${newFriend.name} (${code})!`, 'success');

    if (window.soundEngine) {
      window.soundEngine.playCoin();
    }
    return true;
  }

  removeFriend(friendId) {
    const friend = this.friends.find(f => f.id === friendId);
    const name = friend ? friend.name : friendId;

    if (!confirm(`Yakin ingin menghapus ${name} dari daftar sahabat?`)) {
      return;
    }

    this.friends = this.friends.filter(f => f.id !== friendId);
    this.saveFriendsData();

    if (this.isFirebaseActive && this.firestoreDb) {
      this.firestoreDb
        .collection('tung_players')
        .doc(this.myProfile.id)
        .collection('friends')
        .doc(friendId)
        .delete()
        .catch(e => console.warn('Firestore delete error:', e));
    }

    this.renderFriendsList();
    this.showAlert(`${name} telah dihapus dari daftar sahabat.`, 'info');
  }

  // ----------------------------------------------------
  // SEND & CLAIM GIFTS (TAKJIL SAHUR)
  // ----------------------------------------------------
  async sendGift(friendId) {
    const friend = this.friends.find(f => f.id === friendId);
    if (!friend) return;

    // Deduct a few coins from sender or free daily gift
    if (this.game && this.game.stats.coins < 5) {
      this.showAlert('Koin Sahurmu kurang (butuh 5 koin untuk kirim takjil)!', 'error');
      return;
    }

    if (this.game) {
      this.game.stats.coins -= 5;
      this.game.updateHUD();
    }

    const giftTypes = [
      { name: 'Kurma Sahur Manis', hunger: 25, thirst: 10, coins: 15 },
      { name: 'Air Mineral Segar Backrooms', hunger: 5, thirst: 35, coins: 15 },
      { name: 'Almond Water Botol Kaca', hunger: 15, thirst: 30, coins: 25 },
      { name: 'Sepiring Indomie Telur Sahur', hunger: 45, thirst: 5, coins: 20 }
    ];
    const chosenGift = giftTypes[Math.floor(Math.random() * giftTypes.length)];

    if (this.isFirebaseActive && this.firestoreDb) {
      try {
        await this.firestoreDb
          .collection('tung_players')
          .doc(friendId)
          .collection('gifts')
          .add({
            fromName: this.myProfile.name,
            fromId: this.myProfile.id,
            item: chosenGift.name,
            coins: chosenGift.coins,
            hunger: chosenGift.hunger,
            thirst: chosenGift.thirst,
            sentAt: firebase.firestore.FieldValue.serverTimestamp()
          });

        this.showAlert(`Berhasil mengirim ${chosenGift.name} ke ${friend.name} lewat Firebase!`, 'success');
      } catch (err) {
        console.error('Firebase send gift error:', err);
        this.showAlert(`Gagal kirim via Firebase, hadiah terkirim lokal!`, 'warning');
      }
    } else {
      this.showAlert(`Berhasil mengirim bingkisan ${chosenGift.name} ke ${friend.name}!`, 'success');
    }

    if (window.soundEngine) {
      window.soundEngine.playCoin();
    }
  }

  claimAllGifts() {
    if (!this.pendingGifts || this.pendingGifts.length === 0) return;

    let totalCoins = 0;
    let totalHunger = 0;
    let totalThirst = 0;

    this.pendingGifts.forEach(g => {
      totalCoins += (g.coins || 15);
      totalHunger += (g.hunger || 15);
      totalThirst += (g.thirst || 15);
    });

    if (this.game) {
      this.game.stats.coins += totalCoins;
      this.game.stats.hunger = Math.min(100, this.game.stats.hunger + totalHunger);
      this.game.stats.thirst = Math.min(100, this.game.stats.thirst + totalThirst);
      this.game.stats.sanity = Math.min(100, this.game.stats.sanity + 15);
      this.game.updateHUD();
      this.game.showSpeech(`Menerima kiriman Takjil Sahur dari sahabat! (+${totalCoins} Koin)`, 2500);
    }

    const count = this.pendingGifts.length;
    this.pendingGifts = [];
    this.saveFriendsData();

    if (this.isFirebaseActive && this.firestoreDb) {
      // Clear claimed gifts in Firestore
      this.firestoreDb
        .collection('tung_players')
        .doc(this.myProfile.id)
        .collection('gifts')
        .get()
        .then(snapshot => {
          snapshot.forEach(doc => doc.ref.delete());
        })
        .catch(e => console.warn('Error clearing gifts in Firestore:', e));
    }

    this.renderFriendsList();
    this.updateBadge();
    this.showAlert(`Alhamdulillah! Berhasil mengklaim ${count} bingkisan takjil (+${totalCoins} Koin Sahur)!`, 'success');

    if (window.soundEngine) {
      window.soundEngine.playSahurRhythm();
    }
  }

  // ----------------------------------------------------
  // VISITING FRIEND'S ROOM (BERTAMU)
  // ----------------------------------------------------
  visitFriend(friendId) {
    const friend = this.friends.find(f => f.id === friendId);
    if (!friend) return;

    this.activeVisitingFriend = friend;

    // Close friends modal
    const modal = document.getElementById('modal-friends');
    if (modal) modal.classList.remove('active');

    // Switch view to friend's room
    const banner = document.getElementById('visiting-banner');
    const friendNameTag = document.getElementById('visiting-friend-name');
    const petTag = document.getElementById('visiting-pet-tag');

    if (banner) banner.style.display = 'flex';
    if (friendNameTag) friendNameTag.textContent = friend.name;
    if (petTag) petTag.textContent = `${friend.petName} (${friend.id})`;

    // Temporarily apply friend's mood to character
    if (this.game) {
      this.game.isVisiting = true;
      this.game.visitingFriend = friend;
      this.game.character.setMood(friend.mood || 'happy');
      this.game.showSpeech(`Selamat bertamu di bilik ${friend.name}! TUNG TUNG TUNG!`, 3000);

      // Render custom shelf tray for visiting actions
      this.renderVisitingShelf();
    }

    if (window.soundEngine) {
      window.soundEngine.playTung(1.1);
    }
  }

  leaveFriendRoom() {
    this.activeVisitingFriend = null;

    const banner = document.getElementById('visiting-banner');
    if (banner) banner.style.display = 'none';

    if (this.game) {
      this.game.isVisiting = false;
      this.game.visitingFriend = null;
      this.game.evaluateMood();
      this.game.renderShelf();
      this.game.updateHUD();
      this.game.showSpeech('Kembali ke bilik sendiri di Level 0...', 2000);
    }

    if (window.soundEngine) {
      window.soundEngine.playTung(0.9);
    }
  }

  renderVisitingShelf() {
    if (!this.game) return;
    const tray = this.game.shelfTray;
    if (!tray) return;

    tray.innerHTML = `
      <div class="visiting-actions-tray">
        <button id="btn-visit-feed" class="shelf-item-card visiting-tool-card" title="Suapi Makanan Sahur (+15 Koin)">
          <div class="item-icon-box">🥣</div>
          <div class="item-label">Suapi Sahur</div>
          <div class="item-price" style="color:#22c55e;">+15 Koin</div>
        </button>

        <button id="btn-visit-drink" class="shelf-item-card visiting-tool-card" title="Beri Air Mineral (+10 Koin)">
          <div class="item-icon-box">💧</div>
          <div class="item-label">Beri Minum</div>
          <div class="item-price" style="color:#22c55e;">+10 Koin</div>
        </button>

        <button id="btn-visit-pet" class="shelf-item-card visiting-tool-card" title="Beri Belaian Sahur (+5 Koin)">
          <div class="item-icon-box">👋</div>
          <div class="item-label">Sapa & Usap</div>
          <div class="item-price" style="color:#22c55e;">+5 Koin</div>
        </button>

        <button id="btn-visit-leave" class="shelf-item-card visiting-tool-card" style="border-color:#ef4444;" title="Kembali ke Kamar">
          <div class="item-icon-box">🏠</div>
          <div class="item-label">Pulang</div>
          <div class="item-price" style="color:#ef4444;">Kembali</div>
        </button>
      </div>
    `;

    document.getElementById('btn-visit-feed').addEventListener('click', () => {
      this.interactVisitingFriend('feed');
    });

    document.getElementById('btn-visit-drink').addEventListener('click', () => {
      this.interactVisitingFriend('drink');
    });

    document.getElementById('btn-visit-pet').addEventListener('click', () => {
      this.interactVisitingFriend('pet');
    });

    document.getElementById('btn-visit-leave').addEventListener('click', () => {
      this.leaveFriendRoom();
    });
  }

  interactVisitingFriend(type) {
    if (!this.activeVisitingFriend || !this.game) return;
    const friend = this.activeVisitingFriend;

    if (type === 'feed') {
      this.game.stats.coins += 15;
      friend.stats.hunger = Math.min(100, (friend.stats.hunger || 50) + 20);
      this.game.character.setMood('happy');
      this.game.showSpeech(`Nyam nyam! ${friend.petName} senang kamu suapi kurma! (+15 Koin)`, 2500);
      if (window.soundEngine) {
        window.soundEngine.playChomp();
        window.soundEngine.playCoin();
      }
    } else if (type === 'drink') {
      this.game.stats.coins += 10;
      friend.stats.thirst = Math.min(100, (friend.stats.thirst || 50) + 20);
      this.game.character.setMood('happy');
      this.game.showSpeech(`Gluk gluk! Segarnya air sahur pemberianmu! (+10 Koin)`, 2500);
      if (window.soundEngine) {
        window.soundEngine.playGulp();
        window.soundEngine.playCoin();
      }
    } else if (type === 'pet') {
      this.game.stats.coins += 5;
      friend.stats.sanity = Math.min(100, (friend.stats.sanity || 50) + 10);
      this.game.character.setMood('happy');
      this.game.character.beatKentongan();
      this.game.showSpeech(`TUNG! TUNG! TUNG! ${friend.petName} bergoyang sahur gembira! (+5 Koin)`, 2500);
      if (window.soundEngine) {
        window.soundEngine.playTung(1.2);
        window.soundEngine.playCoin();
      }
    }

    this.game.updateHUD();
    this.saveFriendsData();
  }

  // ----------------------------------------------------
  // FIREBASE INITIALIZATION & SYNC
  // ----------------------------------------------------
  loadFirebaseConfig() {
    try {
      const savedConfig = localStorage.getItem(this.fbConfigKey);
      if (savedConfig) {
        this.firebaseConfig = JSON.parse(savedConfig);
        this.initFirebase(this.firebaseConfig);
      }
    } catch (e) {
      console.warn('Error loading Firebase config:', e);
    }
  }

  async saveFirebaseConfig(configString) {
    if (!configString || !configString.trim()) {
      this.showAlert('Tempel konfigurasi JSON Firebase terlebih dahulu!', 'error');
      return;
    }

    try {
      const config = JSON.parse(configString);
      if (!config.apiKey || !config.projectId) {
        throw new Error('Konfigurasi Firebase harus memiliki apiKey dan projectId!');
      }

      this.firebaseConfig = config;
      localStorage.setItem(this.fbConfigKey, JSON.stringify(config));
      await this.initFirebase(config);
      this.showAlert('Firebase berhasil dihubungkan! Mode Global aktif! 🔥', 'success');
      this.renderFirebaseTab();
    } catch (e) {
      console.error('Firebase config error:', e);
      this.showAlert(`Gagal membaca konfigurasi Firebase: ${e.message}`, 'error');
    }
  }

  resetFirebaseConfig() {
    localStorage.removeItem(this.fbConfigKey);
    this.firebaseConfig = null;
    this.isFirebaseActive = false;
    this.firestoreDb = null;
    if (this.unsubscribeGifts) {
      this.unsubscribeGifts();
      this.unsubscribeGifts = null;
    }
    this.showAlert('Firebase telah direset ke Mode Local Storage.', 'info');
    this.renderFirebaseTab();
  }

  async initFirebase(config) {
    try {
      // Check if Firebase SDK is present in window
      if (typeof firebase === 'undefined') {
        // Dynamically load Firebase SDK scripts
        await this.loadFirebaseSDK();
      }

      if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
          this.firebaseApp = firebase.initializeApp(config);
        } else {
          this.firebaseApp = firebase.app();
        }
        this.firestoreDb = firebase.firestore();
        this.isFirebaseActive = true;
        this.setupFirebaseListeners();
        this.syncMyLiveStats();
        console.log('Firebase Firestore Global initialized successfully!');
      }
    } catch (err) {
      console.error('Error initializing Firebase:', err);
      this.isFirebaseActive = false;
    }
    this.renderFirebaseTab();
  }

  loadFirebaseSDK() {
    return new Promise((resolve, reject) => {
      if (typeof firebase !== 'undefined') return resolve();

      const appScript = document.createElement('script');
      appScript.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js';
      appScript.onload = () => {
        const firestoreScript = document.createElement('script');
        firestoreScript.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js';
        firestoreScript.onload = () => resolve();
        firestoreScript.onerror = reject;
        document.head.appendChild(firestoreScript);
      };
      appScript.onerror = reject;
      document.head.appendChild(appScript);
    });
  }

  setupFirebaseListeners() {
    if (!this.isFirebaseActive || !this.firestoreDb) return;

    try {
      // Real-time listener for incoming gifts
      this.unsubscribeGifts = this.firestoreDb
        .collection('tung_players')
        .doc(this.myProfile.id)
        .collection('gifts')
        .onSnapshot((snapshot) => {
          let hasNewGifts = false;
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              this.pendingGifts.unshift({
                id: change.doc.id,
                fromName: data.fromName || 'Sahabat Backrooms',
                fromId: data.fromId || 'UNKNOWN',
                item: data.item || 'Takjil Sahur',
                coins: data.coins || 15,
                hunger: data.hunger || 20,
                thirst: data.thirst || 20,
                time: 'Baru saja'
              });
              hasNewGifts = true;
            }
          });

          if (hasNewGifts) {
            this.saveFriendsData();
            this.renderFriendsList();
            this.updateBadge();
            if (window.soundEngine) window.soundEngine.playCoin();
          }
        });
    } catch (err) {
      console.warn('Firebase gifts listener error:', err);
    }
  }

  syncMyLiveStats() {
    if (!this.game) return;

    // Update days survived
    const days = Math.floor((Date.now() - (this.myProfile.createdAt || Date.now())) / (1000 * 60 * 60 * 24)) + 1;
    this.myProfile.daysSurvived = days;

    const myCurrentData = {
      id: this.myProfile.id,
      name: this.myProfile.name,
      petName: this.myProfile.petName,
      daysSurvived: days,
      mood: this.game.character ? this.game.character.mood : 'happy',
      stats: {
        hunger: Math.round(this.game.stats.hunger),
        thirst: Math.round(this.game.stats.thirst),
        hygiene: Math.round(this.game.stats.hygiene),
        energy: Math.round(this.game.stats.energy),
        sanity: Math.round(this.game.stats.sanity),
        coins: this.game.stats.coins
      },
      lastSeenDate: new Date().toISOString()
    };

    if (this.isFirebaseActive && this.firestoreDb) {
      try {
        this.firestoreDb
          .collection('tung_players')
          .doc(this.myProfile.id)
          .set(
            {
              ...myCurrentData,
              lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            },
            { merge: true }
          )
          .catch(e => console.warn('Firestore sync error:', e));
      } catch (err) {
        console.warn('Error pushing profile to Firestore:', err);
      }
    }
  }

  checkAutoSyncProfile() {
    this.syncMyLiveStats();
  }

  // ----------------------------------------------------
  // DOM INITIALIZATION & UI EVENTS
  // ----------------------------------------------------
  initDOM() {
    this.modal = document.getElementById('modal-friends');
    this.openBtn = document.getElementById('btn-friends-toggle');
    this.closeBtn = document.getElementById('btn-close-friends');
    this.badgeEl = document.getElementById('friends-badge');
    this.tabBadgeEl = document.getElementById('tab-friend-count-badge');
    this.alertBox = document.getElementById('friend-alert-box');

    // Tab buttons & contents
    this.tabBtns = document.querySelectorAll('.friend-tab-btn');
    this.tabContents = document.querySelectorAll('.friend-tab-content');

    // List containers
    this.friendsListEl = document.getElementById('friends-list-container');
    this.discoverListEl = document.getElementById('discover-list-container');
    this.pendingGiftsBar = document.getElementById('pending-gifts-bar');
    this.claimGiftsBtn = document.getElementById('btn-claim-gifts');

    // Add friend controls
    this.inputCode = document.getElementById('input-friend-code');
    this.submitAddBtn = document.getElementById('btn-submit-add-friend');
    this.refreshDiscoverBtn = document.getElementById('btn-refresh-discover');

    // Profile controls
    this.myCodeVal = document.getElementById('my-friend-code-val');
    this.copyCodeBtn = document.getElementById('btn-copy-friend-code');
    this.copyFeedback = document.getElementById('copy-feedback-text');
    this.inputProfileName = document.getElementById('my-profile-name-input');
    this.inputPetName = document.getElementById('my-pet-name-input');
    this.saveProfileBtn = document.getElementById('btn-save-profile');

    // Firebase controls
    this.fbStatusIndicator = document.getElementById('firebase-status-indicator');
    this.fbStatusBox = document.getElementById('firebase-connection-status-box');
    this.fbStatusIcon = document.getElementById('fb-status-icon');
    this.fbStatusText = document.getElementById('fb-status-text');
    this.fbConfigTextarea = document.getElementById('firebase-config-json');
    this.fbSaveBtn = document.getElementById('btn-save-firebase-config');
    this.fbResetBtn = document.getElementById('btn-reset-firebase');

    // Visiting room banner
    this.leaveRoomBtn = document.getElementById('btn-leave-friend-room');
  }

  setupEvents() {
    // Open modal
    if (this.openBtn) {
      this.openBtn.addEventListener('click', () => {
        this.openModal();
      });
    }

    // Close modal
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => {
        this.closeModal();
      });
    }

    // Tab switching
    this.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-tab');
        this.switchTab(targetId);
      });
    });

    // Add Friend
    if (this.submitAddBtn) {
      this.submitAddBtn.addEventListener('click', () => {
        const code = this.inputCode.value;
        if (code) {
          this.addFriendByCode(code).then(success => {
            if (success) {
              this.inputCode.value = '';
              this.switchTab('tab-friend-list');
            }
          });
        }
      });

      this.inputCode.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.submitAddBtn.click();
        }
      });
    }

    // Search Friends in List
    const searchInput = document.getElementById('friend-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.renderFriendsList(e.target.value);
      });
    }

    // Refresh Discover Wanderers
    if (this.refreshDiscoverBtn) {
      this.refreshDiscoverBtn.addEventListener('click', () => {
        this.randomizeDiscoverList();
      });
    }

    // Copy Friend Code
    if (this.copyCodeBtn) {
      this.copyCodeBtn.addEventListener('click', () => {
        this.copyMyCode();
      });
    }

    // Save Profile
    if (this.saveProfileBtn) {
      this.saveProfileBtn.addEventListener('click', () => {
        this.updateProfile(this.inputProfileName.value, this.inputPetName.value);
        this.renderProfileTab();
      });
    }

    // Claim Gifts
    if (this.claimGiftsBtn) {
      this.claimGiftsBtn.addEventListener('click', () => {
        this.claimAllGifts();
      });
    }

    // Firebase Save / Reset
    if (this.fbSaveBtn) {
      this.fbSaveBtn.addEventListener('click', () => {
        this.saveFirebaseConfig(this.fbConfigTextarea.value);
      });
    }

    if (this.fbResetBtn) {
      this.fbResetBtn.addEventListener('click', () => {
        this.resetFirebaseConfig();
      });
    }

    // Leave Friend Room Banner
    if (this.leaveRoomBtn) {
      this.leaveRoomBtn.addEventListener('click', () => {
        this.leaveFriendRoom();
      });
    }
  }

  openModal() {
    if (!this.modal) return;
    this.modal.classList.add('active');
    this.renderFriendsList();
    this.renderProfileTab();
    this.renderFirebaseTab();

    if (window.soundEngine) {
      window.soundEngine.playTung(1.05);
    }
  }

  closeModal() {
    if (!this.modal) return;
    this.modal.classList.remove('active');
  }

  switchTab(targetTabId) {
    this.tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === targetTabId);
    });

    this.tabContents.forEach(content => {
      content.classList.toggle('active', content.id === targetTabId);
    });

    if (targetTabId === 'tab-friend-list') {
      this.renderFriendsList();
    } else if (targetTabId === 'tab-my-profile') {
      this.renderProfileTab();
    } else if (targetTabId === 'tab-firebase-sync') {
      this.renderFirebaseTab();
    }
  }

  // ----------------------------------------------------
  // RENDERING UI
  // ----------------------------------------------------
  renderFriendsList(filterQuery = '') {
    if (!this.friendsListEl) return;
    this.friendsListEl.innerHTML = '';

    // Render gifts bar
    if (this.pendingGiftsBar) {
      if (this.pendingGifts && this.pendingGifts.length > 0) {
        this.pendingGiftsBar.style.display = 'flex';
        const msgEl = document.getElementById('gift-message-text');
        if (msgEl) {
          msgEl.textContent = `Ada ${this.pendingGifts.length} kiriman Takjil Sahur menunggumu!`;
        }
      } else {
        this.pendingGiftsBar.style.display = 'none';
      }
    }

    const query = filterQuery.toLowerCase().trim();
    const filtered = this.friends.filter(f =>
      f.name.toLowerCase().includes(query) ||
      f.id.toLowerCase().includes(query) ||
      (f.petName && f.petName.toLowerCase().includes(query))
    );

    if (filtered.length === 0) {
      this.friendsListEl.innerHTML = `
        <div class="empty-friends-box">
          <div style="font-size: 2.8rem; margin-bottom: 8px;">🚪👥</div>
          <h4 style="color: #fef08a; margin-bottom: 4px;">Belum Ada Sahabat</h4>
          <p style="font-size: 0.88rem; color: #a1a1aa; max-width: 320px; margin: 0 auto 14px auto;">
            Jelajahi Level 0 bersama teman! Bagikan ID Sahabatmu atau tambahkan penjelajah baru di tab Tambah Teman.
          </p>
          <button class="action-btn-secondary" onclick="window.friendManager.switchTab('tab-add-friend')">
            + Tambah Teman Sekarang
          </button>
        </div>
      `;
      return;
    }

    filtered.forEach(friend => {
      const card = document.createElement('div');
      card.className = 'friend-card';

      // Mood emoji badge
      const moodEmojis = {
        happy: '😊',
        neutral: '😐',
        sad: '🥺',
        crying: '😭',
        angry: '😡',
        pooping: '💩',
        sleeping: '😴',
        sick: '🤒'
      };
      const moodEmoji = moodEmojis[friend.mood] || '😊';

      card.innerHTML = `
        <div class="friend-avatar-wrap">
          <div class="friend-avatar">
            <svg viewBox="0 0 64 64" width="100%" height="100%">
              <ellipse cx="32" cy="36" rx="24" ry="22" fill="#854d0e"/>
              <ellipse cx="32" cy="34" rx="22" ry="20" fill="#a16207"/>
              <circle cx="26" cy="30" r="3.5" fill="#fef08a"/>
              <circle cx="38" cy="30" r="3.5" fill="#fef08a"/>
              <circle cx="26" cy="30" r="1.5" fill="#1c1917"/>
              <circle cx="38" cy="30" r="1.5" fill="#1c1917"/>
              <path d="M28 40 Q32 44 36 40" stroke="#fef08a" stroke-width="2" fill="none"/>
            </svg>
            <span class="friend-mood-indicator">${moodEmoji}</span>
          </div>
          <span class="friend-status-dot ${friend.isOnline ? 'online' : 'offline'}" title="${friend.isOnline ? 'Online' : 'Offline'}"></span>
        </div>

        <div class="friend-info">
          <div class="friend-name-row">
            <span class="friend-name">${friend.name}</span>
            <span class="friend-id-pill">${friend.id}</span>
          </div>
          <div class="friend-pet-desc">
            Peliharaan: <b>${friend.petName || 'Tungtung'}</b>
          </div>
          <div class="friend-status-line">
            ${friend.status || 'Sedang mengitari lorong Backrooms'}
          </div>
        </div>

        <div class="friend-actions">
          <button class="btn-action-visit" title="Kunjungi Kamar Sahabat" data-id="${friend.id}">
            🚪 Kunjungi
          </button>
          <button class="btn-action-gift" title="Kirim Takjil Sahur (5 Koin)" data-id="${friend.id}">
            🎁 Takjil
          </button>
          <button class="btn-action-delete" title="Hapus Sahabat" data-id="${friend.id}">
            🗑️
          </button>
        </div>
      `;

      card.querySelector('.btn-action-visit').addEventListener('click', () => {
        this.visitFriend(friend.id);
      });

      card.querySelector('.btn-action-gift').addEventListener('click', () => {
        this.sendGift(friend.id);
      });

      card.querySelector('.btn-action-delete').addEventListener('click', () => {
        this.removeFriend(friend.id);
      });

      this.friendsListEl.appendChild(card);
    });

    this.updateBadge();
  }

  renderDiscoverList() {
    if (!this.discoverListEl) return;
    this.discoverListEl.innerHTML = '';

    this.discoverList.forEach(wanderer => {
      const item = document.createElement('div');
      item.className = 'discover-card';
      const isAlreadyFriend = this.friends.some(f => f.id === wanderer.id);

      item.innerHTML = `
        <div class="discover-top">
          <div class="discover-avatar">🪵</div>
          <div class="discover-meta">
            <span class="discover-name">${wanderer.name}</span>
            <span class="discover-code">${wanderer.id}</span>
          </div>
        </div>
        <p class="discover-desc">${wanderer.desc}</p>
        <button class="btn-quick-add ${isAlreadyFriend ? 'added' : ''}" data-id="${wanderer.id}">
          ${isAlreadyFriend ? '✓ Berteman' : '+ Tambah'}
        </button>
      `;

      const btn = item.querySelector('.btn-quick-add');
      if (!isAlreadyFriend) {
        btn.addEventListener('click', () => {
          this.addFriendByCode(wanderer.id);
          this.renderDiscoverList();
        });
      }

      this.discoverListEl.appendChild(item);
    });
  }

  randomizeDiscoverList() {
    const randomWanderers = [
      { id: `SAHUR-${Math.floor(1000 + Math.random() * 9000)}`, name: 'Penjelajah Pipa Neon', petName: 'Tung Neon', mood: 'happy', desc: 'Suka berlari di lorong Backrooms' },
      { id: `SAHUR-${Math.floor(1000 + Math.random() * 9000)}`, name: 'Pencari Kolam Karpet', petName: 'Tung Basah', mood: 'neutral', desc: 'Menghindari genangan cairan aneh Level 0' },
      { id: `SAHUR-${Math.floor(1000 + Math.random() * 9000)}`, name: 'Pendengar Dengung Neon', petName: 'Tung Dengung', mood: 'sleeping', desc: 'Tertidur diiringi dengungan lampu fluoresens' },
      { id: `SAHUR-${Math.floor(1000 + Math.random() * 9000)}`, name: 'Ahli Kentongan Sahur', petName: 'Tung Tabuh', mood: 'happy', desc: 'Menabuh kayu sahur secepat kilat' }
    ];
    this.discoverList = randomWanderers;
    this.renderDiscoverList();
    this.showAlert('Daftar penjelajah rekomendasi diperbarui!', 'info');
  }

  renderProfileTab() {
    if (this.myCodeVal) this.myCodeVal.textContent = this.myProfile.id;
    if (this.inputProfileName) this.inputProfileName.value = this.myProfile.name;
    if (this.inputPetName) this.inputPetName.value = this.myProfile.petName;

    // Update pet chips
    const chipMood = document.getElementById('chip-mood');
    const chipHunger = document.getElementById('chip-hunger');
    const chipThirst = document.getElementById('chip-thirst');
    const chipHygiene = document.getElementById('chip-hygiene');
    const chipDays = document.getElementById('chip-days');

    if (this.game) {
      if (chipMood) chipMood.textContent = `Emosi: ${this.game.character ? this.game.character.mood.toUpperCase() : 'NORMAL'}`;
      if (chipHunger) chipHunger.textContent = `🍗 Lapar: ${Math.round(this.game.stats.hunger)}%`;
      if (chipThirst) chipThirst.textContent = `💧 Haus: ${Math.round(this.game.stats.thirst)}%`;
      if (chipHygiene) chipHygiene.textContent = `🧼 Bersih: ${Math.round(this.game.stats.hygiene)}%`;
      if (chipDays) chipDays.textContent = `Hari Bertahan: Hari ${this.myProfile.daysSurvived || 1} 🚪`;
    }
  }

  renderFirebaseTab() {
    if (this.fbStatusIndicator) {
      this.fbStatusIndicator.className = `firebase-status-dot ${this.isFirebaseActive ? 'online' : 'offline'}`;
    }

    if (this.fbStatusIcon && this.fbStatusText) {
      if (this.isFirebaseActive) {
        this.fbStatusIcon.textContent = '🟢';
        this.fbStatusText.innerHTML = `Status: <b style="color:#22c55e;">Terhubung ke Firebase Global (Project: ${this.firebaseConfig ? this.firebaseConfig.projectId : 'Aktif'})</b>`;
      } else {
        this.fbStatusIcon.textContent = '⚪';
        this.fbStatusText.innerHTML = `Status: <b style="color:#ca8a04;">Mode Local Storage (Offline & Siap Dihubungkan)</b>`;
      }
    }

    if (this.fbConfigTextarea && this.firebaseConfig) {
      this.fbConfigTextarea.value = JSON.stringify(this.firebaseConfig, null, 2);
    }
  }

  updateBadge() {
    const count = this.friends.length;
    const giftsCount = this.pendingGifts ? this.pendingGifts.length : 0;

    if (this.badgeEl) {
      this.badgeEl.textContent = count + (giftsCount > 0 ? ` (+${giftsCount}🎁)` : '');
      this.badgeEl.style.display = count > 0 || giftsCount > 0 ? 'inline-block' : 'none';
    }

    if (this.tabBadgeEl) {
      this.tabBadgeEl.textContent = count;
    }
  }

  copyMyCode() {
    if (!this.myProfile.id) return;
    const textToCopy = this.myProfile.id;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        this.showCopyFeedback();
      }).catch(() => {
        this.fallbackCopyText(textToCopy);
      });
    } else {
      this.fallbackCopyText(textToCopy);
    }
  }

  fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      this.showCopyFeedback();
    } catch (err) {
      console.warn('Copy failed:', err);
    }
    document.body.removeChild(textArea);
  }

  showCopyFeedback() {
    if (this.copyFeedback) {
      this.copyFeedback.classList.add('visible');
      setTimeout(() => {
        this.copyFeedback.classList.remove('visible');
      }, 2000);
    }
    this.showAlert(`ID Sahabat (${this.myProfile.id}) disalin ke clipboard!`, 'success');
    if (window.soundEngine) window.soundEngine.playCoin();
  }

  showAlert(msg, type = 'info') {
    if (!this.alertBox) return;
    this.alertBox.textContent = msg;
    this.alertBox.className = `friend-alert-box alert-${type}`;
    this.alertBox.style.display = 'block';

    setTimeout(() => {
      if (this.alertBox) this.alertBox.style.display = 'none';
    }, 3500);
  }
}

// Global instance
window.friendManager = new FriendManager();
