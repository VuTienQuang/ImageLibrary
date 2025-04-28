const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  features: {
    sobel: { type: [Number], required: true },  // Lưu trữ các đặc trưng Sobel (9 bins)
    hsv: { type: [Number], required: true },    // Lưu trữ các đặc trưng HSV
    rgb: { type: [Number], required: true },    // Lưu trữ các đặc trưng RGB
  },
  nsfw: {
    label: { type: String, required: true },
    probability: { type: Number, required: true },
  },
});

module.exports = mongoose.model('Image', ImageSchema);
