const mongoose = require("mongoose");
const invoiceModel = require("../models/invoiceModel.js");
const {
  createTransaction,
  deleteTransactionOfPaymentInOrSales,
  updateTransaction,
} = require("./transactionController.js");

const getInvoices = async (req, res) => {
  try {
    const invoice = await invoiceModel.find();
    const detailList = invoice.map((item) => {
      const { _id, ...rest } = item._doc;
      return { id: _id, ...rest };
    });
    //renaming _id to id of every invoice and storing it in detailList variable.

    const data = invoice.map((item) => {
      const {
        _id,
        invoiceNo,
        statusIndex,
        statusName,
        totalAmount,
        paidAmount,
        dueDate,
        createdDate,
        clientDetail,
      } = item;
      return {
        id: _id,
        invoiceNo,
        statusIndex,
        statusName,
        totalAmount,
        paidAmount,
        dueDate,
        createdDate,
        clientName: clientDetail?.name,
      };
    });

    res.status(200).json({ data, detailList });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
}; // end of getInvoices

const getInvoice = async (req, res) => {
  const { id } = req.params;
  try {
    const invoice = await invoiceModel.findById(id);
    res.status(200).json({ data: invoice });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
}; // end of getInvoice


const NewInvoiceNo = async (req, res) => {
  try {
    const { type } = req.params;
    const lastInvoice = await invoiceModel
      .findOne({ invoiceType: type })
      .sort({ _id: -1 });
    const lastInvoiceNo = lastInvoice?.invoiceNo || 0;
    let newInvoiceNo;
    if (lastInvoiceNo === 1000) {
      newInvoiceNo = 1;
    } else {
      newInvoiceNo = lastInvoiceNo + 1;
    }
    res.status(200).json({ data: newInvoiceNo });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
}; // end of NewInvoiceNo

const createInvoice = async (req, res) => {
  const invoice = req.body;
  const newInvoice = new invoiceModel(invoice);
  const invoiceNo = invoice.invoiceNo || "";
  const receviedAmount = parseInt(invoice.paidAmount);
  try {
    const transaction = {
      transactionNumber: newInvoice._id,
      transactionType: newInvoice.invoiceType,
      partyDetails: newInvoice.clientDetail,
      productDetails: newInvoice.products,
      receviedAmount: receviedAmount,
      status: newInvoice.statusName,
      amount: newInvoice.totalAmount,
      note: newInvoice.note,
      billNumber: invoiceNo,
      createdDate: invoice.createdDate,
    };
    await createTransaction(transaction);
    await newInvoice.save();
    res
      .status(201)
      .json({ data: newInvoice, message: "Invoice created successfully." });
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
}; // end of createInvoice

const updateInvoice = async (req, res) => {
  const { id } = req.params;
  const invoice = req.body;
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(404).send(`No invoice with id: ${id}`);
  const invoiceNo = invoice.invoiceNo || "";
  const receviedAmount = parseInt(invoice.paidAmount);
  const transaction = {
    transactionNumber: id,
    partyDetails: invoice.clientDetail,
    productDetails: invoice.products,
    status: invoice.statusName,
    transactionType: invoice.invoiceType,
    amount: invoice.totalAmount,
    receviedAmount: receviedAmount,
    note: invoice.note,
    billNumber: invoiceNo,
    createdDate: invoice.createdDate,
  };
  await updateTransaction(transaction);
  const updatedInvoice = await invoiceModel.findByIdAndUpdate(
    id,
    // { ...invoice, id },
    { ...invoice},

    { new: true }
  );
  res
    .status(200)
    .json({ data: updatedInvoice, message: "Invoice updated successfully." });
}; // end of updateInvoice

const deleteInvoice = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(404).send(`No invoice with id: ${id}`);
  await deleteTransactionOfPaymentInOrSales(id);
  await invoiceModel.findByIdAndRemove(id);
  res.json({ message: "Invoice deleted successfully." });
}; // end of deleteInvoice

// get client purchase history by client id from invoiceModel
const getClientPurchaseHistory = async (req, res) => {
  const { id } = req.params;
  try {
    // find all invoices by client id and exclude statusIndex 1 (draft)
    const invoice = await invoiceModel.find({
      "clientDetail._id": id,
      statusIndex: { $ne: "1" },
    });

    
    const data = invoice.map((item) => {
      const {
        _id,
        invoiceNo,
        statusName,
        statusIndex,
        totalAmount,
        paidAmount,
        dueDate,
        clientDetail,
        products,
      } = item;
      return {
        _id,
        invoiceNo,
        statusName,
        totalAmount,
        paidAmount,
        dueDate,
        statusIndex,
        clientDetail,
        products: products.map((product) => {
          return {
            id: product.id,
            name: product.name,
            quantity: product.quantity,
            amount: product.amount,
          };
        }),
      };
    });
    res.status(200).json({ data });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
}; // end of getClientPurchaseHistory

const deleteinvoiceByClientID = async (id) => {
  try {
    const allInvoice = await invoiceModel.find({
      "clientDetail._id": id,
    });
    allInvoice.forEach(async (invoice) => {
      await invoiceModel.findByIdAndRemove(invoice._id);
    });
  } catch (error) {
    console.log(error);
  }
};

const deleteAllInvoices = async (req, res) => {
  try {
    await invoiceModel.deleteMany({});
    res.status(200).json({ message: "All invoices deleted successfully." });
  } catch (error) {
    console.log(error, "error");
    res.status(500).json({ error: "There was an error deleting the invoices" });
  }
};

module.exports = {
  getInvoices,
  getInvoice,
  NewInvoiceNo,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getClientPurchaseHistory,
  deleteinvoiceByClientID,
  deleteAllInvoices
};