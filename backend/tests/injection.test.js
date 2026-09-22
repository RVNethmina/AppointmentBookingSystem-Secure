import { test, describe, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { startDb, stopDb, clearDb, createApp } from './helpers.js'

describe('V6: NoSQL operator injection and user enumeration', () => {
    before(startDb)
    after(stopDb)

    beforeEach(async () => {
        await clearDb()
        await request(createApp())
            .post('/api/user/register')
            .send({ name: 'Alice', email: 'alice@example.com', password: 'Str0ng!Passw0rd' })
    })

    test('an operator object as the email is not executed as a query', async () => {
        const app = createApp()
        const matching = await request(app).post('/api/user/login').send({ email: { $regex: '^a' }, password: 'x' })
        const notMatching = await request(app).post('/api/user/login').send({ email: { $regex: '^z' }, password: 'x' })
        assert.equal(matching.status, 400)
        assert.deepEqual(matching.body, notMatching.body)
        assert.equal(matching.body.token, undefined)
    })

    test('operator injection on the doctor login is rejected', async () => {
        const res = await request(createApp()).post('/api/doctor/login').send({ email: { $ne: null }, password: { $ne: null } })
        assert.equal(res.status, 400)
        assert.equal(res.body.success, false)
    })

    test('unknown account and wrong password produce the same response', async () => {
        const app = createApp()
        const unknown = await request(app).post('/api/user/login').send({ email: 'nobody@example.com', password: 'Wr0ng!Passw0rd' })
        const wrong = await request(app).post('/api/user/login').send({ email: 'alice@example.com', password: 'Wr0ng!Passw0rd' })
        assert.equal(unknown.status, wrong.status)
        assert.deepEqual(unknown.body, wrong.body)
    })

    test('the correct password still logs in', async () => {
        const res = await request(createApp()).post('/api/user/login').send({ email: 'alice@example.com', password: 'Str0ng!Passw0rd' })
        assert.equal(res.body.success, true)
        assert.ok(res.body.token)
    })
})
