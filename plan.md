# Master Plan - KERN-R Studio (Video Editor Platform)

> เปลี่ยนจาก "Video Ranking Generator" เป็น **"KERN-R Studio"** — โปรแกรมตัดต่อวิดีโอครบวงจร
> แรงบันดาลใจจาก CapCut + Viblo.ai

---

## ✅ Phase 1-8: งานที่ทำเสร็จแล้ว (สรุปย่อ)
- ✅ Backend NestJS + BullMQ + Redis
- ✅ Video Engine (edge-tts + yt-dlp + FFmpeg)
- ✅ Supabase Cloud Storage + Database
- ✅ Frontend Next.js (Glassmorphism UI, Preview Panel)
- ✅ Ranking Mode (จัดอันดับวิดีโอ, AI Voice, Trim, Animation)
- ✅ Overlay Images + Subtitles + Global Music
- ✅ Electron Desktop App (Hybrid)

---

## 🔥 Phase 9: Multi-Preset System (ระบบโหมดตัดต่อ)

### เป้าหมาย:
เปลี่ยนจากแอปที่ทำได้แค่ "Ranking" เป็นแอปที่มีหลายโหมดให้เลือก

### Step 9.1 — Preset Selector (หน้าเลือกโหมด)
- [x] สร้างหน้า Landing / Home ที่ให้เลือก Preset Mode
- [x] ออกแบบ UI แบบ Card Grid สวยงาม (เหมือน CapCut Template)
- [x] Preset ที่มี:
  1. **🏆 Ranking Mode** (โหมดเดิม) — สร้างวิดีโอจัดอันดับ Top N
  2. **🎬 Sequence Mode** (ใหม่) — เอาคลิปมาเรียงต่อกัน + ใส่ Transition
  3. **📐 Split Screen Mode** (ใหม่) — จัดคลิปแบบแบ่งจอ (2x1, 2x2, 3x1, Custom)
  4. **🎤 Voiceover Mode** (ใหม่) — ใส่คลิป/รูป + เสียง AI พากย์

### Step 9.2 — Frontend Routing
- [x] 43: สถานะโครงการ: ⏳ ช่วงปรับปรุง UX/UI (Phase 16) - กำลังปรับโฉมให้พรีเมียมระดับ CapCut
- [x] สร้าง Route สำหรับแต่ละ Preset: `/ranking`, `/sequence`, `/split-screen`, `/voiceover`
- [x] แชร์ Components ที่ใช้ร่วมกัน (Timeline, ClipCard, PreviewPanel)
- [x] สร้าง Layout หลักที่ Sidebar เลือกโหมดได้ตลอด

### Step 9.3 — Backend Preset Router
- [x] เพิ่ม `preset_mode` field ใน `video_jobs` table
- [x] สร้าง Processor แยกตาม mode:
  - `RankingProcessor` (แยกจาก video.processor.ts ปัจจุบัน)
  - `SequenceProcessor` (เรียงคลิปต่อกัน)
  - `SplitScreenProcessor` (xstack / hstack / vstack)
  - `VoiceoverProcessor` (รูป/คลิป + เสียง AI)

---

## 🎵 Phase 10: Sound Effects & Overlay Animations (CapCut-like)

### เป้าหมาย:
ใส่เสียง effect, รูปเด้ง, คลิปเด้ง ที่ตำแหน่งเวลาที่กำหนดได้ เหมือน CapCut

### Step 10.1 — Timeline Editor (แบบละเอียดระดับวินาที)
- [x] สร้าง Multi-Track Timeline UI:
  - **Video Track** — แสดงคลิปหลักบน timeline
  - **Audio Track** — แสดงเสียง AI / Clip Audio / Music
  - **SFX Track** — เพิ่มเสียง effect ได้ที่ตำแหน่งไหนก็ได้
  - **Overlay Track** — เพิ่มรูปหรือคลิปซ้อนได้ (Pop-up / เด้งเข้า)
