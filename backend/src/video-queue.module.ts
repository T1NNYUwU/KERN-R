import { Module } from '@nestjs/common';
import { VideoQueueService } from './video-queue.service';
import { RedisModule } from './redis.module';
import { SupabaseService } from './supabase.service';
import { VideoProcessor } from './video.processor';
import { VideoController } from './video.controller';

@Module({
  imports: [RedisModule],
  controllers: [VideoController],
  providers: [VideoQueueService, SupabaseService, VideoProcessor],
  exports: [VideoQueueService],
})
export class VideoQueueModule {}