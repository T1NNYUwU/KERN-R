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
   - `SUPABASE_SERVICE_ROLE_KEY`: (ต้องใช้ Service Role เพื่อให้ Backend เขียนข้อมูลลง DB ได้)
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

## 4. 📝 Post-Deployment Checklist
- [ ] ทดสอบการ Upload ไฟล์สื่อ (Media Library)
- [ ] ทดสอบการกด Export วิดีโอ (Backend Rendering)
- [ ] ตรวจสอบว่า Status Badge บน Header แสดงผลเป็นสีเขียว (Backend Online)

---
สถานะ: V3.1 Production Ready - คู่มือนี้พร้อมสำหรับการ Deploy ทันทีครับ!
