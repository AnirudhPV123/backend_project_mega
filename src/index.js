import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({ path: "./.env" });

connectDB()
  .then(()=>{
    //  app.on is used to check any error occurs globally or in express.js framwork
    app.on("Error", (error) => {
      console.log("ERRR: ", error);
      throw error;
    }),

    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running on port ${process.env.PORT}`);
    })
  })
  .catch((error) => {
    console.log("MONGODB connection FAILED: ", error);
  });
