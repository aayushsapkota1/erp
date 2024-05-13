const mongoose = require("mongoose");
const NepaliDate = require("nepali-date-converter");

const PaymentMethodSchema = mongoose.Schema(
  {
    paymentType: { type: String },
    paymentDate: { type: String },
    paymentNumber: { type: String },
    partyDetails: { type: Object },
    amount: { type: Number },
    note: { type: String },
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
PaymentMethodSchema.pre('save', function(next) {
  const nepDate = new NepaliDate();
  this.dateInfo = {
    year: nepDate.getYear(),
    month: nepDate.getMonth()+1,
    day: nepDate.getDate(),
  };
  next();
});

const PaymentMethod = mongoose.model("PaymentMethod", PaymentMethodSchema);

module.exports = PaymentMethod;
