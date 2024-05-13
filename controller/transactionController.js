const Transaction = require("../models/allTransactionsModel.js");
const clientModel = require("../models/clientModel.js");
const InvoiceModel = require("../models/invoiceModel.js");
const productModel = require("../models/productModel.js");
const { getPaginatedData } = require("../Utils/pagination.js");
const jwt = require("jsonwebtoken").jwt;
const NepaliDate = require('nepali-date-converter');


const createTransaction = async (req) => {
  const nepaliDate= new NepaliDate();
  const formattedDate = nepaliDate.format('YYYY-MM-DD');
  const {
    transactionNumber,
    transactionType,
    partyDetails,
    productDetails,
    receviedAmount,
    // createdDate,
    status,
    amount,   
    note,
    billNumber,
  } = req;

//   console.log("id"+partyDetails.id);
//   console.log("_id"+partyDetails._id);

//   if (typeof partyDetails.id === 'string') {
//     console.log('Id is a string');
// } else {
//     console.log('The variable is not a string');
// }

// if (typeof partyDetails._id === 'string') {
//   console.log('_Id is a string');
// } else {
//   console.log('The variable is not a string');
// }

  if (productDetails !== null) {
    productDetails.forEach((product) => {
      product.quantity = Number(product.quantity);
    });
    //converting product.quantity in number
  }
  if (partyDetails._id !== null) {
    const client = await clientModel.findById(partyDetails?._id);
    if (client !== null) {
      //searching if party exists in the transaction or not
      if (transactionType === "Sale" || transactionType === "Purchase") {
        if(status !=="Draft"){
          client.totalAmountToPay += amount;
          client.totalAmountToPay -= receviedAmount;
          await client.save();
        } 
       
      } else if (
        transactionType === "SalesReturn" ||
        transactionType === "PurchasesReturn"
      ) {
        if(status!=="Draft"){
          client.totalAmountToPay -= amount;
          client.totalAmountToPay += receviedAmount;
          await client.save();
        }
       
      } else if (
        transactionType === "PaymentIn" ||
        transactionType === "PaymentOut"
      ) {
        client.totalAmountToPay -= amount;
        await client.save();
      } else if (transactionType === "OpeningBalance") {
        client.totalAmountToPay += amount;  
        await client.save();
      }
    }
  }
  //totalAmounttopay is adjusted
  let NoNullProductDetail = [];
  let newProductDetails = [];
  if (productDetails !== null) {
    NoNullProductDetail = productDetails.filter((product) => {
      return product.productID !== null && product.productID !== "";
    });
    NoNullProductDetail.forEach(async (product) => {
      //now the loop begins for NoNullProductDetail which is a collection of products coming from frontend
      const productDetail = await productModel.findById(product.productID);
      //first the product is retrieved from database and the quantity is adjusted according to transactionTypes
      if (productDetail !== null) {
        if (transactionType === "Sale") {
          if (product.isSecondaryUnitChecked) {
            productDetail.quantity -=
              product.quantity / product.conversionRatio;
          } else {
            productDetail.quantity -= product.quantity;
          }
          await productDetail.save();
        } else if (transactionType === "Purchase") {
          if (product.isSecondaryUnitChecked) {
            productDetail.quantity +=
              product.quantity / product.conversionRatio;
          } else {
            productDetail.quantity += product.quantity;
          }
          await productDetail.save();
        } else if (transactionType === "SalesReturn") {
          if (product.isSecondaryUnitChecked) {
            productDetail.quantity +=
              product.quantity / product.conversionRatio;
          } else {
            productDetail.quantity += product.quantity;
          }
          await productDetail.save();
        } else if (transactionType === "PurchasesReturn") {
          if (product.isSecondaryUnitChecked) {
            productDetail.quantity -=
              product.quantity / product.conversionRatio;
          } else {
            productDetail.quantity -= product.quantity;
          }
          await productDetail.save();
        } else if (transactionType === "AddQuantity") {
          if (product.isSecondaryUnitChecked) {
            productDetail.quantity +=
              product.quantity / product.conversionRatio;
          } else {
            productDetail.quantity += product.quantity;
          }
          await productDetail.save();
        } else if (transactionType === "ReduceQuantity") {
          if (product.isSecondaryUnitChecked) {
            productDetail.quantity -=
              product.quantity / product.conversionRatio;
          } else {
            productDetail.quantity -= product.quantity;
          }
          await productDetail.save();
        }
      }
    }); //loop ends
    newProductDetails = NoNullProductDetail.map((product) => {
      return {
        productID: product.productID,
        productName: product.name,
        quantity: product.quantity,
        isSecondaryUnitChecked: product.isSecondaryUnitChecked,
        unit: product.isSecondaryUnitChecked
          ? product.secondaryUnit
          : product.primaryUnit,
      };
    });
  }
  // create a new transaction
  const newTransaction = new Transaction({
    transactionNumber,
    transactionType,
    partyDetails,
    productDetails: newProductDetails,
    receviedAmount,
    createdDate: formattedDate,
    status,
    amount,
    note,
    billNumber,
  });

  try {
    await newTransaction.save();
  } catch (error) {
    console.log(error.message);
  }
};

