import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const healthcheck = asyncHandler(async (req, res) => {
    const dbStatus = mongoose.connection.readyState;

    if (dbStatus !== 1) {
        throw new ApiError(500, "Database connection not healthy");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { status: "OK", database: "connected" },
                "Server and database are healthy"
            )
        );
});

export { healthcheck };
