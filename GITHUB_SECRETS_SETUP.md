# GitHub Secrets và Variables Setup

## Hướng dẫn cấu hình GitHub Secrets cho tự động deploy

### Bước 1: Truy cập GitHub Repository Settings

1. Mở repository của bạn trên GitHub
2. Click vào tab **Settings**
3. Trong sidebar bên trái, click **Secrets and variables** > **Actions**

### Bước 2: Thêm Secrets

Click nút **"New repository secret"** và thêm 2 secrets sau:

- **Name**: `SUPABASE_URL`
  - **Value**: URL từ Supabase Dashboard (ví dụ: `https://xxxxx.supabase.co`)
  
- **Name**: `SUPABASE_ANON_KEY`
  - **Value**: Anonymous key từ Supabase Dashboard

### Bước 3: Lấy thông tin Supabase

1. Đăng nhập vào [Supabase Dashboard](https://supabase.com/dashboard)
2. Chọn project của bạn
3. Click vào **Settings** (icon bánh răng) > **API**
4. Copy:
   - **Project URL** → dùng cho `SUPABASE_URL`
   - **anon public** key → dùng cho `SUPABASE_ANON_KEY`

### Bước 4: Enable GitHub Pages

1. Vẫn trong Settings, click **Pages** ở sidebar
2. Trong **Source**, chọn **"GitHub Actions"**
3. Click **Save**

### Bước 5: Deploy

Có 2 cách để deploy:

**Tự động:**
- Push code lên branch `main`
- GitHub Actions sẽ tự động build và deploy

**Thủ công:**
1. Vào tab **Actions**
2. Click workflow **"Deploy to GitHub Pages"**
3. Click **"Run workflow"**
4. Chọn branch `main` và click **"Run workflow"**

### Kiểm tra deployment

1. Vào tab **Actions** để xem tiến trình build
2. Sau khi hoàn thành, app sẽ có tại: `https://your-username.github.io/your-repo-name/`

## Lưu ý bảo mật

- **Secrets** được mã hóa và không thể xem lại sau khi lưu
- **Variables** có thể xem được, chỉ dùng cho thông tin không nhạy cảm
- Không bao giờ commit API keys vào code
- File `environment.prod.ts` được tự động tạo trong quá trình build, không cần commit

## Troubleshooting

### Build thất bại?
1. Kiểm tra logs trong tab Actions
2. Đảm bảo tất cả required secrets đã được thêm
3. Kiểm tra format của secrets (không có khoảng trắng thừa)

### App không load được?
1. Kiểm tra GitHub Pages đã được enable
2. Đợi vài phút để deployment hoàn tất
3. Clear browser cache và thử lại

### Supabase không kết nối được?
1. Kiểm tra `SUPABASE_URL` có đúng format không
2. Kiểm tra `SUPABASE_ANON_KEY` có đúng không (phải là anon key, không phải service key)
3. Kiểm tra Supabase project có đang active không

## Cấu trúc file sau khi setup

```
.github/
  workflows/
    deploy.yml          # Workflow tự động deploy (đã cấu hình)

src/
  environments/
    environment.ts           # Local development (gitignored)
    environment.example.ts   # Template để copy
    environment.prod.ts      # Auto-generated khi deploy (gitignored)
```

## Các lệnh hữu ích

```bash
# Test build locally
npm run build

# Test production build locally
npm run build -- --configuration=production

# Xem output
ls dist/english-practice/browser
```
