import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!mongoose.isValidObjectId(videoId) || !videoId) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const pipeline = [];

    pipeline.push(
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "commentOwner",
                pipeline: [
                    {
                        $project: {
                            avatar: 1,
                            username: 1,
                            fullName: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                commentOwner: { $first: "$commentOwner" },
            },
        },
        {
            $project: {
                content: 1,
                commentOwner: 1,
            },
        }
    );

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    };

    const paginateComments = await Comment.aggregatePaginate(
        Comment.aggregate(pipeline),
        options
    );

    if (!paginateComments) {
        throw new ApiError(404, "Error while searching comments");
    }

    res.status(200).json(
        new ApiResponse(200, paginateComments, "successfully fetched comments")
    );
});

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
});

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
});

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
});

export { getVideoComments, addComment, updateComment, deleteComment };
