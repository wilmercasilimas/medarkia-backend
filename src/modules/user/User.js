const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
    },
    apellido: {
      type: String,
      required: [true, "El apellido es obligatorio"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "El email es obligatorio"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "La contraseña es obligatoria"],
      minlength: 6,
    },
    telefono: {
      type: String,
      required: [true, "El teléfono es obligatorio"],
      trim: true,
    },
    rol: {
      type: String,
      enum: ["admin", "doctor", "asistente", "paciente"],
      default: "paciente",
    },
    avatar: {
      url: {
        type: String,
        default: process.env.DEFAULT_AVATAR_URL,
      },
      public_id: {
        type: String,
        default: null,
      },
    },
    creado_por: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    editado_por: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true, // createdAt y updatedAt
  }
);

// 🔐 Hashear contraseña antes de guardar
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 🔐 Comparar contraseñas
userSchema.methods.compararPassword = async function (passwordFormulario) {
  return await bcrypt.compare(passwordFormulario, this.password);
};

module.exports = mongoose.model("User", userSchema);
