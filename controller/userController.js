const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel.js");

const signatureKey = "mySecretKey";

const signin = async (req, res) => {

  const { userName, password } = req.body;

  try {
    if (!userName) {
      return res.status(400).json({ message: "Please enter username." });
    }

    if (!password) {
      return res.status(400).json({ message: "Please enter password." });
    }

    const existingUser = await userModel.findOne({ userName: userName.toLowerCase() });

    if (!existingUser)
      return res.status(404).json({ message: "Invalid Credentials!!" });


    const isPasswordCorrect = await bcrypt.compare(
      password,
      existingUser.password
    );
    if (!isPasswordCorrect)
      return res.status(400).json({ message: "Invalid Credentials!!" });

    const token = jwt.sign(
      {
        userName: existingUser.userName,
        id: existingUser._id,
        isAdmin: existingUser.isAdmin,
      },
      signatureKey,
      { expiresIn: "1h" }
    );


    res.status(200).json({token });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong" });
  }
};

const signup = async (req, res) => {
  //this is done by admin.
  const { userName, password, confirmPassword, firstName, lastName } = req.body;

  try {
    if (!userName) {
        return res.status(400).json({ message: "Please enter username." });
      }
  
      if (!password) {
        return res.status(400).json({ message: "Please enter password." });
      }

      if (!confirmPassword) {
        return res.status(400).json({ message: "Please confirm your password." });
      }
      if (!firstName ) {
        return res.status(400).json({ message: "Please enter your first name." });
      }
      if (!lastName ) {
        return res.status(400).json({ message: "Please enter your last name." });
      }

    const existingUser = await userModel.findOne({ userName });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    if (password !== confirmPassword)
      return res.status(400).json({ message: "Passwords don't match" });

    const hashedPassword = await bcrypt.hash(password, 12);

    //creating userModel with hashed password using bcrypt
    const result = await userModel.create({
      userName,
      password: hashedPassword,
      name: `${firstName} ${lastName}`,
    });
  //generating and sending back token
    const token = jwt.sign(
      { userName: result.userName, id: result._id, isAdmin: result.isAdmin },
      signatureKey,
      { expiresIn: "1h" }
    );

    res.status(201).json({ result, token });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });

    console.log(error);
  }
};

module.exports= {signin, signup}; 