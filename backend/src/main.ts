import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: '*',
    credentials: true,
  });
  const port = process.env.PORT ?? 3005;
  await app.listen(port, '127.0.0.1');
  console.log(`Backend is running on: http://127.0.0.1:${port}`);
}
bootstrap();
