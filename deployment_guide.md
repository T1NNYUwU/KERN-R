# 🚀 KERN-R Studio Deployment Guide (V3.1)

คู่มือการ Deploy ระบบตัดต่อวิดีโอ KERN-R ทั้งส่วน Frontend และ Backend

## 1. 🗄️ Database & Auth (Supabase)
ก่อนเริ่ม Deploy ส่วนอื่น ต้องมั่นใจว่า Supabase ตั้งค่าเรียบร้อยแล้ว:
- **URL & Anon Key**: คัดมาใส่ใน Env ของทั้ง Frontend และ Backend
- **RLS Policies**: ตรวจสอบว่า Table `user_renders` และ `media_files` เปิดสิทธิ์ให้ User เข้าถึงข้อมูลตัวเองได้
- **Storage**: สร้าง Storage Bucket ชื่อ `renders` (Public หรือ Private ตามต้องการ)

## 2. 🌐 Frontend (Next.js) — Deploy via Vercel
1. เข้าไปที่ [Vercel](https://vercel.com)
2. เลือก Import Repository `KERN-R`
3. ตั้งค่า **Root Directory** เป็น `frontend`
4. เพิ่ม **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`: (จาก Supabase)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (จาก Supabase)
   - `NEXT_PUBLIC_BACKEND_URL`: URL ของ Backend ที่ Deploy เสร็จแล้ว (เช่น `https://api.kern-r.com`)

## 3. ⚙️ Backend (Node.js + FFmpeg)
Backend จำเป็นต้องมีสภาพแวดล้อมที่มี FFmpeg ติดตั้งอยู่

### Option A: Railway.app (แนะนำ)
1. เข้าไปที่ [Railway](https://railway.app)
2. Import Repository และตั้งค่า **Root Directory** เป็น `backend`
3. Railway จะตรวจเจอ `Dockerfile` และรันให้เอง
4. เพิ่ม **Environment Variables**:
   - `PORT`: `3005`
   - `SUPABASE_URL`: ...
   - `SUPABASE_KEY`: (นำ Service Role Key มาใส่เพื่อให้ Backend มีสิทธิ์จัดการ Database และ Storage ได้)
   - `CORS_ORIGIN`: URL ของ Frontend บน Vercel
   - `REDIS_HOST`: (จาก .env)
   - `REDIS_PORT`: (จาก .env)
   - `REDIS_PASSWORD`: (จาก .env)

### Option B: VPS (Docker Compose)
หากต้องการรันบน Server ตัวเอง (เช่น Ubuntu):
1. ติดตั้ง Docker และ Docker Compose
2. สร้างไฟล์ `docker-compose.yml` ในเครื่อง Server:
```yaml
services:
  backend:
    build: ./backend
    ports:
      - "3005:3005"
    environment:
      - SUPABASE_URL=your_url
      - SUPABASE_SERVICE_ROLE_KEY=your_key
      - CORS_ORIGIN=https://your-frontend.vercel.app
    restart: always
```
3. รันคำสั่ง `docker-compose up -d --build`

54: ## 4. 📝 Post-Deployment Checklist
55: - [ ] ทดสอบการ Upload ไฟล์สื่อ (Media Library)
56: - [ ] ทดสอบการกด Export วิดีโอ (Backend Rendering)
57: - [ ] ตรวจสอบว่า Status Badge บน Header แสดงผลเป็นสีเขียว (Backend Online)
58: 
59: ## 5. ⏰ Keep-Alive & Active Monitoring (ป้องกันเซิร์ฟเวอร์หลับลึก)
60: เพื่อป้องกันไม่ให้เซิร์ฟเวอร์ประมวลผลวิดีโอ (Backend) เข้าสู่โหมดสลีป (Cold Start) และเพื่อตรวจสอบความพร้อมใช้งานตลอด 24 ชั่วโมง โปรเจกต์ KERN-R ใช้สถาปัตยกรรมมอนิเตอร์แบบคู่ขนาน (Dual-Active Monitoring System):
61: 
62: ### 🔵 Option A: GitHub Actions Keep-Alive Cron (พร้อมรันอัตโนมัติ)
63: - ระบบจะตั้งเวลารันอัตโนมัติผ่านไฟล์ `.github/workflows/keep-alive.yml` ทุกๆ 15 นาที เพื่อส่งสัญญานไปกระตุ้น API สุขภาพ (`/api/videos/health`) บน Cloud
64: - สามารถกดรันและปลุกเซิร์ฟเวอร์ด้วยตัวเองผ่านหน้าแท็บ **Actions** บน GitHub ได้ตลอดเวลา
65: 
66: ### 🟢 Option B: Cron-Job.org (แนะนำอย่างยิ่งเพื่อความเสถียรสูงสุด)
67: แนะนำให้ตั้งค่าระบบภายนอกร่วมด้วยเพื่อความตรงเวลาและเช็คได้ถี่กว่า (ทุกๆ 5 นาที):
68: 1. เข้าไปที่ [console.cron-job.org](https://console.cron-job.org/) และสมัครสมาชิกฟรี
69: 2. คลิกปุ่ม **Create Cronjob**
70: 3. ตั้งค่าพารามิเตอร์ดังนี้:
71:    - **Title:** `KERN-R Backend Keep-Alive`
72:    - **URL:** `https://kern-r-production.up.railway.app/api/videos/health` (หรือ URL ของหลังบ้านคุณ)
73:    - **Request Method:** `GET`
74:    - **Schedule:** เลือก `Every 5 minutes` เพื่อการกระตุ้นที่ได้ผลดีที่สุด
75: 4. คลิก **Create** เพื่อเปิดใช้ระบบมอนิเตอร์ประสิทธิภาพสูง
76: 
77: ---
78: สถานะ: V3.1 Production Ready - คู่มือนี้พร้อมสำหรับการ Deploy ทันทีครับ!
79:
