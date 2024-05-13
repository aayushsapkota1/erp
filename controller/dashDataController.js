const invoiceModel = require("../models/invoiceModel.js");
const expenseModel = require("../models/expenseModel.js");
const productModel = require("../models/productModel.js");
const clientModel = require("../models/clientModel.js");
const transactionModel = require("../models/allTransactionsModel.js");
const paymentModel = require("../models/paymentMethod.js");
const { response } = require("express");
const NepaliDate = require('nepali-date-converter');

const TIME_RANGES = {
  THIS_WEEK: "thisWeek",
  LAST_WEEK: "lastWeek",
  THIS_MONTH: "thisMonth",
  LAST_MONTH: "lastMonth",
  THIS_YEAR: "thisYear",
  LAST_YEAR: "lastYear",
};

const LENGTHS = {
  [TIME_RANGES.THIS_WEEK]: 7,
  [TIME_RANGES.LAST_WEEK]: 7,
  [TIME_RANGES.THIS_MONTH]: 5,
  [TIME_RANGES.LAST_MONTH]: 5,
  [TIME_RANGES.THIS_YEAR]: 4,
  [TIME_RANGES.LAST_YEAR]: 4,
};

const groupByPeriod = {
  [TIME_RANGES.THIS_WEEK]: { $dayOfWeek: "$createdAt" },
  [TIME_RANGES.LAST_WEEK]: { $dayOfWeek: "$createdAt" },
  [TIME_RANGES.THIS_MONTH]: { 
    $add: [
      1,
      {
        $floor: {
          $divide: [
            { $subtract: ["$dateInfo.day", 1] },
            7
          ]
        }
      },
    ] 
  },
  [TIME_RANGES.LAST_MONTH]: { 
    $add: [
      1,
      {
        $floor: {
          $divide: [
            { $subtract: ["$dateInfo.day", 1] },
            7
          ]
        }
      },
    ]
  },

  [TIME_RANGES.THIS_YEAR]: {
    $add: [
      1,
      {
        $floor: {
          $divide: [
            { $subtract: ["$dateInfo.month", 1] },
            3
          ]
        }
      },
    ]
  },
  
  [TIME_RANGES.LAST_YEAR]: {
    $add: [
      1,
      {
        $floor: {
          $divide: [
            { $subtract: ["$dateInfo.month", 1] },
            3
          ]
        }
      },
    ]
  }
};

const getTimeRange = (timeRange, now = new NepaliDate()) => {
    // Define startDay and endDay here
    let startDayNepali = new NepaliDate();
    let endDayNepali = new NepaliDate();
  
    switch (timeRange) {
      case "thisWeek":
        startDayNepali.setDate(now.getDate() - now.getDay());
        endDayNepali.setDate(now.getDate() - now.getDay() + 6);
        break;
      case "lastWeek":
        startDayNepali.setDate(now.getDate() - now.getDay() - 7);
        endDayNepali.setDate(now.getDate() - now.getDay() - 1);
        break;
      case "thisMonth":
        startDayNepali.setDate(1);
        endDayNepali.setMonth(now.getMonth() + 1);
        endDayNepali.setDate(0);
        break;
      case "lastMonth":
        startDayNepali.setMonth(now.getMonth() - 1);
        startDayNepali.setDate(1);
        endDayNepali.setDate(0);
        break;
      case "thisYear":
        startDayNepali.setMonth(0);
        startDayNepali.setDate(1);
      
        endDayNepali.setYear(now.getYear()+1);
        endDayNepali.setMonth(0);
        endDayNepali.setDate(0);
        break;
      case "lastYear":
        startDayNepali.setYear(now.getYear() - 1);
        startDayNepali.setMonth(0);
        startDayNepali.setDate(1);

          endDayNepali.setMonth(0);
          endDayNepali.setDate(0);

        break;
      default:
        return res.status(400).json({
          success: false,
          message: `Invalid time range provided: ${timeRange}`,
        });
    }

    const startDay=new Date(startDayNepali.toJsDate());
const endDay=new Date(endDayNepali.toJsDate());

    startDay.setHours(0, 0, 0, 0);
    endDay.setHours(23, 59, 59, 999);


    return { startDay, endDay };
    
  };

  function getCurrentDayBounds() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return { startOfDay, endOfDay };
}

  

