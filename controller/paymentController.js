const PaymentMethod = require("../models/paymentMethod.js");
const clientModel = require("../models/clientModel.js");
const mongoose = require("mongoose");
const {
  createTransaction,
  deleteTransactionOfPaymentInOrSales,
  updateTransaction,
} = require("./transactionController.js");

const createPayment = async (req, res) => {
  const payment = req.body;
  const paymentNo = await PaymentMethod.countDocuments();
  const newPayment = new PaymentMethod({
    ...payment,
    paymentNumber: `PAY-${paymentNo + 1000}`,
  });
  const transaction = {
    transactionNumber: newPayment._id,
    transactionType: newPayment.paymentType,
    partyDetails: newPayment.partyDetails,
    productDetails: null,
    amount: newPayment.amount,
    note: newPayment.note,
    createdDate: newPayment.paymentDate,
  };
  try {
    await createTransaction(transaction);
    await newPayment.save();
    res.status(201).json({ data: newPayment });
  } catch (error) {
    console.log(error);
    res.status(409).json({ message: error.message });
  }
}; // end of createInvoice

const updatedPayment = async (req, res) => {
  const { id } = req.params;
  const payment = req.body;
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(404).send(`No payment with id: ${id}`);
  const transaction = {
    transactionNumber: payment.transactionNumber,
    transactionType: payment.paymentType,
    partyDetails: payment.partyDetails,
    productDetails: null,
    amount: payment.amount,
    note: payment.note,
    createdDate: payment.paymentDate,
  };
  await updateTransaction(transaction);
  try {
    const updatedPayment = await PaymentMethod.findById(id);
    // update the payment
    updatedPayment.amount = payment.amount;
    updatedPayment.note = payment.note;
    updatedPayment.paymentDate = payment.paymentDate || new Date();
    // save the payment
    await updatedPayment.save();
    res.status(200).json({ data: updatedPayment });
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
}; // end of updateInvoice

const deletePaymentMethod = async (req, res) => {
  const { id } = req.params;
  try {
    await deleteTransactionOfPaymentInOrSales(id);
    await PaymentMethod.findByIdAndDelete(id);
    res.status(200).json({ message: "Payment deleted successfully." });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

const deletePaymentMethodByClientID = async (id) => {
  try {
    const allPayment = await PaymentMethod.find({
      "partyDetails._id": id,
    });
    allPayment.forEach(async (payment) => {
      await PaymentMethod.findByIdAndDelete(payment._id);
    });
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  createPayment,
  updatedPayment,
  deletePaymentMethod,
  deletePaymentMethodByClientID
};