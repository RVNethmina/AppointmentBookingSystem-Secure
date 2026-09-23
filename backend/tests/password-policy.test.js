import { test, describe, before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { v2 as cloudinary } from 'cloudinary'
import { signAccessToken } from '../utils/token.js'
import { isStrongPassword } from '../utils/validators.js'
import userModel from '../models/userModel.js'
import doctorModel from '../models/doctorModel.js'
import { startDb, stopDb, clearDb, createApp } from './helpers.js'

const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAAABJRU5ErkJggg==',
    'base64'
)
const WEAK = ['password', '12345678', 'Password', 'Password1', 'passw0rd!', 'P@ss1']

describe('V9: password policy', () => {
    const originalUpload = cloudinary.uploader.upload

    before(startDb)
    after(stopDb)
    beforeEach(async () => {
        await clearDb()
        cloudinary.uploader.upload = async () => ({ secure_url: 'https://res.cloudinary.com/demo/image/upload/x.png' })
    })
    afterEach(() => { cloudinary.uploader.upload = originalUpload })

    test('the policy requires length and all four character classes', () => {
        for (const weak of WEAK) assert.equal(isStrongPassword(weak), false, weak)
        assert.equal(isStrongPassword('Str0ng!Passw0rd'), true)
        assert.equal(isStrongPassword('A1!' + 'a'.repeat(80)), false, 'longer than bcrypt can use')
    })

    test('registration rejects weak passwords', async () => {
        const app = createApp()
        for (const [i, weak] of WEAK.slice(0, 4).entries()) {
            const res = await request(app).post('/api/user/register').send({ name: 'Weak', email: `weak${i}@example.com`, password: weak })
            assert.equal(res.body.success, false, weak)
        }
        assert.equal(await userModel.countDocuments(), 0)
    })

    test('registration accepts a strong password', async () => {
        const res = await request(createApp()).post('/api/user/register').send({ name: 'Strong', email: 'strong@example.com', password: 'Str0ng!Passw0rd' })
        assert.equal(res.body.success, true)
    })

    test('adding a doctor with a weak password is rejected', async () => {
        const res = await request(createApp())
            .post('/api/admin/add-doctor')
            .set('atoken', signAccessToken({ role: 'admin', email: process.env.ADMIN_EMAIL }))
            .field('name', 'Dr Weak').field('email', 'weakdoc@example.com').field('password', '12345678')
            .field('speciality', 'Neurologist').field('degree', 'MBBS').field('experience', '3 Year')
            .field('about', 'About').field('fees', '40')
            .field('address', JSON.stringify({ line1: 'a', line2: 'b' }))
            .attach('image', PNG, { filename: 'p.png', contentType: 'image/png' })
        assert.equal(res.body.success, false)
        assert.equal(await doctorModel.countDocuments(), 0)
    })
})
