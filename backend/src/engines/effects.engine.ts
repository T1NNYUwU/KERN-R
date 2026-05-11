import * as fs from 'fs';
import * as path from 'path';

export class EffectsEngine {
  /**
   * Generates FFmpeg filter segments for SFX and Overlays
   */
  static buildFilter(
    timelineItems: any[], 
    baseVideoTag: string, 
    baseAudioTag: string, 
    inputOffset: number,
    tempDir: string
  ): { filter: string; inputArgs: string; vOut: string; aOut: string; nextInputIdx: number } {
    let filter = '';
    let inputArgs = '';
    let vCur = baseVideoTag;
    let aCur = baseAudioTag;
    let currentInputIdx = inputOffset;

    const sfxItems = (timelineItems || []).filter(it => it.type === 'sfx');
    const overlayItems = (timelineItems || []).filter(it => it.type === 'image' || it.type === 'video');

    // 1. Process Overlays (Visual)
    overlayItems.forEach((img, idx) => {
      if (img.content && fs.existsSync(img.content)) {
        inputArgs += ` -i "${img.content.replace(/\\/g, '/')}"`;
        const vNext = `vov_${idx}`;
        const scale = img.scale || 1.0;
        const startTime = img.startTime || 0;
        const endTime = startTime + (img.duration || 2);
        
        let animation = '';
        if (img.animation === 'pop') {
          animation = `scale='min(iw,iw*((t-${startTime})/0.3))':'min(ih,ih*((t-${startTime})/0.3))'`;
        } else if (img.animation === 'fade') {
          animation = `format=yuva420p,fade=in:st=${startTime}:d=0.3:alpha=1`;
        } else if (img.animation === 'slide') {
          // We'll handle slide via overlay expression instead of scale filter
          animation = `scale=iw:ih`; 
        } else {
          animation = `scale=iw:ih`;
        }

        const xPos = img.animation === 'slide' 
          ? `if(lt(t,${startTime}+0.5),${img.x}-w/2-1000*(1-(t-${startTime})/0.5),${img.x}-w/2)`
          : `${img.x}-w/2`;

        filter += `[${currentInputIdx}:v]${animation}[ov_${idx}];`;
        filter += `[${vCur}][ov_${idx}]overlay=x=${xPos}:y=${img.y}-h/2:enable='between(t,${startTime},${endTime})'[${vNext}];`;
        vCur = vNext;
        currentInputIdx++;
      }
    });

    // 2. Process SFX (Audio)
    if (sfxItems.length > 0) {
      let audioMixTags = [aCur];
      sfxItems.forEach((sfx, idx) => {
        // SFX content can be a local path or a URL (for simplicity we assume path for now)
        if (sfx.content && (sfx.content.startsWith('http') || fs.existsSync(sfx.content))) {
          inputArgs += ` -i "${sfx.content.replace(/\\/g, '/')}"`;
          const aTag = `asfx_${idx}`;
          const delay = Math.round(sfx.startTime * 1000);
          filter += `[${currentInputIdx}:a]adelay=${delay}|${delay}[${aTag}];`;
          audioMixTags.push(aTag);
          currentInputIdx++;
        }
      });
      
      const aNext = 'amix_out';
      filter += `${audioMixTags.join('')}amix=inputs=${audioMixTags.length}:duration=first[${aNext}]`;
      aCur = aNext;
    }

    return {
      filter,
      inputArgs,
      vOut: vCur,
      aOut: aCur,
      nextInputIdx: currentInputIdx
    };
  }
}
