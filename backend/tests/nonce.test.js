import { test, describe, before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import googleVerifier from '../utils/google.js'
import { startDb, stopDb, clearDb, createApp } from './helpers.js'

describe('V18: Google ID tokens bound to a single-use nonce', () => {
    const originalVerify = googleVerifier.verify
    let idTokenNonce

    before(startDb)
    after(stopDb)
    beforeEach(async () => {
        await clearDb()
        googleVerifier.verify = async () => ({
            sub: '555666777888', email: 'nonce@gmail.com', email_verified: true, name: 'Nonce', nonce: idTokenNonce,
        })
    })
    afterEach(() => { googleVerifier.verify = originalVerify })

    const getNonce = async (app) => (await request(app).get('/api/user/auth/google/nonce'))

    test('nonces are random, 256-bit and not cacheable', async () => {
        const app = createApp()
        const a = await getNonce(app)
        const b = await getNonce(app)
        assert.equal(a.headers['cache-control'], 'no-store')
        assert.notEqual(a.body.nonce, b.body.nonce)
        assert.equal(Buffer.from(a.body.nonce, 'base64url').length, 32)
    })

    test('a missing nonce token is rejected with 400', async () => {
        idTokenNonce = 'whatever'
        const res = await request(createApp()).post('/api/user/auth/google').send({ credential: 'id-token' })
        assert.equal(res.status, 400)
    })

    test('a nonce token cannot be used as an access token', async () => {
        const app = createApp()
        const { body } = await getNonce(app)
        const res = await request(app).get('/api/user/get-profile').set('token', body.nonceToken)
        assert.equal(res.status, 401)
    })

    test('an ID token issued for a different nonce is rejected', async () => {
        const app = createApp()
        const { body } = await getNonce(app)
        idTokenNonce = 'nonce-from-another-login-attempt'
        const res = await request(app).post('/api/user/auth/google').send({ credential: 'id-token', nonceToken: body.nonceToken })
        assert.equal(res.status, 401)
        assert.equal(res.body.token, undefined)
    })

    test('an ID token without a nonce is rejected', async () => {
        const app = createApp()
        const { body } = await getNonce(app)
        idTokenNonce = undefined
        const res = await request(app).post('/api/user/auth/google').send({ credential: 'id-token', nonceToken: body.nonceToken })
        assert.equal(res.status, 401)
    })

    test('replaying a successful sign-in request fails', async () => {
        const app = createApp()
        const { body } = await getNonce(app)
        idTokenNonce = body.nonce
        const payload = { credential: 'id-token', nonceToken: body.nonceToken }

        const first = await request(app).post('/api/user/auth/google').send(payload)
        assert.equal(first.body.success, true)
        const replay = await request(app).post('/api/user/auth/google').send(payload)
        assert.equal(replay.status, 401)
        assert.equal(replay.body.token, undefined)
    })

    test('a forged nonce token is rejected', async () => {
        idTokenNonce = 'attacker-nonce'
        // signed with a key the attacker chose instead of the derived nonce key
        const forged = jwt.sign({ nonce: 'attacker-nonce', typ: 'google-oidc-nonce' }, 'attacker-key', { jwtid: 'x', expiresIn: 600 })
        const res = await request(createApp()).post('/api/user/auth/google')
            .send({ credential: 'id-token', nonceToken: forged })
        assert.equal(res.status, 401)
    })
})