const getRevenueData = async (req, res) => {
    const { timeRange } = req.query;
  
    if(!timeRange || !Object.values(TIME_RANGES).includes(timeRange)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid or missing time range provided',
        });
    }
  
    const { startDay, endDay } = getTimeRange(timeRange);
  
    try {
        const data = await invoiceModel.aggregate([
            {
                $match:{
                    createdAt: { $gte: startDay, $lte: endDay },
                    invoiceType: 'Sale'
                }
            },
            {
                $group: {
                    _id: groupByPeriod[timeRange],
                    totalSales: { $sum: '$totalAmount' },
                    totalMoneyReceived: { $sum: '$paidAmount' }
                }
            },
            {
                $sort: { _id: 1 } // Sort by the period (day, week, quarter)
            }
        ]);
        //second aggregation pipeline
        const totalData = await invoiceModel.aggregate([
          {
              $match:{
                  createdAt: { $gte: startDay, $lte: endDay },
                  invoiceType: 'Sale'
              }
          },
          {
              $group: {
                  _id: null,
                  totalSales: { $sum: '$totalAmount' },
              }
          }
      ]);

      // Third Aggregation to calculate total returned amount for invoices of type "SalesReturn"
      const totalReturnedData = await invoiceModel.aggregate([
        {
            $match:{
                createdAt: { $gte: startDay, $lte: endDay },
                invoiceType: 'SalesReturn'
            }
        },
        {
            $group: {
                _id: null,
                totalReturned: { $sum: '$totalAmount' },
            }
        }
    ]);

          // Create a default array for all weeks
          let result = Array.from({ length: LENGTHS[timeRange] }, (_, i) => ({
            _id: i + 1,
            totalSales: 0,
            totalMoneyReceived: 0
          }));

          
        if (data.length !==0) {
             // Update the result array with actual data
             for(let item of data) {
              const periodIndex = item._id - 1;
              result[periodIndex] = item;
            }
  
          };   
  
        // Send the data
        return res.status(200).json({
            success: true,
            data:result,
            totalSales: totalData.length?totalData[0].totalSales:0,
            totalReturned: totalReturnedData.length ? totalReturnedData[0].totalReturned : 0
        });
  
    } catch (error) {
        // Catch any error
        console.error(error);
        return res.status(500).json({
            success: false,
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
  }

  const getExpenseData = async (req, res) => {
    const { timeRange } = req.query;

    if(!timeRange || !Object.values(TIME_RANGES).includes(timeRange)) {
      return res.status(400).json({
          success: false,
          message: 'Invalid or missing time range provided',
      });
  }

  const { startDay, endDay } = getTimeRange(timeRange);

  try {
    const data = await expenseModel.aggregate([
        {
            $match:{
                createdAt: { $gte: startDay, $lte: endDay },
            }
        },
        {
            $group: {
                _id:"$category",
                totalExpense: { $sum: '$amount' },
            }
        },
        {
            $sort: { _id: 1 } // Sort by the period (day, week, quarter)
        }
    ]);

    // No data found
    if (!data.length) {
        return res.status(404).json({
            success: false,
            message: `No data found for ${timeRange}`
        });
    }

    const totalExpenseData = await expenseModel.aggregate([
      {
          $match:{
              createdAt: { $gte: startDay, $lte: endDay },
          }
      },
      {
          $group: {
              _id: null,
              totalExpense: { $sum: '$amount' },
          }
      }
  ]);

    // Send the data
    return res.status(200).json({
        success: true,
        data,
        totalExpenseData: totalExpenseData.length?totalExpenseData[0].totalExpense:0,

    });

} catch (error) {
    // Catch any error
    console.error(error);
    return res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
}
}

const getRevenueByCategory = async (req, res) => {
    const { timeRange } = req.query;
  
    if (!timeRange || !Object.values(TIME_RANGES).includes(timeRange)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing time range provided',
      });
    }
  
    const { startDay, endDay } = getTimeRange(timeRange);
  
    try {
      const salesData = await invoiceModel.aggregate([
        {
          $match: {
            createdAt: { $gte: startDay, $lte: endDay },
            invoiceType: 'Sale',
          },
        },
        { $unwind: "$products" },
        {
          $group: {
            _id: "$products.category",
            totalSold: {
              $sum: {
                $multiply: [
                  {
                    $cond: {
                      if: { $eq: ["$products.quantity", ""] },
                      then: 0,
                      else: { $toDouble: "$products.quantity" }
                    }
                  },
                  {
                    $cond: {
                      if: { $eq: ["$products.amount", ""] },
                      then: 0,
                      else: { $toDouble: "$products.amount" }
                    }
                  }
                ],
                
              },
            },
          },
        },
      ]); //sales data aggregation finished
  
      const returnData = await invoiceModel.aggregate([
        {
          $match: {
            createdAt: { $gte: startDay, $lte: endDay },
            invoiceType: 'SalesReturn',
          },
        },
        { $unwind: "$products" },
        {
          $group: {
            _id: "$products.category",
            totalReturned: {
              $sum: {
                // $multiply: [
                //   { $toDouble: "$products.quantity" },
                //   { $toDouble: "$products.amount" },
                // ],
                $multiply: [
                  {
                    $cond: {
                      if: { $eq: ["$products.quantity", ""] },
                      then: 0,
                      else: { $toDouble: "$products.quantity" }
                    }
                  },
                  {
                    $cond: {
                      if: { $eq: ["$products.amount", ""] },
                      then: 0,
                      else: { $toDouble: "$products.amount" }
                    }
                  }
                ],
                
              },
            },
          },
        },
      ]); //return data aggregation finished
  
      // Calculate net revenue for each category
      const data = salesData.map((salesItem) => {
        const returnItem = returnData.find(
          (item) => item._id === salesItem._id
        );
        const totalReturned = returnItem ? returnItem.totalReturned : 0;
        return {
          name: salesItem._id,
          netRevenue: salesItem.totalSold - totalReturned,
        };
      });

      // Filter out items with null category
      const finalData = data.filter((item) => item.name !== null);
  
      // No data found
      if (!finalData.length) {
        return res.status(404).json({
          success: false,
          message: `No data found for ${timeRange}`,
        });
      }

          // Aggregation to calculate total amount for invoices of type "Sales"
      const totalData = await invoiceModel.aggregate([
        {
            $match:{
                createdAt: { $gte: startDay, $lte: endDay },
                invoiceType: 'Sale'
            }
        },
        {
            $group: {
                _id: null,
                totalSales: { $sum: '$totalAmount' },
            }
        }
    ]);

    // Aggregation to calculate total returned amount for invoices of type "SalesReturn"
    const totalReturnedData = await invoiceModel.aggregate([
      {
          $match:{
              createdAt: { $gte: startDay, $lte: endDay },
              invoiceType: 'SalesReturn'
          }
      },
      {
          $group: {
              _id: null,
              totalReturned: { $sum: '$totalAmount' },
          }
      }
  ]);

  const totalSales=totalData.length?totalData[0].totalSales:0;
  const totalReturned=totalReturnedData.length ? totalReturnedData[0].totalReturned : 0;
  
      // Send the data
      return res.status(200).json({
        success: true,
        finalData,
        totalRevenue:totalSales-totalReturned,
      });
    } catch (error) {
      // Catch any error
      console.error(error);
      return res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'development' ? error.message : 'Server error',
      });
    }
  };


