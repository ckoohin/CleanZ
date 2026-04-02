import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import validationOptions from './common/utils/validation-options';
import { GlobalExceptionFilter } from './common/utils/global-exception';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  });
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(new ValidationPipe(validationOptions));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
