const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const nsfwjs = require('nsfwjs');
const tf = require('@tensorflow/tfjs');
const { createCanvas, Image: CanvasImage } = require('canvas');
const path = require('path');
const fs = require('fs');
const Jimp = require('jimp');


// MongoDB model
const ImageModel = require('./models/Image');       

// Xử lý ảnh
const sharp = require('sharp'); 
const { Image: ImageJS } = require('image-js');     
const { extractHOG } = require('hog-features');     

const app = express();
app.use(cors());
app.use(express.json());

// Serve folder uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Kết nối MongoDB
mongoose.connect('mongodb://localhost:27017/imageLibrary', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ Kết nối MongoDB thành công'))
  .catch(err => console.error('❌ Lỗi kết nối MongoDB:', err.message));

// Multer memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Load NSFW model
let nsfwModel;
(async () => {
  nsfwModel = await nsfwjs.load();
})();
// trích suất đặc trưng 
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const d = mx - mn;
  let h = 0, s = mx === 0 ? 0 : d / mx, v = mx;
  if (d !== 0) {
    if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = h * 60;
  }
  return [h/360, s, v];
}

async function extractFeatures(buffer) {
  // 1. Load & resize
  const img = await Jimp.read(buffer);
  img.resize(128, 256);  // width=128, height=256
  const { data, width, height } = img.bitmap;

  // 2. Tính Sobel & HOG cơ bản (orientation histogram 9 bin)
  // 2.1 Clone + greyscale
  const gray = img.clone().greyscale();
  const sobelXKernel = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1]
  ];
  const sobelYKernel = [
    [-1,-2,-1],
    [ 0, 0,  0],
    [ 1, 2,  1]
  ];
  const gxImg = gray.clone().convolute(sobelXKernel);
  const gyImg = gray.clone().convolute(sobelYKernel);

  const sobelBins = 9;
  const sobelHist = new Array(sobelBins).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y*width + x)*4;
      const gx = gxImg.bitmap.data[idx];
      const gy = gyImg.bitmap.data[idx];
      const mag = Math.hypot(gx, gy);
      let angle = Math.atan2(gy, gx);        // -π..π
      if (angle < 0) angle += Math.PI;       // 0..π
      let bin = Math.floor(angle / Math.PI * sobelBins);
      if (bin >= sobelBins) bin = sobelBins - 1;
      sobelHist[bin] += mag;
    }
  }
  // normalize
  const sumS = sobelHist.reduce((a,b)=>a+b, 1e-6);
  const sobelVector = sobelHist.map(v=>v/sumS);

  // 3. HSV histogram (50 bins mỗi kênh)
  const binsHSV = 50;
  const hsvHist = [new Array(binsHSV).fill(0),
                   new Array(binsHSV).fill(0),
                   new Array(binsHSV).fill(0)];
  for (let i = 0; i < width*height; i++) {
    const idx = i*4;
    const [h, s, v] = rgbToHsv(
      data[idx], data[idx+1], data[idx+2]
    );
    const hi = Math.min(binsHSV-1, Math.floor(h*binsHSV));
    const si = Math.min(binsHSV-1, Math.floor(s*binsHSV));
    const vi = Math.min(binsHSV-1, Math.floor(v*binsHSV));
    hsvHist[0][hi]++; hsvHist[1][si]++; hsvHist[2][vi]++;
  }
  const hsvVector = hsvHist.flatMap(arr => {
    const sum = arr.reduce((a,b)=>a+b,1e-6);
    return arr.map(v=>v/sum);
  });

  // 4. RGB histogram (256 bins mỗi kênh)
  const binsRGB = 256;
  const rgbHist = [new Array(binsRGB).fill(0),
                   new Array(binsRGB).fill(0),
                   new Array(binsRGB).fill(0)];
  for (let i = 0; i < width*height; i++) {
    const idx = i*4;
    rgbHist[0][ data[idx]   ]++;
    rgbHist[1][ data[idx+1] ]++;
    rgbHist[2][ data[idx+2] ]++;
  }
  const rgbVector = rgbHist.flatMap(arr => {
    const sum = arr.reduce((a,b)=>a+b,1e-6);
    return arr.map(v=>v/sum);
  });

  // 5. Gộp HOG + HSV + RGB
  // độ dài: 9 + 3*50 + 3*256 = 9 + 150 + 768 = 927
  return [...sobelVector, ...hsvVector, ...rgbVector];
}