const updateTransaction = async (req) => {
  const {
    transactionNumber,
    transactionType,
    partyDetails,
    productDetails,
    receviedAmount,
    createdDate,
    status,
    amount,
    note,
    billNumber,
  } = req;
  if (productDetails !== null) {
    productDetails.forEach((product) => {
      product.quantity = Number(product.quantity);
    });
  } //all the producct's quantity us changedd to integer

  const transaction = await Transaction.findOne({ transactionNumber });

  let newClient = null, oldClient = null;

//   console.log("id"+partyDetails.id);
//   console.log("_id"+partyDetails._id);

//   if (typeof partyDetails.id === 'string') {
//     console.log('Id is a string');
// } else {
//     console.log('The variable is not a string');
// }

// if (typeof partyDetails._id === 'string') {
//   console.log('_Id is a string');
// } else {
//   console.log('The variable is not a string');
// }
  
  if (partyDetails && partyDetails._id) {
    newClient = await clientModel.findById(partyDetails._id);
  }

  if (transaction && transaction.partyDetails && transaction.partyDetails._id) {
    oldClient = await clientModel.findById(transaction.partyDetails._id);
  }
 


  if(newClient && oldClient && newClient._id.toString() == oldClient._id.toString()){
    let amountDifference=0;
    if (amount !== transaction.amount) {
      amountDifference = amount - transaction.amount;
    }
    let receivedAmountDifference = transaction.receviedAmount - receviedAmount;
    switch (transactionType) {
      case "Purchase":
      case "Sale":
        if (transaction.status=="Draft"){
          newClient.totalAmountToPay+= amount-receviedAmount;
          break;
        }
          newClient.totalAmountToPay +=
          amountDifference + receivedAmountDifference;

        break;
      case "PurchasesReturn":
      case "SalesReturn":
        if (transaction.status=="Draft"){
          newClient.totalAmountToPay-= amount-receviedAmount;
          break;
        }
        newClient.totalAmountToPay -=
          amountDifference + receivedAmountDifference;
        break;
      case "PaymentIn":
      case "PaymentOut":
        newClient.totalAmountToPay -= amountDifference;
        break;
      case "OpeningBalance":
        newClient.totalAmountToPay += amountDifference;
        break;
      default:
        break;
    }
    await newClient.save();
  }
  else{
    if (newClient) {
      switch (transactionType) {
        case "Purchase":
        case "Sale":
          newClient.totalAmountToPay += amount - receviedAmount;
          break;
        default:
          break;
      }
      await newClient.save();
    }
  
      // Only proceed if it exists, and transaction status isn't "Draft"
    if (oldClient && transaction.status !== 'Draft') {
      switch (transactionType) {
        case "Purchase":
        case "Sale":
          oldClient.totalAmountToPay -= transaction.amount-transaction.receviedAmount;
          break;
        default:
          break;
      }
      await oldClient.save();
    }
  }

  let newProductDetails = [];
  if (transaction) {
    let NoNullProductDetail = []; 
    if (productDetails !== null) {
      NoNullProductDetail = productDetails.filter((product) => {
        return product.productID !== null && product.productID !== "";
      }); //NoNullProductDetail--> New products list.
      if (NoNullProductDetail.length > 0) {
        let productIDs = transaction.productDetails
          ? transaction.productDetails.map(
              (productDetail) => productDetail.productID
            )
          : [];
        const previousProductIDs = [...productIDs];
            //these are previous product IDS
        for (let i = 0; i < NoNullProductDetail.length; i++) {
          const product = NoNullProductDetail[i];
          const isProductIDExist = productIDs.includes(product.productID); //making sure the new product exist in the previous products list
          let productDetail = await productModel.findById(product.productID);
          if (!productDetail) {
            return;
          }
          if (!isProductIDExist) {
            transaction.productDetails.push(productDetail); //push ta garyo but tyo product ko quantity ko kura??
            if (
              transactionType === "Sale" ||
              transactionType === "PurchasesReturn"
            ) {
              productDetail.quantity -= product.isSecondaryUnitChecked
                ? product.quantity / productDetail.conversionRatio
                : product.quantity;
            } else if (
              transactionType === "Purchase" ||
              transactionType === "SalesReturn"
            ) {
              productDetail.quantity += product.isSecondaryUnitChecked
                ? product.quantity / productDetail.conversionRatio
                : product.quantity;
            }
            await productDetail.save();
          } else { //but if product exists in previous product list 
            const existingProductDetail = transaction.productDetails.find(
              (p) => p.productID === product.productID //product means NoNullProductDetail[i];
            );
            let diff = 0;
            if (
              existingProductDetail.isSecondaryUnitChecked !==
              product.isSecondaryUnitChecked //product means NoNullProductDetail[i];
            ) {
              if (existingProductDetail.isSecondaryUnitChecked) {
                diff =
                  existingProductDetail.quantity /
                  productDetail.conversionRatio;
                diff = product.quantity - diff;
              } else {
                diff = product.quantity / productDetail.conversionRatio;
                diff = diff - existingProductDetail.quantity;
              }
            } else {
              if (existingProductDetail.isSecondaryUnitChecked) {
                diff =
                  existingProductDetail.quantity /
                  productDetail.conversionRatio;
                diff = product.quantity / productDetail.conversionRatio - diff;
              } else {
                diff = product.quantity - existingProductDetail.quantity;
              }
            }
            if (diff !== 0) {
              if (
                transactionType === "Sale" ||
                transactionType === "PurchasesReturn"
              ) {
                if (diff < 0) {
                  productDetail.quantity += Math.abs(diff);
                  await productDetail.save();
                } else {
                  productDetail.quantity -= diff;
                  await productDetail.save();
                }
              } else if (
                transactionType === "Purchase" ||
                transactionType === "SalesReturn"
              ) {
                if (diff < 0) {
                  productDetail.quantity -= Math.abs(diff);
                  await productDetail.save();
                } else {
                  productDetail.quantity += Math.abs(diff);
                  await productDetail.save();
                }
              }
            }
            // remove from previousProductIDs so that at the end we are left with only deleted products
            previousProductIDs.splice(
              previousProductIDs.indexOf(product.productID),
              1
            );
          }
        }
        for (let i = 0; i < previousProductIDs.length; i++) {
          const productID = previousProductIDs[i];
          const product = await productModel.findById(productID);
          const productDetail = transaction.productDetails.find(
            (p) => p.productID === productID
          );
          if (product) {
            if (
              transactionType === "Sale" ||
              transactionType === "PurchasesReturn"
            ) {
              if (productDetail.isSecondaryUnitChecked) {
                product.quantity +=
                  transaction.productDetails.find(
                    (p) => p.productID === productID
                  ).quantity / product.conversionRatio;
              } else {
                product.quantity += transaction.productDetails.find(
                  (p) => p.productID === productID
                ).quantity;
              }
              await product.save();
            } else if (
              transactionType === "Purchase" ||
              transactionType === "SalesReturn"
            ) {
              if (productDetail.isSecondaryUnitChecked) {
                product.quantity -=
                  transaction.productDetails.find(
                    (p) => p.productID === productID
                  ).quantity / product.conversionRatio;
              } else {
                product.quantity -= transaction.productDetails.find(
                  (p) => p.productID === productID
                ).quantity;
              }
              await product.save();
            }
          }
        }
        await transaction.save();
      } else { // if NoNullProductDetail.length = 0
        for (let i = 0; i < transaction.productDetails.length; i++) {
          const productDetail = transaction.productDetails[i];
          const product = await productModel.findById(productDetail.productID);
          if (product) {
            if (
              transactionType === "Sale" ||
              transactionType === "PurchasesReturn"
            ) {
              if (productDetail.isSecondaryUnitChecked) {
                product.quantity +=
                  productDetail.quantity / product.conversionRatio;
                await product.save();
              } else {
                product.quantity += productDetail.quantity;
                await product.save();
              }
            } else if (
              transactionType === "Purchase" ||
              transactionType === "SalesReturn"
            ) {
              if (productDetail.isSecondaryUnitChecked) {
                product.quantity -=
                  productDetail.quantity / product.conversionRatio;
                await product.save();
              } else {
                product.quantity -= productDetail.quantity;
                await product.save();
              }
            }
          }
        }
        transaction.productDetails = [];
        await transaction.save();
      }
      newProductDetails = NoNullProductDetail.map((product) => {
        return {
          productID: product.productID,
          productName: product.productName,
          quantity: product.quantity,
          isSecondaryUnitChecked: product.isSecondaryUnitChecked,
          unit: product.isSecondaryUnitChecked
            ? product.secondaryUnit
            : product.primaryUnit,
        };
      });
    }
  }
  // update the transaction
  const updatedTransaction = await Transaction.findOne({
    transactionNumber,
  });
  updatedTransaction.transactionType = transactionType;
  updatedTransaction.partyDetails = partyDetails;
  updatedTransaction.productDetails = newProductDetails;
  updatedTransaction.receviedAmount = receviedAmount;
  updatedTransaction.status = status;
  updatedTransaction.amount = amount;
  updatedTransaction.note = note;
  updatedTransaction.billNumber = billNumber;
  updatedTransaction.createdDate = transaction.createdDate;
  try {
    await updatedTransaction.save();
  } catch (error) {
    console.log(error.message);
  }
};

