const express = require("express");
const router = express.Router();

const {
  getExpense,
  createExpense,
  getExpenseById,
  getFilterExpense,
  updateExpenseById,
  deleteExpenseById,
} = require("../controller/expenseController.js");

const { auth, checkAdmin } = require("../middleware/auth.js");

router.get("/", auth, getExpense);
router.get("/:id", auth, getExpenseById);
router.get("/filter", auth, getFilterExpense);
router.post("/", auth, createExpense);
router.patch("/:id", auth, updateExpenseById);
router.delete("/:id", auth, checkAdmin, deleteExpenseById);

module.exports = router;
