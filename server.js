import express from 'express'
import { onValue, ref as ref_db, set } from 'firebase/database'
import { ref as ref_storage, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage'
import multer from 'multer'


//const fb = require('./firebaseConfig')
//const {fb, db} = require('./firebase')
import {fb, db, storage} from './firebase.js'
import fbConf from './firebaseConfig.js'
import dataTes from './tes.js'

const app = express()
const PORT = 4353

app.set('view engine', 'ejs')   // set templating engine
app.use(express.urlencoded({ extended: true }));    // needed to parse body from html form to the server

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
    let listUserName = []

    listResult.items.forEach((item) => {
        listPathRef.push(item.fullPath)
        listPhotoId.push(item.name)
        const userNameRef = ref_db(db, `tes/${item.name.split('.')[0]}`)
        onValue(userNameRef, (snapshot) => {
            const user = snapshot.val()
            listUserName.push(user.name)
        })
    

    })

    for (const item of listPathRef) {
        const url = await getDownloadURL(ref_storage(storage, item))
        listPhotoUrl.push(url)
    }


    console.log(listPathRef)
    console.log(listPhotoId)

    res.render('upload.ejs', {listPathRef: listPathRef, listPhotoUrl: listPhotoUrl, listPhotoId: listPhotoId, listUserName: listUserName})


})

app.post('/add-data', async (req, res) => {

    const data = "tess 1234"

    try {
        await set(ref_db(db, 'tesdata/2'), {
            test: data
        }).then((valu) => console.log(valu))
        console.log("end method")
        //return res.status(201).send('<p>succes</p>')    // should be pop up
    } catch (error) {
        
    }
    
})


const upload = multer({
    storage: multer.memoryStorage()
})
app.post('/upload-user', upload.single('image'), async (req, res) => {

    try {
        const userId = req.body.userId
        const userName = req.body.userName

        const tesStorageRef = ref_storage(storage, `tes/${userId}.jpg`)
        const metadata = {
            contentType: 'image/png'
        }


        const result = await uploadBytes(tesStorageRef, req.file.buffer, metadata)
        const databasePath = `tes/${userId}`
        await set(ref_db(db, databasePath), {
            name: userName
        })
        console.log(`Uploaded ${userId} ${userName} ${result.metadata.size}`)
        res.redirect('/upload');

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