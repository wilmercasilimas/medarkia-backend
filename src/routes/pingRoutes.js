// src/routes/pingRoutes.js
const express = require("express");
const router = express.Router();

router.get("/ping", (_, res) => {
  res.sendStatus(200); // sin JSON, sin lógica
});

module.exports = router;
