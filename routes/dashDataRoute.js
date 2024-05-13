const express = require("express");
const router = express.Router();

const {
  getRevenueData,
  getExpenseData,
  getRevenueByCategory,
  getStockData,
  getFinancialData,
  getCashFlowData,
  getPurchaseData,
  getDayBookData,
  calculateMonthlyProfit,
} = require("../controller/dashDataController.js");

const { auth, checkAdmin } = require("../middleware/auth.js");

router.get("/revenueData", auth, checkAdmin, getRevenueData);
router.get("/purchaseData", auth, checkAdmin, getPurchaseData);
router.get("/expenseData", auth, checkAdmin, getExpenseData);
router.get("/revenueByCategory", auth, checkAdmin, getRevenueByCategory);
router.get("/stockData", auth, checkAdmin, getStockData);
router.get("/financialData", auth, checkAdmin, getFinancialData);
router.get("/cashFlowData", auth, checkAdmin, getCashFlowData);
router.get("/dayBookData", auth, checkAdmin, getDayBookData);
router.get("/getMonthlyProfit", auth, checkAdmin, calculateMonthlyProfit);

module.exports = router;
