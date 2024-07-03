// const {initializeApp} = require('firebase/app')
// require('firebase/database')
// const firebaseConfig = require('./firebaseConfig')

// const fb = initializeApp(firebaseConfig)
// const db = fb.database()


// module.exports = { fb, db }

import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import firebaseConfig from './firebaseConfig.js'
import { getStorage } from 'firebase/storage';


const fb = initializeApp(firebaseConfig)
const db = getDatabase(fb)
const storage = getStorage(fb)

export { fb, db, storage }