const getTransactions = async (req, res) => {
  try {
    const {
      page,
      draft,
      searchBy: { name, anything },
      filterBy,
      sortBy,
      date: { startDate, endDate },
    } = req.query;
    const pageNumber = parseInt(page);
    const showDraft = draft === "true" ? true : false;
    let regexSearch = name;
    let regexAnything = anything;
    let sort = parseInt(sortBy);
    if (sort === 1) {
      sort = { createdAt: -1 };
    } else if (sort === 2) {
      sort = { transactionType: 1 };
    } else if (sort === 3) {
      sort = { transactionType: -1 };
    } else if (sort === 4) {
      sort = { createdAt: 1 };
    }
    if (regexSearch) {
      regexSearch = new RegExp(regexSearch, "i");
    }
    let OrCondition = [];
    if (regexAnything) {
      regexAnything = new RegExp(anything, "i");
      OrCondition = [
        {
          "partyDetails.clientType": regexAnything,
        },
        {
          "productDetails.productName": regexAnything,
        },
        {
          billNumber: regexAnything,
        },
        {
          note:regexAnything
        }
      ];
    }
    const oneAndCondition =
      showDraft === true
        ? [{ status: "Draft" }]
        : [
            {
              status: { $ne: "Draft" },
            },
            {
              transactionType: { $ne: "OpeningBalance" },
            },
            {
              transactionType: { $ne: "AddQuantity" },
            },
            {
              transactionType: { $ne: "ReduceQuantity" },
            },
          ];
    const { data, pageCount } = await getPaginatedData({
      page: pageNumber,
      limit: 8,
      modelName: Transaction,
      inside: OrCondition,
      oneAndCondition: oneAndCondition,
      mainSearch: regexSearch
        ? { name: "partyDetails.name", value: regexSearch }
        : "",
      filterBy: filterBy ? { name: "transactionType", value: filterBy } : "",
      sortBy: sort,
      // startDate: startDate ? new Date(startDate) : "",
      // endDate: endDate ? new Date(endDate) : "",
      startDate: startDate,
      endDate: endDate,
    });
    res.status(200).json({ data, pageCount });
  } catch (error) {
    console.log(error);
    res.status(404).json({ message: error.message });
  }
};

