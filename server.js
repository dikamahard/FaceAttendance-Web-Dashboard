import express from 'express'
import { ref as ref_db, set } from 'firebase/database'
import { ref as ref_storage, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage'
import multer from 'multer'


//const fb = require('./firebaseConfig')
//const {fb, db} = require('./firebase')
import {fb, db, storage} from './firebase.js'
import fbConf from './firebaseConfig.js'
import dataTes from './tes.js'

const app = express()
const PORT = 4353

app.set('view engine', 'ejs')
app.use(express.urlencoded({ extended: true }));

//app.set('views','./views')


app.get('/', (req, res) => {
    res.render('index.ejs', {tes: dataTes})
})

// fecth img data from firebase here
app.get('/upload', async (req, res) => {

    const photoRef = ref_storage(storage, 'tes')
/*
    listAll(listRef).then((results) => {
        res.render('upload.ejs', {listData: results.items})
        results.items.forEach((x) => {
            getDownloadURL(ref_storage(storage, x.fullPath)).then((url) => {
                console.log(url)
            })
        })
    }).catch((error) => {
        return res.status(400).send(error.message)
    })
        */

    const listResult = await listAll(photoRef)
    let listPathRef = []
    let listPhotoUrl = []
    let listPhotoId = []

    listResult.items.forEach((item) => {
        listPathRef.push(item.fullPath)
        listPhotoId.push(item.name)
    })

    for (const item of listPathRef) {
        const url = await getDownloadURL(ref_storage(storage, item))
        listPhotoUrl.push(url)
    }


    console.log(listPathRef)
    console.log(listPhotoId)

    res.render('upload.ejs', {listPathRef: listPathRef, listPhotoUrl: listPhotoUrl, listPhotoId: listPhotoId})


})

app.post('/add-data', (req, res) => {
    const data = "tess 1234"
    set(ref_db(db, 'tesdata'), {
        tes: data
    })
    return res.status(201).send('<p>succes</p>')    // should be pop up
})


const upload = multer({
    storage: multer.memoryStorage()
})
app.post('/upload-user', upload.single('image'), async (req, res) => {

    try {
        const userId = req.body.userId
        const tesStorageRef = ref_storage(storage, `tes/${userId}.jpg`)
        const metadata = {
            contentType: 'image/png'
        }

        // uploadBytes(tesStorageRef, req.file.buffer, metadata).then((snapshot) => {
        //     console.log(`Uploaded ${snapshot.ref}`)
        // })

        // TODO: upload name to realtimedb
        const result = await uploadBytes(tesStorageRef, req.file.buffer, metadata)
        console.log(`Uploaded ${userId}`)
        res.redirect('/');

    } catch (error) {
        return res.status(400).send(error.message)
    }

})

app.post('/delete-user', async (req, res) => {
    const userId = req.body.userId

    try {
        const userPhotoRef = ref_storage(storage, `tes/${userId}`)
        // delete here
        await deleteObject(userPhotoRef)
        console.log(`deleted ${userPhotoRef}`)
        res.redirect('/upload')

    } catch (error) {
        console.error('Failed to delete user:', error)
        res.status(500).send('Failed to delete data')
    }
})


app.listen(PORT, () => {
    console.log(`Server ${fbConf.appId} is running on http://localhost:${PORT}`)
})