import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { signAccessToken } from '../utils/token.js'
import { startDb, stopDb, createApp } from './helpers.js'

const { ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET } = process.env

describe('V2: administrator token', () => {
    before(startDb)
    after(stopDb)

    test('admin login issues a role token that does not contain the password', async () => {
        const res = await request(createApp())
            .post('/api/admin/login')
            .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        assert.equal(res.body.success, true)
        const decoded = jwt.verify(res.body.token, JWT_SECRET)
        assert.equal(decoded.role, 'admin')
        assert.ok(decoded.exp)
        assert.ok(!JSON.stringify(decoded).includes(ADMIN_PASSWORD))
    })

    test('the issued admin token grants access to admin routes', async () => {
        const app = createApp()
        const login = await request(app).post('/api/admin/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        const res = await request(app).get('/api/admin/dashboard').set('atoken', login.body.token)
        assert.equal(res.status, 200)
        assert.equal(res.body.success, true)
    })

    test('a token built with the original email+password scheme is rejected', async () => {
        const legacy = jwt.sign(ADMIN_EMAIL + ADMIN_PASSWORD, JWT_SECRET)
        const res = await request(createApp()).get('/api/admin/dashboard').set('atoken', legacy)
        assert.equal(res.status, 403)
        assert.equal(res.body.success, false)
    })

    test('a patient token is not accepted on admin routes', async () => {
        const userToken = signAccessToken({ id: '507f1f77bcf86cd799439011', role: 'user' })
        const res = await request(createApp()).get('/api/admin/appointments').set('atoken', userToken)
        assert.equal(res.status, 403)
    })

    test('wrong credentials are rejected with 401', async () => {
        const res = await request(createApp())
            .post('/api/admin/login')
            .send({ email: ADMIN_EMAIL, password: 'qwerty123' })
        assert.equal(res.status, 401)
        assert.equal(res.body.token, undefined)
    })
})