const getTransactionsByUserAndReport = async (req, res) => {
  try {
    const {
      id,
      page,
      searchBy: { anything },
      date: { startDate, endDate },
    } = req.query;
    const pageNumber = parseInt(page);
    let regexAnything = anything;
    let oneAndCondition = [{
      status:{$ne:'Draft'}
    }];
    let OrCondition=[];
    if (regexAnything) {
      regexAnything = new RegExp(anything, "i");
      OrCondition = [
        {
          transactionType: regexAnything,
        },
        {
          billNumber: regexAnything,
        },
        {
          note: regexAnything,
        },
      ];
    }
    const { data, pageCount } = await getPaginatedData({
      page: pageNumber,
      limit: 100000000000000, //removing limit created problems that's why
      modelName: Transaction,
      inside: OrCondition,
      oneAndCondition,
      mainSearch: { name: "partyDetails._id", value: id },
      startDate: startDate,
      endDate: endDate,
    });
    res.status(200).json({ data, pageCount });
  } catch (error) {
    console.log(error);
    res.status(404).json({ message: error.message });
  }
};

const getTransactionByUser = async (req, res) => {
  const { id } = req.params;
  try {
    const page = parseInt(req.query.page);
    const { data, pageCount } = await getPaginatedData({
      page: page,
      limit: 100000000000, // removing limit created problems that's why
      modelName: Transaction,
      oneAndCondition:[{status:{$ne:'Draft'}}],
      inside: [{ "partyDetails._id": id }],
    });
    res.status(200).json({ data: data, pageCount: pageCount });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

const getTransactionByProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const page = parseInt(req.query.page);
    const { data, pageCount } = await getPaginatedData({
      page: page,
      limit: 8,
      modelName: Transaction,
      inside: [{ "productDetails.productID": id }],
    });
    res.status(200).json({ data: data, pageCount: pageCount });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

const deleteAllTransactions = async (req,res) => {
  try {
    await Transaction.deleteMany({});
    res.status(200).json({ message: "All transactions deleted successfully." });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "There was an error deleting the transactions" });
  }
};