const getStockData = async (req, res) => {
  try {
    const data = await productModel.aggregate([
      {
        $group: {
          _id: "$category",
          totalStock: {
            $sum: {
              $multiply: ["$quantity", "$price"]
            }
          }
        }
      }
    ]);

    const totalStock = await productModel.aggregate([
      {
        $group: {
          _id: null,
          totalValue: {
            $sum: {
              $multiply: ["$quantity", "$price"]
            }
          }
        }
      }
    ]);
    

    // No data found
    if (!data.length) {
        return res.status(404).json({
            success: false,
            message: "No data found"
        });
    }

    // Send the data
    return res.status(200).json({
        success: true,
        data,
        totalStock: totalStock.length?totalStock[0].totalValue:0,
    });

} catch (error) {
    // Catch any error
    console.error(error);
    return res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
}
}

const getFinancialData = async (req, res) => {
  try{
    const receivablesData = await clientModel.aggregate([
      {
          $match: {
              clientType: 'Customer'
          }
      },
      {
          $group: {
              _id: null,
              receivables: { $sum: '$totalAmountToPay' },
          }
      }
  ]);
  const payablesData = await clientModel.aggregate([
    {
        $match: {
            clientType: 'Merchant'
        }
    },
    {
        $group: {
            _id: null,
            payables: { $sum: '$totalAmountToPay' },
        }
    }
]);

const totalSalesData = await invoiceModel.aggregate([
  {
    $match: {
      invoiceType: 'Sale'
    }
  },
  {
    $group: {
      _id: null,
      totalSales: { $sum: '$totalAmount' },
    }
  }
]);

const totalSalesReturnData = await invoiceModel.aggregate([
  {
    $match: {
      invoiceType: 'SalesReturn'
    }
  },
  {
    $group: {
      _id: null,
      totalSalesReturn: { $sum: '$totalAmount' },
    }
  }
]);

const customerOpeningBalance = await clientModel.aggregate([
  {
      $match: {
          clientType: 'Customer'
      }
  },
  {
      $group: {
          _id: null,
          totalOpenings: { $sum: '$openingBalance' },
      }
  }
]);

const totalPurchaseData = await invoiceModel.aggregate([
  {
    $match: {
      invoiceType: 'Purchase'
    }
  },
  {
    $group: {
      _id: null,
      totalPurchase: { $sum: '$totalAmount' },
    }
  }
]);

const totalPurchaseReturnData = await invoiceModel.aggregate([
  {
    $match: {
      invoiceType: 'PurchasesReturn'
    }
  },
  {
    $group: {
      _id: null,
      totalPurchaseReturn: { $sum: '$totalAmount' },
    }
  }
]);

const merchantOpeningBalance = await clientModel.aggregate([
  {
      $match: {
          clientType: 'Merchant'
      }
  },
  {
      $group: {
          _id: null,
          totalOpenings: { $sum: '$openingBalance' },
      }
  }
]);

const sales=totalSalesData[0]?.totalSales||0;
const purchase=totalPurchaseData[0]?.totalPurchase||0;
const salesReturn=totalSalesReturnData[0]?.totalSalesReturn||0;
const purchaseReturn=totalPurchaseReturnData[0]?.totalPurchaseReturn||0;

const customerOpenings=customerOpeningBalance[0]?.totalOpenings||0;
const merchantOpenings=merchantOpeningBalance[0]?.totalOpenings||0;

        return res.status(200).json({
          success: true,
          totalReceivables:receivablesData.length? receivablesData[0].receivables:0,
          totalPayables: payablesData.length?payablesData[0].payables:0,
          totalSales: sales-salesReturn+customerOpenings,//look how customerOpenings is added to totalSales 
          totalPurchase:purchase-purchaseReturn+merchantOpenings//look how merchantOpenings is added to totalPurchase 
      });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
}
}

