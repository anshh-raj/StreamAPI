import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
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
    //TODO: get video by id
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: update video details like title, description, thumbnail
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
};
