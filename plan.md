# KERN-R Studio V3 — CapCut Clone (Web Edition) Architecture & Roadmap

> **วิสัยทัศน์:** สร้าง Web-based Video Editor ที่มี Core Workflow เหมือน CapCut สมบูรณ์ที่สุด (เสถียร, ลื่นไหล, และใช้งานได้จริง ไม่ใช่แค่เดโม) โดยจะโฟกัสที่ "โครงสร้างพื้นฐาน" (Solid Foundation) เป็นอันดับแรก เพื่อให้ต่อยอดฟีเจอร์ KERN-R ได้ในอนาคต

---

## 🏗️ 1. Core Architecture (โครงสร้างระบบ)

### 1.1 State Management & Persistence (กันข้อมูลหาย)
- **Local Database (IndexedDB):** ใช้เซฟไฟล์ `File` / `Blob` ดิบของวิดีโอและรูปภาพเข้า Browser Database (ด้วย `idb-keyval` หรือ `localforage`) เมื่ออัปโหลดเสร็จ หรือซิงค์กับ Supabase Backend เพื่อป้องกันไฟล์หายเมื่อกด Refresh
- **Project State (Zustand):** จัดการสถานะ Timeline, Tracks, Clips และเก็บ History (Undo/Redo) รวมถึงทำ Auto-save โปรเจกต์ลง Local Storage ทุกๆ การเปลี่ยนแปลง

### 1.2 Track System (ระบบแทร็ก)
- **Main Track (Video):** แทร็กหลักที่เป็นแบบ **Magnetic Timeline** (คลิปจะดูดติดกันเสมอ ถ้าลบตรงกลาง คลิปข้างหลังจะขยับมาแทนที่)
- **PIP/Overlay Tracks:** แทร็กวิดีโอ/รูปภาพซ้อนทับ (ทำงานอิสระ ลากวางตรงไหนก็ได้)
- **Text Tracks:** แทร็กข้อความแยกเฉพาะ 
- **Audio Tracks:** แทร็กเสียงแยกเฉพาะ

---

## 🚀 2. Roadmap & Execution Plan

### 🟢 Phase 1: Data Persistence & Robust State (กัน Asset หาย) - DONE
- [x] ติดตั้งและเซ็ตอัพ `idb-keyval` (หรือ `localforage`)
- [x] เมื่อผู้ใช้ Import Media -> บันทึกไฟล์ลง IndexedDB ทันที
- [x] เมื่อโหลดหน้าเว็บ -> ดึงไฟล์จาก IndexedDB มาแสดงใน MediaBin
- [x] ระบบ Auto-save Timeline State ลง `localStorage`

### 🟢 Phase 2: Timeline Engine (Magnetic & Core Interactions) - DONE
- [x] **Magnetic Main Track:** เขียน Logic ให้ Main Video Track คลิปต่อกันเสมอ (เวลา Trim หรือลบคลิป ให้คำนวณและขยับตำแหน่งคลิปอื่นอัตโนมัติ)
- [x] **Clip Drag & Drop:** ลากคลิปข้าม Track ได้ (ถ้าลากลง Main Track ให้แทรกกลาง / ถ้าลากลง PIP ให้ซ้อนทับ)
- [x] **Trim Handle:** ดึงหัว/ท้ายคลิปเพื่อลดหรือเพิ่มความยาว (Trim In/Out)
- [x] **Split (S key):** กด S เพื่อตัดคลิปออกเป็น 2 ท่อนตรงเส้น Playhead
- [x] **Snapping:** ลากคลิปแล้วดูดติด Playhead หรือขอบคลิปอื่น

### 🟢 Phase 3: Canvas & Inspector (CapCut Style Properties) - DONE
- [x] **Video Transform:** ปรับ Scale, X/Y, Opacity, Rotate จาก Inspector
- [x] **Text Styling:** กรอบ (Stroke/Outline), ไม่มีเงาแบบจำกัดสี, พื้นหลัง (Background)
- [x] **Direct Canvas Edit:** ลากย่อขยาย (Resize/Scale) คลิปหรือข้อความจากบนหน้าจอวิดีโอพรีวิวโดยตรงแบบ 8 จุดพร้อม Rotate Handle
- [x] **Inspector Redesign:** ใช้ Tabbed UI แบบ CapCut Online (Basic, Animation ฯลฯ)
- [ ] **Keyframes (Basic):** มาร์คจุดตั้งต้นและจุดจบเพื่อทำแอนิเมชัน (เลื่อนไปทำทีหลัง)

### 🟢 Phase 4: Advanced Export Engine (FFmpeg) - DONE
- [x] เขียนตัวแปลคำสั่ง Timeline ให้กลายเป็น `ffmpeg -filter_complex` สำหรับทำ Multi-track 
- [x] การจัดการ Scale และ Position ให้วิดีโอซ้อนกันได้ตอน Export
- [x] Burn-in Text (ฝังข้อความลงในวิดีโอ) และ Audio Mixing
- [x] ระบบ Cloud Rendering ส่งงานไปทำบน Backend และแจ้งผลกลับทางหน้าเว็บ (Polling)

### 🟡 Phase 5: KERN-R Exclusive Features & AI
- [ ] **AI Voiceover (Text to Speech):** เชื่อมต่อกับ Edge TTS / OpenAI สำหรับทำเสียงพากย์
- [ ] **YouTube/TikTok Downloader:** ระบบดึงคลิปจาก Link มาตัดต่อได้ทันที
- [ ] **AI Remove Background:** ระบบลบพื้นหลังวิดีโอ (Green Screen / Subject Removal)

### 🔵 Phase 6: Professional Polish (CapCut Feel)
- [ ] **Audio Waveforms:** แสดงคลื่นเสียงบนไทม์ไลน์เพื่อให้ตัดต่อตามจังหวะได้แม่นยำ
- [ ] **Video Transitions:** ระบบ Transition พื้นฐาน (Fade, Cross Dissolve, Slide)
- [ ] **Keyframes (v1):** ปรับแต่งการเคลื่อนที่ (Motion) ของคลิปและตัวหนังสือผ่านจุด Keyframe
- [ ] **Color Adjustment:** ปรับ Brightness, Contrast, Saturation ในหน้า Inspector
- [ ] Smart Cut (ลบช่วงที่เงียบหรือไม่มีเสียงพูดอัตโนมัติ)

---

## 🛠️ โครงสร้างไฟล์ (File Structure)

```
frontend/
  app/
    page.tsx             ← หน้า Editor หลัก (CapCut Layout)
  components/
    editor/
      Timeline.tsx       ← Multi-track Timeline & Keyboard Logic
      VideoPreview.tsx    ← WebGL/Canvas Player + Draggable Elements
      MediaBin.tsx       ← จัดการ Media (เชื่อมกับ IndexedDB)
      Inspector.tsx      ← แผงคุณสมบัติ (Transform, Text, Audio)
      Toolbar.tsx        ← ปุ่ม Undo, Redo, Split, Delete
    timeline/
      Track.tsx          ← Component ควบคุมแต่ละเลเยอร์ (Magnetic/Free)
      Clip.tsx           ← คลิปบนไทม์ไลน์ + Trim Handles
  lib/
    db.ts                ← IndexedDB Wrapper (เก็บไฟล์ Asset)
    store.ts             ← Zustand Editor State
    ffmpeg.ts            ← FFmpeg.wasm Export Engine
```
