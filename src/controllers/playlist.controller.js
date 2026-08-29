import { Playlist } from "../models/playlist.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import { Video } from "../models/video.models.js";

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    if ([name, description].some((field) => !field?.trim())) {
        throw new ApiError(400, "All fields are required");
    }

    const existedPlaylist = await Playlist.findOne({
        owner: req.user?._id,
        name: name.trim(),
    });

    if (existedPlaylist) {
        throw new ApiError(409, "Playlist with this name already exists");
    }

    const playlist = await Playlist.create({
        name: name.trim(),
        description: description.trim(),
        owner: req.user?._id,
    });

    if (!playlist) {
        throw new ApiError(
            500,
            "Something went wrong while creating the playlist"
        );
    }

    res.status(200).json(
        new ApiResponse(200, playlist, "Playlist created successfully")
    );
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!userId) throw new ApiError(400, "userId is required");

    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const playlists = await Playlist.find({
        owner: userId,
    }).select("-owner");

    if (playlists.length === 0) {
        throw new ApiError(404, "User has no playlist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                playlists,
                "User Playlists fetched successfully"
            )
        );
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!playlistId) throw new ApiError(400, "playlistId is required");

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) throw new ApiError(404, "playlist not found");

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if ([playlistId, videoId].some((field) => !field?.trim())) {
        throw new ApiError(400, "All fields are required");
    }

    // const playlist = await Playlist.findById(playlistId);
    const playlist = await Playlist.findOne({
        owner: req.user?._id,
        _id: playlistId,
    });

    if (!playlist) {
        throw new ApiError(404, "playlist does not exist");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "video does not exist");
    }

    if (playlist.videos.some((id) => id.toString() === videoId)) {
        throw new ApiError(409, "Video already exists in the playlist");
    }

    // playlist.videos.push(videoId);
    // await playlist.save();

    const newPlaylist = await Playlist.findOneAndUpdate(
        {
            _id: playlistId,
            owner: req.user._id,
        },
        {
            $addToSet: {
                videos: videoId,
            },
        },
        {
            returnDocument: "after",
        }
    ).select("-owner");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                newPlaylist,
                "Video added to playlist successfully"
            )
        );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if ([playlistId, videoId].some((field) => !field?.trim())) {
        throw new ApiError(400, "All fields are required");
    }

    // const playlist = await Playlist.findById(playlistId);
    const playlist = await Playlist.findOne({
        owner: req.user?._id,
        _id: playlistId,
    });

    if (!playlist) {
        throw new ApiError(404, "playlist does not exist");
    }

    if (!playlist.videos.some((id) => id.toString() === videoId)) {
        throw new ApiError(404, "Video does not exist in the playlist");
    }

    // const filtered_array = playlist.videos.filter(
    //     (id) => id.toString() !== videoId
    // );

    // playlist.videos = filtered_array;

    // await playlist.save();

    const newPlaylist = await Playlist.findOneAndUpdate(
        {
            _id: playlistId,
            owner: req.user._id,
        },
        {
            $pull: {
                videos: videoId,
            },
        },
        {
            returnDocument: "after",
        }
    ).select("-owner");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                newPlaylist,
                "Video removed from playlist successfully"
            )
        );
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!playlistId) {
        throw new ApiError(400, "Playlist Id is required");
    }

    // const playlist = await Playlist.findById(playlistId);

    // const playlist = await Playlist.findByIdAndDelete(playlistId);

    const playlist = await Playlist.findOneAndDelete({
        owner: req.user?._id,
        _id: playlistId,
    });

    if (!playlist) {
        throw new ApiError(404, "Playlist does not exist");
    }

    // await Playlist.deleteOne({
    //     _id: playlistId,
    // });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Playlist deleted successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;

    if ([playlistId, name, description].some((field) => !field?.trim())) {
        throw new ApiError(400, "All fields are required");
    }

    const playlist = await Playlist.findOneAndUpdate(
        {
            _id: playlistId,
            owner: req.user?._id,
        },
        {
            $set: {
                name: name.trim(),
                description: description.trim(),
            },
        },
        { returnDocument: "after" }
    );

    if (!playlist) {
        throw new ApiError(404, "Playlist does not exist");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Playlist updated successfully"));
});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
};
