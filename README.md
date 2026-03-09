# KnowledgeOS — Deploy Guide

## 🔑 Step 1: Daftar API Key Anthropic

1. Buka **https://console.anthropic.com**
2. Klik **"Sign Up"** → daftar pakai Google atau email
3. Setelah masuk, klik **"API Keys"** di sidebar kiri
4. Klik **"+ Create Key"** → beri nama (misal: "knowledgeos-vercel")
5. **COPY key-nya sekarang** — hanya tampil sekali!
6. Simpan di tempat aman (notes privat, password manager, dll)

> ⚠️ API bersifat pay-as-you-go. Untuk porto / demo ringan biayanya sangat kecil (~$0.01 per beberapa ratus interaksi dengan Sonnet).
> Set spending limit di dashboard Anthropic supaya aman.

---

## 💻 Step 2: Setup Project Lokal

```bash
# 1. Masuk ke folder project
cd knowledgeos-nextjs

# 2. Install dependencies
npm install

# 3. Buat file environment
cp .env.example .env.local

# 4. Edit .env.local — isi API key kamu
#    ANTHROPIC_API_KEY=sk-ant-xxxxx

# 5. Jalankan lokal
npm run dev
```

Buka **http://localhost:3000** — app sudah jalan!

---

## 🐙 Step 3: Push ke GitHub

```bash
# Di dalam folder knowledgeos-nextjs:
git init
git add .
git commit -m "feat: KnowledgeOS initial commit"

# Buat repo baru di github.com, lalu:
git remote add origin https://github.com/USERNAME/knowledgeos.git
git branch -M main
git push -u origin main
```

> ✅ .gitignore sudah mengecualikan .env.local — API key kamu aman!

---

## 🚀 Step 4: Deploy ke Vercel

1. Buka **https://vercel.com** → login dengan GitHub
2. Klik **"Add New Project"**
3. Import repo **knowledgeos** dari GitHub
4. Di bagian **"Environment Variables"**, tambahkan:
   - Key: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-xxxxx` (paste API key kamu)
5. Klik **"Deploy"**

Dalam ~2 menit, kamu dapat URL seperti:
**https://knowledgeos-username.vercel.app** ✨

---

## 📝 Tips untuk CV/Porto

- Tulis di CV: *"Full-stack AI web app with semantic search, auto-summarization, and RAG-based chat"*
- Tech stack yang bisa disebutkan: **Next.js, React, Anthropic Claude API, Vercel**
- Tambahkan di README GitHub: screenshot + demo GIF untuk menarik perhatian recruiter
