const express = require("express");
const router = express.Router();

const {
  createPayment,
  updatedPayment,
  deletePaymentMethod,
} = require("../controller/paymentController.js");

const { auth, checkAdmin } = require("../middleware/auth.js");

router.post("/", auth, createPayment);
router.patch("/:id", auth, updatedPayment);
router.delete("/:id", auth, checkAdmin, deletePaymentMethod);

module.exports = router;
