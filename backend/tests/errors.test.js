import { test, describe, before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { v2 as cloudinary } from 'cloudinary'
import { signAccessToken } from '../utils/token.js'
import userModel from '../models/userModel.js'
import appointmentModel from '../models/AppointmentModel.js'
import { startDb, stopDb, clearDb, createApp } from './helpers.js'

const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64'
)

// captures everything written through console.* while fn runs
const captureConsole = async (fn) => {
    const lines = []
    const saved = {}
    for (const level of ['log', 'info', 'warn', 'error']) {
        saved[level] = console[level]
        console[level] = (...args) => lines.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a) ?? String(a))).join(' '))
    }
    try {
        return { result: await fn(), output: lines.join('\n') }
    } finally {
        Object.assign(console, saved)
    }
}

describe('V8: sensitive logging and verbose errors', () => {
    const originalUpload = cloudinary.uploader.upload

    before(startDb)
    after(stopDb)
    beforeEach(async () => {
        await clearDb()
        cloudinary.uploader.upload = async () => ({ secure_url: 'https://res.cloudinary.com/demo/image/upload/x.png' })
    })
    afterEach(() => { cloudinary.uploader.upload = originalUpload })

    test('adding a doctor does not write the password to the log', async () => {
        const password = 'Secr3t!DoctorPass'
        const { result, output } = await captureConsole(() =>
            request(createApp())
                .post('/api/admin/add-doctor')
                .set('atoken', signAccessToken({ role: 'admin', email: process.env.ADMIN_EMAIL }))
                .field('name', 'Dr Log').field('email', 'log@example.com').field('password', password)
                .field('speciality', 'Neurologist').field('degree', 'MBBS').field('experience', '3 Year')
                .field('about', 'About').field('fees', '40')
                .field('address', JSON.stringify({ line1: 'a', line2: 'b' }))
                .attach('image', PNG, { filename: 'p.png', contentType: 'image/png' })
        )
        assert.equal(result.body.success, true)
        assert.ok(!output.includes(password), 'password found in server log')
    })

    test('handler exceptions return a generic message', async () => {
        const user = await userModel.create({ name: 'Pat', email: 'pat@example.com', password: 'x' })
        const token = signAccessToken({ id: String(user._id), role: 'user' })
        const originalFind = appointmentModel.find
        appointmentModel.find = () => { throw new Error('MongoNetworkError: connect ECONNREFUSED 10.0.0.5:27017') }
        try {
            const { result } = await captureConsole(() =>
                request(createApp()).get('/api/user/appointments').set('token', token)
            )
            assert.equal(result.status, 500)
            assert.equal(result.body.message, 'Something went wrong!')
            assert.ok(!JSON.stringify(result.body).includes('ECONNREFUSED'))
        } finally {
            appointmentModel.find = originalFind
        }
    })

    test('malformed JSON returns a generic 400 without a stack trace', async () => {
        const res = await request(createApp())
            .post('/api/user/login')
            .set('Content-Type', 'application/json')
            .send('{"email": ')
        assert.equal(res.status, 400)
        assert.equal(res.body.message, 'Invalid request.')
        assert.ok(!JSON.stringify(res.body).includes('SyntaxError'))
    })
})
