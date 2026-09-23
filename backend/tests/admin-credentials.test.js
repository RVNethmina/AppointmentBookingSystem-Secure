import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import request from 'supertest'
import { assertAdminCredentials, adminCredentialsMatch } from '../utils/adminCredentials.js'
import { startDb, stopDb, createApp } from './helpers.js'

const backendDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const withAdminEnv = (email, password, fn) => {
    const saved = { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }
    process.env.ADMIN_EMAIL = email
    process.env.ADMIN_PASSWORD = password
    try {
        return fn()
    } finally {
        process.env.ADMIN_EMAIL = saved.email
        process.env.ADMIN_PASSWORD = saved.password
    }
}

describe('V15: administrator credential strength and comparison', () => {
    before(startDb)
    after(stopDb)

    test('weak or malformed admin credentials are refused at start-up', () => {
        const refused = [
            ['admin@prescripto.test', 'qwerty123'],
            ['admin@prescripto.test', 'Sh0rt!Pass1'],
            ['admin@prescripto.test', 'alllowercase-but-long-1'],
            ['not-an-email', 'Adm1n!Test#Passw0rd'],
        ]
        for (const [email, password] of refused) {
            withAdminEnv(email, password, () => assert.throws(assertAdminCredentials, undefined, `${email} / ${password}`))
        }
        assert.doesNotThrow(assertAdminCredentials)
    })

    test('the server process exits when started with the original admin password', () => {
        const result = spawnSync(process.execPath, ['server.js'], {
            cwd: backendDir,
            env: { ...process.env, ADMIN_PASSWORD: 'qwerty123' },
            encoding: 'utf8',
            timeout: 20000,
        })
        assert.equal(result.status, 1)
        assert.match(result.stderr, /ADMIN_PASSWORD/)
    })

    test('comparison handles inputs of any length without throwing', () => {
        assert.equal(adminCredentialsMatch(process.env.ADMIN_EMAIL, 'x'), false)
        assert.equal(adminCredentialsMatch(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD + 'extra'), false)
        assert.equal(adminCredentialsMatch('a@b.c', process.env.ADMIN_PASSWORD), false)
        assert.equal(adminCredentialsMatch(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD), true)
    })

    test('admin login still works and rejects wrong credentials of any length', async () => {
        const app = createApp()
        const ok = await request(app).post('/api/admin/login').send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
        assert.equal(ok.body.success, true)
        for (const password of ['x', 'qwerty123', process.env.ADMIN_PASSWORD.slice(0, -1), process.env.ADMIN_PASSWORD + '!']) {
            const res = await request(app).post('/api/admin/login').send({ email: process.env.ADMIN_EMAIL, password })
            assert.equal(res.status, 401)
        }
    })
})