- [x] Zoom In/Out Timeline (ระดับ 0.1 วินาที)
- [x] Drag & Drop items บน Timeline
- [x] Snap-to-grid (จับตำแหน่งอัตโนมัติ 0.1s)
- [ ] **[UI Architecture Refactor]** ย้าย Global Timeline (SFX/Overlay) ไปอยู่ใต้ `PreviewPanel` ฝั่งขวา เพื่อให้เห็นภาพรวมวิดีโอทั้งหมด
- [ ] **[UI Architecture Refactor]** ปรับให้ `ClipCard` ฝั่งซ้ายแสดงแค่ Trimming Timeline แบบยาวเต็มพื้นที่เพื่อการใช้งานที่สะดวกขึ้น

### Step 10.2 — Sound Effects System (SFX)
- [x] Built-in SFX Library (ไฟล์เสียง preset):
  - Whoosh (เสียงหวืด)
  - Pop / Ding (เสียงเด้ง)
  - Drum Roll / Suspense
  - Applause / Cheer
  - Notification / Bell
- [x] Upload Custom SFX (อัปโหลดเสียง effect เอง)
  - Bass Drop / Impact
  - Transition Swoosh
- [ ] Upload Custom SFX (อัปโหลดเสียง effect เอง)
- [ ] SFX แต่ละตัวกำหนดได้:
  - `startTime` — เริ่มเล่นตอนวินาทีที่เท่าไร
  - `volume` — ความดัง (0-100%)
  - `duration` — ความยาว (ถ้าต้องการตัด)
- [ ] Backend: FFmpeg `amix` / `adelay` เพื่อ overlay เสียงที่ตำแหน่งที่กำหนด

### Step 10.3 — Overlay Pop-up Images (รูปเด้ง)
- [ ] เพิ่มรูปซ้อนทับที่ปรากฏ ณ วินาทีที่กำหนด
- [ ] Animation สำหรับ Overlay Image:
  - **Pop In** — เด้งเข้ามา (scale 0→1 + bounce)
  - **Slide In** — เลื่อนเข้าจากซ้าย/ขวา/บน/ล่าง
  - **Fade In** — ค่อยๆ ปรากฏ
  - **Shake** — สั่น
  - **Spin In** — หมุนเข้ามา
- [ ] กำหนดได้:
  - `startTime` / `endTime` — ช่วงเวลาที่แสดง
  - `x`, `y` — ตำแหน่ง
  - `width`, `height` — ขนาด
  - `animation` — รูปแบบการเข้า
- [ ] Backend: FFmpeg `overlay` filter + `enable='between(t,start,end)'` + scale expression สำหรับ animation

### Step 10.4 — Overlay Pop-up Clips (คลิปเด้ง)
- [ ] เหมือน Overlay Image แต่เป็นวิดีโอ
- [ ] ซ้อนคลิปเล็กบนคลิปหลัก (Picture-in-Picture)
- [ ] รองรับ Animation เข้า/ออก
- [ ] กำหนด `startTime`, `endTime`, ตำแหน่ง, ขนาด
- [ ] Backend: FFmpeg multi-input overlay filter

### Step 10.5 — Backend SFX & Overlay Processor
- [x] สร้าง `EffectsEngine` class ที่จัดการ sfx, overlayImage, overlayClip
- [x] สร้าง FFmpeg filter_complex ที่รองรับทุก effect
- [x] เพิ่ม API: อัปโหลดเสียง effect และคลิปซ้อน

---

## 🎤 Phase 11: AI Voice Generator (เสียงดีขึ้น)

### เป้าหมาย:
อัปเกรดจาก edge-tts ให้มีเสียงที่ดึงดูดกว่า หลายตัวเลือก

### Step 11.1 — Multi-Engine TTS Architecture
- [ ] สร้าง `TTSEngine` interface ที่รองรับหลาย engine:
  1. **edge-tts** (เดิม) — เร็ว, ฟรี, ต้องมีอินเทอร์เน็ต
  2. **Kokoro TTS** (ใหม่) — Open Source, เสียงดี, รันได้บนเครื่อง (82M params)
  3. **Piper TTS** (ใหม่) — Lightweight, เร็ว, ทำงาน Offline ได้
  4. **Google Cloud TTS** (ใหม่, optional) — เสียงคุณภาพสูงสุด (ต้องมี API key)

