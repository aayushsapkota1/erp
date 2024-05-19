const mongoose = require("mongoose");
const app = require("./app");
const dotenv = require("dotenv");

dotenv.config();




const PORT = process.env.PORT || 4000;
mongoose.set("strictQuery", false);

mongoose
  .connect(process.env.CONNECTION_URL)
  .then(() => console.log("Database connected"))
  .catch((error) => console.log(`Database ${error.message} did not connect`))
  .finally(() =>
    app.listen(PORT, console.log(`Server running on port: ${PORT}`))
  );