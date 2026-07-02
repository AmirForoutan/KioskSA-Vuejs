const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 5174;

// تنظیم CORS
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "DELETE"],
  })
);

// ذخیره فایل‌ها
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "public/img");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const { itemId, itemType } = req.body;
    const fileName = `${
      itemType === "category" ? "groups" : "goods"
    }/${itemId}.png`;
    cb(null, fileName);
  },
});

const upload = multer({ storage });

// آپلود تصویر
app.post("/api/upload", upload.single("image"), (req, res) => {
  res.json({
    success: true,
    imageUrl: `/img/${req.file.filename}`,
  });
});

// دسترسی به فایل‌های استاتیک
app.use("/img", express.static(path.join(__dirname, "public/img")));

app.listen(PORT, () => {
  console.log(`سرور آپلود در حال اجرا است: http://localhost:${PORT}`);
});