### Step 11.2 — Voice Selection UI
- [x] Dropdown เลือก TTS Engine ใน ClipCard
- [x] Preview Voice — ฟังตัวอย่างเสียงก่อนเลือก
- [x] เลือกเสียงชาย/หญิง ได้หลากหลาย

### Step 11.3 — Kokoro TTS Integration
- [ ] ติดตั้ง Kokoro TTS (Python) เป็น local service
- [ ] สร้าง Python FastAPI wrapper สำหรับ Kokoro
- [ ] เชื่อม NestJS → Kokoro API (localhost:8100)
- [ ] Bundle Kokoro model ลง Electron App (optional)

### Step 11.4 — Piper TTS Integration
- [ ] ดาวน์โหลด Piper binary + voice models
- [ ] รันผ่าน `child_process` เหมือน yt-dlp/ffmpeg
- [ ] Bundle ลงใน `bin/` สำหรับ Electron

### Step 11.5 — Voice Preview & Caching
- [ ] API: `POST /api/tts/preview` — สร้างตัวอย่างเสียงสั้นๆ ให้ฟัง
- [ ] Cache เสียงที่สร้างแล้ว (ถ้า script + voice ซ้ำกัน ไม่ต้องสร้างใหม่)

---

## 💬 Phase 11.6: Advanced Subtitles & Captions (Thai/English)

### เป้าหมาย:
สร้างระบบคำบรรยาย (Subtitles) ที่สวยงาม รองรับทั้งภาษาไทยและอังกฤษ ปรับแต่งได้ละเอียดเหมือน CapCut

### Step 11.6.1 — Auto-Subtitle Generation
- [x] ดึงข้อความจาก AI Voice Script มาสร้างเป็น Subtitles อัตโนมัติ
- [x] รองรับแอนิเมชัน Fade / Typewriter ใน Subtitle Engine
- [x] รองรับภาษาไทย/อังกฤษสมบูรณ์แบบ

### Step 11.6.2 — Subtitle Styling & Customization
- [ ] เลือกฟอนต์ที่รองรับภาษาไทยสวยๆ (เช่น Kanit, Sarabun) และภาษาอังกฤษ (Inter, Montserrat)
- [ ] ปรับขนาด (Size), สี (Color), ขอบ (Outline/Stroke), และพื้นหลัง (Background/Box)
- [ ] ปรับตำแหน่ง (Position) และการจัดวาง (Alignment)
- [ ] Preset Styles (เทมเพลตซับสำเร็จรูปสวยๆ)

### Step 11.6.3 — Subtitle Animations
- [ ] Typewriter (พิมพ์ทีละตัว)
- [ ] Karaoke Style (เน้นคำตามเสียงพูด)
- [ ] Fade / Slide / Pop สำหรับแต่ละบรรทัด
- [ ] แอนิเมชันตอนเข้า (In) และออก (Out)

### Step 11.6.4 — Backend Subtitle Engine
- [ ] ใช้ FFmpeg `ass` filter เพื่อการจัดรูปแบบที่ซับซ้อนและสวยงามกว่า `drawtext`
- [ ] สร้างไฟล์ `.ass` (Advanced Substation Alpha) อัตโนมัติจากข้อมูล Timeline
- [ ] รองรับการ Render ภาษาไทย (UTF-8) โดยไม่มีปัญหาตัวอักษรลอยหรือเพี้ยน

---

## 🎬 Phase 12: Sequence Mode (เรียงคลิปต่อกัน)

### เป้าหมาย:
โหมดตัดต่อแบบเอาคลิปมาเรียง + ใส่ transition + ใส่ overlay/SFX

### Step 12.1 — Sequence Editor UI
- [x] สร้างหน้าสำหรับโหมด Sequence (`/sequence`)
- [x] ระบบจัดลำดับคลิป (Move Up/Down)
- [x] แต่ละคลิปมี Trim (Start/End)
- [x] รองรับ SFX และ Overlay ในโหมด Sequence

