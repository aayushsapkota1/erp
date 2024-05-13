const clientModel = require("../models/clientModel.js");
const { getPaginatedData } = require("../Utils/pagination.js");
const {
  checkClientTransaction,
  createTransaction,
  updateTransaction,
  deleteTransactionByClientID
} = require("./transactionController.js");

const getAllClient = async (req, res) => {
  try {
    const {
      clientType,
      page,
      searchBy: { name, anything },
      sortBy,
      limit,
    } = req.query;
    const dataLimit = parseInt(limit) || 8;
    let regexSearch = name;
    let regexAnything = anything;
    let sort = parseInt(sortBy);
    if (sort === 1) {
      sort = { createdAt: -1 };
    } else if (sort === 2) {
      sort = { name: 1 };
    } else if (sort === 3) {
      sort = { name: -1 };
    } else if (sort === 4) {
      sort = { createdAt: 1 };
    }
    if (regexSearch) {
      regexSearch = new RegExp(regexSearch, "i");
    }
    let OrCondition = [];
    if (regexAnything) {
      regexAnything = new RegExp(regexAnything, "i");
      OrCondition = [
        {
          mobileNo: regexAnything,
        },
        {
          billingAddress: regexAnything,
        },
        {
          email: regexAnything,
        },
      ];
    }
    const { data, pageCount } = await getPaginatedData({
      page: page,
      limit: dataLimit,
      modelName: clientModel,
      inside: OrCondition,
      oneAndCondition: [{ clientType: clientType }],
      mainSearch: regexSearch ? { name: "name", value: regexSearch } : "",
      sortBy: sort,
    });
    res.status(200).json({ data, pageCount });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

const getClientById = async (req, res) => {
  const { id } = req.params;
  try {
    const data = await clientModel.findById(id);
    res.status(200).json({ data });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

const createClient = async (req, res) => {
  let {
    image,
    name,
    email,
    billingAddress,
    mobileNo,
    secmobileNo,
    vatNumber,
    openingBalance,
    clientType,
    createdDate,
  } = req.body;
  try {
    if (!name) {
      return res.status(400).json({ message: "Please enter name" });
    }
    if (!mobileNo && clientType === "Customer") {
      return res.status(400).json({ message: "Please enter phone number" });
    }
    if (!billingAddress && clientType === "Customer") {
      return res.status(400).json({ message: "Please enter billing address" });
    }
    if (!openingBalance) {
      openingBalance = 0;
    }

    var fullName = name.split(" ");
    var firstName = fullName[0];
    var capitalFirstName =
      firstName.charAt(0).toUpperCase() + firstName.slice(1);

    if(fullName.length>1){
      var middleName = fullName[1];
      var capitalMiddleName =
      middleName.charAt(0).toUpperCase() + middleName.slice(1);
    }  else{
      var capitalMiddleName="";
    }
    

    if(fullName.length>2){
      var lastName=fullName[2];
      var capitalLastName =
      lastName.charAt(0).toUpperCase() + lastName.slice(1);
    } else{
      var capitalLastName="";
    }

      var finalName = capitalFirstName + " " + capitalMiddleName+ " "+ capitalLastName;
      finalName=finalName.trim();
    

    //if exactly that name exists with the same case, 2 is added behind that,

    const clientName = await clientModel.find({
      name: { $regex: finalName },
    });
    if (clientName && clientName.length > 0) {
      finalName = `${finalName} ${clientName.length + 1}`;
    }

    const clientData = new clientModel({
      name: finalName,
      email,
      mobileNo,
      billingAddress,
      secmobileNo,
      vatNumber,
      image,
      openingBalance: parseInt(openingBalance),
      clientType,
      totalAmountToPay: parseInt(openingBalance),
    });
    const transaction = {
      transactionNumber: clientData._id,
      transactionType: "OpeningBalance",
      partyDetails: {
        _id: clientData._id.toString(),
        name: clientData.name,
        email: clientData.email,
        mobileNo: clientData.mobileNo,
        secmobileNo: clientData.secmobileNo,
        vatNumber: clientData.vatNumber,
        billingAddress: clientData.billingAddress,
        clientType: clientData.clientType,
      },
      productDetails: [],
      status: clientData.clientType === "Customer" ? "To Receive" : "To Give",
      amount: clientData.totalAmountToPay,
      createdDate,
    };
    await createTransaction(transaction);
    const savedData = await clientData.save();
    res.status(200).json({
      data: savedData,
      message: `Client ${name} created successfully`,
    });
  } catch (error) {
    console.log(error.message);
    res.json({
      message: error.message,
    });

  }
};

const createMultipleClient = async (req, res) => {
  const { AddClientData: ArrayOfClient, createdDate } = req.body;
  try {
    ArrayOfClient.forEach((client) => {
      if (!client.openingBalance) {
        client.openingBalance = 0;
      }
      client.totalAmountToPay = parseInt(client.openingBalance);
      //making name capital
      var fullName = client.name.split(" ");
      var firstName = fullName[0];
      var lastName = fullName[1];
  
      var capitalFirstName =
        firstName.charAt(0).toUpperCase() + firstName.slice(1);
      var capitalLastName =
        lastName.charAt(0).toUpperCase() + lastName.slice(1);
      client.name = capitalFirstName + " " + capitalLastName;
    });
    const savedMultipleCustomer = await clientModel.insertMany(ArrayOfClient);
    savedMultipleCustomer.forEach(async (clientData) => {
      const transaction = {
        transactionNumber: clientData._id,
        transactionType: "OpeningBalance",
        partyDetails: {
          _id: clientData._id.toString(),
          name: clientData.name,
          email: clientData.email,
          mobileNo: clientData.mobileNo,
          billingAddress: clientData.billingAddress,
          clientType: clientData.clientType,
        },
        productDetails: [],
        status: clientData.clientType === "Customer" ? "To Receive" : "To Give",
        amount: clientData.openingBalance,
        createdDate,
      };
      await createTransaction(transaction);
    });
    res.status(200).json({
      data: savedMultipleCustomer,
      message: `${savedMultipleCustomer.length} clients created successfully`,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      message: error.message,
    });
  }
};

const updateClient = async (req, res) => {
  const { id } = req.params;
  let {
    name,
    email,
    mobileNo,
    secmobileNo,
    vatNumber,
    billingAddress,
    image,
    openingBalance,
    // createdDate,
    clientType
  } = req.body;
  try {
    if (!name) {
      return res.status(400).json({ message: "Please enter name" });
    }
    if (!openingBalance) {
      openingBalance = 0;
    }
    const clientData = {
      name:name.trim(),
      email,
      mobileNo,
      secmobileNo,
      vatNumber,
      billingAddress,
      image,
      openingBalance,
      clientType
    };
    const transaction = {
      transactionNumber: id,
      transactionType: "OpeningBalance",
      partyDetails: {
        _id: id,
        name: clientData.name,
        email: clientData.email,
        mobileNo: clientData.mobileNo,
        secmobileNo: clientData.secmobileNo,
        vatNumber: clientData.vatNumber,
        billingAddress: clientData.billingAddress,
        clientType: clientData.clientType,
      },
      productDetails: [],
      status: clientData.clientType === "Customer" ? "To Receive" : "To Give",
      amount: parseInt(openingBalance),
      // createdDate,
    };
    await updateTransaction(transaction);
    const updatedData = await clientModel.findByIdAndUpdate(id, clientData, {
      new: true,
    });
    res
      .status(200)
      .json({ data: updatedData, message: `Client ${name} updated` });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

const deleteClient = async (req, res) => {
  const { id } = req.params;
  const { merchant } = req.query;
  try {
    const { status, message } = await checkClientTransaction(id, merchant);
    if (status === 400) {
      return res.status(400).json({ message });
    } else {
      await clientModel.findByIdAndDelete(id);
      await deleteTransactionByClientID(id);
      res.status(200).json({ message: message });
    }
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

module.exports = {
  getAllClient,
  getClientById,
  createClient,
  createMultipleClient,
  updateClient,
  deleteClient
};