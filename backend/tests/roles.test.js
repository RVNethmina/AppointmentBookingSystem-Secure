import { test, describe, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { signAccessToken } from '../utils/token.js'
import appointmentModel from '../models/AppointmentModel.js'
import { startDb, stopDb, clearDb, createApp } from './helpers.js'

const USER_ID = '507f1f77bcf86cd799439011'
const OTHER_USER_ID = '507f1f77bcf86cd799439012'
const DOCTOR_ID = '507f1f77bcf86cd799439013'

const tokens = {
    user: () => signAccessToken({ id: USER_ID, role: 'user' }),
    doctor: () => signAccessToken({ id: DOCTOR_ID, role: 'doctor' }),
    admin: () => signAccessToken({ role: 'admin', email: process.env.ADMIN_EMAIL }),
    noRole: () => signAccessToken({ id: USER_ID }),
}

// one protected endpoint per role and the header its client uses
const endpoints = {
    user: { method: 'get', path: '/api/user/appointments', header: 'token' },
    doctor: { method: 'get', path: '/api/doctor/appointments', header: 'dtoken' },
    admin: { method: 'get', path: '/api/admin/appointments', header: 'atoken' },
}

describe('V11: role enforcement and algorithm pinning', () => {
    before(startDb)
    after(stopDb)
    beforeEach(clearDb)

    for (const [role, endpoint] of Object.entries(endpoints)) {
        test(`${endpoint.path} accepts only ${role} tokens`, async () => {
            const app = createApp()
            for (const tokenRole of Object.keys(tokens)) {
                const res = await request(app)[endpoint.method](endpoint.path).set(endpoint.header, tokens[tokenRole]())
                if (tokenRole === role) {
                    assert.equal(res.status, 200, `${tokenRole} token should be accepted`)
                } else {
                    assert.equal(res.status, 403, `${tokenRole} token should get 403`)
                }
            }
        })
    }

    test('tokens signed with another HMAC algorithm are rejected', async () => {
        const hs512 = jwt.sign({ id: USER_ID, role: 'user' }, process.env.JWT_SECRET, { algorithm: 'HS512', expiresIn: '1h' })
        const res = await request(createApp()).get('/api/user/appointments').set('token', hs512)
        assert.equal(res.status, 401)
    })

    test('unsigned (alg=none) tokens are rejected', async () => {
        const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
        const body = Buffer.from(JSON.stringify({ id: USER_ID, role: 'user' })).toString('base64url')
        const res = await request(createApp()).get('/api/user/appointments').set('token', `${header}.${body}.`)
        assert.equal(res.status, 401)
    })

    test('a userId in the request body cannot override the token identity', async () => {
        const other = await appointmentModel.create({
            userId: OTHER_USER_ID, docId: DOCTOR_ID, slotDate: '1_1_2030', slotTime: '10:00 AM',
            userData: {}, docData: {}, amount: 10, date: Date.now(),
        })
        const res = await request(createApp())
            .post('/api/user/cancel-appointment')
            .set('token', tokens.user())
            .send({ userId: OTHER_USER_ID, appointmentId: String(other._id) })
        assert.equal(res.body.success, false)
        const after = await appointmentModel.findById(other._id)
        assert.equal(after.cancelled, false)
    })

    test('the Authorization: Bearer header is accepted as well', async () => {
        const res = await request(createApp()).get('/api/doctor/appointments').set('Authorization', `Bearer ${tokens.doctor()}`)
        assert.equal(res.status, 200)
    })
})