### Step 12.2 — Sequence Processor (Backend)
- [x] สร้าง `SequenceProcessor.ts` เพื่อจัดการงานเรียงคลิป
- [x] Concat คลิปที่ trim แล้ว
- [x] รองรับ SFX overlay + Image overlay ที่ตำแหน่งเวลาใดก็ได้

---

## 📐 Phase 13: Split Screen Mode (แบ่งจอ)

### เป้าหมาย:
แสดงหลายคลิปพร้อมกันบนจอเดียว

### Step 13.1 — Split Screen Layout Picker
- [x] Layout Templates:
  - **2-Up Horizontal** (ซ้าย/ขวา)
  - **2-Up Vertical** (บน/ล่าง)
  - **3-Up** (1 ใหญ่ + 2 เล็ก)
  - **4-Up Grid** (2x2)
- [x] แต่ละ slot ใส่คลิป + trim ได้

### Step 13.2 — Split Screen Preview
- [x] Preview Panel แสดงผล split layout แบบจำลอง (Visualizer)
- [x] ปรับขนาดแต่ละ slot ได้ (ตาม layout อัตโนมัติ)

### Step 13.3 — Split Screen Processor (Backend)
- [x] FFmpeg `xstack` / `hstack` / `vstack` filter
- [x] รองรับ Audio Mixing จากทุก slot (amix)
- [x] ระบบ Standardize วิดีโอแต่ละช่อง

---

## 🎨 Phase 14: Ranking Mode Upgrade (อัปเกรดโหมดเดิม)

### เป้าหมาย:
โหมด Ranking เดิมให้รองรับ SFX, Overlay Animation, Pop-up ได้

### Step 14.1 — SFX ใน Ranking Mode
- [x] แต่ละ Rank ใส่เสียง effect ตอนขึ้นอันดับได้ (Countdown SFX)
- [x] เสียง Drum Roll ก่อนเผยอันดับ 1 (อัตโนมัติ)
- [x] เสียง Ding/Pop/Whoosh ตอนเลขอันดับปรากฏ

### Step 14.2 — Pop-up Overlays ใน Ranking Mode
- [x] ใส่รูป/คลิปเด้งตอนเปลี่ยนอันดับ (ผ่าน Timeline)
- [x] ระบบ Flash Transition ตอนเปลี่ยนอันดับ
- [ ] ใส่ Emoji / Sticker animation
- [ ] กำหนดตำแหน่งและเวลาได้ต่อ rank

### Step 14.3 — Ranking Transition Effects
- [ ] Transition ระหว่าง rank:
  - Slide / Zoom / Glitch / Flash
  - Customizable duration

---

## 🛠️ Architecture Changes

### Frontend (Next.js)
```
frontend/
├── app/
│   ├── page.tsx           → หน้า Home (Preset Selector)
│   ├── ranking/page.tsx   → Ranking Editor
│   ├── sequence/page.tsx  → Sequence Editor
│   ├── split/page.tsx     → Split Screen Editor
│   └── voiceover/page.tsx → Voiceover Editor
├── components/
│   ├── shared/            → Components ที่ใช้ร่วมกัน
│   │   ├── TimelineEditor.tsx   → Multi-track timeline (หัวใจ)
│   │   ├── SFXPicker.tsx        → เลือก Sound Effects
│   │   ├── OverlayManager.tsx   → จัดการ Image/Clip Overlay
│   │   ├── TTSPanel.tsx         → เลือก Voice Engine + Preview
│   │   ├── SubtitleEditor.tsx   → แก้ไขและปรับแต่งซับ (ใหม่)
│   │   ├── TransitionPicker.tsx → เลือก Transition
│   │   └── PresetSelector.tsx   → หน้าเลือกโหมด
│   ├── ranking/           → Components เฉพาะ Ranking
│   ├── sequence/          → Components เฉพาะ Sequence
│   └── split/             → Components เฉพาะ Split Screen
├── lib/
│   ├── types.ts           → อัปเดต types ทั้งหมด
│   ├── sfx-library.ts     → รายการ SFX ที่มีในระบบ
│   └── presets.ts         → ข้อมูล Preset configs
```

