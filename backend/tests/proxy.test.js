import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { startDb, stopDb, createApp } from './helpers.js'

const attempts = async (app, spoof) => {
    const statuses = []
    for (let i = 0; i < 12; i++) {
        const req = request(app).post('/api/user/login').send({ email: 'victim@example.com', password: `guess-${i}` })
        if (spoof) req.set('X-Forwarded-For', `203.0.113.${i + 1}`)
        statuses.push((await req).status)
    }
    return statuses
}

describe('V13: rate limit cannot be bypassed with X-Forwarded-For', () => {
    const original = process.env.TRUST_PROXY

    before(startDb)
    after(async () => {
        process.env.TRUST_PROXY = original ?? ''
        await stopDb()
    })

    test('without TRUST_PROXY a spoofed header per request is still throttled', async () => {
        delete process.env.TRUST_PROXY
        const statuses = await attempts(createApp(), true)
        assert.deepEqual(statuses.slice(10), [429, 429], statuses.join(','))
    })

    test('without TRUST_PROXY the client address is the socket address', async () => {
        delete process.env.TRUST_PROXY
        const app = createApp()
        app.get('/whoami', (req, res) => res.json({ ip: req.ip }))
        const res = await request(app).get('/whoami').set('X-Forwarded-For', '203.0.113.7')
        assert.notEqual(res.body.ip, '203.0.113.7')
    })

    test('with TRUST_PROXY=1 the address set by the proxy is used', async () => {
        process.env.TRUST_PROXY = '1'
        const app = createApp()
        app.get('/whoami', (req, res) => res.json({ ip: req.ip }))
        const res = await request(app).get('/whoami').set('X-Forwarded-For', '203.0.113.7')
        assert.equal(res.body.ip, '203.0.113.7')
    })
})
