import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { startDb, stopDb, createApp } from './helpers.js'

describe('V5: CORS allow-list and security headers', () => {
    before(startDb)
    after(stopDb)

    test('an unknown origin is refused with 403', async () => {
        const res = await request(createApp()).get('/api/doctor/list').set('Origin', 'https://evil.example')
        assert.equal(res.status, 403)
        assert.equal(res.headers['access-control-allow-origin'], undefined)
    })

    test('an allowed origin gets its own origin back, never *', async () => {
        const res = await request(createApp()).get('/api/doctor/list').set('Origin', 'http://localhost:5173')
        assert.equal(res.status, 200)
        assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:5173')
    })

    test('preflight requests from allowed origins permit the token headers', async () => {
        const res = await request(createApp())
            .options('/api/user/get-profile')
            .set('Origin', 'http://localhost:5174')
            .set('Access-Control-Request-Method', 'GET')
            .set('Access-Control-Request-Headers', 'token')
        assert.equal(res.status, 204)
        assert.match(res.headers['access-control-allow-headers'], /token/)
    })

    test('ALLOWED_ORIGINS replaces the development defaults', async () => {
        const original = process.env.ALLOWED_ORIGINS
        process.env.ALLOWED_ORIGINS = 'https://app.example, https://panel.example'
        try {
            const app = createApp()
            assert.equal((await request(app).get('/api/doctor/list').set('Origin', 'https://panel.example')).status, 200)
            assert.equal((await request(app).get('/api/doctor/list').set('Origin', 'http://localhost:5173')).status, 403)
        } finally {
            if (original === undefined) delete process.env.ALLOWED_ORIGINS
            else process.env.ALLOWED_ORIGINS = original
        }
    })

    test('security headers are set and the framework is not advertised', async () => {
        const res = await request(createApp()).get('/api/doctor/list')
        assert.equal(res.headers['x-content-type-options'], 'nosniff')
        assert.ok(res.headers['strict-transport-security'])
        assert.ok(res.headers['content-security-policy'])
        assert.ok(res.headers['x-frame-options'])
        assert.equal(res.headers['x-powered-by'], undefined)
    })
})
