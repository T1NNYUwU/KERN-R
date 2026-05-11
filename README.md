# Video Ranking Generator

แพลตฟอร์มสร้างวิดีโอคลิปสั้น (TikTok/Shorts) แบบจัดอันดับโดยอัตโนมัติ

## เทคโนโลยีที่ใช้
- **Frontend:** Next.js (App Router), Tailwind CSS, Framer Motion
- **Backend:** NestJS, BullMQ (Redis)
- **Database/Storage:** Supabase
- **Video Engine:** edge-tts, yt-dlp, FFmpeg

## การติดตั้งและการเริ่มใช้งาน

### 1. ติดตั้ง CLI Tools (สำคัญ)
เครื่องของคุณต้องมีเครื่องมือเหล่านี้ติดตั้งและอยู่ใน PATH:
- **FFmpeg:** สำหรับตัดต่อวิดีโอ
- **yt-dlp:** `pip install yt-dlp`
- **edge-tts:** `pip install edge-tts`

### 2. ตั้งค่า Environment Variables
สร้างไฟล์ `.env` ในโฟลเดอร์ `backend`:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_role_key
REDIS_HOST=your_redis_host
REDIS_PORT=your_redis_port
REDIS_PASSWORD=your_redis_password
```

และไฟล์ `.env.local` ในโฟลเดอร์ `frontend`:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

### 3. เริ่มรันระบบ
เปิด Terminal แยกกัน 2 หน้าจอ:

**หน้าจอที่ 1 (Backend):**
```bash
cd backend
npm install
npm run start:dev
```

**หน้าจอที่ 2 (Frontend):**
```bash
cd frontend
npm install
npm run dev
```

## วิธีใช้งาน
1. เข้าไปที่ `http://localhost:3001`
2. ใส่หัวข้อหลัก (Main Title)
3. ใส่รายละเอียดทั้ง 5 อันดับ (ลิ้งค์วิดีโอ, ชื่อ, สคริปต์เสียง) หรือกดปุ่ม **"Fill with Samples"** เพื่อทดสอบ
4. กด **"Generate Full Video"** และรอระบบประมวลผล
5. เมื่อเสร็จแล้วสามารถดูพรีวิวและดาวน์โหลดไฟล์ได้ทันที
