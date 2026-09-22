import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import createApp from '../app.js'

let mongod

// Starts a throw-away MongoDB instance for the current test file.
export const startDb = async () => {
    mongod = await MongoMemoryServer.create()
    await mongoose.connect(mongod.getUri())
}

export const stopDb = async () => {
    await mongoose.disconnect()
    await mongod.stop()
}

export const clearDb = async () => {
    for (const collection of Object.values(mongoose.connection.collections)) {
        await collection.deleteMany({})
    }
}

export { createApp }
