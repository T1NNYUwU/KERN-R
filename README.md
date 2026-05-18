# KERN-R Studio V3.3 — Web-based Video Editor

**KERN-R Studio** เป็นแพลตฟอร์มตัดต่อวิดีโอบนเว็บระดับมืออาชีพ (Web-based Video Editor) ที่ออกแบบมาด้วยรูปแบบการทำงานที่เป็นสากล ใช้งานง่ายและทรงพลัง พร้อมระบบประมวลผลวิดีโอประสิทธิภาพสูงจากคลาวด์ ผสานพลังปัญญาประดิษฐ์ (AI) ในการพากย์เสียงและสร้างซับไตเติลภาษาไทยที่ประณีตงดงาม

💻 **ใช้งานจริงได้ที่:** [https://kerntemplate.online](https://kerntemplate.online)

---

## 🌟 ฟีเจอร์เด่น (Key Features)

### 1. โครงสร้างพื้นฐานและความปลอดภัยสูง (Core & Security)
- 🗄️ **Local Storage & IndexedDB:** จัดเก็บชิ้นงาน ไฟล์ดิบวิดีโอและรูปภาพแยกตามบัญชีผู้ใช้ในเบราว์เซอร์อย่างปลอดภัย ข้อมูลและประวัติไม่หายแม้ปิดหน้าเว็บหรือรีเฟรช
- 💾 **Auto-save System:** บันทึกโครงสร้างไทม์ไลน์ แทร็ก และตำแหน่งหัวอ่าน (Playhead) ลงใน LocalStorage อัตโนมัติทุกจังหวะการแก้ไข
- 🔄 **Undo / Redo:** สลับย้อนกลับและทำซ้ำการกระทำได้สูงสุด 50 ขั้นตอนโดยไม่ทำให้หน่วยความจำโหลดหนัก
- 🔒 **Multi-user Supabase RLS:** แยกข้อมูลส่วนบุคคลของโปรเจกต์ออกจากกันอย่างสมบูรณ์แบบด้วย Row-Level Security ของ Supabase บัญชีอื่นไม่มีสิทธิ์เข้าถึงหรือมองเห็น

### 2. ส่วนประสานงานและไทม์ไลน์อัจฉริยะ (Pro Timeline Interface)
- 🌑 **Premium Dark Slate UI:** ออกแบบโทนมืดที่ผ่อนคลายสายตา ปรับสัดส่วนระยะห่าง (Spacing & Spacing Polish) อย่างลงตัว ป้องกันหน้าจอเบียดหรือไอคอนล้นตกขอบจอ
- 🛠️ **Capsule Timeline Toolbar:** แถบปุ่มลัดรูปทรงแคปซูล เช่น ปุ่มแยกคลิป (Split), ปุ่มลบ (Delete), ปุ่มเล่น/หยุด (Play/Pause) และตัวคุมซูม
- 🎞️ **Multi-track Editing:** แยกเลเยอร์การทำงานชัดเจน (วิดีโอหลัก, วิดีโอซ้อนทับ/PIP, เสียงประกอบ, ตัวอักษร) พร้อมความสามารถในการล็อกเลเยอร์และปิดเสียงแยกแทร็ก
- 🧲 **Visual Snapping & Snapping Toggle:** ระบบแม่เหล็กดูดขอบคลิปให้แนบชิดติดกันอัตโนมัติเพื่อป้องกันเฟรมดำขณะเล่น หรือเลือกปิดเพื่อให้ลากวางได้อย่างอิสระ (Free-form Drag)
- 🔉 **Separate Audio:** คลิกขวาเพื่อแยกแถวคลื่นเสียงออกจากคลิปวิดีโอดั้งเดิมลงสู่แทร็กเสียงแยกอิสระในคลิกเดียว

### 3. คลังสื่ออเนกประสงค์หน้าเดียวจบ (Unified Media Library)
- 📦 **Single-screen Asset Manager:** รวบรวมฟังก์ชันการลากไฟล์อัปโหลดจากคอมพิวเตอร์และช่องกรอก URL วิดีโอจากเว็บมาไว้บนหน้าจอเดียวกันอย่างบูรณาการ
- 🎥 **YouTube & TikTok Proxy Downloader:** ระบบดาวน์โหลดและแปลงคลิปภายนอกเป็น Proxy 480p อัตโนมัติ เพื่อการขูดสครับและเล่นบนแคนวาสที่ลื่นไหล
- 🗑️ **IndexedDB Cleanup:** ปุ่ม **"Clean Garbage"** ล้างไฟล์ Blob ตกค้างในฐานข้อมูล IndexedDB ของบราวเซอร์เพื่อคืนพื้นที่จัดเก็บ

### 4. แผงควบคุมและจอพรีวิวยืดหยุ่น (Canvas & Inspector)
- 📐 **Direct Canvas Transform:** ควบคุมและยืดขยาย ย่อขนาด หรือหมุนเอียงชิ้นงานบนจอพรีวิวได้โดยตรงด้วยกรอบคอนโทรลสีขาว 8 จุด (Transform Handles)
- 🎨 **Premium Thai Typography:** ตกแต่งสไตล์ตัวอักษรภาษาไทยระดับสูง ปรับฟอนต์ยอดนิยม เลือกขนาด สี เส้นขอบข้อความ (Stroke) และสีพื้นหลังกล่องข้อความได้อิสระ
- 🎚️ **Color EQ Adjustments:** สไลเดอร์ปรับความสว่าง (Brightness), คอนทราสต์ (Contrast) และความสดสี (Saturation) ของแต่ละคลิปแบบเรียลไทม์
- 🎭 **Transition Fades:** ฟังก์ชันสร้างการเฟดเข้า (Fade In) และเฟดออก (Fade Out) ของภาพและเสียงเพื่อความสมูทในการเปลี่ยนผ่านชิ้นงาน

### 5. ระบบปัญญาประดิษฐ์และพลังขับเคลื่อนการประมวลผล (AI & Processing Engines)
- 🎙️ **Intelligent AI Voiceover:** แปลงบทพิมพ์เป็นเสียงพูดธรรมชาติระดับมนุษย์ทันทีผ่านระบบหลัก Edge TTS (`th-TH-NiwatNeural`) และระบบสำรอง Google TTS เพื่อรับประกันอัตราความสำเร็จ 100%
- 🔤 **ASS Subtitles Engine:** แปลงข้อความไทม์ไลน์เป็นไฟล์ซับไตเติลคุณภาพสูงตระกูล `.ass` มาพร้อมแอนิเมชันพิมพ์ทีละตัว (Typewriter) สวยหรู
- 🔊 **Intelligent Audio Mixer:** ผสมและประมวลผลแทร็กเสียงทั้งหมดพร้อมกัน แปลงระดับเดซิเบล (dB) สู่คลื่นเชิงเส้น (Linear Scale) และ Resampling สู่ระบบ Stereo 44.1kHz เท่ากันทั้งหมด
- 🎥 **Multi-track Cloud Rendering:** ส่งงานเข้าคิวประมวลผลที่เซิร์ฟเวอร์หลังบ้าน Compile วิดีโอสเกล 'contain' 1080p ลบลายน้ำภายนอกและจัดตำแหน่งอย่างเที่ยงตรงเทียบเท่าหน้าจอที่ตาเห็น
- 🖥️ **Hardware Acceleration & Fallback:** เร่งเข้ารหัสวิดีโอด้วยชิปการ์ดจอ (GPU NVENC/Media Foundation) และสลับกลับมาประมวลผลด้วย CPU (libx264) อัตโนมัติทันทีหากเกิดข้อผิดพลาด

### 6. การตรวจสอบและบำรุงรักษาระบบ (Keep-Alive & Monitoring)
- 🏥 **Real-time Health Checker:** สัญญาณไฟมอนิเตอร์ออนไลน์หลังบ้านหน้าแอปพลิเคชัน (เขียว = เชื่อมต่อเสถียร, แดง = ออฟไลน์)
- 🚀 **GitHub Actions CI/CD:** บิลด์และตรวจสอบข้อผิดพลาดของโค้ด Next.js 16 และ NestJS แยกจากกันโดยอัตโนมัติก่อนการปล่อยเวอร์ชันใช้งานจริง
- ⏰ **Multi-Option Keep-Alive:** รัน Cron Job คอยส่งคำขอ Ping กระตุ้นเซิร์ฟเวอร์เรนเดอร์ทุกๆ 15 นาที เพื่อแก้ไขปัญหา Cold Start 100%

---

## 🛠️ เทคโนโลยีหลักที่ใช้ (Tech Stack)

### **Frontend**
- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS, Framer Motion
- **State Management:** Zustand
- **Database/Caching (Client):** IndexedDB (`idb-keyval`)

### **Backend & Engine**
- **Framework:** NestJS
- **Task Queue:** BullMQ (Redis)
- **Video & Audio Processor:** FFmpeg (Server-side & CLI wrapper)
- **External Tools:** `edge-tts`, `yt-dlp`

### **Infrastructure**
- **Database:** Supabase (PostgreSQL with RLS Enabled)
- **Frontend Hosting:** Vercel
- **Backend Hosting:** Railway
- **CI/CD:** GitHub Actions

---

## 📂 โครงสร้างโฟลเดอร์หลัก (Folder Structure)

```
KERN-R/
├── frontend/             # Next.js App Router (Client Application)
│   ├── app/              # Router, Layouts และหน้า Login
│   ├── components/       # Editor UI Components (Timeline, Canvas, Inspector, Toolbar, MediaBin)
│   └── lib/              # IndexedDB database config, Zustand store, และ Render helpers
├── backend/              # NestJS Server & Job Processors
│   ├── src/              # Logic ระบบคิวเรนเดอร์, จัดการผู้ใช้, ดาวน์โหลดมีเดีย
│   └── uploads/          # พื้นที่จัดเก็บไฟล์ Proxy และ Cache ชั่วคราว
└── .github/              # GitHub Actions workflows (.yml สำหรับ CI และ Keep-Alive)
```

---

## 💻 การติดตั้งและการเริ่มใช้งานในเครื่องโลคอล (Local Setup)

### 1. ติดตั้งซอฟต์แวร์จำเป็น (System Requirements)
เครื่องที่รัน Backend จะต้องติดตั้งเครื่องมือเหล่านี้และตั้งค่าเข้า PATH ในระบบ:
- **FFmpeg:** สำหรับนำเข้า แยกเสียง และรวมไฟล์
- **yt-dlp:** สำหรับโหลดคลิปวิดีโอ Proxy `pip install yt-dlp`
- **edge-tts:** สำหรับสังเคราะห์เสียงพากย์ AI `pip install edge-tts`

### 2. ตั้งค่าไฟล์สภาพแวดล้อม (Environment Variables)

สร้างไฟล์ `.env` ในโฟลเดอร์ **`backend`**:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_role_key
REDIS_HOST=your_redis_host
REDIS_PORT=your_redis_port
REDIS_PASSWORD=your_redis_password
```

สร้างไฟล์ `.env.local` ในโฟลเดอร์ **`frontend`**:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

### 3. รันเพื่อพัฒนาโปรแกรม (Run Dev Servers)

**เปิดหน้าจอ Terminal ที่ 1 (Backend):**
```bash
cd backend
npm install
npm run start:dev
```

**เปิดหน้าจอ Terminal ที่ 2 (Frontend):**
```bash
cd frontend
npm install
npm run dev
```

---

## 👥 ลิขสิทธิ์และการพัฒนา
พัฒนาขึ้นโดยความตั้งใจเพื่อสร้างขีดความสามารถใหม่ในการสร้างภาพยนตร์และวิดีโอคลิปสั้นบนหน้าเบราว์เซอร์อย่างรวดเร็วและปลอดภัย ใช้งานและพัฒนาต่อยอดได้ตามมาตรฐานใบอนุญาตโอเพนซอร์ส
