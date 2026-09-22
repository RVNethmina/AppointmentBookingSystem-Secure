import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { assertJwtSecret, signAccessToken } from '../utils/token.js'
import { startDb, stopDb, createApp } from './helpers.js'

describe('V3: token expiry and secret strength', () => {
    before(startDb)
    after(stopDb)

    test('issued tokens carry an expiry', () => {
        const decoded = jwt.decode(signAccessToken({ id: 'abc', role: 'user' }))
        assert.ok(decoded.exp, 'token has no exp claim')
        assert.ok(decoded.exp - decoded.iat <= 24 * 60 * 60)
    })

    test('the server refuses to start with the original 4-character secret', () => {
        const original = process.env.JWT_SECRET
        try {
            process.env.JWT_SECRET = 'RBRO'
            assert.throws(assertJwtSecret)
            delete process.env.JWT_SECRET
            assert.throws(assertJwtSecret)
        } finally {
            process.env.JWT_SECRET = original
        }
        assert.doesNotThrow(assertJwtSecret)
    })

    test('a token signed with the old secret is rejected', async () => {
        const forged = jwt.sign({ id: '507f1f77bcf86cd799439011' }, 'RBRO')
        const res = await request(createApp()).get('/api/user/get-profile').set('token', forged)
        assert.equal(res.status, 401)
        assert.equal(res.body.success, false)
    })

    test('an expired token is rejected', async () => {
        const expired = jwt.sign(
            { id: '507f1f77bcf86cd799439011', role: 'user', exp: Math.floor(Date.now() / 1000) - 60 },
            process.env.JWT_SECRET
        )
        const res = await request(createApp()).get('/api/user/get-profile').set('token', expired)
        assert.equal(res.status, 401)
    })

    test('a request without a token is rejected', async () => {
        const res = await request(createApp()).get('/api/doctor/profile')
        assert.equal(res.status, 401)
    })

    test('registration returns an expiring token', async () => {
        const res = await request(createApp())
            .post('/api/user/register')
            .send({ name: 'Pat', email: 'pat@example.com', password: 'Str0ng!Passw0rd' })
        assert.equal(res.body.success, true)
        const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET)
        assert.ok(decoded.exp)
        assert.equal(decoded.role, 'user')
    })
})
