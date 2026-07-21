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

  // ===== CORS =====
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3020',
    'http://127.0.0.1:3020',
    'http://172.22.64.1:3020',
    'http://192.168.1.21:3020',
    // Cho phép Swagger UI tự test API
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Not allowed by CORS: ${origin}`), false);
    },
    credentials: true,
  });

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(new ValidationPipe(validationOptions));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const apiVersion = '1.0.0';
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${port}`;
  const swaggerConfig = new DocumentBuilder()
    .setTitle('CleanZ')
    .setDescription(
      [
        'API documentation for CleanZ backend.',
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
    .addTag(
      'Booking – Customer Flow',
      'Customer step 1: quote → step 2: create → step 3: active booking → step 4: detail/tracking. Update and cancel are optional branches.',
    )
    .addTag(
      'Booking – Tasker Flow',
      'Tasker step 1: posted list → step 2: posted detail → step 3: accept → step 4: assigned detail → step 5: on the way → step 6: check-in → step 7: start → step 8: complete.',
    )
    .addTag(
      'Booking – System/Admin Flow',
      'System and admin operations supporting the booking lifecycle.',
    )
    .addTag('Upload', 'Image upload and delete endpoints')
    .addTag('Token', 'Token module endpoints')
    .addTag('Policy', 'Policy management endpoints')
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

  console.log('================================');
  console.log('PORT ENV:', process.env.PORT);
  console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
  console.log('ALLOWED ORIGINS:', allowedOrigins);
  console.log('RUNNING ON: http://localhost:' + port);
  console.log('SWAGGER: http://localhost:' + port + '/api/v1/docs');
  console.log('================================');
}

void bootstrap();