const getCashFlowData = async (req, res) => {
  try {
    const now = new NepaliDate();
    const initialFiveMonthsAgo= new NepaliDate(now.getYear(),now.getMonth()-4,1);
    const fiveMonthsAgo = initialFiveMonthsAgo.toJsDate();

    // Aggregate Cash In from transactions
    const cashInData = await transactionModel.aggregate([
      {
        $match: {
          createdAt: { $gte: fiveMonthsAgo },
          $or: [{ transactionType: 'Sale' }, { transactionType: 'PaymentIn' }]
        }
      },
      {
        $group: {
          // _id: { $month: "$createdAt" },
          _id: "$dateInfo.month",
          cashIn: {
            $sum: {
              $cond: [
                { $eq: ["$transactionType", "Sale"] },
                "$receviedAmount",
                "$amount"
              ]
            }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Aggregate Cash Out from transactions
    const cashOutTransactionsData = await transactionModel.aggregate([
      {
        $match: {
          createdAt: { $gte: fiveMonthsAgo },
          $or: [{ transactionType: 'Purchase' }, { transactionType: 'SalesReturn' }, { transactionType: 'PaymentOut' }]
        }
      },
      {
        $group: {
          // _id: { $month: "$createdAt" },
          _id: "$dateInfo.month",
          cashOut: {
            $sum: {
              $cond: [
                { $in: ["$transactionType", ["Purchase", "SalesReturn"]] },
                "$receviedAmount",
                "$amount"
              ]
            }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    // Aggregate Cash Out from expenses
    const cashOutExpensesData = await expenseModel.aggregate([
      {
        $match: {
          createdAt: { $gte: fiveMonthsAgo }
        }
      },
      {
        $group: {
          // _id: { $month: "$createdAt" },
          _id: "$dateInfo.month",
          cashOut: { $sum: '$amount' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

     // Merge Cash Out data from transactions and expenses
     let cashOutData = [...cashOutTransactionsData, ...cashOutExpensesData];

     // Group by month and sum up cashOut
    cashOutData = cashOutData.reduce((res, item) => {
      const existing = res.find(data => data._id === item._id);

      if (existing) {
        existing.cashOut += item.cashOut;
      } else {
        res.push(item);
      }

      return res;
    }, []);
    // Sort the cashOutData by month
    cashOutData.sort((a, b) => a._id - b._id);

   // Merge cashInData and cashOutData
  let cashFlowData = [...cashInData, ...cashOutData].reduce((acc, curr) => {
    const existingMonth = acc.find(item => item._id === curr._id);
    if (existingMonth) {
      existingMonth.cashIn = existingMonth.cashIn || curr.cashIn;
      existingMonth.cashOut = existingMonth.cashOut || curr.cashOut;
    } else {
      acc.push({
        _id: curr._id,
        cashIn: curr.cashIn || 0,
        cashOut: curr.cashOut || 0,
      });
    }
    return acc;
  }, []);

// Fill in missing months
 //This code will handle year rollovers
 let m = initialFiveMonthsAgo.getMonth();
let y = initialFiveMonthsAgo.getYear();
let currentMonth = now.getMonth();
let currentYear = now.getYear();

while (y < currentYear || (y === currentYear && m <= currentMonth)) {
  const existingMonth = cashFlowData.find(item => item._id === (m + 1));
  if (!existingMonth) {
    cashFlowData.push({ _id: m + 1, cashIn: 0, cashOut: 0 });
  }

  m++;
  if (m > 11) {
    m = 0;
    y++;
  }
}
//Fill in missing months
//  for (let m = initialFiveMonthsAgo.getMonth(); m <= now.getMonth(); m++) {
//   const existingMonth = cashFlowData.find(item => item._id === (m+1));
//   if (!existingMonth) {
//     cashFlowData.push({ _id: m+1, cashIn: 0, cashOut: 0 });
//   }
// }

  // Sort the array by month
  cashFlowData.sort((a, b) => a._id - b._id);

  return res.status(200).json({
    success: true,
    cashFlowData
  });

  } catch (error) {
    // Catch any error
    console.error(error);
    return res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
}

const getPurchaseData = async (req, res) => {
  const { timeRange } = req.query;

  if(!timeRange || !Object.values(TIME_RANGES).includes(timeRange)) {
      return res.status(400).json({
          success: false,
          message: 'Invalid or missing time range provided',
      });
  }

  const { startDay, endDay } = getTimeRange(timeRange);

  try {
      const data = await invoiceModel.aggregate([
          {
              $match:{
                  createdAt: { $gte: startDay, $lte: endDay },
                  invoiceType: 'Purchase'
              }
          },
          {
              $group: {
                  _id: groupByPeriod[timeRange],
                  totalPurchase: { $sum: '$totalAmount' },
                  totalMoneyPaid: { $sum: '$paidAmount' }
              }
          },
          {
              $sort: { _id: 1 } // Sort by the period (day, week, quarter)
          }
      ]);
      //second aggregation pipeline
      const totalData = await invoiceModel.aggregate([
        {
            $match:{
                createdAt: { $gte: startDay, $lte: endDay },
                invoiceType: 'Purchase'
            }
        },
        {
            $group: {
                _id: null,
                totalPurchase: { $sum: '$totalAmount' },
            }
        }
    ]);

    // Third Aggregation to calculate total returned amount for invoices of type "SalesReturn"
    const totalReturnedData = await invoiceModel.aggregate([
      {
          $match:{
              createdAt: { $gte: startDay, $lte: endDay },
              invoiceType: 'PurchaseReturn'
          }
      },
      {
          $group: {
              _id: null,
              totalReturned: { $sum: '$totalAmount' },
          }
      }
  ]);

        // Create a default array for all weeks
        let result = Array.from({ length: LENGTHS[timeRange] }, (_, i) => ({
          _id: i + 1,
          totalPurchase: 0,
          totalMoneyPaid: 0
        }));

        
      if (data.length !==0) {
           // Update the result array with actual data
           for(let item of data) {
            const periodIndex = item._id - 1;
            result[periodIndex] = item;
          }

        };   

      // Send the data
      return res.status(200).json({
          success: true,
          data:result,
          totalPurchase: totalData.length?totalData[0].totalPurchase:0,
          totalReturned: totalReturnedData.length ? totalReturnedData[0].totalReturned : 0
      });

  } catch (error) {
      // Catch any error
      console.error(error);
      return res.status(500).json({
          success: false,
          message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
      });
  }
}

const getDayBookData = async (req, res) => {
  const { startOfDay, endOfDay } = getCurrentDayBounds();
  console.log(startOfDay, endOfDay);

  try {
    const salesToday = await invoiceModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay },
          invoiceType: "Sale",
        },
      },
      {
        $group: {
          _id: null,
          sales: { $sum: "$paidAmount" },
        },
      },
     
    ]);

    const esewaSalesToday = await invoiceModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay },
          invoiceType: "Sale",
          note:{ $regex:/^esewa$/i},
        },
      },
      {
        $group: {
          _id: null,
          esewaSales: { $sum: "$paidAmount" },
        },
      },
     
    ]);

    const purchaseToday = await invoiceModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay },
          invoiceType: "Purchase",
        },
      },
      {
        $group: {
          _id: null,
          totalPurchase: { $sum: "$paidAmount" },
        },
      },
     
    ]);

    const totalExpenseToday = await expenseModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: null,
          totalExpense: { $sum: "$amount" },
        },
      },
    ]);

    const paymentInTodayCash = await paymentModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay },
          paymentType: "PaymentIn",
          note:"Cash"
        },
      },
      {
        $group: {
          _id: null,
          paymentIn: { $sum: "$amount" },
        },
      },
    ]);

    const paymentInTodayEsewa = await paymentModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay },
          paymentType: "PaymentIn",
          note:"Esewa"
        },
      },
      {
        $group: {
          _id: null,
          paymentIn: { $sum: "$amount" },
        },
      },
    ]);

    const paymentOutTodayCash = await paymentModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay },
          paymentType: "PaymentOut",
          note:"Cash"
        },
      },
      {
        $group: {
          _id: null,
          paymentOut: { $sum: "$amount" },
        },
      },
    ]);

    const paymentOutTodayEsewa = await paymentModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay },
          paymentType: "PaymentOut",
          note:"Esewa"
        },
      },
      {
        $group: {
          _id: null,
          paymentOut: { $sum: "$amount" },
        },
      },
    ]);

    // const totalCount=await invoiceModel.aggregate([
    //   {
    //     $match: {
    //       createdAt: { $gte: startOfDay, $lte: endOfDay },
    //       invoiceType: "Sale",
    //     },
    //   },
    //   {
    //     $group:{
    //       _id:null,
    //       totalNumber: { $sum: 1 }
    //     }
    //   }
    // ])

    const salesCounts=await invoiceModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay },
          invoiceType: "Sale",
        },
      },
      {
        $group:{
          _id:"$statusName",
          totalNumber: { $sum: 1 }
        }
      }
    ])

    const counts = {
      Paid: 0,
      Unpaid: 0,
      Partial: 0
    };

    salesCounts.forEach(result => {
      counts[result._id] = result.totalNumber;
    });
    
   
    const salesTodayData= salesToday.length ? salesToday[0].sales:0;
    const esewaSalesTodayData= esewaSalesToday.length ? esewaSalesToday[0].esewaSales:0;

    
    // Send the data
    return res.status(200).json({
      success: true,
      cashSalesToday: salesTodayData-esewaSalesTodayData,
      esewaSalesToday: esewaSalesToday.length ? esewaSalesToday[0].esewaSales : 0,
      purchaseToday: purchaseToday.length ? purchaseToday[0].totalPurchase : 0,
      totalExpenseToday: totalExpenseToday.length ? totalExpenseToday[0].totalExpense : 0,
      paymentInTodayCash: paymentInTodayCash.length ? paymentInTodayCash[0].paymentIn : 0,
      paymentInTodayEsewa: paymentInTodayEsewa.length ? paymentInTodayEsewa[0].paymentIn : 0,
      paymentOutTodayCash: paymentOutTodayCash.length ? paymentOutTodayCash[0].paymentOut : 0,
      paymentOutTodayEsewa: paymentOutTodayEsewa.length ? paymentOutTodayEsewa[0].paymentOut : 0,     
      //  totalCount: totalCount[0] ? totalCount[0].totalNumber : 0,
       salesCounts: counts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        process.env.NODE_ENV === "development" ? error.message : "Server error",
    });
  }
};

