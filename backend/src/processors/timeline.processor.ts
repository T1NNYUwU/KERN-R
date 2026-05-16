import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
import * as path from 'path';
import * as fs from 'fs';
import { SupabaseService } from '../supabase.service';

export class TimelineProcessor {
  constructor(private readonly supabaseService: SupabaseService) {}

  async process(id: string, clips: any[], mediaFiles: any[]): Promise<string> {
    const tempDir = path.join(process.cwd(), 'temp', id);
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    try {
      if (!clips || clips.length === 0) {
        throw new Error('No clips found in timeline');
      }

      await this.supabaseService.updateJobStatus(id, 'PROCESSING', 10);

      // 1. Download/Collect all required assets in PARALLEL
      const uniqueMediaIds = [...new Set(clips.map(c => c.mediaId))];
      const mediaMap: Record<string, string> = {};

      console.log(`[Timeline] Preparing ${uniqueMediaIds.length} assets in parallel...`);
      
      await Promise.all(uniqueMediaIds.map(async (mediaId) => {
        const media = mediaFiles.find(m => m.id === mediaId);
        if (!media) {
          console.warn(`[Timeline] Media ${mediaId} not found in mediaFiles list`);
          return;
        }

        let localPath = path.join(process.cwd(), 'uploads', media.id + path.extname(media.name || '.mp4'));
        const uploadsDir = path.dirname(localPath);
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

        if (!fs.existsSync(localPath)) {
            const url = media.url;
            if (url && url.startsWith('http')) {
                try {
                    console.log(`[Timeline] Downloading asset: ${media.name}`);
                    // Use curl for faster parallel downloads than ffmpeg
                    await execAsync(`curl -L -s -o "${localPath}" "${url}"`);
                } catch (err) {
                    try { await execAsync(`ffmpeg -y -i "${url}" -c copy "${localPath}"`); } catch(e) {}
                }
            }
        }
        mediaMap[mediaId] = localPath;
      }));

      // 2. Build FFmpeg Filter Graph
      const videoClips = clips.filter(c => c.type === 'video' || c.type === 'image');
      const audioClips = clips.filter(c => c.type === 'audio' || (c.type === 'video' && !c.muted));
      const textClips = clips.filter(c => c.type === 'text');
      
      const maxDuration = Math.max(...clips.map(c => c.startTime + c.duration), 0);
      if (maxDuration <= 0) {
        throw new Error('Timeline duration is 0. Add some clips before exporting.');
      }
      
      let filterComplex = `color=c=black:s=1920x1080:d=${maxDuration},format=yuv420p[bg];`;
      let inputArgs: string[] = [];
      const inputMap = new Map<string, number>();

      // Unique inputs for ffmpeg
      uniqueMediaIds.forEach((mid) => {
        const p = mediaMap[mid];
        if (p && fs.existsSync(p)) {
          const inputIdx = inputArgs.length;
          const isImage = clips.find(c => c.mediaId === mid)?.type === 'image';
          if (isImage) {
            inputArgs.push(`-loop 1 -t ${maxDuration} -i "${p}"`);
          } else {
            inputArgs.push(`-i "${p}"`);
          }
          inputMap.set(mid, inputIdx);
        } else {
          console.error(`[Timeline] Missing physical file for mediaId: ${mid}`);
        }
      });

      // Video Layering (Videos and Images)
      let lastVideoLabel = 'bg';
      videoClips.sort((a, b) => a.startTime - b.startTime).forEach((clip, i) => {
        const inputIdx = inputMap.get(clip.mediaId);
        if (inputIdx === undefined) return;

        const trimStart = clip.trimStart || 0;
        const outLabel = `v${i}`;
        
        // Scale, Trim and Fades
        const scale = (clip.scaleX ?? 100) / 100;
        const opacity = (clip.opacity ?? 100) / 100;

        let vfilters = `trim=start=${trimStart}:duration=${clip.duration},setpts=PTS-STARTPTS,scale=w=iw*${scale}:h=-1:flags=fast_bilinear`;
        
        if (opacity < 1) vfilters += `,format=rgba,colorchannelmixer=aa=${opacity}`;
        if (clip.fadeIn)  vfilters += `,fade=t=in:st=0:d=${clip.fadeIn}`;
        if (clip.fadeOut) vfilters += `,fade=t=out:st=${clip.duration - clip.fadeOut}:d=${clip.fadeOut}`;
        
        // Color EQ (Brightness/Contrast/Saturation)
        const bright = Math.min(Math.max(((clip.brightness ?? 100) - 100) / 100, -1), 1);
        const contrast = Math.min(Math.max((clip.contrast ?? 100) / 100, 0), 10);
        const saturation = Math.min(Math.max((clip.saturation ?? 100) / 100, 0), 3);
        if (bright !== 0 || contrast !== 1 || saturation !== 1) {
          vfilters += `,eq=brightness=${bright}:contrast=${contrast}:saturation=${saturation}`;
        }
        
        filterComplex += `[${inputIdx}:v]${vfilters}[v_proc${i}];`;
        
        // Overlay with position (posX/posY are % of clip's own size in CSS translate)
        const px = (clip.posX ?? 0) / 100;
        const py = (clip.posY ?? 0) / 100;
        const xPos = `(W-w)/2+(w*${px})`;
        const yPos = `(H-h)/2+(h*${py})`;
        
        filterComplex += `[${lastVideoLabel}][v_proc${i}]overlay=x='${xPos}':y='${yPos}':enable='between(t,${clip.startTime},${clip.startTime + clip.duration})'[${outLabel}];`;
        lastVideoLabel = outLabel;
      });

      // Text Layering
      textClips.forEach((clip, i) => {
        const outLabel = `t${i}`;
        const escapedText = (clip.text || '').replace(/'/g, "'\\\\\\''").replace(/:/g, '\\:');
        const fontSize = Math.round((clip.textSize || 32) * (1080 / 480)); // Map UI size to 1080p
        const color = (clip.textColor || '#ffffff').replace('#', '0x');
        
        // Text Position mapping (UI uses textX/textY as 0-100% for center)
        // FFmpeg drawtext uses x/y for top-left.
        const tx = clip.textX ?? 50;
        const ty = clip.textY ?? 50;
        
        const xExpr = `(W*${tx}/100)-tw/2`;
        const yExpr = `(H*${ty}/100)-th/2`;
        
        // Windows Font Fallback (Arial)
        const fontPath = "C\\:/Windows/Fonts/arial.ttf";
        const fontOption = fs.existsSync("C:/Windows/Fonts/arial.ttf") ? `:fontfile='${fontPath}'` : "";

        filterComplex += `[${lastVideoLabel}]drawtext=text='${escapedText}':fontcolor=${color}:fontsize=${fontSize}${fontOption}:x='${xExpr}':y='${yExpr}':enable='between(t,${clip.startTime},${clip.startTime + clip.duration})'[${outLabel}];`;
        lastVideoLabel = outLabel;
      });

      // Audio Mixing
      let audioLabels: string[] = [];
      audioClips.forEach((clip, i) => {
        const inputIdx = inputMap.get(clip.mediaId);
        if (inputIdx === undefined) return;

        const trimStart = clip.trimStart || 0;
        const delayMs = Math.floor(clip.startTime * 1000);
        
        // Convert dB to Linear volume: linear = 10^(dB/20)
        const db = clip.volume ?? 0;
        const vol = Math.pow(10, db / 20);

        // Force resample and convert to stereo to ensure compatibility in amix
        let afilters = `aresample=44100,pan=stereo|c0=c0|c1=c1,asetpts=PTS-STARTPTS,volume=${vol},adelay=${delayMs}|${delayMs}`;
        if (clip.fadeIn)  afilters += `,afade=t=in:st=0:d=${clip.fadeIn}`;
        if (clip.fadeOut) afilters += `,afade=t=out:st=${clip.duration - clip.fadeOut}:d=${clip.fadeOut}`;

        filterComplex += `[${inputIdx}:a]atrim=start=${trimStart}:duration=${clip.duration},${afilters}[a${i}];`;
        audioLabels.push(`[a${i}]`);
      });

      if (audioLabels.length > 0) {
        // amix=dropout_transition=0 prevents audio from cutting off early
        // we use volume=X to normalize back after amix reduces it
        filterComplex += `${audioLabels.join('')}amix=inputs=${audioLabels.length}:duration=longest:dropout_transition=0,volume=${audioLabels.length}[aout]`;
      } else {
        filterComplex += `anullsrc=r=44100:cl=stereo:d=${maxDuration}[aout]`;
      }

      const finalPath = path.join(tempDir, 'output.mp4');
      
      // Auto-detect best encoder (Priority: NVENC > MF > x264)
      let encoder = 'libx264';
      try {
        const { stdout: encoders } = await execAsync('ffmpeg -encoders');
        if (encoders.includes('h264_nvenc')) encoder = 'h264_nvenc';
        else if (encoders.includes('h264_mf')) encoder = 'h264_mf';
      } catch (e) {}

      const ffmpegCmd = `ffmpeg -y -threads 0 ${inputArgs.join(' ')} -filter_complex "${filterComplex}" -sws_flags fast_bilinear -map "[${lastVideoLabel}]" -map "[aout]" -c:v ${encoder} ${encoder === 'libx264' ? '-preset ultrafast -crf 23' : '-rc constqp -qp 23'} -pix_fmt yuv420p "${finalPath}"`;

      console.log(`[Timeline] Executing FFmpeg Render with ${encoder}...`);
      console.log('[Timeline] Command:', ffmpegCmd);
      
      try {
        await execAsync(ffmpegCmd);
      } catch (renderErr) {
        console.error('[Timeline] FFmpeg Render Command failed!', renderErr);
        throw renderErr;
      }

      await this.supabaseService.updateJobStatus(id, 'PROCESSING', 90);
      const publicUrl = await this.supabaseService.uploadFile(finalPath, `exports/${id}.mp4`);
      
      const BACKEND_URL = process.env.IS_ELECTRON === 'true' ? 'http://127.0.0.1:3005' : 'http://127.0.0.1:3005';
      const finalUrl = publicUrl || `${BACKEND_URL}/temp/${id}/output.mp4`;

      await this.supabaseService.updateJobStatus(id, 'COMPLETED', 100, finalUrl);

      return finalUrl;
    } catch (error) {
      console.error('Timeline render failed:', error);
      await this.supabaseService.updateJobStatus(id, 'FAILED', 0);
      throw error;
    } finally {
      // Do not cleanup immediately if we need to serve the local file!
      // We will cleanup in a delayed task or let the cleanup endpoint handle it
      // For now, keep it for 10 minutes
      setTimeout(() => {
        try {
          if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) {}
      }, 600000); 
    }
  }
}