const deleteTransactionByClientID = async (id) => {
  try {
    const allTransaction = await Transaction.find({
      "partyDetails._id": id,
    });
    allTransaction.forEach(async (transaction) => {
      // increase the quantity of the product in the transaction
      if (transaction.productDetails.length > 0) {
        const updateProductQuantity = async (
          productID,
          quantity,
          isSecondaryUnitChecked,
          method
        ) => {
          const product = await productModel.findById(productID);
          if (product) {
            if (method === "Sale" || method === "PurchasesReturn") {
              if (isSecondaryUnitChecked) {
                product.quantity += quantity / product.conversionRatio;
                await product.save();
              } else {
                product.quantity += quantity;
                await product.save();
              }
            } else if (method === "Purchase" || method === "SalesReturn") {
              if (isSecondaryUnitChecked) {
                product.quantity -= quantity / product.conversionRatio;
                await product.save();
              } else {
                product.quantity -= quantity;
                await product.save();
              }
            }
          }
        };
        transaction.productDetails.forEach(async (product) => {
          const productID = product.productID;
          const quantity = product.quantity;
          const isSecondaryUnitChecked = product.isSecondaryUnitChecked;
          const method = transaction.transactionType;
          await updateProductQuantity(
            productID,
            quantity,
            isSecondaryUnitChecked,
            method
          );
        });
      }
      await Transaction.findByIdAndDelete(transaction._id);
    });
  } catch (error) {
    console.log(error);
  }
}; 

const deleteTransactionOfPaymentInOrSales = async (id) => {
  try {
    const transaction = await Transaction.findOne({
      transactionNumber: id,
    });
    const products = transaction.productDetails;
    const method = transaction.transactionType;
    if (products.length > 0) {
      const updateProductQuantity = async (
        productID,
        quantity,
        isSecondaryUnitChecked,
        method
      ) => {
        const product = await productModel.findById(productID);
        if (product) {
          if (isSecondaryUnitChecked) {
            product.quantity =
              method === "Sale" || method === "PurchasesReturn"
                ? product.quantity + quantity / product.conversionRatio
                : product.quantity - quantity / product.conversionRatio;
          } else {
            product.quantity =
              method === "Sale" || method === "PurchasesReturn"
                ? product.quantity + quantity
                : product.quantity - quantity;
          }
          await product.save();
        }
      };
      for (let i = 0; i < products.length; i++) {
        updateProductQuantity(
          products[i].productID,
          products[i].quantity,
          products[i].isSecondaryUnitChecked,
          method
        );
      }
    }
    const client = await clientModel.findById(transaction.partyDetails._id);
    if (client !== null && transaction.status !== "Draft") {
      if (method === "PaymentIn") {
        client.totalAmountToPay += transaction.amount;
      } else if (method === "PaymentOut") {
        client.totalAmountToPay += transaction.amount;
      } else if (method === "Sale" || method === "Purchase") {
        client.totalAmountToPay -= transaction.amount;
        client.totalAmountToPay += transaction.receviedAmount;
        await client.save();
      } else if (method === "PurchasesReturn" || method === "SalesReturn") {
        client.totalAmountToPay += transaction.amount;
        client.totalAmountToPay -= transaction.receviedAmount;
      }
      await client.save();
    }
    await Transaction.findOneAndDelete({
      transactionNumber: id,
    });
  } catch (error) {
    console.log(error);
  }
};

