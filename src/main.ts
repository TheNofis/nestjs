import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import * as path from 'path';
import fastifyStatic from '@fastify/static';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  app.enableCors();
  app.setGlobalPrefix('api/v1');

  app.register(fastifyStatic, {
    root: path.join(__dirname, '..', 'avatars'),
    prefix: '/avatar/', // Файлы будут доступны прямо из корня
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
