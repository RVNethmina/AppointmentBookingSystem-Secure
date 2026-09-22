// Central error handler: log details on the server only and return a
// generic message, never the exception text or a stack trace.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err)
    }

    const status = err.status || err.statusCode
    if (status >= 400 && status < 500) {
        // client errors, e.g. malformed JSON bodies
        return res.status(status).json({ success: false, message: "Invalid request." })
    }

    console.error(err)
    res.status(500).json({ success: false, message: "Something went wrong!" })
}

export default errorHandler
