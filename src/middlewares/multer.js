// 📦 Middleware para carga de archivos clínicos (no solo imágenes)
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Crear carpeta temporal si no existe
const tempDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const nombreUnico = Date.now() + "-" + file.originalname;
    cb(null, nombreUnico);
  },
});

// Filtro para múltiples tipos permitidos
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const extensionesPermitidas = [".jpg", ".jpeg", ".png", ".webp", ".pdf", ".doc", ".docx"];

  if (extensionesPermitidas.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Formato de archivo no permitido."), false);
  }
};

// Configuración Multer
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

module.exports = upload;