const deleteTransactionByProductID = async (id) => {
  try {
    const allTransaction = await Transaction.find({
      "productDetails.productID": id,
    });
    const allInvoice = await InvoiceModel.find({
      "products.productID": id,
    });
    allTransaction.forEach(async (transaction) => {
      const client = await clientModel.findById(transaction.partyDetails._id);
      if (client) {
        for (let i = 0; i < transaction.productDetails.length; i++) {
          if (transaction.productDetails[i].productID === id) {
            if (transaction.transactionType === "Sale") {
              const unpaid = transaction.amount - transaction.receviedAmount;
              client.totalAmountToPay -= unpaid;
            } else if (transaction.transactionType === "Purchase") {
              const unpaid = transaction.amount - transaction.receviedAmount;
              client.totalAmountToPay += unpaid;
            }
            await client.save();
          }
        }
      }
      const productDetails = transaction.productDetails.filter(
        (product) => product.productID !== id
      );
      if (productDetails.length === 0) {
        await Transaction.findByIdAndDelete(transaction._id);
      } else {
        const reduceTransactionTotalAmountByID =
          transaction.productDetails.filter(
            (product) => product.productID === id
          );
        const product = await productModel.findById(id);
        const productPrice = reduceTransactionTotalAmountByID[0]
          .isSecondaryUnitChecked
          ? product.price / product.conversionRatio
          : product.price;
        transaction.amount -=
          productPrice * reduceTransactionTotalAmountByID[0].quantity;
        if (transaction.amount > transaction.receviedAmount) {
          transaction.status = "Unpaid";
        } else {
          transaction.status = "Paid";
        }
        transaction.productDetails = productDetails;
        await transaction.save();
      }
    });
    allInvoice.forEach(async (invoice) => {
      const products = invoice.products.filter(
        (product) => product.productID !== id
      );
      if (products.length === 0) {
        await InvoiceModel.findByIdAndDelete(invoice._id);
      } else {
        const reduceInvocieTotalAmountByID = invoice.products.filter(
          (product) => product.productID === id
        );
        invoice.totalAmount -=
          reduceInvocieTotalAmountByID[0].amount *
          reduceInvocieTotalAmountByID[0].quantity;
        invoice.products = products;
        await invoice.save();
      }
    });
  } catch (error) {
    console.log(error);
  }
}; // might not need



const checkProductTransaction = async (id) => {
  const transaction = await Transaction.find({
    "productDetails.productID": id,
    transactionType: { $ne: "OpeningBalance" },
  });
  if (transaction.length > 0) {
    return {
      message: "Product is in Use, can not be deleted",
      status: 400,
    };
  } else {
    await Transaction.deleteMany({
      "productDetails.productID": id,
    });
    return {
      message: "Product Deleted Successfully",
      status: 200,
    };
  }
};

const checkClientTransaction = async (id, merchant) => {
  const transaction = await Transaction.find({
    "partyDetails._id": id,
    transactionType: { $ne: "OpeningBalance" },
  });
  if (transaction.length > 0) {
    return {
      message: `${
        merchant === "true" ? "Merchant" : "Customer"
      } is in Use, can not be deleted`,
      status: 400,
    };
  } else {
    await Transaction.deleteMany({
      "partyDetails._id": id,
    });
    return {
      message: `${
        merchant === "true" ? "Merchant" : "Customer"
      } Deleted Successfully`,
      status: 200,
    };
  }
};

// const generateToken = (data) => {
//   return jwt.sign({ data }, process.env.JWT_SECRET, {
//     expiresIn: process.env.JWT_EXPIRES_IN,
//   });
// };

module.exports = {
  createTransaction,
  updateTransaction,
  getTransactions,
  getTransactionsByUserAndReport,
  getTransactionByUser,
  getTransactionByProduct,
  deleteAllTransactions,
  deleteTransactionByClientID,
  deleteTransactionOfPaymentInOrSales,
  deleteTransactionByProductID,
  checkProductTransaction,
  checkClientTransaction
};