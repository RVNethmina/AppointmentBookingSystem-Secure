import { test, describe, before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import googleVerifier from '../utils/google.js'
import userModel from '../models/userModel.js'
import { startDb, stopDb, clearDb, createApp } from './helpers.js'

const claims = (overrides = {}) => ({
    iss: 'https://accounts.google.com',
    aud: process.env.GOOGLE_CLIENT_ID,
    sub: '112233445566778899',
    email: 'patient@gmail.com',
    email_verified: true,
    name: 'Google Patient',
    ...overrides,
})

// requests a nonce, makes the stubbed ID token carry it, and signs in
const signIn = async (app, idClaims) => {
    const { body } = await request(app).get('/api/user/auth/google/nonce')
    idClaims.nonce = body.nonce
    return request(app).post('/api/user/auth/google').send({ credential: 'id-token', nonceToken: body.nonceToken })
}

describe('Google sign-in (OpenID Connect)', () => {
    const originalVerify = googleVerifier.verify
    let nextClaims

    before(startDb)
    after(stopDb)
    beforeEach(async () => {
        await clearDb()
        nextClaims = claims()
        googleVerifier.verify = async () => nextClaims
    })
    afterEach(() => { googleVerifier.verify = originalVerify })

    test('a verified Google identity creates an account and returns an app token', async () => {
        const app = createApp()
        const res = await signIn(app, nextClaims)
        assert.equal(res.body.success, true)
        const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET)
        assert.equal(decoded.role, 'user')

        const user = await userModel.findById(decoded.id)
        assert.equal(user.googleId, nextClaims.sub)
        assert.equal(user.email, nextClaims.email)

        const profile = await request(app).get('/api/user/get-profile').set('token', res.body.token)
        assert.equal(profile.body.userData.email, nextClaims.email)
    })

    test('signing in again reuses the same account', async () => {
        const app = createApp()
        const first = await signIn(app, nextClaims)
        const second = await signIn(app, nextClaims)
        assert.equal(jwt.decode(first.body.token).id, jwt.decode(second.body.token).id)
        assert.equal(await userModel.countDocuments(), 1)
    })

    test('an ID token that fails verification is rejected', async () => {
        googleVerifier.verify = async () => { throw new Error('Wrong recipient, payload audience != requiredAudience') }
        const res = await signIn(createApp(), nextClaims)
        assert.equal(res.status, 401)
        assert.equal(res.body.token, undefined)
    })

    test('an unverified email address is rejected', async () => {
        nextClaims = claims({ email_verified: false })
        const res = await signIn(createApp(), nextClaims)
        assert.equal(res.status, 401)
    })

    test('a missing credential is rejected', async () => {
        const app = createApp()
        const { body } = await request(app).get('/api/user/auth/google/nonce')
        const noCredential = await request(app).post('/api/user/auth/google').send({ nonceToken: body.nonceToken })
        assert.equal(noCredential.status, 400)
        const noNonce = await request(app).post('/api/user/auth/google').send({ credential: 'id-token' })
        assert.equal(noNonce.status, 400)
    })
})
