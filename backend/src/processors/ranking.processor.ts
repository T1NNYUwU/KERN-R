import { BaseProcessor } from './base.processor';
import { SupabaseService } from '../supabase.service';
import { EffectsEngine } from '../engines/effects.engine';
import { TTSEngine } from '../engines/tts.engine';
import { SubtitleEngine } from '../engines/subtitle.engine';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export class RankingProcessor extends BaseProcessor {
  constructor(supabaseService: SupabaseService) {
    super(supabaseService);
  }

  private hasAudioStream(filePath: string): boolean {
    const ffprobe = this.getBinaryPath('ffprobe');
    try {
      const out = execSync(
        `${ffprobe} -v error -select_streams a:0 -show_entries stream=index -of csv=p=0 "${filePath}"`,
      )
        .toString()
        .trim();
      return out.length > 0;
    } catch {
      return false;
    }
  }

  private getAnimationExpr(
    animation: string,
    baseY: string,
    delay = 0.3,
  ): string {
    switch (animation) {
      case 'slide':
        return `enable='gte(t,${delay})':y='${baseY}+150*max(0,1-(t-${delay})/0.4)'`;
      default:
        return `enable='gte(t,${delay})'`;
    }
  }

  async process(
    id: string,
    video_settings: any,
    items_payload: any[],
  ): Promise<string> {
    const tempDir = path.join(process.cwd(), 'temp', id);
    const ffmpeg = this.getBinaryPath('ffmpeg');
    const ffprobe = this.getBinaryPath('ffprobe');
    const ytdlp = this.getBinaryPath('yt-dlp');

    if (process.platform === 'win32') {
      process.env.FONTCONFIG_FILE = 'NUL';
      process.env.FONTCONFIG_PATH = 'NUL';
    }

    const headerText = video_settings.headerText || '';
    const headerFontSize = video_settings.headerFontSize || 80;
    const headerColor = video_settings.headerColor || '#ffffff';
    const headerX = video_settings.headerX || 540;
    const headerY = video_settings.headerY || 120;
    const headerAlign = video_settings.headerAlign || 'center';
    const subTitles = video_settings.subTitles || [];
    const overlayImages = video_settings.overlayImages || [];
    const bgColor = video_settings.bgColor || '#000000';
    const rankNumberColor = video_settings.rankNumberColor || '#FFD700';
    const rankFontSize = video_settings.rankFontSize || 100;
    const rankX = video_settings.rankX || 40;
    const rankY_raw = video_settings.rankY || 0;
    const videoY_raw = video_settings.videoY ?? -1;

    const bgColorFFmpeg = this.hexToFFmpegColor(bgColor);
    const headerColorFFmpeg = this.hexToFFmpegColor(headerColor);

    try {
      await this.supabaseService.updateJobStatus(id, 'PROCESSING', 10);
      fs.mkdirSync(tempDir, { recursive: true });
      const clipPaths: string[] = [];

      const localFontName = 'f.ttf';
      const localEmojiName = 'e.ttf';
      try {
        fs.copyFileSync(
          'C:\\Windows\\Fonts\\seguib.ttf',
          path.join(tempDir, localFontName),
        );
      } catch (e) {
        try {
          fs.copyFileSync(
            'C:\\Windows\\Fonts\\arialbd.ttf',
            path.join(tempDir, localFontName),
          );
        } catch (e2) {}
      }
      try {
        fs.copyFileSync(
          'C:\\Windows\\Fonts\\seguiemj.ttf',
          path.join(tempDir, localEmojiName),
        );
      } catch (e) {
        try {
          fs.copyFileSync(
            path.join(tempDir, localFontName),
            path.join(tempDir, localEmojiName),
          );
        } catch (e2) {}
      }

      for (let i = 0; i < items_payload.length; i++) {
        const item = items_payload[i];
        const rank = items_payload.length - i;
        const itemDir = path.join(tempDir, `rank_${rank}`);
        fs.mkdirSync(itemDir, { recursive: true });

        fs.copyFileSync(
          path.join(tempDir, localFontName),
          path.join(itemDir, localFontName),
        );
        fs.copyFileSync(
          path.join(tempDir, localEmojiName),
          path.join(itemDir, localEmojiName),
        );

        const rawVideoPath = path.join(itemDir, 'raw_clip.mp4');
        const videoPath = path.join(itemDir, 'output_clip.mp4');

        const audioMode = item.audioMode || 'ai';
        const textAnimation = item.textAnimation || 'fade';
        const startTime = parseFloat(item.startTime) || 0;
        const endTime = item.endTime
          ? parseFloat(item.endTime)
          : startTime + 30;
        const finalDuration = Math.max(0.1, endTime - startTime);

        const escapedHeader = (headerText || '').replace(/'/g, "'\\\\\\''");
        const itemRankColor = item.rankColor || rankNumberColor;
        const itemRankColorFFmpeg = this.hexToFFmpegColor(itemRankColor);
        const itemVideoHeightPct = item.videoHeightPct || 70;
        const targetH = Math.round((1920 * itemVideoHeightPct) / 100);

        // Download
        const isYouTube =
          item.link.includes('youtube.com') || item.link.includes('youtu.be');
        try {
          if (isYouTube) {
            const sectionArg = `*${startTime}-${endTime}`;
            execSync(
              `${ytdlp} --js-runtime node --download-sections "${sectionArg}" -f "bestvideo[vcodec^=avc1][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]" ` +
                `"${item.link}" -o "${rawVideoPath.replace(/\\/g, '/')}" --force-overwrites -q`,
              { timeout: 300000 },
            );
          } else {
            execSync(
              `${ytdlp} --js-runtime node -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]" ` +
                `"${item.link}" -o "${rawVideoPath.replace(/\\/g, '/')}" --force-overwrites -q`,
              { timeout: 300000 },
            );
          }
        } catch (e) {
          execSync(
            `${ffmpeg} -f lavfi -i color=c=black:s=1080x1920:d=${finalDuration} -c:v libx264 -pix_fmt yuv420p "${rawVideoPath}" -y`,
          );
        }

        // ── Phase 14: Automatic SFX per Rank
        const items = item.timelineItems || [];
        if (rank === 1) {
          // Add Drum Roll for Rank 1
          items.push({
            id: 'auto-drumroll',
            type: 'sfx',
            name: 'Drum Roll',
            startTime: 0,
            duration: 3,
            path: 'https://cdn.pixabay.com/audio/2022/01/18/audio_651a2a5371.mp3',
          });
        } else {
          // Add Whoosh for other ranks
          items.push({
            id: 'auto-whoosh',
            type: 'sfx',
            name: 'Whoosh',
            startTime: 0,
            duration: 1,
            path: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c35071190d.mp3',
          });
        }
        item.timelineItems = items;

        const clipHasAudio = this.hasAudioStream(rawVideoPath);
        let clipDuration = finalDuration;
        let inputArgs = isYouTube
          ? `-i "raw_clip.mp4"`
          : `-ss ${startTime} -t ${finalDuration} -i "raw_clip.mp4"`;
        let audioMapIdx = 0;

        // ── Phase 11: AI Voice with TTSEngine
        if (audioMode === 'ai') {
          const script = item.script || '';
          try {
            const voice = item.voice || 'th-TH-NiwatNeural';
            await TTSEngine.generate({
              text: script,
              outputFile: 'audio.mp3',
              engine: item.ttsEngine || 'edge',
              voice: voice,
            });
            const durStr = execSync(
              `${ffprobe} -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "audio.mp3"`,
              { cwd: itemDir },
            )
              .toString()
              .trim();
            clipDuration = Math.min(parseFloat(durStr), finalDuration);
            inputArgs += ` -i "audio.mp3"`;
            audioMapIdx = 1;

            // ── Phase 11.6: Generate Subtitles from Script
            if (script) {
              SubtitleEngine.generateASS(
                [{ text: script, start: 0, end: clipDuration }],
                path.join(itemDir, 'sub.ass'),
                { fontName: 'Kanit SemiBold', fontSize: 24 },
              );
            }
          } catch (e) {
            execSync(
              `${ffmpeg} -f lavfi -t ${finalDuration} -i anullsrc=sample_rate=44100 -c:a aac "silent_tts.aac" -y`,
              { cwd: itemDir },
            );
            inputArgs += ` -i "silent_tts.aac"`;
            audioMapIdx = 1;
          }
        } else if (audioMode === 'music') {
          if (item.musicPath) {
            inputArgs += ` -i "${item.musicPath.replace(/\\/g, '/')}"`;
            audioMapIdx = 1;
          } else {
            // Fallback to Silence (Global BGM will be mixed in at the end)
            execSync(
              `${ffmpeg} -f lavfi -t ${finalDuration} -i anullsrc=sample_rate=44100 -c:a aac "silent_music.aac" -y`,
              { cwd: itemDir },
            );
            inputArgs += ` -i "silent_music.aac"`;
            audioMapIdx = 1;
          }
        } else if (audioMode === 'clip' && !clipHasAudio) {
          execSync(
            `${ffmpeg} -f lavfi -t ${finalDuration} -i anullsrc=sample_rate=44100 -c:a aac "silent.aac" -y`,
            { cwd: itemDir },
          );
          inputArgs += ` -i "silent.aac"`;
          audioMapIdx = 1;
        }

        const N = items_payload.length;
        const SPACING = Math.max(140, rankFontSize * 1.2);
        const groupStartY =
          rankY_raw !== 0
            ? rankY_raw
            : Math.round(1920 / 2 - ((N - 1) * SPACING) / 2) - 150;
        const videoY = videoY_raw !== -1 ? videoY_raw : '(oh-ih)/2';
        const h1X =
          headerAlign === 'left'
            ? `${headerX}`
            : headerAlign === 'right'
              ? `${headerX}-text_w`
              : `${headerX}-text_w/2`;
        const fontFilter = `:fontfile=${localFontName}`;

        let filterComplex = `[0:v]setpts=PTS-STARTPTS,fps=30,scale=-2:${targetH},pad=1080:1920:(ow-iw)/2:${videoY}:color=${bgColorFFmpeg},setsar=1[bg];`;
        let vCur = 'bg';
        let aCur = `${audioMapIdx}:a`;

        let currentInputIdx = inputArgs.split(' -i ').length;
        for (let j = 0; j < overlayImages.length; j++) {
          const img = overlayImages[j];
          if (fs.existsSync(img.path)) {
            inputArgs += ` -i "${img.path.replace(/\\/g, '/')}"`;
            const vNext = `vimg${j}`;
            filterComplex += `[${currentInputIdx}:v]scale=${img.w}:${img.h}[ov${j}];[${vCur}][ov${j}]overlay=${img.x}-w/2:${img.y}-h/2[${vNext}];`;
            vCur = vNext;
            currentInputIdx++;
          }
        }

        filterComplex += `[${vCur}]drawtext=text='${escapedHeader}':fontcolor=${headerColorFFmpeg}:fontsize=${headerFontSize}:x=${h1X}:y=${headerY}${fontFilter}[vt]`;
        vCur = 'vt';

        // ── Phase 10: Apply Effects (SFX & Overlays from Timeline)
        const fx = EffectsEngine.buildFilter(
          item.timelineItems || [],
          vCur,
          `${audioMapIdx}:a`,
          currentInputIdx,
          itemDir,
        );
        if (fx.filter) {
          inputArgs += fx.inputArgs;
          filterComplex += `;${fx.filter}`;
          vCur = fx.vOut;
          aCur = fx.aOut;
          currentInputIdx = fx.nextInputIdx;
        }

        // Apply Subtitles if exists
        if (fs.existsSync(path.join(itemDir, 'sub.ass'))) {
          const vNext = `vsub`;
          // FFmpeg ass filter requires escaped path for Windows
          const escapedAssPath = 'sub.ass'.replace(/:/g, '\\\\:');
          filterComplex += `;[${vCur}]ass=${escapedAssPath}[${vNext}]`;
          vCur = vNext;
        }

        for (let j = 0; j < subTitles.length; j++) {
          const sub = subTitles[j];
          const escapedSub = (sub.text || '').replace(/'/g, "'\\\\\\''");
          const subColor = this.hexToFFmpegColor(sub.color || '#ffffff');
          const vNext = `vst${j}`;
          filterComplex += `;[${vCur}]drawtext=text='${escapedSub}':fontcolor=${subColor}:fontsize=${sub.fontSize}:x=${sub.x}-text_w/2:y=${sub.y}-text_h/2${fontFilter}[${vNext}]`;
          vCur = vNext;
        }

        for (let j = 0; j < N; j++) {
          const jIdxInPayload = N - 1 - j;
          const jItem = items_payload[jIdxInPayload];
          const jRank = j + 1;
          const jY = groupStartY + j * SPACING;
          const currentRankNumber = N - i;
          const isActive = jRank === currentRankNumber;
          const jColor = jItem.rankColor
            ? this.hexToFFmpegColor(jItem.rankColor)
            : itemRankColorFFmpeg;
          const opacity = isActive ? '' : '@0.5';
          const vNext = `vr${j}`;
          filterComplex += `;[${vCur}]drawtext=text='${jRank}.':fontcolor=${jColor}${opacity}:fontsize=${rankFontSize}:x=${rankX}:y=${jY}${fontFilter}[${vNext}]`;
          vCur = vNext;

          if (jRank >= currentRankNumber) {
            if (jItem.clipTitle) {
              const titleFs = jItem.clipTitleFontSize || 52;
              const titleColor = jItem.clipTitleColor
                ? this.hexToFFmpegColor(jItem.clipTitleColor)
                : 'white';
              const titleX = rankX + rankFontSize * 1.1;
              const titleY = jY + rankFontSize * 0.1;
              const strokeW = jItem.clipTitleStroke || 2;
              const strokeC = jItem.clipTitleStrokeColor
                ? this.hexToFFmpegColor(jItem.clipTitleStrokeColor)
                : '0x000000';
              const titleAnim = isActive
                ? this.getAnimationExpr(textAnimation, '0', 0.3)
                : '';
              const escapedTitle = (jItem.clipTitle || '').replace(
                /'/g,
                "'\\\\\\''",
              );
              const vNextTitle = `vrt${j}`;
              filterComplex += `;[${vCur}]drawtext=text='${escapedTitle}':fontcolor=${titleColor}${opacity}:fontsize=${titleFs}:x=${titleX}:y=${titleY}:fontfile=${localFontName}:borderw=${strokeW}:bordercolor=${strokeC}:line_spacing=10:${titleAnim}[${vNextTitle}]`;
              vCur = vNextTitle;
            }
          }
        }

        // ── Phase 14: Flash Transition at the end
        const flashStartTime = Math.max(0, clipDuration - 0.2);
        const vFlash = `vflash`;
        filterComplex += `;[${vCur}]drawbox=y=0:color=white@'if(between(t,${flashStartTime},${clipDuration}),(t-${flashStartTime})/0.2,0)':width=iw:height=ih:t=fill[${vFlash}]`;
        vCur = vFlash;

        filterComplex += `;[${vCur}]copy[vout];[${aCur}]asetpts=PTS-STARTPTS,aresample=44100,apad[aout]`;
        execSync(
          `${ffmpeg} ${inputArgs} -filter_complex "${filterComplex}" -map "[vout]" -map "[aout]" -t ${clipDuration} -c:v libx264 -preset fast -pix_fmt yuv420p -r 30 -c:a aac -ar 44100 "output_clip.mp4" -y`,
          { cwd: itemDir },
        );
        clipPaths.push(videoPath);
        await this.supabaseService.updateJobStatus(
          id,
          'PROCESSING',
          Math.min(15 + Math.floor(((i + 1) / N) * 70), 85),
        );
      }

      const listPath = path.join(tempDir, 'clips.txt');
      fs.writeFileSync(
        listPath,
        clipPaths.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n'),
      );
      const finalPath = path.join(tempDir, 'final.mp4');
      const globalMusicPath = video_settings.globalMusicPath;
      const globalMusicVolume = video_settings.globalMusicVolume ?? 20;

      if (globalMusicPath) {
        const safeMusicPath = globalMusicPath.replace(/\\/g, '/');
        const volFloat = globalMusicVolume / 100;
        execSync(
          `${ffmpeg} -f concat -safe 0 -i "clips.txt" -i "${safeMusicPath}" -filter_complex "[0:a]volume=1.0[a0];[1:a]volume=${volFloat}[a1];[a0][a1]amix=inputs=2:duration=first[aout]" -map 0:v -map "[aout]" -c:v libx264 -preset fast -pix_fmt yuv420p -c:a aac -ar 44100 -async 1 "final.mp4" -y`,
          { cwd: tempDir },
        );
      } else {
        execSync(
          `${ffmpeg} -f concat -safe 0 -i "clips.txt" -c:v libx264 -preset fast -pix_fmt yuv420p -c:a aac -ar 44100 -async 1 "final.mp4" -y`,
          { cwd: tempDir },
        );
      }

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
