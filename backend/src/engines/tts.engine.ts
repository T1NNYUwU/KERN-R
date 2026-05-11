import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface TTSOptions {
  text: string;
  voice?: string;
  outputFile: string;
  engine: 'edge' | 'kokoro' | 'piper';
  speed?: number;
  pitch?: number;
}

export class TTSEngine {
  static async generate(options: TTSOptions): Promise<void> {
    const { text, outputFile, engine, voice } = options;
    
    switch (engine) {
      case 'kokoro':
        await this.generateKokoro(text, outputFile, voice);
        break;
      case 'piper':
        await this.generatePiper(text, outputFile, voice);
        break;
      case 'edge':
      default:
        await this.generateEdge(text, outputFile, voice);
        break;
    }
  }

  private static async generateEdge(text: string, outputFile: string, voice = 'th-TH-NiwatNeural'): Promise<void> {
    const escapedText = text.replace(/"/g, '\\"');
    execSync(`edge-tts --text "${escapedText}" --voice "${voice}" --write-media "${outputFile}"`);
  }

  private static async generateKokoro(text: string, outputFile: string, voice = 'af_heart'): Promise<void> {
    // Kokoro usually runs as a Python service or via a CLI wrapper
    // For now, we'll try to call a local python script if available, else fallback to edge
    try {
      // Assuming a kokoro-cli or similar is installed
      const escapedText = text.replace(/"/g, '\\"');
      execSync(`kokoro-tts --text "${escapedText}" --voice "${voice}" --output "${outputFile}"`);
    } catch (e) {
      console.warn('Kokoro TTS failed, falling back to edge-tts');
      await this.generateEdge(text, outputFile);
    }
  }

  private static async generatePiper(text: string, outputFile: string, voice = 'th-th-niwat-medium'): Promise<void> {
    try {
      const piperBin = process.env.IS_ELECTRON === 'true' 
        ? path.join(process.env.BIN_ROOT || '', 'piper', 'piper.exe')
        : 'piper';
      
      const modelPath = path.join(process.env.BIN_ROOT || '', 'piper', `${voice}.onnx`);
      
      if (!fs.existsSync(modelPath)) throw new Error('Piper model not found');

      // pipe text to piper
      execSync(`echo "${text}" | ${piperBin} --model ${modelPath} --output_file ${outputFile}`);
    } catch (e) {
      console.warn('Piper TTS failed, falling back to edge-tts');
      await this.generateEdge(text, outputFile);
    }
  }
}
