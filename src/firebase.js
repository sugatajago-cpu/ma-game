/**
 * Tungtungtung Sahur in The Backrooms - Firebase Cloud Service
 * Handles full cloud synchronization for player stats, inventory, poop state,
 * friends system, takjil gift inbox, and arcade leaderboard.
 * 
 * Project: best-game-cfbfe
 */

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyC9QAf7_HBHwom5XBH8mdPt6a3uYgSUlBE",
  authDomain: "best-game-cfbfe.firebaseapp.com",
  projectId: "best-game-cfbfe",
  storageBucket: "best-game-cfbfe.firebasestorage.app",
  messagingSenderId: "560046168213",
  appId: "1:560046168213:web:db71ff97990797ae7fe39c",
  measurementId: "G-LHC7NB0KWS"
};

class FirebaseService {
  constructor() {
    this.config = DEFAULT_FIREBASE_CONFIG;
    this.app = null;
    this.analytics = null;
    this.db = null;
    this.isInitialized = false;
    this.isOnline = navigator.onLine;
    this.syncStatus = 'idle'; // 'idle', 'syncing', 'synced', 'error'
    this.lastSyncedAt = null;
    this.lastError = null;
    this.subscribers = [];
    this.activeGiftsUnsubscribe = null;
    this.saveTimeout = null;
    this.pendingSaveData = null;

    // Listen to network status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifySubscribers();
      if (this.pendingSaveData) {
        this.flushPendingSave();
      }
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifySubscribers();
    });

    this.init();
  }

  // Subscribe to status changes (e.g. for HUD icons)
  onStatusChange(callback) {
    if (typeof callback === 'function') {
      this.subscribers.push(callback);
      callback(this.getStatus());
    }
  }

  notifySubscribers() {
    const status = this.getStatus();
    this.subscribers.forEach(cb => {
      try {
        cb(status);
      } catch (e) {
        console.warn('Firebase status callback error:', e);
      }
    });
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isOnline: this.isOnline,
      syncStatus: this.syncStatus,
      lastSyncedAt: this.lastSyncedAt,
      projectId: this.config ? this.config.projectId : null,
      error: this.lastError
    };
  }

  // Initialize Firebase App, Firestore, and Analytics
  init(customConfig = null) {
    try {
      if (customConfig) {
        this.config = customConfig;
      } else {
        // Check localStorage for saved custom config override
        try {
          const saved = localStorage.getItem('tung_sahur_fb_config');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.projectId) {
              this.config = Object.assign({}, DEFAULT_FIREBASE_CONFIG, parsed);
            }
          }
        } catch (e) {
          // ignore
        }
      }

      if (typeof firebase === 'undefined') {
        console.warn('Firebase SDK not yet loaded. Will retry once scripts finish loading.');
        return false;
      }

      // Initialize App
      if (!firebase.apps || !firebase.apps.length) {
        this.app = firebase.initializeApp(this.config);
      } else {
        this.app = firebase.app();
      }

      // Initialize Firestore
      this.db = firebase.firestore();

      // Enable persistence if available
      try {
        this.db.enablePersistence({ synchronizeTabs: true }).catch(err => {
          if (err.code === 'failed-precondition') {
            // Multiple tabs open, persistence can only be enabled in one tab at a time.
            console.info('Firestore offline persistence: multiple tabs open.');
          } else if (err.code === 'unimplemented') {
            // Browser doesn't support persistence
            console.info('Firestore offline persistence not supported in this browser.');
          }
        });
      } catch (err) {
        // ignore persistence init error
      }

      // Initialize Analytics if supported
      try {
        if (typeof firebase.analytics === 'function') {
          this.analytics = firebase.analytics();
          this.logEvent('app_open', { app_name: 'tungtung_sahur_backrooms' });
        }
      } catch (analyticsErr) {
        console.warn('Analytics init warning:', analyticsErr);
      }

      this.isInitialized = true;
      this.syncStatus = 'synced';
      this.notifySubscribers();
      console.log(`🔥 Firebase Global connected successfully to project [${this.config.projectId}]!`);
      return true;
    } catch (err) {
      console.error('Firebase initialization error:', err);
      this.isInitialized = false;
      this.syncStatus = 'error';
      this.lastError = err.message || 'Gagal menginisialisasi Firebase';
      this.notifySubscribers();
      return false;
    }
  }

  // Log Analytics events
  logEvent(eventName, params = {}) {
    try {
      if (this.analytics) {
        this.analytics.logEvent(eventName, params);
      }
    } catch (e) {
      // ignore
    }
  }

  // ----------------------------------------------------------------
  // COMPREHENSIVE CLOUD SAVE (Player Profile, Virtual Pet, Poop, Room)
  // ----------------------------------------------------------------
  saveAllPlayerData(playerId, data, immediate = false) {
    if (!playerId) return Promise.resolve(false);

    this.pendingSaveData = { playerId, data };
    this.syncStatus = 'syncing';
    this.notifySubscribers();

    if (immediate) {
      return this.flushPendingSave();
    }

    // Debounce rapid saves (e.g., ticking stats)
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    return new Promise(resolve => {
      this.saveTimeout = setTimeout(async () => {
        const result = await this.flushPendingSave();
        resolve(result);
      }, 1200);
    });
  }

  async flushPendingSave() {
    if (!this.pendingSaveData) return true;
    const { playerId, data } = this.pendingSaveData;
    this.pendingSaveData = null;

    if (!this.isInitialized || !this.db) {
      // Local fallback still intact
      this.syncStatus = 'idle';
      this.notifySubscribers();
      return false;
    }

    try {
      this.syncStatus = 'syncing';
      this.notifySubscribers();

      const docRef = this.db.collection('tung_players').doc(playerId);

      const payload = {
        id: playerId,
        name: data.profile ? data.profile.name : 'Penjelajah Sahur',
        petName: data.profile ? data.profile.petName : 'Tungtung Sahur',
        daysSurvived: data.profile ? (data.profile.daysSurvived || 1) : 1,
        createdAt: data.profile ? (data.profile.createdAt || Date.now()) : Date.now(),
        mood: data.mood || 'happy',
        currentRoom: data.currentRoom || 'hallway',
        isDead: Boolean(data.isDead),
        isSick: Boolean(data.isSick),
        isSleeping: Boolean(data.isSleeping),
        stats: {
          hunger: Math.round(data.stats ? data.stats.hunger : 80),
          thirst: Math.round(data.stats ? data.stats.thirst : 75),
          hygiene: Math.round(data.stats ? data.stats.hygiene : 90),
          energy: Math.round(data.stats ? data.stats.energy : 85),
          sanity: Math.round(data.stats ? data.stats.sanity : 80),
          coins: Number(data.stats ? data.stats.coins : 60),
          playerHp: Number(data.stats ? data.stats.playerHp : 100)
        },
        poopList: Array.isArray(data.poopList) ? data.poopList : [],
        friendsCount: Array.isArray(data.friends) ? data.friends.length : 0,
        highScore: Number(data.highScore || 0),
        lastSeenDate: new Date().toISOString(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      // If friends list is included, save it too
      if (Array.isArray(data.friends)) {
        payload.friendsList = data.friends.map(f => ({
          id: f.id,
          name: f.name,
          petName: f.petName,
          status: f.status || 'Sahabat Backrooms',
          mood: f.mood || 'happy'
        }));
      }

      await docRef.set(payload, { merge: true });

      this.syncStatus = 'synced';
      this.lastSyncedAt = new Date();
      this.lastError = null;
      this.notifySubscribers();
      return true;
    } catch (err) {
      console.warn('Firebase save warning (data saved locally):', err);
      this.syncStatus = 'error';
      this.lastError = err.message || 'Gagal menyimpan ke Firebase';
      this.notifySubscribers();
      return false;
    }
  }

  // ----------------------------------------------------------------
  // CLOUD LOAD (Retrieve state from Cloud Firestore)
  // ----------------------------------------------------------------
  async loadPlayerData(playerId) {
    if (!playerId || !this.isInitialized || !this.db) {
      return null;
    }

    try {
      this.syncStatus = 'syncing';
      this.notifySubscribers();

      const docSnap = await this.db.collection('tung_players').doc(playerId).get();
      if (!docSnap.exists) {
        this.syncStatus = 'synced';
        this.notifySubscribers();
        return null;
      }

      const cloudData = docSnap.data();
      this.syncStatus = 'synced';
      this.lastSyncedAt = new Date();
      this.notifySubscribers();
      return cloudData;
    } catch (err) {
      console.warn('Firebase load error:', err);
      this.syncStatus = 'error';
      this.lastError = err.message;
      this.notifySubscribers();
      return null;
    }
  }

  // ----------------------------------------------------------------
  // SEARCH / FETCH OTHER PLAYERS (For Adding Friends & Visiting)
  // ----------------------------------------------------------------
  async searchPlayer(code) {
    if (!code || !this.isInitialized || !this.db) {
      return null;
    }

    try {
      const formattedCode = code.trim().toUpperCase();
      const docSnap = await this.db.collection('tung_players').doc(formattedCode).get();
      if (docSnap.exists) {
        return docSnap.data();
      }
      return null;
    } catch (err) {
      console.warn('Firebase search player error:', err);
      return null;
    }
  }

  // Interact with friend's pet in cloud when visiting
  async interactWithFriendPet(friendId, interactionType) {
    if (!friendId || !this.isInitialized || !this.db) return false;

    try {
      const docRef = this.db.collection('tung_players').doc(friendId);
      const updates = {};

      if (interactionType === 'feed') {
        updates['stats.hunger'] = firebase.firestore.FieldValue.increment(20);
        updates['mood'] = 'happy';
      } else if (interactionType === 'drink') {
        updates['stats.thirst'] = firebase.firestore.FieldValue.increment(20);
        updates['mood'] = 'happy';
      } else if (interactionType === 'pet') {
        updates['stats.sanity'] = firebase.firestore.FieldValue.increment(10);
        updates['mood'] = 'happy';
      }

      updates['lastVisitedAt'] = firebase.firestore.FieldValue.serverTimestamp();
      await docRef.update(updates);
      this.logEvent('friend_pet_interact', { type: interactionType, friend_id: friendId });
      return true;
    } catch (err) {
      console.warn('Firebase update friend pet error:', err);
      return false;
    }
  }

  // ----------------------------------------------------------------
  // GIFTS / TAKJIL EXCHANGE SYSTEM (Real-time Cloud Subcollection)
  // ----------------------------------------------------------------
  async sendGift(recipientId, giftData) {
    if (!recipientId || !this.isInitialized || !this.db) return false;

    try {
      const giftDoc = {
        fromId: giftData.fromId,
        fromName: giftData.fromName,
        item: giftData.item,
        coins: giftData.coins || 15,
        hunger: giftData.hunger || 20,
        thirst: giftData.thirst || 20,
        sentAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await this.db
        .collection('tung_players')
        .doc(recipientId)
        .collection('gifts')
        .add(giftDoc);

      this.logEvent('send_takjil_gift', { item: giftData.item, recipient: recipientId });
      return true;
    } catch (err) {
      console.warn('Firebase send gift error:', err);
      return false;
    }
  }

  listenToIncomingGifts(playerId, onGiftCallback) {
    if (!playerId || !this.isInitialized || !this.db) return null;

    if (this.activeGiftsUnsubscribe) {
      this.activeGiftsUnsubscribe();
      this.activeGiftsUnsubscribe = null;
    }

    try {
      this.activeGiftsUnsubscribe = this.db
        .collection('tung_players')
        .doc(playerId)
        .collection('gifts')
        .onSnapshot(
          snapshot => {
            snapshot.docChanges().forEach(change => {
              if (change.type === 'added') {
                const data = change.doc.data();
                onGiftCallback({
                  id: change.doc.id,
                  ...data
                });
              }
            });
          },
          err => {
            console.warn('Firebase gifts listener warning:', err);
          }
        );

      return this.activeGiftsUnsubscribe;
    } catch (e) {
      console.warn('Error setting up gifts listener:', e);
      return null;
    }
  }

  async clearGifts(playerId) {
    if (!playerId || !this.isInitialized || !this.db) return;

    try {
      const snapshot = await this.db
        .collection('tung_players')
        .doc(playerId)
        .collection('gifts')
        .get();

      const batch = this.db.batch();
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      this.logEvent('claim_all_gifts', { count: snapshot.size });
    } catch (e) {
      console.warn('Error clearing gifts:', e);
    }
  }

  // ----------------------------------------------------------------
  // ARCADE LEADERBOARD SYSTEM (Cloud High Scores)
  // ----------------------------------------------------------------
  async submitLeaderboardScore(playerId, playerName, petName, score, coins) {
    if (!playerId || !this.isInitialized || !this.db) return;

    try {
      const leaderboardRef = this.db.collection('tung_leaderboard').doc(playerId);
      const existing = await leaderboardRef.get();

      if (!existing.exists || (existing.data().score || 0) < score) {
        await leaderboardRef.set({
          playerId: playerId,
          playerName: playerName || 'Penjelajah',
          petName: petName || 'Tungtung',
          score: score,
          coins: coins,
          achievedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        this.logEvent('leaderboard_new_highscore', { score, coins });
      }
    } catch (err) {
      console.warn('Firebase submit leaderboard error:', err);
    }
  }

  async getLeaderboard(limitCount = 10) {
    if (!this.isInitialized || !this.db) return [];

    try {
      const snap = await this.db
        .collection('tung_leaderboard')
        .orderBy('score', 'desc')
        .limit(limitCount)
        .get();

      const list = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      return list;
    } catch (err) {
      console.warn('Firebase fetch leaderboard error:', err);
      return [];
    }
  }
}

// Global Singleton
window.firebaseService = new FirebaseService();
