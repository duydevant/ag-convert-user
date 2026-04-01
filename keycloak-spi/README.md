# Keycloak Auth0 Migration SPI

Custom Keycloak SPI plugin — khi user đăng nhập trên giao diện login Keycloak, plugin sẽ tự động xác thực với Auth0, migrate password, và cho phép login bình thường.

## Cấu trúc

```
keycloak-spi/
├── pom.xml                                    # Maven project
└── src/main/
    ├── java/com/ant/keycloak/auth0/
    │   ├── Auth0MigrationAuthenticator.java   # Core logic
    │   └── Auth0MigrationAuthenticatorFactory.java
    └── resources/META-INF/services/
        └── org.keycloak.authentication.AuthenticatorFactory

Dockerfile.keycloak    # Build SPI + Keycloak image
docker-compose.yml     # Run Keycloak
```

## Flow hoạt động

```
User nhập email/password trên Keycloak login form
        │
        ▼
  ┌─ auth0_migrated = "true"? ─┐
  │ YES                        │ NO
  ▼                            ▼
Keycloak auth              Call Auth0 /oauth/token
bình thường                    │
                    ┌──────────┼──────────┐
                    │ 200 OK               │ 401/Error
                    ▼                      ▼
              Set password             Login thất bại
              trong Keycloak
              Mark migrated = true
                    │
                    ▼
              Keycloak auth thành công
```

## Build & Deploy

### 1. Build Docker image

```bash
docker-compose build
```

### 2. Start Keycloak

```bash
docker-compose up -d
```

### 3. Cấu hình trong Keycloak Admin UI

Truy cập: `http://localhost:8180/admin`  
Login: `admin` / `admin123`

#### a) Tạo Authentication Flow:

1. **Authentication** → **Flows** → **Create flow**
2. Đặt tên: `Auth0 Migration Browser`
3. **Add step** → tìm `Auth0 Migration Authenticator` → thêm vào → set **REQUIRED**
4. Click **⚙ Settings** (gear icon) trên step đó → điền:
   - **Auth0 Domain**: `dev-4eyaqk1jsz1ztxsr.us.auth0.com`
   - **Auth0 Client ID**: `FPm9qfZyRbsutjIifSCjO2Mooov4GGlW`
   - **Auth0 Client Secret**: `kGxc9LVlIAxiKfx4GusG1g1ES6IZc7XwnxiSUqZ4oeepvp9prlscnbcf91zvCf-C`
   - **Auth0 Connection**: `Username-Password-Authentication`

#### b) Gán Flow cho Realm:

1. **Authentication** → **Flows** tab
2. Ở dropdown **Browser flow** → chọn `Auth0 Migration Browser`

#### c) Đảm bảo users đã import:

Users cần tồn tại trong Keycloak (đã import qua NestJS tool) với attribute `auth0_migrated` chưa set hoặc != "true".

## Kiểm tra

1. Mở Keycloak login: `http://localhost:8180/realms/ag-ecommerce/account`
2. Đăng nhập bằng email/password Auth0
3. Xem logs: `docker-compose logs -f keycloak`
4. Phải thấy: `[Auth0 Migration] ✅ Auth0 validated for ... — migrating password to Keycloak`
5. Lần login sau → Keycloak auth bình thường (không gọi Auth0 nữa)
