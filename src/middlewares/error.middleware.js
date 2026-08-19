const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;

    res.status(statusCode).json({
        statusCode,
        message: err.message || "Internal Server Error",
        success: false,
        errors: err.errors || [],
    });
};

export { errorHandler };
