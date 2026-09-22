import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { startDb, stopDb, createApp } from './helpers.js'

describe('V4: brute-force protection', () => {
    before(startDb)
    after(stopDb)

    for (const path of ['/api/user/login', '/api/doctor/login', '/api/admin/login', '/api/user/register']) {
        test(`${path} is throttled after 10 attempts`, async () => {
            const app = createApp()
            const statuses = []
            for (let i = 0; i < 12; i++) {
                const res = await request(app).post(path).send({ email: 'victim@example.com', password: `guess-${i}` })
                statuses.push(res.status)
            }
            assert.ok(statuses.slice(0, 10).every((s) => s !== 429), statuses.join(','))
            assert.deepEqual(statuses.slice(10), [429, 429])
        })
    }

    test('the whole API reports a request budget', async () => {
        const res = await request(createApp()).get('/api/doctor/list')
        assert.ok(res.headers['ratelimit-policy'])
    })
})
