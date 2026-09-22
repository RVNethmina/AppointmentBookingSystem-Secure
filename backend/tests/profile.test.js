import { test, describe, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { signAccessToken } from '../utils/token.js'
import userModel from '../models/userModel.js'
import doctorModel from '../models/doctorModel.js'
import { startDb, stopDb, clearDb, createApp } from './helpers.js'

describe('V17: mass assignment in profile updates', () => {
    let app, doctor, doctorToken, user, userToken

    before(startDb)
    after(stopDb)

    beforeEach(async () => {
        await clearDb()
        app = createApp()
        doctor = await doctorModel.create({
            name: 'Dr Fee', email: 'fee@example.com', password: 'hash', image: 'img', speciality: 'Dermatologist',
            degree: 'MBBS', experience: '5 Year', about: 'About', fees: 50, address: { line1: 'a', line2: 'b' }, date: Date.now(),
        })
        doctorToken = signAccessToken({ id: String(doctor._id), role: 'doctor' })
        user = await userModel.create({ name: 'Pat', email: 'pat@example.com', password: 'hash' })
        userToken = signAccessToken({ id: String(user._id), role: 'user' })
    })

    const updateDoctor = (body) =>
        request(app).post('/api/doctor/update-profile').set('dtoken', doctorToken)
            .send({ fees: 60, address: { line1: 'x', line2: 'y' }, available: true, ...body })

    const updateUser = (fields) => {
        const req = request(app).post('/api/user/update-profile').set('token', userToken)
        const values = { name: 'Pat', phone: '0771234567', dob: '2000-01-01', gender: 'Male', address: JSON.stringify({ line1: 'a', line2: 'b' }), ...fields }
        for (const [key, value] of Object.entries(values)) req.field(key, value)
        return req
    }

    test('a doctor can update fees, address and availability', async () => {
        const res = await updateDoctor({ fees: '75' })
        assert.equal(res.body.success, true)
        const fresh = await doctorModel.findById(doctor._id)
        assert.equal(fresh.fees, 75)
        assert.deepEqual(fresh.address, { line1: 'x', line2: 'y' })
    })

    test('negative, non-numeric and huge fees are rejected', async () => {
        for (const fees of [-100, 'abc', 1e9, { $gt: 0 }, null]) {
            const res = await updateDoctor({ fees })
            assert.equal(res.status, 400, JSON.stringify(fees))
        }
        assert.equal((await doctorModel.findById(doctor._id)).fees, 50)
    })

    test('the doctor address keeps only two short text lines', async () => {
        const nested = await updateDoctor({ address: { line1: { $where: 'x' }, line2: 'b' } })
        assert.equal(nested.status, 400)
        const tooLong = await updateDoctor({ address: { line1: 'a'.repeat(201), line2: '' } })
        assert.equal(tooLong.status, 400)

        await updateDoctor({ address: { line1: 'x', line2: 'y', extra: 'dropped', isAdmin: true } })
        const fresh = await doctorModel.findById(doctor._id).lean()
        assert.deepEqual(fresh.address, { line1: 'x', line2: 'y' })
    })

    test('other doctor fields cannot be changed through the profile endpoint', async () => {
        await updateDoctor({ name: 'Hacked', email: 'hacked@example.com', slots_booked: { x: ['y'] } })
        const fresh = await doctorModel.findById(doctor._id)
        assert.equal(fresh.name, 'Dr Fee')
        assert.equal(fresh.email, 'fee@example.com')
    })

    test('malformed patient address JSON gets 400 instead of 500', async () => {
        const res = await updateUser({ address: '{not json' })
        assert.equal(res.status, 400)
    })

    test('patient phone, date of birth and gender are validated', async () => {
        for (const fields of [{ phone: 'call me' }, { dob: '2999-01-01' }, { dob: '2000-02-31' }, { gender: 'Robot' }, { name: '' }]) {
            const res = await updateUser(fields)
            assert.equal(res.status, 400, JSON.stringify(fields))
        }
    })

    test('a valid patient update is stored', async () => {
        const res = await updateUser({ name: 'Patricia', address: JSON.stringify({ line1: '1 Main St', line2: 'Colombo', role: 'admin' }) })
        assert.equal(res.body.success, true)
        const fresh = await userModel.findById(user._id).lean()
        assert.equal(fresh.name, 'Patricia')
        assert.deepEqual(fresh.address, { line1: '1 Main St', line2: 'Colombo' })
    })

    test('the default "Not Selected" values can be saved', async () => {
        const res = await updateUser({ dob: 'Not Selected', gender: 'Not Selected', phone: '0000000000' })
        assert.equal(res.body.success, true)
    })
})
