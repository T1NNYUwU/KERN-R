import { SupabaseService } from '../supabase.service';
import * as fs from 'fs';
import * as path from 'path';

export abstract class BaseProcessor {
  constructor(protected readonly supabaseService: SupabaseService) {}

  abstract process(
    jobId: string,
    videoSettings: any,
    itemsPayload: any[],
  ): Promise<string>;

  protected getBinaryPath(name: string): string {
    const isElectron = process.env.IS_ELECTRON === 'true';
    const binRoot = process.env.BIN_ROOT;
    if (isElectron && binRoot) {
      const binPath = path.join(
        binRoot,
        `${name}${process.platform === 'win32' ? '.exe' : ''}`,
      );
      if (fs.existsSync(binPath)) {
        return `"${binPath.replace(/\\/g, '/')}"`;
      }
    }
    return name;
  }

  protected hexToFFmpegColor(hex: string): string {
    if (!hex) return 'white';
    return hex.replace('#', '0x') + '@1.0';
  }

  protected async cleanup(dir: string) {
    try {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch (e) {}
  }
}
