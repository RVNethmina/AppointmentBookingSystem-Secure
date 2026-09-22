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

export { UPLOAD_DIR }
export default upload
