import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, "Invalid channel Id");
    }

    const getTotalViews = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(channelId),
            },
        },
        {
            $group: {
                _id: null,
                totalViews: {
                    $sum: "$views",
                },
            },
        },
    ]);

    const totalViews =
        getTotalViews.length > 0 ? getTotalViews[0].totalViews : 0;

    const totalSubscribers = await Subscription.countDocuments({
        owner: new mongoose.Types.ObjectId(channelId),
    });

    const totalVideos = await Video.countDocuments({
        owner: new mongoose.Types.ObjectId(channelId),
    });

    const getAllLikes = await Like.aggregate([
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videoInfo",
            },
        },
        {
            $unwind: "$videoInfo",
        },
        {
            $match: {
                "videoInfo.owner": new mongoose.Types.ObjectId(channelId),
            },
        },
        {
            $count: "totalLikes",
        },
    ]);

    const totalLikes = getAllLikes.length > 0 ? getAllLikes[0].totalLikes : 0;

    const stats = {
        totalViews,
        totalSubscribers,
        totalVideos,
        totalLikes,
    };

    return res
        .status(200)
        .json(
            new ApiResponse(200, stats, "channel stats fetched successfully")
        );
});

const getChannelVideos = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, "Invalid channel Id");
    }

    const getAllVideos = Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(channelId),
            },
        },
        {
            $project: {
                owner: 0,
            },
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
    ]);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    };

    const result = await Video.aggregatePaginate(getAllVideos, options);

    return res
        .status(200)
        .json(
            new ApiResponse(200, result, "Channel videos fetched successfully")
        );
});

export { getChannelStats, getChannelVideos };
