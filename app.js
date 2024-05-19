const express = require("express");
const morgan = require("morgan");
const cors = require("cors");

const ProductRoute = require("./routes/productRoute.js");
const ClientRoute = require("./routes/clientRoute.js");
const InvoiceRoute = require("./routes/invoiceRoute.js");
const PaymentRoute = require("./routes/paymentRoute.js");
const Transactions = require("./routes/transactionsRoute.js");
const ExpenseRoute = require("./routes/expenseRoute.js");
const DashDataRoute = require("./routes/dashDataRoute.js");
const UserRoute = require("./routes/userRoute.js");

const app = express();
app.use(cors());


app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use(morgan("dev"));

app.use("/API/products", ProductRoute);
app.use("/API/clients", ClientRoute);
app.use("/API/invoices", InvoiceRoute);
app.use("/API/payments", PaymentRoute);
app.use("/API/transactions", Transactions);
app.use("/API/expenses", ExpenseRoute);
app.use("/API/dashData", DashDataRoute);
app.use("/API/users", UserRoute);

// Route handler for the root URL
app.get("/", (req, res) => {
  res.send("hi mero vai");
});


module.exports = app;
