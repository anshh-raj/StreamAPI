import "dotenv/config";
import connectDB from "./db/index.js";
import { app } from "./app.js";

connectDB()
    .then(() => {
        const server = app.listen(process.env.PORT || 8000, () => {
            console.log(
                `Server is running on port ${process.env.PORT || 8000}`
            );
        });

        server.on("error", (err) => {
            console.error("Server Error :", err);
            process.exit(1);
        });
    })
    .catch((error) => {
        console.log(`MONGODB CONNECTION ERROR: ${error}`);
        process.exit(1);
    });

/*
import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";
import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

(async () => {
    try {
        await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
        console.log("MongoDB Connected");

        const server = app.listen(process.env.PORT, () => {
            console.log(`Server is running on port ${process.env.PORT}`);
        });

        server.on("error", (err) => {
            console.error("Server Error :", err);
            // throw error;
            process.exit(1);
        });
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        // throw error;
        process.exit(1);
    }
})();
*/