// Route: lấy ảnh
app.get('/images', async (req, res) => {
  try {
    const images = await ImageModel.find();
    res.json(images);
  } catch (err) {
    console.error('❌ Lỗi lấy ảnh:', err);
    res.status(500).json({ message: 'Lỗi khi lấy ảnh' });
  }
});

// Route: upload ảnh
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const { buffer, originalname } = req.file;

    // Lưu file vào /uploads
    const fileName = `${Date.now()}_${originalname}`;
    const filePath = path.join(__dirname, 'uploads', fileName);
    fs.writeFileSync(filePath, buffer);

    // NSFW classify
    const cImg = new CanvasImage();
    cImg.src = buffer;
    const canvas = createCanvas(cImg.width, cImg.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(cImg, 0, 0);
    const tensor = tf.browser.fromPixels(canvas).toFloat().expandDims(0);
    const preds = await nsfwModel.classify(tensor);
    const top = preds[0];
    

    // Trích feature thật
    const features = await extractFeatures(req.file.buffer);


    // Lưu MongoDB
    const sobelVector = features.slice(0, 9);  // 9 bins cho Sobel
    const hsvVector = features.slice(9, 9 + 150);  // 150 bins cho HSV
    const rgbVector = features.slice(9 + 150);  // 768 bins cho RGB
    const doc = new ImageModel({
      imageUrl: `/uploads/${fileName}`,
      features: {
        sobel: sobelVector,
        hsv: hsvVector,
        rgb: rgbVector,
      },
      nsfw: { label: top.className, probability: top.probability }
    });
    
    await doc.save();

    res.json(doc);
  } catch (err) {
    console.error('❌ Lỗi upload:', err);
    res.status(500).json({ message: 'Lỗi khi upload ảnh' });
  }
});

// Route: xóa ảnh
app.delete('/images/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const img = await ImageModel.findByIdAndDelete(id);
    if (!img) return res.status(404).json({ message: 'Ảnh không tồn tại' });

    // Xóa file vật lý
    fs.unlink(path.join(__dirname, img.imageUrl), err => {
      if (err) console.warn('Không xóa được file:', err);
    });

    res.json({ message: 'Xóa ảnh thành công', id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi khi xóa ảnh' });
  }
});
// Hàm tính cosine similarity
function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a*a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b*b, 0));
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}

// Route: tìm kiếm ảnh theo ảnh
app.post('/search', upload.single('image'), async (req, res) => {
  try {
    const { buffer } = req.file;
    
    // Trích feature từ ảnh input
    const inputFeatures = await extractFeatures(buffer);

    // Load tất cả ảnh từ database
    const images = await ImageModel.find();

    // Tính cosine similarity với từng ảnh
    const results = images.map(img => {
      const dbFeatures = [
        ...img.features.sobel,
        ...img.features.hsv,
        ...img.features.rgb,
      ];
      const score = cosineSimilarity(inputFeatures, dbFeatures);
      return { image: img, score };
    });

    // Sắp xếp giảm dần theo độ giống
    results.sort((a, b) => b.score - a.score);

    // Lấy 3 ảnh giống nhất
    const top3 = results.slice(0, 3).map(r => ({
      id: r.image._id,
      imageUrl: r.image.imageUrl,
      score: r.score,
    }));

    res.json(top3);
  } catch (err) {
    console.error('❌ Lỗi search ảnh:', err);
    res.status(500).json({ message: 'Lỗi khi tìm kiếm ảnh' });
  }
});


// Chạy server
app.listen(5000, () => console.log('🚀 Server chạy port 5000'));
