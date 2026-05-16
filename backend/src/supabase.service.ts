import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Supabase URL or Key is missing in environment variables',
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  async updateJobStatus(
    jobId: string,
    status: string,
    progress: number,
    finalVideoUrl?: string,
  ) {
    const { error } = await this.supabase
      .from('video_jobs')
      .update({ status, progress, final_video_url: finalVideoUrl })
      .eq('id', jobId);

    if (error) {
      console.error('Error updating job status:', error);
    }
  }

  async uploadFile(filePath: string, fileName: string): Promise<string | null> {
    const fs = require('fs');
    const path = require('path');
    const fileContent = fs.readFileSync(filePath);
    const ext = path.extname(fileName).toLowerCase();

    let contentType = 'application/octet-stream';
    if (ext === '.mp4') contentType = 'video/mp4';
    else if (ext === '.mp3') contentType = 'audio/mpeg';
    else if (ext === '.wav') contentType = 'audio/wav';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.gif') contentType = 'image/gif';

    const { data, error } = await this.supabase.storage
      .from('assets')
      .upload(fileName, fileContent, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error('Error uploading to Supabase:', error);
      return null;
    }

    const { data: publicUrlData } = this.supabase.storage
      .from('assets')
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  }
}
