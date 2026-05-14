import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { SupabaseService } from '../supabase.service';

export class TimelineProcessor {
  constructor(private readonly supabaseService: SupabaseService) {}

  async process(id: string, clips: any[], mediaFiles: any[]): Promise<string> {
    const tempDir = path.join(process.cwd(), 'temp', id);
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    try {
      await this.supabaseService.updateJobStatus(id, 'PROCESSING', 10);

      // 1. Download/Collect all required assets
      const uniqueMediaIds = [...new Set(clips.map(c => c.mediaId))];
      const mediaMap: Record<string, string> = {};

      for (const mediaId of uniqueMediaIds) {
        const media = mediaFiles.find(m => m.id === mediaId);
        if (!media) continue;

        let localPath = path.join(process.cwd(), 'uploads', media.id + path.extname(media.name));
        
        // Ensure uploads directory exists
        const uploadsDir = path.dirname(localPath);
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

        // If file doesn't exist locally, download it from URL
        if (!fs.existsSync(localPath)) {
            const url = media.url;
            if (url && url.startsWith('http')) {
                console.log(`Downloading asset from ${url} to ${localPath}`);
                try {
                    // Use ffmpeg to download to ensure we get a compatible format or just use curl
                    // -y to overwrite, -i for input, -c copy to avoid re-encoding
                    execSync(`ffmpeg -y -i "${url}" -c copy "${localPath}"`);
                } catch (err) {
                    console.error(`Failed to download ${url}:`, err);
                    // Try curl as a backup
                    try { execSync(`curl -L -o "${localPath}" "${url}"`); } catch(e) {}
                }
            }
        }
        mediaMap[mediaId] = localPath;
      }

      // 2. Build FFmpeg Filter Graph
      const videoClips = clips.filter(c => c.type === 'video' || c.type === 'image');
      const audioClips = clips.filter(c => c.type === 'audio' || (c.type === 'video' && !c.muted));
      const textClips = clips.filter(c => c.type === 'text');
      
      const maxDuration = Math.max(...clips.map(c => c.startTime + c.duration), 0);
      
      let filterComplex = `color=c=black:s=1920x1080:d=${maxDuration}[bg];`;
      let inputArgs: string[] = [];
      const inputMap = new Map<string, number>();

      // Unique inputs for ffmpeg
      uniqueMediaIds.forEach((mid) => {
        const p = mediaMap[mid];
        if (p && fs.existsSync(p)) {
          const isImage = clips.find(c => c.mediaId === mid)?.type === 'image';
          if (isImage) {
            inputArgs.push(`-loop 1 -t ${maxDuration} -i "${p}"`);
          } else {
            inputArgs.push(`-i "${p}"`);
          }
          inputMap.set(mid, inputMap.size);
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
        let vfilters = `trim=start=${trimStart}:duration=${clip.duration},setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2`;
        
        if (clip.fadeIn)  vfilters += `,fade=t=in:st=0:d=${clip.fadeIn}`;
        if (clip.fadeOut) vfilters += `,fade=t=out:st=${clip.duration - clip.fadeOut}:d=${clip.fadeOut}`;
        
        filterComplex += `[${inputIdx}:v]${vfilters}[scaled${i}];`;
        // Overlay
        filterComplex += `[${lastVideoLabel}][scaled${i}]overlay=enable='between(t,${clip.startTime},${clip.startTime + clip.duration})'[${outLabel}];`;
        lastVideoLabel = outLabel;
      });

      // Text Layering
      textClips.forEach((clip, i) => {
        const outLabel = `t${i}`;
        const escapedText = (clip.text || '').replace(/'/g, "'\\\\\\''").replace(/:/g, '\\:');
        const fontSize = clip.fontSize || 48;
        const color = clip.color || 'white';
        // Basic positioning (can be improved)
        const x = clip.x !== undefined ? clip.x : '(w-tw)/2';
        const y = clip.y !== undefined ? clip.y : '(h-th)/2';

        filterComplex += `[${lastVideoLabel}]drawtext=text='${escapedText}':fontcolor=${color}:fontsize=${fontSize}:x=${x}:y=${y}:enable='between(t,${clip.startTime},${clip.startTime + clip.duration})'[${outLabel}];`;
        lastVideoLabel = outLabel;
      });

      // Audio Mixing
      let audioLabels: string[] = [];
      audioClips.forEach((clip, i) => {
        const inputIdx = inputMap.get(clip.mediaId);
        if (inputIdx === undefined) return;

        const trimStart = clip.trimStart || 0;
        const delayMs = Math.floor(clip.startTime * 1000);
        const vol = (clip.volume ?? 100) / 100;

        let afilters = `asetpts=PTS-STARTPTS,volume=${vol},adelay=${delayMs}|${delayMs}`;
        if (clip.fadeIn)  afilters += `,afade=t=in:st=0:d=${clip.fadeIn}`;
        if (clip.fadeOut) afilters += `,afade=t=out:st=${clip.duration - clip.fadeOut}:d=${clip.fadeOut}`;

        filterComplex += `[${inputIdx}:a]atrim=start=${trimStart}:duration=${clip.duration},${afilters}[a${i}];`;
        audioLabels.push(`[a${i}]`);
      });

      if (audioLabels.length > 0) {
        filterComplex += `${audioLabels.join('')}amix=inputs=${audioLabels.length}:duration=first[aout]`;
      } else {
        filterComplex += `anullsrc=r=44100:cl=stereo:d=${maxDuration}[aout]`;
      }

      const finalPath = path.join(tempDir, 'output.mp4');
      const ffmpegCmd = `ffmpeg -y ${inputArgs.join(' ')} -filter_complex "${filterComplex}" -map "[${lastVideoLabel}]" -map "[aout]" -c:v libx264 -preset ultrafast -crf 23 -pix_fmt yuv420p "${finalPath}"`;

      console.log('Executing FFmpeg:', ffmpegCmd);
      execSync(ffmpegCmd);

      await this.supabaseService.updateJobStatus(id, 'PROCESSING', 90);
      const publicUrl = await this.supabaseService.uploadFile(finalPath, `exports/${id}.mp4`);
      await this.supabaseService.updateJobStatus(id, 'COMPLETED', 100, publicUrl || undefined);

      return publicUrl || '';
    } catch (error) {
      console.error('Timeline render failed:', error);
      await this.supabaseService.updateJobStatus(id, 'FAILED', 0);
      throw error;
    } finally {
      // Cleanup
      try {
        if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {}
    }
  }
}
