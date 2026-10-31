# 📚 Tổng Quan Dự Án - English Practice

## 🎯 Giới Thiệu

**English Practice** là một ứng dụng web học tiếng Anh hiện đại, sử dụng công nghệ AI để giúp người học luyện tập kỹ năng dịch và viết tiếng Anh. Ứng dụng được xây dựng bằng Angular 20 với kiến trúc standalone components hiện đại, tích hợp AI (Azure OpenAI/Google Gemini) để cung cấp phản hồi chi tiết và cá nhân hóa.

## 🏗️ Kiến Trúc Kỹ Thuật

### Framework & Công Nghệ
- **Angular 20**: Standalone components, Signals API, modern control flow
- **TypeScript 5.9**: Strict mode, type safety
- **RxJS 7.8**: Reactive programming
- **Tailwind CSS 3.4**: Utility-first styling
- **Firebase**: Authentication & Firestore (tùy chọn)

### Tích Hợp AI
- **Azure OpenAI GPT-4**: Phân tích và chấm điểm bản dịch
- **Google Gemini Pro**: Alternative AI provider
- **Text-to-Speech**: Phát âm chuẩn cho bản dịch

### Lưu Trữ Dữ Liệu
- **LocalStorage**: Lưu trữ tiến độ học tập cục bộ
- **Firebase Firestore**: Đồng bộ dữ liệu đa thiết bị (tùy chọn)

## ✨ Các Chức Năng Chính

### 1. 🎓 Hệ Thống Bài Tập Đa Cấp Độ

**3 Cấp Độ Học:**
- **Beginner**: Câu đơn giản, từ vựng cơ bản
- **Intermediate**: Câu phức tạp hơn, ngữ pháp nâng cao
- **Advanced**: Văn phong chuyên nghiệp, từ vựng học thuật

**8+ Chủ Đề Đa Dạng:**
- Daily Life (Cuộc sống hàng ngày)
- Travel & Transportation (Du lịch & Giao thông)
- Education & Work (Giáo dục & Công việc)
- Health & Wellness (Sức khỏe)
- Society & Services (Xã hội & Dịch vụ)
- Culture & Arts (Văn hóa & Nghệ thuật)
- Science & Environment (Khoa học & Môi trường)
- Philosophy & Beliefs (Triết học & Tín ngưỡng)

### 2. 🤖 Phản Hồi AI Thông Minh

**Phân Tích Chi Tiết:**
- **Điểm chính xác**: Đánh giá tổng thể (0-100%)
- **Phân tích ngữ pháp**: Lỗi cấu trúc câu, thì, giới từ
- **Đánh giá từ vựng**: Từ đồng nghĩa, collocations, từ vựng phù hợp
- **Cấu trúc câu**: Đề xuất cách diễn đạt tự nhiên hơn
- **Lỗi chính tả**: Phát hiện và sửa lỗi đánh máy

**Feedback Trực Quan:**
- Highlight từng lỗi trong văn bản
- Giải thích chi tiết từng lỗi
- Đề xuất cách sửa cụ thể
- Nhận xét tổng quan về bản dịch

### 3. 💡 Hệ Thống Gợi Ý (Hints)

**Gợi Ý Thông Minh:**
- AI tạo gợi ý phù hợp với ngữ cảnh
- Tối đa 3 gợi ý cho mỗi câu
- Gợi ý từ vựng, cấu trúc, ngữ pháp
- Không tiêu tốn credits khi sử dụng

**Cơ Chế:**
- Gợi ý được tạo động dựa trên câu gốc
- Không tiết lộ đáp án hoàn chỉnh
- Giúp người học tự suy nghĩ và phát triển

### 4. 🔊 Text-to-Speech (TTS)

**Phát Âm Chuẩn:**
- Nghe phát âm bản dịch sau khi hoàn thành
- Giọng đọc tự nhiên, rõ ràng
- Hỗ trợ học phát âm và ngữ điệu
- Tích hợp Web Speech API

### 5. 📊 Theo Dõi Tiến Độ

**Hệ Thống Điểm:**
- **Credits**: Tiền tệ trong app (mua bằng điểm hoặc nạp)
- **Points**: Điểm tích lũy từ việc hoàn thành bài tập
- Điểm thưởng dựa trên độ chính xác

