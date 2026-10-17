# RuangKita — MVP web meeting

RuangKita adalah aplikasi web untuk rapat kecil: signaling WebRTC, video/audio peer-to-peer, chat real-time Socket.IO, daftar peserta, link undangan ruang, dan screen sharing.

## Struktur proyek

Pastikan `server.js`, `package.json`, dan `render.yaml` berada di root proyek, sedangkan antarmuka harus berada di `public/index.html`. Struktur ini penting agar Express menyajikan halaman utama dengan benar.

```text
ruangkita/
├── public/
│   └── index.html
├── server.js
├── package.json
├── render.yaml
├── .gitignore
└── README.md
```

## Jalankan lokal

1. Install Node.js 20 atau lebih baru.
2. Ekstrak proyek dan buka terminal di folder `ruangkita` (folder yang berisi `package.json`).
3. Jalankan `npm install`.
4. Jalankan `npm start`.
5. Buka `http://localhost:3000`.
6. Untuk menguji, buka URL ruang yang sama di browser/perangkat lain. Izinkan kamera dan mikrofon.
7. Periksa `http://localhost:3000/health`; hasil yang diharapkan `{"ok":true,"app":"RuangKita"}`.
8. Jika `npm install` gagal, pastikan internet aktif dan Node.js versi 20 atau lebih baru; jangan lanjut menganggap server sudah berjalan.

## Deploy ke Render (URL publik)

1. Buat akun di GitHub dan Render.
2. Buat repository GitHub baru, lalu unggah isi folder proyek ini (jangan unggah `node_modules` atau `.env`).
3. Di Render pilih **New + → Web Service**, lalu hubungkan repository tersebut.
4. Pilih runtime Node; Build Command `npm install`; Start Command `npm start`.
5. Pastikan health check memakai `/health` jika tersedia. Render membaca `render.yaml` bila memakai Blueprint.
6. Klik deploy dan tunggu status **Live**. Buka URL `https://...onrender.com/health`; hasil yang diharapkan adalah JSON dengan `ok: true`.
7. Buka URL utama HTTPS, buat ruang, lalu salin link undangan. Uji dengan dua perangkat di jaringan berbeda.
8. Pastikan log Render tidak menunjukkan error. Uji chat, mute/unmute, kamera, keluar/masuk, dan screen sharing.

Saya tidak dapat membuat atau mengklaim URL publik aktif dari repository ini tanpa akses akun hosting dan hasil deploy aktual. URL baru dianggap terverifikasi setelah langkah pengujian di atas berhasil.

## Fitur dan batasan penting

- Signaling/chat memakai Socket.IO. Media dikirim WebRTC peer-to-peer (mesh), bukan melalui server media.
- Batas saat ini 8 peserta per ruang; untuk rapat besar diperlukan SFU seperti LiveKit, mediasoup, atau layanan setara.
- STUN publik disediakan di browser. STUN tidak menjamin koneksi pada semua NAT/firewall. Untuk koneksi yang lebih andal, siapkan TURN (misalnya coturn atau layanan TURN terkelola) dan masukkan kredensial sementara melalui konfigurasi server yang aman.
- Chat dan keanggotaan ruang hanya tersimpan di memori; restart atau instance hosting baru menghapusnya. Belum ada riwayat chat, akun, kata sandi ruang, moderasi, rekaman, atau enkripsi end-to-end tambahan.
- Nama ruang adalah tautan akses, bukan autentikasi. Gunakan ID ruang acak dan jangan membagikan link ke orang yang tidak diundang.
- Screen sharing memerlukan browser yang mendukung `getDisplayMedia`, tindakan pengguna secara langsung, dan HTTPS (localhost dikecualikan).
- Untuk produksi, tambahkan rate limiting, autentikasi/otorisasi ruang, pengelolaan rahasia TURN, pemantauan, serta pengujian lintas browser.

## File utama

- `server.js` — Express, health endpoint, signaling Socket.IO, keanggotaan ruang dan chat.
- `public/index.html` — antarmuka dan logika WebRTC/browser.
- `render.yaml` — konfigurasi awal deployment Render.
