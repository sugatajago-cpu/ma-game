# 🌐 Panduan Integrasi Firebase Global - Tungtungtung Sahur

Fitur **Sahabat Backrooms (Add Friends & Multiplayer Bertamu)** sudah terpasang dan siap digunakan! Sistem ini dirancang secara modular:
1. **Mode Local Storage (Offline)**: Berjalan otomatis tanpa konfigurasi awal. Dilengkapi simulasi sahabat, hadiah takjil, dan bertamu.
2. **Mode Firebase Global (Online)**: Cukup tempelkan kredensial Firebase Anda ke tab **"🔥 Firebase Global"** di dalam game, maka game langsung terhubung secara global ke seluruh dunia (pemain di laptop/HP lain bisa saling berteman dan bertamu).

---

## 🚀 Langkah 1: Buat Project Firebase (Gratis)
1. Buka [Firebase Console](https://console.firebase.google.com/) dan login dengan akun Google.
2. Klik **Add project** (Tambah project), beri nama project (contoh: `tungtung-sahur-game`), lalu klik **Continue**.
3. Nonaktifkan Google Analytics (opsional), lalu klik **Create project**.

---

## 🗄️ Langkah 2: Aktifkan Cloud Firestore Database
1. Di sidebar kiri Firebase Console, klik **Build** > **Firestore Database**.
2. Klik tombol **Create database**.
3. Pilih lokasi database (contoh: `asia-southeast2` untuk Jakarta atau default).
4. Pada bagian *Security rules*, pilih **Start in test mode** (klik Next > Enable).

---

## 🔒 Langkah 3: Konfigurasi Security Rules Firestore
Di tab **Rules** pada Cloud Firestore, masukkan aturan berikut agar pemain bisa saling membaca status dan mengirim takjil:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Profil pemain dan status Tungtung
    match /tung_players/{playerId} {
      allow read, write: if true;
      
      // Sub-koleksi daftar sahabat
      match /friends/{friendId} {
        allow read, write: if true;
      }
      
      // Sub-koleksi takjil & bingkisan sahur
      match /gifts/{giftId} {
        allow read, write: if true;
      }
    }
  }
}
```
Klik tombol **Publish**.

---

## 🔑 Langkah 4: Dapatkan `firebaseConfig`
1. Klik ikon **Project Settings (⚙️)** di samping *Project Overview* (kiri atas).
2. Di tab *General*, scroll ke bawah ke bagian **Your apps**.
3. Klik ikon Web (**`</>`**).
4. Masukkan nama aplikasi (contoh: `tungtung-web`) lalu klik **Register app**.
5. Salin objek `const firebaseConfig = { ... };`. Contoh formatnya:
   ```json
   {
     "apiKey": "AIzaSyD-xxxxxxxxxxxxxxxxxxxxxxxxx",
     "authDomain": "tungtung-sahur.firebaseapp.com",
     "projectId": "tungtung-sahur",
     "storageBucket": "tungtung-sahur.appspot.com",
     "messagingSenderId": "123456789012",
     "appId": "1:123456789012:web:abcdef123456"
   }
   ```

---

## 🎮 Langkah 5: Aktifkan di Dalam Game
1. Jalankan game dan buka di browser: `http://localhost:3000/` (atau buka `index.html`).
2. Klik tombol **👥 Sahabat** di bar atas game.
3. Buka tab **🔥 Firebase Global**.
4. Tempelkan objek JSON `firebaseConfig` tadi ke kotak teks.
5. Klik **🔥 Sambungkan ke Firebase**.
6. Status akan langsung berubah menjadi: **🟢 Terhubung ke Firebase Global**!

---

## 🌟 Fitur-Fitur yang Langsung Aktif:
* **ID Sahabat Unik**: Setiap pemain mendapat ID otomatis seperti `SAHUR-8821` yang bisa disalin dengan 1 klik.
* **Tambah Teman Real-Time**: Masukkan ID teman di tab *Tambah Teman*, game akan mencari dokumen pemain di Firebase Firestore.
* **Mode Bertamu (Kunjungi Sahabat)**: Klik tombol **🚪 Kunjungi** untuk masuk ke kamar temanmu di Backrooms, suapi makan sahur, beri minum, dan sapa Tungtung mereka untuk mendapatkan bonus **Koin Sahur**!
* **Kirim Takjil Sahur**: Kirim hadiah Kurma Sahur atau Almond Water ke teman yang langsung masuk ke kotak pesan mereka secara realtime!
