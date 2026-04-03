# Flow Cấu Hình Keycloak Client Cho Frontend (Public Client)

Tài liệu này hướng dẫn chi tiết từng click chuột trên Admin Dashboard của Keycloak để tạo một Client dành cho Frontend (SPA - React/Vue/Angular), kèm theo luồng xử lý (logic flow) để áp dụng vào phía Frontend.

## Giai Đoạn 1: Thao Tác Trên Keycloak Dashboard

Vì Frontend chạy trên trình duyệt (môi trường không an toàn, dễ bị lộ code), ứng dụng của mày bắt buộc phải được cấu hình dưới dạng **Public Client** (không sử dụng Client Secret).

### Bước 1: Đăng nhập & Chọn Realm
1. Truy cập vào trang quản trị: `http://localhost:9016/admin/` (hoặc URL server Keycloak thực tế).
2. Đăng nhập với tài khoản Admin (như cấu hình là `admin` / `admin123`).
3. Mở menu thả xuống ở góc trên cùng bên trái, chọn đúng Realm đang sử dụng: **`ag-ecommerce`**.

### Bước 2: Tạo Client mới
1. Ở thanh menu bên trái, nhấp vào **Clients**.
2. Nhấp vào nút **Create client** màu xanh ở góc màn hình.
3. **Phần General Settings:**
   - **Client type:** Chọn `OpenID Connect`.
   - **Client ID:** Điền ID định danh cho app của mày (Ví dụ: `ag-web-frontend`, `react-app-id`).
   - Nhấp **Next**.

### Bước 3: Cấu Hình Chế Độ Public
1. **Phần Capability config:**
   - **Client authentication:** Gạt công tắc sang **OFF**. *(Hành động này sẽ báo cho Keycloak biết đây là một Public Client, không có sinh ra tab config Secret).*
   - **Authentication flow:**
     - Tích chọn `Standard flow` (Rất quan trọng, bắt buộc phải có để chuyển hướng mở trang đổi Password).
     - Tích chọn `Direct access grants` (Hỗ trợ đổi Username/Password qua API).
   - Nhấp **Next**.

### Bước 4: Khai Báo Bảo Mật Domain (Redirect & CORS)
1. **Phần Login settings:**
   - **Valid redirect URIs:** Thêm URL chính xác của trang Frontend sau khi đăng nhập thành công.
     - *Localhost:* `http://localhost:3000/*` hoặc `http://localhost:9015/*`
     - *Production:* `https://domain-cua-may.com/*`
   - **Web origins:** Quản lý cấu hình Cross-Origin Resource Sharing (CORS). Điền `+` (nghĩa là mặc định cho phép các domain ở Valid redirect, hoặc điền cứng domain Frontend).
2. Nhấp **Save**.

---

## Giai Đoạn 2: Flow Áp Dụng Dưới Frontend Của Mày

Quy trình chuẩn sử dụng OIDC + PKCE (Phương pháp bảo mật bắt buộc đối với Public Client).

### Bước 1: Khởi Tạo SDK 
Frontend tích hợp một thư viện OIDC (phổ biến như `keycloak-js`, `oidc-client-ts`, hoặc qua NextAuth nếu là React/NextJS).
Khởi tạo cấu hình với:
- `url`: `http://localhost:9016` (Server Auth)
- `realm`: `ag-ecommerce`
- `clientId`: `ag-web-frontend` (Phải khớp chính xác tên đã khai báo ở Giai đoạn 1).

### Bước 2: Thực thi check phiên làm việc ngầm ("check-sso")
Khi App Frontend vừa chạy lên, code sẽ gọi lệnh initialize với tham số ưu tiên check-sso. Thư viện sẽ ngầm kiểm tra cookie của trình duyệt. 
- *Không có session:* Tải Web UI như bình thường, các route tự do vẫn xem được. Người dùng đứng ở dạng Khách (Guest).
- *Có session hợp lệ:* Thư viện âm thầm trích xuất Token về. Lúc này người dùng tự động ở trạng thái Đăng Nhập.

### Bước 3: Thao tác Đăng nhập (Trigger Login)
Khi người dùng chủ động bấm vào nút **"Login"** trên ứng dụng Frontend của mày:
1. Thư viện kích hoạt luồng đăng nhập, tạo ra các chuỗi mã hóa ngẫu nhiên (PKCE keys là `state`, `code_challenge`).
2. Frontend lập tức **Redirect 100% người dùng** sang URL đăng nhập của chính Server Keycloak.
3. Người dùng điền Email/Mật khẩu cũ của Auth0 vào form, bấm đăng nhập. Lúc này **Logic Auth0 Migration SPI (file Java)** mày đã cài ở backend Keycloak sẽ kích hoạt, âm thầm vào Auth0 tra xét, rồi copy dữ liệu về Database Keycloak.
4. Xác thực thành công: Keycloak đưa người dùng chuyển hướng (redirect) bay trở lại URL trang web Frontend của mày, đính kèm lên Address Bar chùm tham số chứa mã `Authorization Code` (`?session_state=...&code=...`).

### Bước 4: Đổi Mã Code Lấy Token (Token Exchange)
Thư viện quản lý ở Frontend (ví dụ `keycloak-js`) sẽ nhận ra URL có dính chuỗi mã `code`. Nó lập tức tự bắt mã đó, tiến hành một call API ngầm gửi ngược lại cho Server Keycloak nhằm chứng thực độ đáng tin (bằng cách gửi kèm key PKCE sinh ra từ nãy). Server trả về cặp Access Token và Refresh Token. 
Tiến trình đăng nhập hoàn tất. Lập trình viên trích xuất Profile trong ID token để đắp lên màn hình giao diện (Avatar, Username...).

### Bước 5: Luồng gửi lệnh về Backend API của Ứng dụng
Bất kỳ khi nào Frontend cần xài data từ Application Backend API (NestJS):
- Frontend gắn chuỗi mã `Access Token` vào HTTP Headers -> `Authorization: Bearer <Access_Token>`
- Application Backend chỉ check cái ID Key của signature Token, xem nó khớp Public Keys của Keycloak hay không. Gói tin hợp lệ thì trả Data. 

Kết thúc flow. Frontend không hề biết hệ thống cũ auth0 ở đâu, không giữ một mã Secret nào, bảo mật tuyệt đối!
