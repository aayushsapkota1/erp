const mongoose = require("mongoose");
const NepaliDate = require("nepali-date-converter");

const TransactionSchema = mongoose.Schema(
  {
    transactionNumber: { type: String },
    transactionType: { type: String },
    partyDetails: { type: Object },
    productDetails: { type: Array },
    status: { type: String },
    amount: { type: Number },
    receviedAmount: { type: Number },
    totalAmountToPay: { type: Number },
    note: { type: String },
    billNumber: { type: String },
    createdDate: { type: String},
    dateInfo: {
      year: { type: Number },
      month: { type: Number },
      day: { type: Number },
    },
  },
  {
    timestamps: true,
  }
);


// Middleware to populate dateInfo
TransactionSchema.pre('save', function(next) {
  const nepDate = new NepaliDate();
  this.dateInfo = {
    year: nepDate.getYear(),
    month: nepDate.getMonth()+1,
    day: nepDate.getDate(),
  };
  next();
});

const Transaction = mongoose.model("Transaction", TransactionSchema);

module.exports = Transaction;
