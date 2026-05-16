import { Injectable, OnModuleInit } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { SupabaseService } from './supabase.service';
import { RankingProcessor } from './processors/ranking.processor';
import { SequenceProcessor } from './processors/sequence.processor';
import { SplitScreenProcessor } from './processors/split-screen.processor';
import { TimelineProcessor } from './processors/timeline.processor';

@Injectable()
export class VideoProcessor implements OnModuleInit {
  private worker: Worker;
  private rankingProcessor: RankingProcessor;
  private sequenceProcessor: SequenceProcessor;
  private splitScreenProcessor: SplitScreenProcessor;
  private timelineProcessor: TimelineProcessor;

  constructor(private readonly supabaseService: SupabaseService) {
    this.rankingProcessor = new RankingProcessor(supabaseService);
    this.sequenceProcessor = new SequenceProcessor(supabaseService);
    this.splitScreenProcessor = new SplitScreenProcessor(supabaseService);
    this.timelineProcessor = new TimelineProcessor(supabaseService);
  }

  onModuleInit() {
    this.worker = new Worker(
      'video-rendering',
      async (job: Job) => {
        try {
          const {
            preset_mode = 'ranking',
            id,
            video_settings,
            items_payload,
          } = job.data;
          console.log(`Processing job ${id} with mode: ${preset_mode}`);

          switch (preset_mode) {
            case 'ranking':
              await this.rankingProcessor.process(
                id,
                video_settings,
                items_payload,
              );
              break;
            case 'sequence':
              await this.sequenceProcessor.process(
                id,
                video_settings,
                items_payload,
              );
              break;
            case 'split':
              await this.splitScreenProcessor.process(
                id,
                video_settings,
                items_payload,
              );
              break;
            case 'timeline':
              await this.timelineProcessor.process(
                id,
                job.data.clips,
                job.data.mediaFiles,
              );
              break;
            default:
              console.error(`Unknown preset mode: ${preset_mode}`);
              await this.supabaseService.updateJobStatus(id, 'FAILED', 0);
          }
        } catch (error) {
          console.error(`Error processing job ${job.id}:`, error);
          // Status update is usually handled inside specific processors
        }
      },
      {
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD || undefined,
        },
        lockDuration: 60000, // 60 seconds
        stalledInterval: 60000,
      },
    );

    this.worker.on('completed', (job) =>
      console.log(`Job ${job.id} completed`),
    );
    this.worker.on('failed', (job, err) =>
      console.error(`Job ${job?.id} failed: ${err.message}`),
    );
  }
}
