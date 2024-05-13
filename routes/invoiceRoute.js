const express = require("express");
const router = express.Router();

const {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getClientPurchaseHistory,
  NewInvoiceNo,
  deleteAllInvoices,
} = require("../controller/invoiceController.js");

const { auth, checkAdmin } = require("../middleware/auth.js");

router.get("/", auth, getInvoices);
router.get("/newInvoiceNo/:type", auth, NewInvoiceNo);
router.post("/", auth, createInvoice);
router.get("/:id", auth, getInvoice);
router.patch("/:id", auth, updateInvoice);
router.delete("/:id", auth, checkAdmin, deleteInvoice);
router.delete("/", auth, checkAdmin, deleteAllInvoices);
router.get("/client/:id", auth, getClientPurchaseHistory); //all invoices specific to that client excluding draft

module.exports = router;
