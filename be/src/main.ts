import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import validationOptions from './common/utils/validation-options';
import { GlobalExceptionFilter } from './common/utils/global-exception';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());

  const port = Number(process.env.PORT) || 3000;

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5000',
    credentials: true,
  });
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(new ValidationPipe(validationOptions));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const apiVersion = '1.0.0';
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${port}`;
  const swaggerConfig = new DocumentBuilder()
    .setTitle('King of service')
    .setDescription(
      [
        'API documentation for King of service backend.',
        'Base path: /api/v1',
        'Authentication: JWT (Bearer) and HTTP-only cookies (accessToken, refreshToken).',
      ].join('\n'),
    )
    .setVersion(apiVersion)
    .addServer(backendUrl, 'Current backend server')
    .addTag('App', 'Root application endpoints')
    .addTag('Auth Google', 'Google OAuth login and callback endpoints')
    .addTag('Auth Facebook', 'Facebook OAuth login and callback endpoints')
    .addTag('Users', 'User management endpoints (admin only)')
    .addTag('Customers', 'Customer profile endpoints')
    .addTag('Services', 'Service catalog CRUD endpoints')
    .addTag('Upload', 'Image upload and delete endpoints')
    .addTag('Token', 'Token module endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste access token as: Bearer <token>',
      },
      'access-token',
    )
    .addCookieAuth(
      'accessToken',
      {
        type: 'apiKey',
        in: 'cookie',
        name: 'accessToken',
        description: 'HTTP-only access token cookie',
      },
      'access-token-cookie',
    )
    .addCookieAuth(
      'refreshToken',
      {
        type: 'apiKey',
        in: 'cookie',
        name: 'refreshToken',
        description: 'HTTP-only refresh token cookie',
      },
      'refresh-token-cookie',
    )
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument, {
    useGlobalPrefix: true,
  });
  await app.listen(port);
}
bootstrap();
