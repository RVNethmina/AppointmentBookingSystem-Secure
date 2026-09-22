import { test, describe, before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import path from 'path'
import request from 'supertest'
import { v2 as cloudinary } from 'cloudinary'
import { UPLOAD_DIR } from '../middleware/multer.js'
import { signAccessToken } from '../utils/token.js'
import { startDb, stopDb, clearDb, createApp } from './helpers.js'

// smallest valid PNG (1x1 pixel)
const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64'
)

const adminToken = () => signAccessToken({ role: 'admin', email: process.env.ADMIN_EMAIL })

const addDoctor = (app, file, filename, contentType) =>
    request(app)
        .post('/api/admin/add-doctor')
        .set('atoken', adminToken())
        .field('name', 'Dr Test')
        .field('email', `doc${Date.now()}@example.com`)
        .field('password', 'D0ctor!Passw0rd')
        .field('speciality', 'Dermatologist')
        .field('degree', 'MBBS')
        .field('experience', '2 Year')
        .field('about', 'About')
        .field('fees', '50')
        .field('address', JSON.stringify({ line1: 'a', line2: 'b' }))
        .attach('image', file, { filename, contentType })

describe('V7: upload restrictions', () => {
    let uploadedPaths
    const originalUpload = cloudinary.uploader.upload

    before(startDb)
    after(stopDb)

    beforeEach(async () => {
        await clearDb()
        uploadedPaths = []
        cloudinary.uploader.upload = async (filePath) => {
            uploadedPaths.push(filePath)
            return { secure_url: 'https://res.cloudinary.com/demo/image/upload/x.png' }
        }
    })
    afterEach(() => { cloudinary.uploader.upload = originalUpload })

    test('images are stored in the upload directory under a random name', async () => {
        const res = await addDoctor(createApp(), PNG, 'photo.png', 'image/png')
        assert.equal(res.body.success, true)
        assert.equal(uploadedPaths.length, 1)
        assert.equal(path.dirname(uploadedPaths[0]), path.resolve(UPLOAD_DIR))
        assert.match(path.basename(uploadedPaths[0]), /^[0-9a-f]{32}\.png$/)
    })

    test('non-image types are rejected', async () => {
        const res = await addDoctor(createApp(), Buffer.from('<?php system($_GET[0]); ?>'), 'shell.php', 'application/x-php')
        assert.ok(res.status >= 400)
        assert.notEqual(res.body.success, true)
        assert.equal(uploadedPaths.length, 0)
    })

    test('files larger than 2 MB are rejected', async () => {
        const big = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)])
        const res = await addDoctor(createApp(), big, 'big.png', 'image/png')
        assert.ok(res.status >= 400)
        assert.equal(uploadedPaths.length, 0)
    })
})