**Streak System:**
- Theo dõi chuỗi ngày học liên tiếp
- Khuyến khích học đều đặn hàng ngày
- Hiển thị streak hiện tại và lịch sử

**Lịch Sử Làm Bài:**
- Xem lại tất cả các lần làm bài
- So sánh điểm số qua các lần
- Theo dõi sự tiến bộ theo thời gian

### 6. ⭐ Quản Lý Yêu Thích (Favorites)

**Đánh Dấu Bài Tập:**
- Lưu các bài tập quan trọng
- Truy cập nhanh bài tập đã đánh dấu
- Quản lý danh sách yêu thích

**Tính Năng:**
- Thêm/xóa khỏi danh sách yêu thích
- Hiển thị số lượng bài tập yêu thích
- Lọc và tìm kiếm trong danh sách

### 7. 👤 Hồ Sơ Người Dùng (Profile)

**Thông Tin Cá Nhân:**
- Xem tổng quan tiến độ học tập
- Quản lý credits và points
- Xem streak và achievements

**Cấu Hình AI:**
- Chọn AI provider (Azure OpenAI/Google Gemini)
- Nhập API key
- Cấu hình endpoint (cho Azure)

**Đồng Bộ Firebase:**
- Đăng nhập/đăng ký với email
- Đồng bộ tiến độ đa thiết bị
- Backup dữ liệu tự động

### 8. 🔐 Xác Thực & Đồng Bộ (Tùy Chọn)

**Firebase Authentication:**
- Đăng ký/đăng nhập với email
- Quản lý phiên đăng nhập
- Bảo mật thông tin người dùng

**Firestore Sync:**
- Tự động đồng bộ tiến độ
- Truy cập từ nhiều thiết bị
- Backup dữ liệu cloud

## 📱 Giao Diện Người Dùng

### Components Chính

1. **Header**: Navigation, auth status, credits/points display
2. **Home**: Chọn cấp độ và category
3. **Exercise List**: Danh sách bài tập theo level/category
4. **Exercise Detail**: Làm bài tập, nhận feedback
5. **Profile**: Quản lý tài khoản và cấu hình
6. **Favorites**: Danh sách bài tập yêu thích
7. **Progress Stats**: Thống kê tiến độ học tập

### Trải Nghiệm Người Dùng

- **Responsive Design**: Hoạt động tốt trên mọi thiết bị
- **Dark Mode Ready**: Giao diện tối thân thiện với mắt
- **Accessibility**: Tuân thủ WCAG AA standards
- **Performance**: OnPush change detection, lazy loading

## 🎮 Luồng Sử Dụng

1. **Khởi động**: Chọn cấp độ (Beginner/Intermediate/Advanced)
2. **Chọn chủ đề**: Chọn category phù hợp với mục tiêu học
3. **Đọc đề bài**: Đọc văn bản tiếng Việt và câu cần dịch (highlighted)
4. **Dịch câu**: Nhập bản dịch tiếng Anh
5. **Sử dụng hints**: Nhấn 💡 nếu cần gợi ý (tùy chọn)
6. **Submit**: Gửi bản dịch để AI chấm điểm
7. **Xem feedback**: Đọc phân tích chi tiết và điểm số
8. **Nghe phát âm**: Nhấn 🔊 để nghe bản dịch chuẩn
9. **Làm lại**: Thử lại để cải thiện điểm số
10. **Theo dõi tiến độ**: Xem streak, points, và lịch sử

## 📦 Cấu Trúc Dự Án

