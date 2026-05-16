import * as fs from 'fs';
import * as path from 'path';

export interface SubtitleItem {
  text: string;
  start: number; // seconds
  end: number; // seconds
}

export class SubtitleEngine {
  /**
   * Generates an .ass file with styling for Thai/English support
   */
  static generateASS(
    items: SubtitleItem[],
    outputPath: string,
    options: any = {},
  ): void {
    const fontSize = options.fontSize || 24;
    const primaryColor = options.primaryColor || '&H00FFFFFF'; // ABGR
    const outlineColor = options.outlineColor || '&H00000000';
    const fontName = options.fontName || 'Kanit SemiBold';

    let content = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${primaryColor},&H000000FF,${outlineColor},&H00000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,100,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    items.forEach((item) => {
      const start = this.formatTime(item.start);
      const end = this.formatTime(item.end);
      const text = item.text.replace(/\n/g, '\\N');

      let tags = '';
      if (options.animation === 'fade') {
        tags += '\\fad(300,300)'; // 300ms fade in/out
      } else if (options.animation === 'typewriter') {
        const durMs = (item.end - item.start) * 1000;
        tags += `\\t(0,${durMs},\\clip(0,0,0,1920))\\t(0,${durMs},\\clip(0,0,1080,1920))`;
      }

      const finalLine = tags ? `{\\${tags}}${text}` : text;
      content += `Dialogue: 0,${start},${end},Default,,0,0,0,,${finalLine}\n`;
    });

    fs.writeFileSync(outputPath, content, 'utf8');
  }

  private static formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }
}
