# App Overview

> **Tags:** #overview  
> **Trạng thái:** Active  
> **Domain:** `https://dailyenglish.qzz.io/`

## Sản phẩm là gì?

**Daily English** là ứng dụng web học tiếng Anh dành cho người Việt. Người dùng dịch câu/đoạn từ tiếng Việt sang tiếng Anh, AI chấm điểm và phản hồi chi tiết về ngữ pháp, từ vựng, cấu trúc. Tiến độ được lưu trữ và phân tích để gợi ý ôn tập thông minh.

## Đối tượng & giá trị cốt lõi

- **Đối tượng:** học viên Việt Nam ở 3 cấp — Beginner, Intermediate, Advanced.
- **Giá trị cốt lõi:**
  1. **Phản hồi AI cá nhân hóa** trên từng bản dịch ([[AI-Providers]], [[Translation-Practice]]).
  2. **Ôn tập có khoa học** (SM-2 spaced repetition — [[Spaced-Repetition]]).
  3. **Lộ trình có cấu trúc** theo tuần ([[Learning-Path]]).
  4. **Gamification** giữ động lực: streak, huy hiệu, mục tiêu ([[Achievements]], [[Daily-Challenge]], [[Weekly-Goals]]).
  5. **Đa thiết bị + offline-first** ([[Storage-Sync]], [[PWA-Offline]]).

## Quy mô nội dung

- **250+ bài tập** chia thành **3 cấp × 8 chủ đề** (`daily-life`, `travel-transportation`, `education-work`, `health-wellness`, `society-services`, `culture-arts`, `science-environment`, `philosophy-beliefs`) — xem [[Exercise-Library]].
- **60+ achievement** chia thành 4 loại: Milestone, Streak, Performance, Category Master — xem [[Achievements]].
- **3 lộ trình** beginner/intermediate/advanced — xem [[Learning-Path]].

## Tech stack (rút gọn)

| Layer | Công nghệ |
|---|---|
| Framework | Angular 20 (Standalone Components, Signals) |
| Language | TypeScript 5.9 strict |
| Styling | SCSS + Tailwind CSS 3.4 |
| Database | Supabase (PostgreSQL + Realtime) — multi-DB |
| AI | OpenRouter / Azure OpenAI / Google Gemini / OpenAI |
| Charts | Chart.js 4.5 |
| Build | Angular CLI, prerender, sitemap & static page generation |

Chi tiết: [[Architecture]].

## Mô hình tài chính & dữ liệu

- **Miễn phí cho người dùng.**
- **API Key** AI lưu trong `localStorage` của trình duyệt, không gửi lên server riêng — chỉ gửi tới nhà cung cấp AI mà user chọn. Xem [[AI-Providers]].
- **Dữ liệu tiến độ** lưu Supabase (khi đã đăng nhập) hoặc `localStorage` (khách). Xem [[Storage-Sync]].

## Các luồng người dùng chính

1. **Luồng luyện tập:** [[Exercise-Library]] → chọn bài → [[Translation-Practice]] → nhận điểm + huy hiệu ([[Achievements]]) → có thể chuyển sang [[Dictation-Practice]].
2. **Luồng có cấu trúc:** [[Learning-Path]] → module theo tuần → bài trong module → certificate khi xong.
3. **Luồng ôn tập:** [[Review-Queue]] / [[Flashcards]] → bài tập do [[Spaced-Repetition]] xếp lịch.
4. **Luồng phân tích:** mọi attempt → [[Dashboard-Analytics]] → [[Error-Patterns]] → [[Adaptive-Learning]] gợi ý bài tiếp theo.

## Liên kết

- **Tiếp theo:** [[Architecture]]
- **Tra cứu nhanh:** [[Routes-Map]]
