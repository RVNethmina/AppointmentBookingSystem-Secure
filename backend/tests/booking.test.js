import { test, describe, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { signAccessToken } from '../utils/token.js'
import userModel from '../models/userModel.js'
import doctorModel from '../models/doctorModel.js'
import appointmentModel from '../models/AppointmentModel.js'
import { startDb, stopDb, clearDb, createApp } from './helpers.js'

const slotDateIn = (days) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return `${d.getDate()}_${d.getMonth() + 1}_${d.getFullYear()}`
}

describe('V16: booking race condition and booking logic', () => {
    let app, doctor, users, userTokens, doctorToken, adminToken

    before(startDb)
    after(stopDb)

    beforeEach(async () => {
        await clearDb()
        app = createApp()
        doctor = await doctorModel.create({
            name: 'Dr Race', email: 'race@example.com', password: 'hash', image: 'img', speciality: 'Neurologist',
            degree: 'MBBS', experience: '2 Year', about: 'About', fees: 50, address: { line1: 'a', line2: 'b' }, date: Date.now(),
        })
        users = []
        for (let i = 0; i < 10; i++) {
            users.push(await userModel.create({ name: `Patient ${i}`, email: `p${i}@example.com`, password: 'hash' }))
        }
        userTokens = users.map((u) => signAccessToken({ id: String(u._id), role: 'user' }))
        doctorToken = signAccessToken({ id: String(doctor._id), role: 'doctor' })
        adminToken = signAccessToken({ role: 'admin', email: process.env.ADMIN_EMAIL })
    })

    const book = (i, body) =>
        request(app).post('/api/user/book-appointment').set('token', userTokens[i])
            .send({ docId: String(doctor._id), slotDate: slotDateIn(3), slotTime: '10:00 AM', ...body })

    test('ten concurrent requests for the same slot produce exactly one booking', async () => {
        const results = await Promise.all(users.map((_, i) => book(i)))
        const booked = results.filter((r) => r.body.success)
        assert.equal(booked.length, 1)
        assert.equal(await appointmentModel.countDocuments(), 1)
        const fresh = await doctorModel.findById(doctor._id)
        assert.deepEqual(fresh.slots_booked[slotDateIn(3)], ['10:00 AM'])
    })

    test('concurrent bookings of different slots are all kept', async () => {
        const times = ['10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM']
        const results = await Promise.all(times.map((t, i) => book(i, { slotTime: t })))
        assert.ok(results.every((r) => r.body.success))
        const fresh = await doctorModel.findById(doctor._id)
        assert.equal(fresh.slots_booked[slotDateIn(3)].length, times.length)
    })

    test('invalid identifiers, dates and times are rejected with 400', async () => {
        const invalid = [
            { docId: 'not-an-id' },
            { docId: { $gt: '' } },
            { slotDate: slotDateIn(-5) },
            { slotDate: slotDateIn(90) },
            { slotDate: '31_2_2030' },
            { slotDate: '__proto__' },
            { slotDate: '1_1_2030.x' },
            { slotTime: '25:99' },
            { slotTime: { $ne: 'x' } },
        ]
        for (const body of invalid) {
            const res = await book(0, body)
            assert.equal(res.status, 400, JSON.stringify(body))
        }
        assert.equal(await appointmentModel.countDocuments(), 0)
    })

    test('an unavailable doctor cannot be booked', async () => {
        await doctorModel.updateOne({ _id: doctor._id }, { available: false })
        const res = await book(0)
        assert.equal(res.body.success, false)
        assert.equal(await appointmentModel.countDocuments(), 0)
    })

    test('appointment records store only displayed fields', async () => {
        await book(0)
        const appt = await appointmentModel.findOne().lean()
        assert.deepEqual(Object.keys(appt.docData).sort(), ['address', 'image', 'name', 'speciality'])
        assert.deepEqual(Object.keys(appt.userData).sort(), ['dob', 'image', 'name'])
    })

    test('completed appointments cannot be cancelled and cancelled ones cannot be completed', async () => {
        await book(0)
        await book(1, { slotTime: '11:00 AM' })
        const first = await appointmentModel.findOne({ slotTime: '10:00 AM' })
        const second = await appointmentModel.findOne({ slotTime: '11:00 AM' })

        const complete = await request(app).post('/api/doctor/complete-appointment').set('dtoken', doctorToken).send({ appointmentId: String(first._id) })
        assert.equal(complete.body.success, true)
        const cancelCompleted = await request(app).post('/api/user/cancel-appointment').set('token', userTokens[0]).send({ appointmentId: String(first._id) })
        assert.equal(cancelCompleted.body.success, false)

        const cancel = await request(app).post('/api/admin/cancel-appointment').set('atoken', adminToken).send({ appointmentId: String(second._id) })
        assert.equal(cancel.body.success, true)
        const completeCancelled = await request(app).post('/api/doctor/complete-appointment').set('dtoken', doctorToken).send({ appointmentId: String(second._id) })
        assert.equal(completeCancelled.body.success, false)
    })

    test('a repeated cancellation does not release a slot booked again by someone else', async () => {
        await book(0)
        const first = await appointmentModel.findOne({ userId: String(users[0]._id) })
        const cancel = () => request(app).post('/api/user/cancel-appointment').set('token', userTokens[0]).send({ appointmentId: String(first._id) })

        assert.equal((await cancel()).body.success, true)
        assert.equal((await book(1)).body.success, true)
        assert.equal((await cancel()).body.success, false)

        const fresh = await doctorModel.findById(doctor._id)
        assert.deepEqual(fresh.slots_booked[slotDateIn(3)], ['10:00 AM'])
    })

    test('the doctor cancelling releases the slot', async () => {
        await book(0)
        const appt = await appointmentModel.findOne()
        const res = await request(app).post('/api/doctor/cancel-appointment').set('dtoken', doctorToken).send({ appointmentId: String(appt._id) })
        assert.equal(res.body.success, true)
        const fresh = await doctorModel.findById(doctor._id)
        assert.deepEqual(fresh.slots_booked[slotDateIn(3)], [])
    })

    test('cancelling a non-existent appointment fails cleanly', async () => {
        const res = await request(app).post('/api/user/cancel-appointment').set('token', userTokens[0]).send({ appointmentId: '507f1f77bcf86cd799439099' })
        assert.equal(res.status, 200)
        assert.equal(res.body.success, false)
    })

    test('the admin availability toggle is atomic and validates the id', async () => {
        const toggle = (docId) => request(app).post('/api/admin/change-availability').set('atoken', adminToken).send({ docId })
        assert.equal((await toggle('bad-id')).status, 400)
        await Promise.all([toggle(String(doctor._id)), toggle(String(doctor._id))])
        const fresh = await doctorModel.findById(doctor._id)
        assert.equal(fresh.available, true)
    })
})
