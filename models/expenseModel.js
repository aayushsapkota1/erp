const mongoose = require("mongoose");
const NepaliDate = require("nepali-date-converter");

const ExpenseSchema = mongoose.Schema(
  {
  
    title: { type: String },
   
    category: { type: String },
    image: { type: String },
   
    amount: {
      type: Number,
      default: 0,
    },
   
    
    remarks: { type: String },
    createdDate: {type:String},
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
ExpenseSchema.pre('save', function(next) {
  const nepDate = new NepaliDate();
  this.dateInfo = {
    year: nepDate.getYear(),
    month: nepDate.getMonth()+1,
    day: nepDate.getDate(),
  };
  next();
});

const Expense = mongoose.model("Expense", ExpenseSchema);

module.exports = Expense;
