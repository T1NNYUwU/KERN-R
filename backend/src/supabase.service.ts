import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL or Key is missing in environment variables');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  async updateJobStatus(jobId: string, status: string, progress: number, finalVideoUrl?: string) {
    const { error } = await this.supabase
      .from('video_jobs')
      .update({ status, progress, final_video_url: finalVideoUrl })
      .eq('id', jobId);

    if (error) {
      console.error('Error updating job status:', error);
    }
  }

  async uploadVideo(filePath: string, fileName: string): Promise<string | null> {
    const fs = require('fs');
    const fileContent = fs.readFileSync(filePath);

    const { data, error } = await this.supabase.storage
      .from('videos')
      .upload(fileName, fileContent, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (error) {
      console.error('Error uploading video:', error);
      return null;
    }

    const { data: publicUrlData } = this.supabase.storage
      .from('videos')
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  }
}
