const express = require("express");
const router = express.Router();

const {
  createClient,
  createMultipleClient,
  deleteClient,
  getAllClient,
  updateClient,
  getClientById,
} = require("../controller/clientController.js");

const { auth, checkAdmin } = require("../middleware/auth.js");

router.get("/", auth, getAllClient);
router.post("/", auth, createClient);
router.post("/multiple", auth, createMultipleClient);
router.patch("/:id", auth, updateClient);
router.delete("/:id", auth, checkAdmin, deleteClient);
router.get("/:id", auth, getClientById);

module.exports = router;
