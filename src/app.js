import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

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
app.use(urlencoded({ extended: true, limit: "16kb" })); //mostly no need to use extended without it also its enough
app.use(static("public"));
app.use(cookieParser());

export { app };
