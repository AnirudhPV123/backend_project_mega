# backend project

This is a backend project build by following chai-aur-backend youtube tutorial

-[data model link](https://app.eraser.io/workspace/YtPqZ1VogxGy1jzIDkzj)


<!-- start -->
index.js

import mongoose from "mongoose";
import { DB_NAME } from "./constants";
import express from "express";

const app = express();

(async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    app.on("Error", (error) => {
      console.log("ERRR: ", error);
      throw error;
    });

    app.listen(process.env.PORT, () => {
      console.log(`Server listening on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.error("ERRR: ", error);
    throw error;
  }
})();
<!-- end -->

