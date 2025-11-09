# 🎓 English Practice - Luyện Tiếng Anh với AI

Ứng dụng web giúp bạn luyện dịch tiếng Anh và nhận phản hồi từ AI.

## ✨ Tính Năng

- **Phản hồi AI thông minh**: Chấm điểm và phân tích bản dịch của bạn
- **Gợi ý thông minh**: AI tạo gợi ý phù hợp khi bạn gặp khó khăn
- **Text-to-Speech**: Nghe phát âm bản dịch chuẩn
- **Dashboard & Analytics**: Xem thống kê chi tiết về tiến độ học tập
  - Biểu đồ xu hướng điểm số theo thời gian (Chart.js)
  - Phân tích hiệu suất theo chủ đề và cấp độ
  - Activity heatmap theo dõi streak và hoạt động hàng ngày
  - Thống kê từ vựng và từ cần ôn tập
  - Xuất dữ liệu tiến độ (JSON format)
- **Theo dõi tiến độ**: Streak, điểm số, lịch sử làm bài
- **Đồng bộ đa thiết bị**: Lưu tiến độ trên Supabase với realtime sync
- **3 cấp độ**: Beginner, Intermediate, Advanced
- **20+ chủ đề**: Cuộc sống, du lịch, công việc, công nghệ...

## 🚀 Cài Đặt & Chạy Ứng Dụng

### Yêu Cầu Hệ Thống

- Node.js 18+ và npm
- Angular CLI 20+

### Cài Đặt Dependencies

```bash
npm install
```

### Chạy Development Server

```bash
npm start
# hoặc
ng serve
```

Mở trình duyệt tại `http://localhost:4200`

### Build Production

```bash
npm run build
```

Output sẽ được tạo trong thư mục `dist/`

## 🔧 Cấu Hình Supabase

1. Tạo project mới tại [supabase.com](https://supabase.com)
2. Copy URL và anon key từ Settings > API
3. Cập nhật `src/environments/environment.ts`:

```typescript
supabase: {
  url: 'YOUR_SUPABASE_URL',
  anonKey: 'YOUR_SUPABASE_ANON_KEY'
}
```

4. Tạo các bảng cần thiết trong Supabase (xem file migration trong `supabase-migrations/`)

## 🤖 Cấu Hình AI Provider

Ứng dụng hỗ trợ 3 nhà cung cấp AI:

### Lấy API Key

- **Google Gemini** (miễn phí, khuyên dùng): https://makersuite.google.com/app/apikey
- **OpenAI**: https://platform.openai.com/api-keys
- **Azure OpenAI**: https://portal.azure.com/

### Cấu Hình trong Ứng Dụng

1. Mở ứng dụng và click vào **👤 Profile** ở góc trên bên phải
2. Chọn nhà cung cấp AI bạn muốn sử dụng
3. Click vào card của nhà cung cấp để mở rộng form cấu hình
4. Nhập thông tin:
   - **Google Gemini**: API Key (model: gemini-2.5-pro)
   - **OpenAI**: API Key và chọn model (gpt-5)
   - **Azure OpenAI**: Endpoint URL, API Key, Deployment Name (gpt-4)
5. Click **"Use [Provider Name]"** để chọn nhà cung cấp
6. Click **💾 Save Configuration** để lưu

**Lưu ý:**
- API Key được lưu trong LocalStorage của trình duyệt
- Không được chia sẻ với server nào ngoài nhà cung cấp AI bạn chọn
- Có thể thay đổi nhà cung cấp bất cứ lúc nào

## 📖 Cách Sử Dụng

1. **Chọn cấp độ** (Beginner/Intermediate/Advanced)
2. **Chọn chủ đề** (Daily Life, Travel, Work...)
3. **Dịch câu** được highlight sang tiếng Anh
4. **Submit** để nhận phản hồi từ AI
5. **Xem điểm** và phân tích chi tiết (ngữ pháp, từ vựng, cấu trúc)
6. Dùng **💡 Hint** nếu gặp khó (tối đa 3 gợi ý/câu)
7. Dùng **🔊 Play** để nghe phát âm sau khi hoàn thành
8. Truy cập **Dashboard** để xem thống kê và phân tích tiến độ học tập

### Dashboard Features

- **Progress Charts**: Xu hướng điểm số, phân bố theo chủ đề và cấp độ (Chart.js)
- **Performance Analysis**: Phân tích lỗi thường gặp, độ chính xác theo chủ đề
- **Activity Heatmap**: Theo dõi streak và hoạt động hàng ngày (90 ngày gần nhất)
- **Vocabulary Stats**: Thống kê từ vựng đã học và từ cần ôn tập
- **Export Data**: Xuất toàn bộ dữ liệu tiến độ dưới dạng JSON

## 🛠️ Tech Stack

- **Framework**: Angular 20 (Standalone Components)
- **Language**: TypeScript 5.9 (Strict Mode)
- **Styling**: SCSS + Tailwind CSS 3.4
- **Database**: Supabase (PostgreSQL + Realtime)
- **AI**: Azure OpenAI / Google Gemini / OpenAI
- **Charts**: Chart.js 4.5
- **Date Utils**: date-fns 4.1
- **Testing**: Karma + Jasmine

## 📁 Cấu Trúc Project

```
src/app/
├── components/          # UI components (standalone)
├── models/             # TypeScript interfaces & enums
├── services/           # Business logic & data services
│   └── ai/            # AI provider implementations
├── app.config.ts      # Application configuration
├── app.routes.ts      # Route definitions
└── app.ts             # Root component

public/data/           # Static JSON data (exercises)
supabase-migrations/   # Database migrations
```

## 📝 Scripts

```bash
npm start              # Start dev server (localhost:4200)
npm run build          # Production build
npm run watch          # Development build with watch mode
npm test               # Run unit tests
npm run deploy:rules   # Deploy Firestore rules
```

**Made with ❤️ using Angular 20, Supabase & AI**