### Backend (NestJS)
```
backend/src/
├── processors/
│   ├── base.processor.ts        → Base class สำหรับทุก processor
│   ├── ranking.processor.ts     → Ranking Mode (จาก video.processor.ts)
│   ├── sequence.processor.ts    → Sequence Mode
│   ├── split-screen.processor.ts → Split Screen Mode
│   ├── voiceover.processor.ts   → Voiceover Mode
├── engines/
│   ├── effects.engine.ts        → SFX + Overlay filter builder
│   ├── tts.engine.ts            → Multi-TTS engine (edge/kokoro/piper)
│   ├── subtitle.engine.ts       → ระบบสร้างไฟล์ .ass และ render ซับ (ใหม่)
│   └── transition.engine.ts     → Transition filter builder
├── video.controller.ts          → อัปเดต API endpoints
├── video-queue.service.ts       → อัปเดต Queue routing
```

### Database (Supabase)
```sql
-- อัปเดต video_jobs table
ALTER TABLE video_jobs ADD COLUMN preset_mode TEXT DEFAULT 'ranking';
ALTER TABLE video_jobs ADD COLUMN timeline_data JSONB;
ALTER TABLE video_jobs ADD COLUMN sfx_data JSONB;
ALTER TABLE video_jobs ADD COLUMN overlay_data JSONB;
```

---

## 📦 Dependencies ใหม่ที่ต้องติดตั้ง

### Frontend
| Package | Purpose |
|---------|---------|
| `wavesurfer.js` | แสดง Audio Waveform บน Timeline |
| `@dnd-kit/core` | Drag & Drop สำหรับ Timeline items |
| `howler` / `use-sound` | เล่น SFX preview ใน browser |
| `zustand` | State management (ซับซ้อนขึ้น) |

### Backend
| Package | Purpose |
|---------|---------|
| `@nestjs/microservices` | สื่อสารกับ TTS service |

### External Tools (ไม่ต้อง npm)
| Tool | Purpose |
|------|---------|
| Kokoro TTS (Python) | เสียง AI คุณภาพสูง, รัน local |
| Piper TTS (Binary) | เสียง AI เร็ว, ทำงาน offline |

### SFX Files (ฟรี ใช้ได้เลย)
- รวมไฟล์เสียง effect ไว้ใน `public/sfx/` (frontend preview)
- และใน `backend/assets/sfx/` (สำหรับ ffmpeg ใช้ตอนเรนเดอร์)

---

## 🗓️ ลำดับการทำงาน (Priority)

| ลำดับ | งาน | ระยะเวลา | Phase |
|-------|------|-----------|-------|
| 1 | Multi-Preset System + Preset Selector UI | 2-3 วัน | Phase 9 |
| 2 | Timeline Editor (Multi-track) | 3-4 วัน | Phase 10.1 |
| 3 | Sound Effects System | 2-3 วัน | Phase 10.2 |
| 4 | Overlay Pop-up (รูปเด้ง) | 2-3 วัน | Phase 10.3 |
| 5 | Overlay Pop-up (คลิปเด้ง) | 2 วัน | Phase 10.4 |
| 6 | Backend Effects Engine | 3-4 วัน | Phase 10.5 |
| 7 | AI Voice Upgrade (Kokoro/Piper) | 3-4 วัน | Phase 11 |
| 8 | Sequence Mode | 2-3 วัน | Phase 12 |
| 9 | Split Screen Mode | 2-3 วัน | Phase 13 |
| 10 | Ranking Mode Upgrade (SFX + Overlay) | 2-3 วัน | Phase 14 |

**รวมประมาณ: 23-32 วัน**

---

## 💡 เทคนิคสำคัญ

