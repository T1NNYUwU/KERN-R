import { Controller, Post, Get, Body, Param, Query, NotFoundException, UseInterceptors, UploadedFile, Logger } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { VideoQueueService } from './video-queue.service';
import { SupabaseService } from './supabase.service';
import { v4 as uuidv4 } from 'uuid';
import { execSync } from 'child_process';
import { TTSEngine } from './engines/tts.engine';

const BACKEND_URL = process.env.IS_ELECTRON === 'true' ? 'http://localhost:3005' : 'http://localhost:3005';

@Controller('api/videos')
export class VideoController {
  private readonly logger = new Logger(VideoController.name);

  constructor(
    private readonly videoQueueService: VideoQueueService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private getBinaryPath(name: string): string {
    const isElectron = process.env.IS_ELECTRON === 'true';
    const binRoot = process.env.BIN_ROOT;
    if (isElectron && binRoot) {
      const binPath = path.join(binRoot, `${name}${process.platform === 'win32' ? '.exe' : ''}`);
      if (fs.existsSync(binPath)) {
         return `"${binPath.replace(/\\/g, '/')}"`;
      }
    }
    return name;
  }

  @Get('preview')
  async getVideoPreview(@Query('url') url: string) {
    try {
      const ytdlp = this.getBinaryPath('yt-dlp');
      
      // 1. Get metadata
      const info = execSync(
        `${ytdlp} --dump-json --no-playlist "${url}"`,
        { timeout: 30000, maxBuffer: 10 * 1024 * 1024 }
      ).toString();
      const data = JSON.parse(info);

      // 2. Download a lightweight proxy version for the editor preview
      const tempDir = path.join(process.cwd(), 'temp', 'previews');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      
      const hash = require('crypto').createHash('md5').update(url).digest('hex');
      const filename = `${hash}.mp4`;
      const filepath = path.join(tempDir, filename);

      if (!fs.existsSync(filepath)) {
         this.logger.log(`Downloading proxy for preview: ${url}`);
         // Use a fast, low-res mp4 for the preview editor
         execSync(
           `${ytdlp} -f "b[ext=mp4][height<=480]/w[ext=mp4]/b" -o "${filepath}" "${url}"`,
           { timeout: 120000 }
         );
      }

      return {
        thumbnail: data.thumbnail,
        title: data.title,
        duration: data.duration,
        uploader: data.uploader,
        videoUrl: `${BACKEND_URL}/temp/previews/${filename}`
      };
    } catch (error) {
      this.logger.error('Error fetching preview', error);
      return { error: 'Cannot fetch video info' };
    }
  }

  @Post('preview-voice')
  async previewVoice(@Body() body: { text: string; voice: string; engine: string }) {
    const tempFile = `preview_${Date.now()}.mp3`;
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const tempPath = path.join(tempDir, tempFile);
    
    await TTSEngine.generate({
      text: body.text || 'สวัสดีครับ นี่คือตัวอย่างเสียงพากย์ AI',
      outputFile: tempPath,
      engine: (body.engine as 'edge' | 'kokoro' | 'piper') || 'edge',
      voice: body.voice
    });

    return { url: `${BACKEND_URL}/temp/${tempFile}` };
  }

  @Post('render')
  async renderTimeline(@Body() body: any) {
    const { id, clips, mediaFiles } = body;
    const jobId = id || crypto.randomUUID();
    
    this.logger.log(`Adding timeline render job: ${jobId}`);
    await this.videoQueueService.addVideoJob({
      id: jobId,
      preset_mode: 'timeline',
      clips,
      mediaFiles
    });
    
    return { jobId };
  }

  @Post('generate')
  async generate(@Body() body: { preset_mode: string; video_settings: any; items_payload: any[] }) {
    const jobId = uuidv4();
    const presetMode = body.preset_mode || 'ranking';
    const globalHeader = body.video_settings?.headerText || 'Top 5';

    const { error } = await this.supabaseService.getClient()
      .from('video_jobs')
      .insert({
        id: jobId,
        global_header: globalHeader,
        items_payload: body.items_payload,
        status: 'PENDING',
        progress: 0,
        // we can store preset_mode in metadata if needed, but for now we pass it to queue
      });

    if (error) {
      this.logger.error('Error inserting job:', error);
      throw new Error('Failed to create video job');
    }

    await this.videoQueueService.addVideoJob({
      id: jobId,
      preset_mode: presetMode,
      video_settings: body.video_settings,
      items_payload: body.items_payload,
    });

    return { job_id: jobId };
  }

  @Post('upload-music')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const dir = path.join(process.cwd(), 'temp', 'music');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
    }),
  }))
  async uploadMusic(@UploadedFile() file: Express.Multer.File) {
    return { musicPath: file.path };
  }

  @Post('upload-overlay')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        try {
          const dir = path.join(process.cwd(), 'temp', 'overlays');
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        } catch (e) {
          cb(e as Error, '');
        }
      },
      filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`),
    }),
  }))
  async uploadOverlay(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      this.logger.error('No file uploaded');
      throw new Error('File upload failed');
    }
    this.logger.log(`Overlay uploaded: ${file.path}`);
    return { imagePath: file.path };
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const dir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}-${file.originalname.replace(/\s+/g, '_')}`);
      },
    }),
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('File upload failed');

    let publicUrl = `${BACKEND_URL}/uploads/${file.filename}`;

    // Try to upload to Supabase if configured
    try {
      const supabaseUrl = await this.supabaseService.uploadFile(file.path, `assets/${file.filename}`);
      if (supabaseUrl) {
        publicUrl = supabaseUrl;
        this.logger.log(`File uploaded to Supabase: ${publicUrl}`);
      }
    } catch (e) {
      this.logger.warn('Failed to upload to Supabase, falling back to local URL');
    }

    return { 
      url: publicUrl,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size
    };
  }

  @Get('status/:id')
  async getStatus(@Param('id') id: string) {
    const { data, error } = await this.supabaseService.getClient()
      .from('video_jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Job not found');
    }

    return data;
  }
}
