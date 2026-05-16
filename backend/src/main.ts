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
  // Use 0.0.0.0 to allow external connections (crucial for Docker/Cloud deployment)
  await app.listen(port, '0.0.0.0');
  console.log(`Backend is running on port: ${port}`);
}
bootstrap();