### FFmpeg SFX Overlay ที่ตำแหน่งเวลา:
```bash
# ใส่เสียง pop ที่วินาทีที่ 5
ffmpeg -i main.mp4 -i pop.mp3 \
  -filter_complex "[1:a]adelay=5000|5000[sfx];[0:a][sfx]amix=inputs=2[aout]" \
  -map 0:v -map "[aout]" output.mp4
```

### FFmpeg Image Overlay Animation (Pop-in):
```bash
# รูปเด้งเข้ามาที่วินาที 3-6
ffmpeg -i main.mp4 -i logo.png \
  -filter_complex "[1:v]scale='min(200,200*((t-3)/0.3))':'min(200,200*((t-3)/0.3))'[ov]; \
  [0:v][ov]overlay=x=100:y=100:enable='between(t,3,6)'[vout]" \
  -map "[vout]" output.mp4
```

### FFmpeg Split Screen (xstack):
```bash
# 2x2 Grid
ffmpeg -i v1.mp4 -i v2.mp4 -i v3.mp4 -i v4.mp4 \
  -filter_complex "[0:v]scale=540:960[v0];[1:v]scale=540:960[v1]; \
  [2:v]scale=540:960[v2];[3:v]scale=540:960[v3]; \
  [v0][v1][v2][v3]xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0[v]" \
  -map "[v]" output.mp4
```

---

## 🛠️ Phase 15: Maintenance & DevOps

### เป้าหมาย:
จัดการโครงสร้างโปรเจกต์ให้เหมาะสมกับการทำงานบน Git และลดขนาด Repository

### Step 15.1 — Git Hygiene & UI Stability
- [x] สร้าง `.gitignore` ที่ครอบคลุม (node_modules, dist, bin/*.exe)
- [x] ลบไฟล์ขนาดใหญ่ที่เคยถูก track ใน Git history (ถ้ามี)
- [x] แก้ไข Critical UI Bug ใน `TimelineEditor` (Snap points type error & Playhead drag freeze)
- [ ] แนะนำการใช้ Git LFS หากจำเป็นต้องเก็บไฟล์ขนาดใหญ่จริงๆ

---

## ✨ Phase 16: UX/UI Refinement & Premium Polish (Current)

### เป้าหมาย:
ยกระดับประสบการณ์ผู้ใช้ (UX) และหน้าตาโปรแกรม (UI) ให้ดูพรีเมียมและลื่นไหลระดับ CapCut

### Step 16.1 — Unified Design System
- [ ] ปรับ TimelineEditor และ PreviewPanel ให้เป็น Glassmorphism สไตล์เดียวกับ ClipCard
- [ ] เปลี่ยน Emoji Icons เป็น Professional SVG Icons (Lucide/Heroicons)
- [ ] กำหนดมาตรฐาน Color Palette (Deep Dark + Purple Neon)

### Step 16.2 — Advanced Timeline Interactions
- [ ] ระบบ Snap Guides (Magnetic Snapping) พร้อมเส้นไกด์สีแดง
- [ ] Ghosting/Preview Effect ขณะลากคลิปบน Timeline
- [ ] ปรับปรุง Playhead ให้ดูเป็นมืออาชีพ

### Step 16.3 — Tooling & Modals
- [ ] จัดกลุ่ม Toolbar ใหม่ (Transport, Edit, Library, Settings)
- [ ] ปรับปรุง Text/Overlay Editor Modal ให้สวยงามและใช้งานง่ายขึ้น
- [ ] เพิ่ม Micro-animations ด้วย Framer Motion ในทุกจุดสัมผัส

---

## 🎯 Vision
KERN-R Studio จะเป็นเครื่องมือตัดต่อวิดีโอครบวงจรที่:
1. **ใช้ง่าย** — เลือก Preset แล้วทำตามขั้นตอน
2. **ยืดหยุ่น** — ตัดต่อระดับวินาที ใส่ effect ได้ทุกจุด
3. **เสียง AI ดี** — หลาย Engine ให้เลือก ดึงดูดความสนใจ
4. **ฟรี** — ทำงานบนเครื่อง ไม่เสียค่า Server
5. **สวยงาม** — UI ระดับ CapCut + Premium
