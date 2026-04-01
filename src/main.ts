import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Auth0 → Keycloak Migration Tool')
    .setDescription(
      'API để migrate users từ Auth0 sang Keycloak.\n\n' +
        '**Flow:**\n' +
        '1. Register user trên Auth0\n' +
        '2. Export users từ Auth0\n' +
        '3. Import users vào Keycloak (không có password)\n' +
        '4. User login → password được đồng bộ sang Keycloak',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Auth0 access token',
      },
      'Auth0Token',
    )
    .addTag('Auth', 'Đăng ký & đăng nhập Auth0')
    .addTag('Migration', 'Export, Import & Migrate password')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 Server running on http://localhost:${process.env.PORT ?? 3000}`);
  console.log(`📄 Swagger UI: http://localhost:${process.env.PORT ?? 3000}/api/docs`);
}
bootstrap();
