import { test, describe, before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import bcrypt from 'bcrypt'
import googleVerifier from '../utils/google.js'
import { verifyPassword } from '../utils/password.js'
import userModel from '../models/userModel.js'
import { startDb, stopDb, clearDb, createApp } from './helpers.js'

const VICTIM = 'victim@gmail.com'
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

describe('V14: account pre-hijacking and login oracles', () => {
    const originalVerify = googleVerifier.verify

    before(startDb)
    after(stopDb)
    beforeEach(async () => {
        await clearDb()
        googleVerifier.verify = async () => ({
            sub: '998877665544332211', email: VICTIM, email_verified: true, name: 'Victim',
        })
    })
    afterEach(() => { googleVerifier.verify = originalVerify })

    test('linking a Google identity removes a pre-set password and revokes earlier sessions', async () => {
        const app = createApp()
        // the attacker registers the victim's address first
        const attacker = await request(app).post('/api/user/register').send({ name: 'Attacker', email: VICTIM, password: 'Att4cker!Pass' })
        assert.equal(attacker.body.success, true)

        // make sure the Google sign-in happens in a later second than the attacker's token
        await wait(1100)

        // the real owner signs in with Google
        const google = await request(app).post('/api/user/auth/google').send({ credential: 'id-token' })
        assert.equal(google.body.success, true)

        const user = await userModel.findOne({ email: VICTIM })
        assert.equal(user.password, undefined)
        assert.equal(user.authProvider, 'google')

        // the attacker's password and earlier session no longer work
        const login = await request(app).post('/api/user/login').send({ email: VICTIM, password: 'Att4cker!Pass' })
        assert.equal(login.status, 401)
        const oldSession = await request(app).get('/api/user/get-profile').set('token', attacker.body.token)
        assert.equal(oldSession.status, 401)

        // the owner's new session works
        const newSession = await request(app).get('/api/user/get-profile').set('token', google.body.token)
        assert.equal(newSession.body.userData.email, VICTIM)
    })

    test('password login to a Google-only account fails cleanly with 401', async () => {
        const app = createApp()
        await request(app).post('/api/user/auth/google').send({ credential: 'id-token' })
        const res = await request(app).post('/api/user/login').send({ email: VICTIM, password: 'anything' })
        assert.equal(res.status, 401)
        assert.equal(res.body.message, 'Invalid Credentials!')
    })

    test('unknown accounts and wrong passwords both cost one bcrypt comparison', async () => {
        const app = createApp()
        await request(app).post('/api/user/register').send({ name: 'Alice', email: 'alice@example.com', password: 'Str0ng!Passw0rd' })

        const originalCompare = bcrypt.compare
        let calls = 0
        bcrypt.compare = (...args) => { calls++; return originalCompare.apply(bcrypt, args) }
        try {
            await request(app).post('/api/user/login').send({ email: 'nobody@example.com', password: 'Wr0ng!Pass' })
            assert.equal(calls, 1, 'unknown account')
            calls = 0
            await request(app).post('/api/user/login').send({ email: 'alice@example.com', password: 'Wr0ng!Pass' })
            assert.equal(calls, 1, 'wrong password')
            calls = 0
            await request(app).post('/api/doctor/login').send({ email: 'nobody@example.com', password: 'Wr0ng!Pass' })
            assert.equal(calls, 1, 'unknown doctor')
        } finally {
            bcrypt.compare = originalCompare
        }
    })

    test('verifyPassword never throws', async () => {
        assert.equal(await verifyPassword('x', undefined), false)
        assert.equal(await verifyPassword('x', 'not-a-bcrypt-hash'), false)
        assert.equal(await verifyPassword(undefined, null), false)
    })

    test('tokens of deleted accounts are rejected', async () => {
        const app = createApp()
        const reg = await request(app).post('/api/user/register').send({ name: 'Bob', email: 'bob@example.com', password: 'Str0ng!Passw0rd' })
        await userModel.deleteOne({ email: 'bob@example.com' })
        const res = await request(app).get('/api/user/get-profile').set('token', reg.body.token)
        assert.equal(res.status, 401)
    })
})
