import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
    deleteFromCloudinary,
    uploadOnCloudinary,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

    const pipeline = [];
    const defaultCriteria = {
        isPublished: true,
    };

    //if user search for something
    if (query) {
        defaultCriteria.$or = [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
        ];
    }

    //if user visits a specific profile
    if (userId) {
        if (!mongoose.isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid User Id");
        }
        defaultCriteria.owner = new mongoose.Types.ObjectId(userId);
    }

    //push the completed criteria as the first stage
    pipeline.push({
        $match: defaultCriteria,
    });

    const sortField = {};
    if (sortBy) {
        sortField[sortBy] = sortType === "asc" ? 1 : -1;
    } else {
        sortField["createdAt"] = sortType === "asc" ? 1 : -1;
    }

    pipeline.push({
        $sort: sortField,
    });

    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            avatar: 1,
                            username: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                owner: { $first: "$owner" },
            },
        }
    );

    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
    };

    const paginatedVideos = await Video.aggregatePaginate(
        Video.aggregate(pipeline),
        options
    );

    if (!paginatedVideos) {
        throw new ApiError(404, "Couldn't fetch videos, Please try again.");
    }

    res.status(200).json(
        new ApiResponse(200, paginatedVideos, "successfully fetched videos")
    );
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if (!req.user?._id) {
        throw new ApiError(400, "Please login and try again");
    }

    if ([title, description].some((field) => !field?.trim())) {
        throw new ApiError(400, "All fields are required");
    }

    let videoLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.video) &&
        req.files.video.length > 0
    ) {
        videoLocalPath = req.files.video[0].path;
    }

    let thumbnailLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.thumbnail) &&
        req.files.thumbnail.length > 0
    ) {
        thumbnailLocalPath = req.files.thumbnail[0].path;
    }

    if (!videoLocalPath || !thumbnailLocalPath) {
        throw new ApiError(400, "Both video and thumbnail file is required");
    }

    const video = await uploadOnCloudinary(videoLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!video || !thumbnail) {
        throw new ApiError(
            400,
            "video or thumbnail upload failed. Please try again"
        );
    }

    try {
        const uploadVideo = await Video.create({
            videoFile: {
                url: video.url,
                public_id: video.public_id,
            },
            thumbnail: {
                url: thumbnail.url,
                public_id: thumbnail.public_id,
            },
            title: title.trim(),
            description: description.trim(),
            duration: video.duration,
            owner: req.user?._id,
        });

        return res
            .status(201)
            .json(
                new ApiResponse(201, uploadVideo, "video uploaded successfully")
            );
    } catch (error) {
        if (video?.public_id) {
            await deleteFromCloudinary(video.public_id, "video");
        }
        if (thumbnail?.public_id) {
            await deleteFromCloudinary(thumbnail.public_id, "image");
        }
        throw error;
    }
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id");
    }

    if (req.user?._id) {
        await Video.findByIdAndUpdate(videoId, {
            $inc: {
                views: 1,
            },
        });
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "video",
                as: "comments",
                pipeline: [
                    {
                        $sort: {
                            createdAt: -1,
                        },
                    },
                    {
                        $limit: 10,
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "commentedByUser",
                            pipeline: [
                                {
                                    $project: {
                                        avatar: 1,
                                        username: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            commentedByUser: {
                                $first: "$commentedByUser",
                            },
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            avatar: 1,
                            username: 1,
                        },
                    },
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers", // will be added as array of objects
                        },
                    },
                    {
                        $addFields: {
                            subscriberCount: {
                                $size: "$subscribers",
                            },
                            isSubscribed: {
                                $cond: {
                                    if: {
                                        $in: [
                                            req.user?._id,
                                            "$subscribers.subscriber",
                                        ],
                                    },
                                    then: true,
                                    else: false,
                                },
                            },
                        },
                    },
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            subscriberCount: 1,
                            isSubscribed: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                totalLikes: {
                    $size: "$likes",
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false,
                    },
                },
                owner: {
                    $first: "$owner",
                },
            },
        },
    ]);

    if (!video.length) {
        throw new ApiError(404, "Video does not exist");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video[0], "video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;
    const userId = req.user?._id;

    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id");
    }

    if (
        !title?.trim() &&
        !description?.trim() &&
        !(
            req.files &&
            Array.isArray(req.files.thumbnail) &&
            req.files.thumbnail.length > 0
        )
    ) {
        throw new ApiError(400, "Required atleast one field to update");
    }

    const updateData = {};

    if (title?.trim()) {
        updateData["title"] = title.trim();
    }

    if (description?.trim()) {
        updateData["description"] = description.trim();
    }

    let thumbnailLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.thumbnail) &&
        req.files.thumbnail.length > 0
    ) {
        thumbnailLocalPath = req.files.thumbnail[0].path;
    }

    let thumbnailPath;
    if (thumbnailLocalPath) {
        thumbnailPath = await uploadOnCloudinary(thumbnailLocalPath);
    }

    if (thumbnailPath) {
        updateData["thumbnail"] = {
            url: thumbnailPath.url,
            public_id: thumbnailPath.public_id,
        };
    }

    try {
        const updatedVideo = await Video.findOneAndUpdate(
            {
                _id: videoId,
                owner: userId,
            },

            {
                $set: updateData,
            },
            { returnDocument: "after" }
        );

        if (!updatedVideo) {
            throw new ApiError(
                404,
                "Video not found or you are not authorized to update this video"
            );
        }
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    updatedVideo,
                    "Successfully updated video details"
                )
            );
    } catch (error) {
        if (thumbnailPath?.public_id) {
            await deleteFromCloudinary(thumbnailPath.public_id, "image");
        }
        throw error;
    }
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user?._id;

    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id");
    }

    const deletedVideo = await Video.findOneAndDelete({
        _id: videoId,
        owner: userId,
    });

    if (!deletedVideo) {
        throw new ApiError(
            404,
            "Video not found or you are not authorized to delete this video"
        );
    }

    if (deletedVideo.videoFile?.public_id) {
        await deleteFromCloudinary(deletedVideo.videoFile.public_id, "video");
    }

    if (deletedVideo.thumbnail?.public_id) {
        await deleteFromCloudinary(deletedVideo.thumbnail.public_id, "image");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user?._id;

    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id");
    }

    const video = await Video.findOneAndUpdate(
        {
            _id: videoId,
            owner: userId,
        },
        [
            {
                $set: {
                    isPublished: { $not: "$isPublished" },
                },
            },
        ],
        {
            returnDocument: "after",
        }
    );

    if (!video) {
        throw new ApiError(
            404,
            "Video not found or you are not authorized to update this video"
        );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, video, "Successfully toggled publish status")
        );
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
};
