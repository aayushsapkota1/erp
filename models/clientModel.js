const mongoose = require("mongoose");

const clientSchema = mongoose.Schema(
  {
    name: {
      type: String,
    },
    email: {
      type: String,
      default: "N/A",
    },
    image: { type: String },
    mobileNo: { type: String },
    secmobileNo: { type: String, default: "N/A" },
    vatNumber: { type: String, default: "N/A" },
    billingAddress: { type: String, default: "N/A" },
    totalAmountToPay: { type: Number, default: 0 },
    openingBalance: { type: Number, default: 0 },
    clientType: { type: String, default: "Customer" },
  },
  {
    timestamps: true,
  }
);

const clientModel = mongoose.model("clients", clientSchema);

module.exports = clientModel;
