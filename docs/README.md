# 📚 Documentation

Tài liệu hướng dẫn cho Daily English Practice Platform.

## 🔐 Authentication & Security

| File | Mô tả |
|------|-------|
| [SUPABASE-AUTH-FIX.md](SUPABASE-AUTH-FIX.md) | Khắc phục lỗi 401 Unauthorized sau Google OAuth |
| [AUTH-DEBUG-GUIDE.md](AUTH-DEBUG-GUIDE.md) | Hướng dẫn debug authentication issues |
| [HTTPS-SETUP-GUIDE.md](HTTPS-SETUP-GUIDE.md) | Cấu hình HTTPS cho production |

## 🚀 Deployment

| File | Mô tả |
|------|-------|
| [VERIFICATION-SETUP-GUIDE.md](VERIFICATION-SETUP-GUIDE.md) | Cấu hình Google/Bing verification |

## 🎨 SEO & Marketing

| File | Mô tả |
|------|-------|
| [SEO-GUIDE.md](SEO-GUIDE.md) | Hướng dẫn SEO optimization |
| [SEO-IMPLEMENTATION-SUMMARY.md](archive/SEO-IMPLEMENTATION-SUMMARY.md) | Tóm tắt SEO implementation |

## 🛠️ Quick References

Các file quick reference ở root folder:

- [QUICK-FIX.md](../QUICK-FIX.md) - Quick fix cho lỗi auth
- [SUPABASE-AUTH-CHECKLIST.md](../SUPABASE-AUTH-CHECKLIST.md) - Checklist từng bước
- [AUTH-FIX-SUMMARY.md](../AUTH-FIX-SUMMARY.md) - Tóm tắt chi tiết

## 🔧 Scripts

| Script | Mô tả | Cách chạy |
|--------|-------|-----------|
| check-supabase-config.js | Kiểm tra Supabase config | `node scripts/check-supabase-config.js` |

## 🐛 Debug Tools

| Tool | Mô tả | Location |
|------|-------|----------|
| AuthDebugComponent | Real-time auth state monitor | `src/app/components/auth-debug/` |

## 📖 Cách sử dụng tài liệu

### Khi gặp lỗi Auth

1. Đọc [QUICK-FIX.md](../QUICK-FIX.md) để fix nhanh
2. Nếu chưa được, xem [SUPABASE-AUTH-FIX.md](SUPABASE-AUTH-FIX.md) chi tiết
3. Sử dụng [AUTH-DEBUG-GUIDE.md](AUTH-DEBUG-GUIDE.md) để debug

### Khi deploy lần đầu

1. Đọc [HTTPS-SETUP-GUIDE.md](HTTPS-SETUP-GUIDE.md)
2. Đọc [VERIFICATION-SETUP-GUIDE.md](VERIFICATION-SETUP-GUIDE.md)
3. Follow [SUPABASE-AUTH-CHECKLIST.md](../SUPABASE-AUTH-CHECKLIST.md)

### Khi optimize SEO

1. Đọc [SEO-GUIDE.md](SEO-GUIDE.md)
2. Xem [SEO-IMPLEMENTATION-SUMMARY.md](archive/SEO-IMPLEMENTATION-SUMMARY.md)

## 🆘 Cần trợ giúp?

Nếu tài liệu chưa giải quyết được vấn đề:

1. Chạy script kiểm tra: `node scripts/check-supabase-config.js`
2. Bật debug component (xem [AUTH-DEBUG-GUIDE.md](AUTH-DEBUG-GUIDE.md))
3. Thu thập thông tin:
   - Console logs
   - Network tab
   - localStorage content
4. Tạo issue với thông tin trên

## 📝 Đóng góp tài liệu

Khi thêm tài liệu mới:

1. Đặt file trong thư mục `docs/`
2. Cập nhật file README.md này
3. Sử dụng format Markdown
4. Thêm emoji để dễ đọc 😊
5. Include code examples khi cần

## 🔄 Cập nhật

Tài liệu được cập nhật thường xuyên. Check git history để xem thay đổi:

```bash
git log --oneline -- docs/
```
