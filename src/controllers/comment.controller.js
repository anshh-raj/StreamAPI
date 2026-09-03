import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!mongoose.isValidObjectId(videoId)) {
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

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                paginateComments,
                "successfully fetched comments"
            )
        );
});

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { content } = req.body;

    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    if (!content?.trim()) {
        throw new ApiError(400, "Comment cannot be empty");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const comment = await Comment.create({
        content: content.trim(),
        video: videoId,
        owner: req.user?._id,
    });

    if (!comment) {
        throw new ApiError(
            500,
            "something went wrong while adding the comment"
        );
    }

    return res
        .status(201)
        .json(new ApiResponse(201, comment, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id");
    }

    if (!content?.trim()) {
        throw new ApiError(400, "Comment cannot be empty");
    }

    const updatedComment = await Comment.findOneAndUpdate(
        {
            _id: commentId,
            owner: req.user?._id,
        },
        {
            content: content.trim(),
        },
        { returnDocument: "after" }
    );

    if (!updatedComment) {
        throw new ApiError(404, "Comment does not exist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedComment, "Comment updated successfully")
        );
});

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id");
    }

    const deletedComment = await Comment.findOneAndDelete({
        _id: commentId,
        owner: req.user?._id,
    });

    if (!deletedComment) {
        throw new ApiError(404, "Comment does not exist");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
