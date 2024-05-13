const express = require("express");
const router = express.Router();

const {
  getproductPage,
  createproductPage,
  getProductById,
  getfilterProduct,
  updateProductById,
  deleteProductById,
  createMultipleProduct,
  addOrReduceProductQuantity,
} = require("../controller/productController.js");

const { auth, checkAdmin } = require("../middleware/auth.js");

router.get("/", auth, getproductPage);
router.get("/filter", auth, getfilterProduct);
router.post("/", auth, checkAdmin, createproductPage);
router.post("/multiple", auth, checkAdmin, createMultipleProduct);
router.patch("/quantity/:id", auth, checkAdmin, addOrReduceProductQuantity);
router.patch("/:id", auth, checkAdmin, updateProductById);
router.delete("/:id", auth, checkAdmin, deleteProductById);
router.get("/:id", auth, getProductById);

module.exports = router;