const calculateMonthlyProfit = async (req, res) => {

  const { startDay, endDay } = getTimeRange("thisMonth");

  try{
  // Aggregation pipeline
  const pipeline = [
    {
      $match: {
        createdAt: {
          $gte: startDay,
          $lte: endDay,
        },
      },
    },
    {
      $unwind: '$products',
    },
    {
      $project: {
        adjustedSoldPrice: {
          $cond: [
            { $ifNull: ['$discount.percent', false] },
            {
              $multiply: [
                '$products.amount',
                { $subtract: [1, { $divide: ['$discount.percent', 100] }] },
              ],
            },
            '$products.amount',
          ],
        },
        purchasePrice: '$products.purchasePrice', //i tried the value of these variables inside $group stage instead but it did not work. 
        quantity: '$products.quantity',
        discountAmount: '$discount.amount',
      },
    },
    {
      $group: {
        _id: '$_id',
        totalInvoiceProfit: {
          $sum: {
            $multiply: [
              { $subtract: ['$adjustedSoldPrice', '$purchasePrice'] },
              '$quantity',
            ],
          },
        },
        discountAmount: { $first: '$discountAmount' },
      },
    },
    {
      $project: {
        adjustedInvoiceProfit: {
          $cond: [
            { $ifNull: ['$discountAmount', false] },
            { $subtract: ['$totalInvoiceProfit', '$discountAmount'] },
            '$totalInvoiceProfit',
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        totalProfit: { $sum: '$adjustedInvoiceProfit' },
      },
    },
  ];

  // Run aggregation
  const results = await invoiceModel.aggregate(pipeline);
  const grossProfit= results.length ? results[0].totalProfit:0

  const totalExpenseData = await expenseModel.aggregate([
    {
        $match:{
            createdAt: { $gte: startDay, $lte: endDay },
        }
    },
    {
        $group: {
            _id: null,
            totalExpense: { $sum: '$amount' },
        }
    }
]);

const expense=totalExpenseData.length? totalExpenseData[0].totalExpense:0
const netProfit=grossProfit-expense;



return res.status(200).json({
  success: true,
  netProfit
});
} catch (error) {
return res.status(500).json({
  success: false,
  message:
    process.env.NODE_ENV === "development" ? error.message : "Server error",
});
}}


module.exports = {
  getRevenueData,
  getExpenseData,
  getRevenueByCategory,
  getStockData,
  getFinancialData,
  getCashFlowData,
  getPurchaseData,
  getDayBookData,
  calculateMonthlyProfit
};