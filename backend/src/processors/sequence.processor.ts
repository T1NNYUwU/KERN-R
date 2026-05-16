import { BaseProcessor } from './base.processor';
import { SupabaseService } from '../supabase.service';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export class SequenceProcessor extends BaseProcessor {
  constructor(supabaseService: SupabaseService) {
    super(supabaseService);
  }

  async process(
    id: string,
    video_settings: any,
    items_payload: any[],
  ): Promise<string> {
    const tempDir = path.join(process.cwd(), 'temp', id);
    const ffmpeg = this.getBinaryPath('ffmpeg');
    const ytdlp = this.getBinaryPath('yt-dlp');

    try {
      await this.supabaseService.updateJobStatus(id, 'PROCESSING', 10);
      fs.mkdirSync(tempDir, { recursive: true });
      const clipPaths: string[] = [];

      for (let i = 0; i < items_payload.length; i++) {
        const item = items_payload[i];
        const itemDir = path.join(tempDir, `clip_${i}`);
        fs.mkdirSync(itemDir, { recursive: true });

        const rawVideoPath = path.join(itemDir, 'raw.mp4');
        const outputVideoPath = path.join(itemDir, 'output.mp4');

        // Download
        try {
          execSync(
            `${ytdlp} -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]" "${item.link}" -o "${rawVideoPath}" --force-overwrites -q`,
            { timeout: 300000 },
          );
        } catch (e) {
          // Placeholder if download fails
          execSync(
            `${ffmpeg} -f lavfi -i color=c=black:s=1920x1080:d=5 -c:v libx264 -pix_fmt yuv420p "${rawVideoPath}" -y`,
          );
        }

        // Standardize to 1080p 30fps for concat stability
        execSync(
          `${ffmpeg} -i "${rawVideoPath}" -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30" -c:v libx264 -preset fast -pix_fmt yuv420p "${outputVideoPath}" -y`,
        );

        clipPaths.push(outputVideoPath);
        await this.supabaseService.updateJobStatus(
          id,
          'PROCESSING',
          15 + Math.floor((i / items_payload.length) * 70),
        );
      }

      // Concat all clips
      const listPath = path.join(tempDir, 'clips.txt');
      fs.writeFileSync(
        listPath,
        clipPaths.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n'),
      );

      const finalPath = path.join(tempDir, 'final.mp4');
      execSync(
        `${ffmpeg} -f concat -safe 0 -i "clips.txt" -c copy "final.mp4" -y`,
        { cwd: tempDir },
      );

      const publicUrl = await this.supabaseService.uploadFile(
        finalPath,
        `${id}.mp4`,
      );
      await this.supabaseService.updateJobStatus(
        id,
        'COMPLETED',
        100,
        publicUrl || undefined,
      );
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
