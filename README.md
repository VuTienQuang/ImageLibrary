# Image Library 📸

Website quản lý ảnh và tìm kiém ảnh theo đặc trưng.

## 🛠️ Mỏi trường và cài đặt

### 1. Clone project

```bash
git clone https://github.com/VuTienQuang/ImageLibrary.git
cd ImageLibrary
```

### 2. Cài dependencies cho Frontend và Backend

#### 📦 Frontend (ReactJS):

```bash
cd frontend
npm install
```

(Chi tiết nếu cần:)
```bash
npm install react react-dom react-router-dom axios nsfwjs react-icons react-masonry-css sass @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event web-vitals
```

#### 📦 Backend (Node.js + ExpressJS):

```bash
cd ../backend
npm install
```

(Chi tiết nếu cần:)
```bash
npm install @tensorflow/tfjs @tensorflow/tfjs-node body-parser canvas cors dotenv express face-api.js hog-features image-js jimp mongoose multer node-fetch nsfwjs sharp
```

## 🚀 Chạy project

### 1. Chạy backend

```bash
cd backend
npm start
```
- Backend chạy tại `http://localhost:5000`
- Đảm bảo MongoDB đã khởi động.

### 2. Chạy frontend

Mở tab Terminal mới:

```bash
cd frontend
npm start
```
- Frontend chạy tại `http://localhost:3000`

## 🔧 Thiết lập biến môi trường cho backend

Trong thư mục `backend/`, tạo file `.env`:

```bash
MONGO_URL=your_mongodb_connection_string
PORT=5000
```

## ✨ Tính năng chính

- Upload ảnh.
- Kiểm tra NSFW bằng nsfwjs.
- Tìm kiêm ảnh theo ảnh đầu vào (sử dụng Cosine Similarity).
- Lưu ảnh và đặc trưng vào MongoDB.
- Responsive Masonry layout cho gallery.

## 🔗 Liên hệ

- Tác giả: VuTienQuang
- Github: [VuTienQuang](https://github.com/VuTienQuang)

---

# 👍 Hoàn thành!

