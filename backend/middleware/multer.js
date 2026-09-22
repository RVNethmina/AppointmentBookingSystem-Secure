import multer from 'multer'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// dedicated upload directory instead of the shared OS temp directory
const UPLOAD_DIR = process.env.UPLOAD_DIR
    || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'uploads')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB

// accepted image types and their extensions
const ALLOWED_TYPES = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp'],
}

const storage = multer.diskStorage({
    destination: function(req,file,callback){
        callback(null, UPLOAD_DIR)
    },
    // random 128-bit name: the client-chosen name is never used on disk,
    // so concurrent uploads cannot overwrite each other
    filename: function(req,file,callback){
        const ext = path.extname(file.originalname).toLowerCase()
        callback(null, crypto.randomBytes(16).toString('hex') + ext)
    }
})

const fileFilter = (req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const allowedExtensions = ALLOWED_TYPES[file.mimetype]
    if (!allowedExtensions || !allowedExtensions.includes(ext)) {
        return callback(new Error('Only JPEG, PNG and WEBP images are allowed'))
    }
    callback(null, true)
}

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
})

// File signatures ("magic bytes") of the accepted image formats.
const SIGNATURES = {
    'image/jpeg': (b) => b.length >= 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF,
    'image/png': (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])),
    'image/webp': (b) => b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
}

const readHeader = async (filePath) => {
    const handle = await fs.promises.open(filePath, 'r')
    try {
        const buffer = Buffer.alloc(12)
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0)
        return buffer.subarray(0, bytesRead)
    } finally {
        await handle.close()
    }
}

const removeFile = (file) => {
    if (file && file.path) {
        fs.promises.unlink(file.path).catch(() => {})
    }
}

// Single optional image upload. Must run AFTER the authentication
// middleware. Rejects upload errors with HTTP 400, verifies the actual
// file content, and always deletes the temporary file once the response
// has been sent.
const uploadImage = (fieldName) => (req, res, next) => {
    res.on('close', () => removeFile(req.file))

    upload.single(fieldName)(req, res, async (err) => {
        if (err) {
            const message = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
                ? 'Image must be 2 MB or smaller.'
                : 'Only JPEG, PNG and WEBP images are allowed.'
            return res.status(400).json({ success: false, message })
        }

        if (!req.file) {
            return next()
        }

        try {
            // the declared type must match the file's real content
            const isValid = SIGNATURES[req.file.mimetype]
            if (!isValid || !isValid(await readHeader(req.file.path))) {
                return res.status(400).json({ success: false, message: 'Only JPEG, PNG and WEBP images are allowed.' })
            }
            next()
        } catch (error) {
            next(error)
        }
    })
}

export { UPLOAD_DIR, uploadImage }
export default upload
