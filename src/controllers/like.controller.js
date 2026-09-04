import mongoose from "mongoose";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid Video Id");
    }

    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id,
    });

    existingLike
        ? await Like.findByIdAndDelete(existingLike?._id)
        : await Like.create({
              video: videoId,
              likedBy: req.user?._id,
          });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { isLiked: existingLike ? false : true },
                existingLike ? "Removed Like" : "Added Like"
            )
        );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Invalid Comment Id");
    }

    const existingLike = await Like.findOne({
        comment: commentId,
        likedBy: req.user?._id,
    });

    existingLike
        ? await Like.findByIdAndDelete(existingLike?._id)
        : await Like.create({
              comment: commentId,
              likedBy: req.user?._id,
          });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { isLiked: existingLike ? false : true },
                existingLike ? "Removed Like" : "Added Like"
            )
        );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid Tweet Id");
    }

    const existingLike = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user?._id,
    });

    existingLike
        ? await Like.findByIdAndDelete(existingLike?._id)
        : await Like.create({
              tweet: tweetId,
              likedBy: req.user?._id,
          });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { isLiked: existingLike ? false : true },
                existingLike ? "Removed Like" : "Added Like"
            )
        );
});

const getLikedVideos = asyncHandler(async (req, res) => {
    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id),
                video: { $exists: true },
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        avatar: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner",
                            },
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                video: {
                    $first: "$video",
                },
            },
        },
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, likedVideos, "Fetched liked videos"));
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
