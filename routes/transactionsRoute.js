const express = require("express");
const router = express.Router();

const {
  getTransactions,
  getTransactionByUser,
  getTransactionsByUserAndReport,
  createTransaction,
  deleteAllTransactions,
  getTransactionByProduct,
} = require("../controller/transactionController.js");

const { auth, checkAdmin } = require("../middleware/auth.js");

router.get("/", auth, getTransactions);
router.get("/:id", auth, getTransactionByUser);
router.get("/report/:id", auth, getTransactionsByUserAndReport);
router.get("/product/:id", auth, getTransactionByProduct);
router.post("/", auth, createTransaction);
router.delete("/", auth, checkAdmin, deleteAllTransactions);

module.exports = router;
