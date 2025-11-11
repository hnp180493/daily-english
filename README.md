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

## 🌐 Demo

Ứng dụng đã được deploy tại: **https://dailyenglish.qzz.io/**

### Cấu Hình trong Ứng Dụng

1. Mở ứng dụng và click vào **👤 Profile** ở góc trên bên phải
2. Chọn nhà cung cấp AI bạn muốn sử dụng
3. Click vào card của nhà cung cấp để mở rộng form cấu hình
4. Nhập thông tin:
   - **OpenRouter** (Khuyến nghị - 7 models miễn phí): API Key và chọn model
   - **Google Gemini**: API Key (model: gemini-2.5-pro)
   - **OpenAI**: API Key và chọn model (gpt-5)
   - **Azure OpenAI**: Endpoint URL, API Key, Deployment Name (gpt-4)
5. Click **"Use [Provider Name]"** để chọn nhà cung cấp
6. Click **💾 Save Configuration** để lưu

**Lưu ý:**
- API Key được lưu trong LocalStorage của trình duyệt
- Không được chia sẻ với server nào ngoài nhà cung cấp AI bạn chọn
- Có thể thay đổi nhà cung cấp bất cứ lúc nào

**OpenRouter - Lựa chọn miễn phí tốt nhất:**
- Truy cập nhiều models AI miễn phí qua một API key duy nhất
- Không cần thẻ tín dụng
- Model khuyến nghị: Llama 3.2 3B (nhanh, ổn định)
- Xem [hướng dẫn chi tiết](docs/OPENROUTER-GUIDE.md)
- ⚠️ Lưu ý: Tình trạng model có thể thay đổi - kiểm tra [danh sách model](https://openrouter.ai/models)

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
- **AI**: OpenRouter (7 free models) / Azure OpenAI / Google Gemini / OpenAI
- **Charts**: Chart.js 4.5
- **Date Utils**: date-fns 4.1
- **Testing**: Karma + Jasmine

## 🤖 AI Provider Options

### OpenRouter (Recommended for Free Tier)
- **Multiple Free Models**: Llama 3.2 3B, Llama 3.1 8B, Gemma, Phi-3, Mistral, Hermes 3 405B
- **No Credit Card Required**
- **Unified API**: One key for multiple models
- **Setup Guide**: [OpenRouter Integration Guide](docs/OPENROUTER-GUIDE.md)
- **Note**: Model availability may vary - check [OpenRouter Models](https://openrouter.ai/models)

### Other Providers
- **Azure OpenAI**: Enterprise-grade, requires Azure subscription
- **Google Gemini**: Free tier available, requires Google Cloud account
- **OpenAI**: Pay-as-you-go, requires OpenAI account

For detailed comparison and setup instructions, see [OpenRouter Guide](docs/OPENROUTER-GUIDE.md).


## 📞 Liên Hệ & Hỗ Trợ

Nếu bạn có câu hỏi, góp ý hoặc cần hỗ trợ, vui lòng liên hệ:

- **Email**: phuochnsw@gmail.com
- **Báo lỗi**: Gửi email với tiêu đề "[Bug] Mô tả lỗi"
- **Góp ý tính năng**: Gửi email với tiêu đề "[Feature] Ý tưởng của bạn"
- **Hỗ trợ kỹ thuật**: Gửi email với tiêu đề "[Support] Vấn đề cần hỗ trợ"

### Thời Gian Phản Hồi

- Email thường được phản hồi trong vòng 24-48 giờ
- Các vấn đề khẩn cấp sẽ được ưu tiên xử lý

### Đóng Góp

Nếu bạn muốn đóng góp vào dự án:
1. Fork repository
2. Tạo branch mới cho tính năng của bạn
3. Commit changes
4. Tạo Pull Request
5. Hoặc liên hệ qua email để thảo luận

Cảm ơn bạn đã sử dụng Daily English! 🎉
