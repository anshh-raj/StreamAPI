import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
    })
);
app.use(
    express.json({
        limit: "16kb",
    })
);
app.use(express.urlencoded({ extended: true, limit: "16kb" })); //mostly no need to use extended without it also its enough
app.use(express.static("public"));
app.use(cookieParser());

// routes import
import userRouter from "./routes/user.routes.js";
import playlistRouter from "./routes/playlist.routes.js";

//routes declaration
app.use("/api/v1/users", userRouter);
app.use("/api/v1/playlist", playlistRouter);

//global error handler
app.use(errorHandler);

export { app };