```
src/app/
├── components/          # UI Components
│   ├── home/           # Trang chủ - chọn level/category
│   ├── exercise-list/  # Danh sách bài tập
│   ├── exercise-detail/# Chi tiết bài tập & làm bài
│   ├── profile/        # Hồ sơ người dùng
│   ├── favorites/      # Bài tập yêu thích
│   ├── header/         # Navigation bar
│   ├── footer/         # Footer
│   ├── feedback-panel/ # Hiển thị feedback AI
│   ├── translation-input/ # Input dịch thuật
│   ├── source-text/    # Hiển thị văn bản gốc
│   ├── progress-stats/ # Thống kê tiến độ
│   ├── auth-status/    # Trạng thái đăng nhập
│   ├── level-card/     # Card chọn cấp độ
│   ├── category-card/  # Card chọn category
│   └── exercise-card/  # Card bài tập
│
├── services/           # Business Logic
│   ├── ai/            # AI Integration
│   │   ├── ai.service.ts        # AI service interface
│   │   ├── azure-openai.service.ts  # Azure OpenAI
│   │   ├── gemini.service.ts    # Google Gemini
│   │   └── prompt.service.ts    # Prompt engineering
│   ├── exercise.service.ts      # Quản lý bài tập
│   ├── progress.service.ts      # Theo dõi tiến độ
│   ├── favorite.service.ts      # Quản lý yêu thích
│   ├── tts.service.ts          # Text-to-Speech
│   ├── auth.service.ts         # Firebase Auth
│   ├── firestore-sync.service.ts # Firestore sync
│   └── config.service.ts       # Cấu hình app
│
├── models/            # TypeScript Interfaces
│   ├── exercise.model.ts       # Exercise, Feedback, Attempt
│   └── ai.model.ts            # AI provider configs
│
├── app.config.ts      # App configuration
├── app.routes.ts      # Routing
└── app.ts            # Root component

public/data/
└── exercises.json     # Dữ liệu bài tập
```

## 🚀 Công Nghệ Nổi Bật

### Modern Angular Patterns
- **Signals API**: Reactive state management
- **Standalone Components**: No NgModules
- **Native Control Flow**: `@if`, `@for`, `@switch`
- **input()/output()**: Modern component API
- **OnPush Change Detection**: Performance optimization
- **inject()**: Dependency injection

### AI Integration
- **Streaming Responses**: Real-time feedback
- **Prompt Engineering**: Optimized prompts for accuracy
- **Multi-provider Support**: Azure OpenAI & Google Gemini
- **Context-aware Hints**: Smart hint generation

### Performance
- **Lazy Loading**: Route-based code splitting
- **OnPush Strategy**: Minimal change detection
- **Signal-based State**: Efficient reactivity
- **Computed Values**: Memoized derived state

## 🎯 Mục Tiêu Học Tập

1. **Cải thiện kỹ năng dịch**: Từ tiếng Việt sang tiếng Anh
2. **Học ngữ pháp**: Qua feedback chi tiết từ AI
3. **Mở rộng từ vựng**: Học từ đồng nghĩa và collocations
4. **Rèn luyện cấu trúc câu**: Viết câu tự nhiên, native-like
5. **Phát triển tư duy**: Hiểu ngữ cảnh và cách diễn đạt
6. **Học đều đặn**: Streak system khuyến khích học hàng ngày

## 📈 Tính Năng Nổi Bật

- ✅ **Không cần backend**: Chạy hoàn toàn client-side
- ✅ **Offline-capable**: LocalStorage cho dữ liệu cục bộ
- ✅ **Multi-device sync**: Firebase Firestore (tùy chọn)
- ✅ **AI-powered**: Feedback thông minh và chính xác
- ✅ **Gamification**: Points, credits, streaks, achievements
- ✅ **Responsive**: Hoạt động tốt trên mobile/tablet/desktop
- ✅ **Accessible**: WCAG AA compliant
- ✅ **Modern Stack**: Angular 20, TypeScript 5.9, Tailwind CSS

## 🔧 Cài Đặt & Chạy

```bash
# Cài đặt dependencies
npm install

# Chạy development server
npm start

# Build production
npm run build

# Run tests
npm test
```

## 🌟 Điểm Mạnh

1. **AI Integration**: Feedback chi tiết và chính xác từ GPT-4/Gemini
2. **Modern Architecture**: Angular 20 với Signals và standalone components
3. **User Experience**: Giao diện đẹp, dễ sử dụng, responsive
4. **Gamification**: Hệ thống điểm, streak tạo động lực học tập
5. **Flexibility**: Hỗ trợ nhiều AI provider, có thể offline
6. **Performance**: OnPush, lazy loading, signal-based state

---

**Made with ❤️ using Angular 20 & AI**
