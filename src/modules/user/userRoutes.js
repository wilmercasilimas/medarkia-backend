const express = require("express");
const router = express.Router();
const {
  crearUsuario,
  listarUsuarios,
  actualizarUsuario,
  eliminarUsuario,
  actualizarAvatar,
  asignarDoctor
} = require("./userController");

const auth = require("../../middlewares/auth");
const validarRol = require("../../middlewares/validarRol");
const upload = require("../../middlewares/multer");
const validarUsuario = require("./validarUsuario");

// 🔐 Todas las rutas requieren autenticación
router.use(auth);

// 🆕 Crear usuario (solo admin)
router.post(
  "/",
  //validarRol("admin"),
  upload.single("avatar"),
  validarUsuario,
  crearUsuario
);

// 📋 Listar usuarios (solo admin)
router.get("/", validarRol("admin"), listarUsuarios);

// 🔄 Actualizar usuario (admin o usuario dueño - control interno en el futuro)
router.put(
  "/:id",
  validarRol("admin"),
  upload.single("avatar"),
  validarUsuario,
  actualizarUsuario
);

// 📸 Actualizar avatar de usuario (admin o usuario dueño)
router.put(
  "/avatar/:id",
  upload.single("avatar"),
  actualizarAvatar
);

// 🔗 Asignar doctor a asistente (solo admin)
router.put(
  "/:id/asignar-doctor",
  validarRol("admin", "doctor"),
  asignarDoctor
);


// ❌ Eliminar usuario (solo admin)
router.delete("/:id", validarRol("admin"), eliminarUsuario);

module.exports = router;
