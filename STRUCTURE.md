# Project Structure — KERN-R Studio

เอกสารสรุปโครงสร้างไฟล์ทั้งหมดของโปรเจกต์ KERN-R เพื่อใช้เป็นแผนที่ในการพัฒนา

## 📂 Root Directory
- `plan.md`: แผนงานหลักและ Roadmap ของโปรเจกต์ (Phase 1-5)
- `progress.md`: สถานะการทำงานปัจจุบัน (อัปเดตทุกครั้งหลังจบ Task)
- `STRUCTURE.md`: แผนที่โครงสร้างไฟล์ (ไฟล์นี้)
- `KERN-R.txt`: สรุปความสามารถล่าสุดของโปรแกรม
- `package.json`: การตั้งค่าโปรเจกต์หลัก (Electron shell)
- `main.js`: ส่วนควบคุมหลักของ Electron (Main Process)

---

## 💻 Frontend (`/frontend`)
พัฒนาด้วย Next.js 14 (App Router)

### 📁 App Layer (`/app`)
- `page.tsx`: **หน้า Editor หลัก** — รวมส่วนประกอบทั้งหมด (Timeline, Preview, Inspector)
- `layout.tsx`: โครงสร้างหน้าเว็บพื้นฐานและฟอนต์
- `globals.css`: สไตล์ส่วนกลางและการตั้งค่า Animation

### 📁 Components (`/components/editor`)
- `Timeline.tsx`: ส่วนควบคุมแทร็ก, การลากวางคลิป, การตัด (Split) และการปรับความยาว (Trim)
- `VideoPreview.tsx`: หน้าจอพรีวิววิดีโอ, การแสดงผล Text Overlay และการปรับตำแหน่ง/ขนาด (Transform) บนหน้าจอ
- `Inspector.tsx`: แผงตั้งค่าคลิป (Scale, Position, Opacity, Rotate และ Text Styling)
- `MediaBin.tsx`: ส่วนจัดการไฟล์มีเดียและการนำเข้า (Import) ลง IndexedDB
- `TextLibrary.tsx`: คลังรูปแบบข้อความเริ่มต้น

### 📁 Core Logic (`/lib`)
- `store.ts`: **Zustand Store** — จัดการสถานะทั้งหมดของ Editor (Clips, Tracks, History, Undo/Redo)
- `db.ts`: ส่วนจัดการฐานข้อมูล IndexedDB (เก็บไฟล์วิดีโอและรูปภาพไว้ในเครื่องผู้ใช้)
- `ffmpeg.ts`: เครื่องมือ Export วิดีโอโดยใช้ FFmpeg.wasm
- `types.ts`: นิยามข้อมูล (Interfaces) ที่ใช้ในระบบ

---

## ⚙️ Backend (`/backend/src`)
พัฒนาด้วย NestJS

### 📁 Controllers & Services
- `video.controller.ts`: API สำหรับรับงานประมวลผลวิดีโอ
- `video.processor.ts`: ส่วนจัดการคิวงาน (BullMQ)
- `supabase.service.ts`: เชื่อมต่อกับฐานข้อมูล Supabase

### 📁 Video Engines (`/engines` & `/processors`)
- `engines/subtitle.engine.ts`: ตัวสร้างไฟล์ซับไตเติ้ล (.ass)
- `processors/base.processor.ts`: คลาสแม่สำหรับประมวลผลวิดีโอ
- `processors/ranking.processor.ts`: ระบบสร้างวิดีโอจัดอันดับ (Ranking)
- `processors/sequence.processor.ts`: ระบบต่อคลิปวิดีโอ (Sequence)
- `processors/split-screen.processor.ts`: ระบบแบ่งหน้าจอ (Split Screen)

---

## 🛠️ Infrastructure
- `/dist`: ไฟล์ที่พร้อมสำหรับการติดตั้ง (Electron Build)
- `/node_modules`: ไลบรารีที่จำเป็น
- `.gitignore`: รายการไฟล์ที่ไม่ต้องนำเข้า Git (เช่น ไฟล์วิดีโอขนาดใหญ่, ffmpeg binary)
