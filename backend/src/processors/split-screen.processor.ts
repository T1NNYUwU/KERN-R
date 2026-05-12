import { BaseProcessor } from './base.processor';
import { SupabaseService } from '../supabase.service';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export class SplitScreenProcessor extends BaseProcessor {
  constructor(supabaseService: SupabaseService) {
    super(supabaseService);
  }

  async process(id: string, video_settings: any, items_payload: any[]): Promise<string> {
    const tempDir = path.join(process.cwd(), 'temp', id);
    const ffmpeg = this.getBinaryPath('ffmpeg');
    const ytdlp = this.getBinaryPath('yt-dlp');

    try {
      await this.supabaseService.updateJobStatus(id, 'PROCESSING', 10);
      fs.mkdirSync(tempDir, { recursive: true });
      
      const inputs: string[] = [];
      const numClips = Math.min(items_payload.length, 4); // Limit to 4 for now

      for (let i = 0; i < numClips; i++) {
        const item = items_payload[i];
        const clipPath = path.join(tempDir, `clip_${i}.mp4`);
        const processedPath = path.join(tempDir, `proc_${i}.mp4`);
        
        try {
          execSync(`${ytdlp} -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]" "${item.link}" -o "${clipPath}" --force-overwrites -q`);
        } catch (e) {
          execSync(`${ffmpeg} -f lavfi -i color=c=black:s=960x540:d=10 -c:v libx264 "${clipPath}" -y`);
        }

        // Resize each clip to half of 1080p (960x540) for 2x2 grid
        execSync(`${ffmpeg} -i "${clipPath}" -vf "scale=960:540:force_original_aspect_ratio=increase,crop=960:540,fps=30" -c:v libx264 -pix_fmt yuv420p "${processedPath}" -y`);
        inputs.push(processedPath);
      }

      const finalPath = path.join(tempDir, 'final.mp4');
      
      const layoutMode = video_settings.layout || '2x1';
      let filter = '';
      let amix = '';
      
      for (let i = 0; i < numClips; i++) {
        amix += `[${i}:a]volume=1.0[a${i}];`;
      }
      amix += `${inputs.map((_, i) => `[a${i}]`).join('')}amix=inputs=${numClips}:duration=longest[aout]`;

      if (layoutMode === '2x1') {
        filter = `[0:v][1:v]hstack=inputs=2[v]`;
      } else if (layoutMode === '2x1-V') {
        filter = `[0:v][1:v]vstack=inputs=2[v]`;
      } else if (layoutMode === '2x2') {
        filter = `[0:v][1:v][2:v][3:v]xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0[v]`;
      } else if (layoutMode === '3-Up') {
        filter = `[0:v][1:v][2:v]xstack=inputs=3:layout=0_0|w0_0|w0+w1_0[v]`;
      } else {
        filter = `[0:v]scale=1920:1080[v]`;
      }

      const inputArgs = inputs.map(p => `-i "${p}"`).join(' ');
      execSync(`${ffmpeg} ${inputArgs} -filter_complex "${filter};${amix}" -map "[v]" -map "[aout]" -c:v libx264 -preset fast -pix_fmt yuv420p "final.mp4" -y`, { cwd: tempDir });

      const publicUrl = await this.supabaseService.uploadFile(finalPath, `${id}.mp4`);
      await this.supabaseService.updateJobStatus(id, 'COMPLETED', 100, publicUrl || undefined);
      await this.cleanup(tempDir);
      return publicUrl || '';
    } catch (e) {
      console.error(e);
      await this.supabaseService.updateJobStatus(id, 'FAILED', 0);
      await this.cleanup(tempDir);
      throw e;
    }
  }
}
