import { ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AllExceptionsFilter, TimeoutInterceptor, TransformInterceptor } from '@common';
import { GatewayConfigService } from '@/config';
import { GatewayModule } from '@/gateway.module';

async function bootstrap() {
   const app = await NestFactory.create(GatewayModule, {
      bufferLogs: true,
   });

   const logger = app.get(Logger);
   app.useLogger(logger);

   const config = app.get(GatewayConfigService);
   const reflector = app.get(Reflector);
   const port = config.port;
   const globalPrefix = config.globalPrefix;
   const allowedOrigins = config.corsOrigins;

   // Security headers
   app.use(
      helmet({
         crossOriginEmbedderPolicy: false,
         contentSecurityPolicy: {
            directives: {
               defaultSrc: [`'self'`],
               styleSrc: [`'self'`, `'unsafe-inline'`],
               imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
               scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
            },
         },
      }),
   );

   // Cookie Parser Middleware
   app.use(cookieParser());

   // CORS Configuration with strict whitelist
   app.enableCors({
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
         // Allow requests without Origin (e.g. mobile apps, curl, server-to-server, Postman)
         if (!origin) {
            return callback(null, true);
         }

         if (allowedOrigins.includes(origin)) {
            return callback(null, true);
         }

         // In development mode, fallback to localhost regex if CORS_ORIGINS is not set
         if (!config.isProduction && allowedOrigins.length === 0) {
            const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
            if (isLocalhost) {
               return callback(null, true);
            }
         }

         return callback(new Error(`Origin '${origin}' not allowed by CORS whitelist`), false);
      },
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Cookie'],
      credentials: true,
      maxAge: 86400,
   });

   // Global prefix
   app.setGlobalPrefix(globalPrefix);

   // Global filters & interceptors
   app.useGlobalFilters(new AllExceptionsFilter());
   app.useGlobalInterceptors(new TimeoutInterceptor(15000), new TransformInterceptor(reflector));

   // Global pipes
   app.useGlobalPipes(
      new ValidationPipe({
         whitelist: true,
         transform: true,
         forbidNonWhitelisted: true,
         transformOptions: {
            enableImplicitConversion: true,
         },
      }),
   );

   // Swagger Documentation Setup
   const swaggerConfig = new DocumentBuilder()
      .setTitle('OmniServices API Gateway')
      .setDescription('Microservices API Gateway documentation with Cookie-based JWT Authentication')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('access_token', {
         type: 'apiKey',
         in: 'cookie',
         name: 'access_token',
         description: 'HTTP-only JWT access token cookie',
      })
      .build();

   const document = SwaggerModule.createDocument(app, swaggerConfig);
   SwaggerModule.setup('docs', app, document);

   await app.listen(port);
   logger.log(`🚀 API Gateway is running on: http://localhost:${port}/${globalPrefix}`);
   logger.log(`📖 Swagger documentation available at: http://localhost:${port}/docs`);
}

void bootstrap();
