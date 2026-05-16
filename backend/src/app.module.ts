import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { RedisModule } from './redis.module';
import { VideoQueueModule } from './video-queue.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

const isElectron = process.env.IS_ELECTRON === 'true';
const frontendPath = isElectron
  ? join(__dirname, '..', '..', 'frontend', 'out')
  : join(process.cwd(), '..', 'frontend', 'out');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, '..', '.env'),
    }),
    ServeStaticModule.forRoot(
      {
        rootPath: join(process.cwd(), 'temp'),
        serveRoot: '/temp',
      },
      {
        rootPath: join(process.cwd(), 'uploads'),
        serveRoot: '/uploads',
      },
      {
        rootPath: frontendPath,
        serveRoot: '/',
      },
    ),
    RedisModule,
    VideoQueueModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
