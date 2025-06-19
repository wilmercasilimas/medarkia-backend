const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ message: "Token no proporcionado." });
  }

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
    req.user = decoded; // { id, rol, iat, exp }
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido." });
  }
};

module.exports = auth;
