import express from 'express'
import { onValue, ref as ref_db, remove, set } from 'firebase/database'
import { ref as ref_storage, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage'
import multer from 'multer'


//const fb = require('./firebaseConfig')
//const {fb, db} = require('./firebase')
import {fb, db, storage} from './firebase.js'
import fbConf from './firebaseConfig.js'
import dataTes from './tes.js'

const app = express()
const PORT = 4353
const STORAGE_DIR = ''

app.set('view engine', 'ejs')   // set templating engine
app.use(express.static('public'))   // middleware for static file, which is located in public dir
app.use(express.urlencoded({ extended: true }));    // middleware needed to parse body from html form to the server

//app.set('views','./views')


app.get('/', (req, res) => {
    res.render('index.ejs', {tes: dataTes})
})

// fecth img data from firebase here (change to try catch) need debug sometimes shown no names
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
    let listPathRef = []    // path/to/image1.jpg
    let listPhotoUrl = []   // https::firebasestorage.linkurl.image.jpg
    let listPhotoId = []    // image1.jpg
    let listUserName = []   // get the user name from database using imageId

    listResult.items.forEach((item) => {
        listPathRef.push(item.fullPath)
        listPhotoId.push(item.name)
        const userNameRef = ref_db(db, `tes/${item.name.split('.')[0]}`)
        onValue(userNameRef, (snapshot) => {
            const user = snapshot.val()
            if (user) {
                listUserName.push(user.name);
            } else {
                console.log(`No user found at ${userNameRef}`);
            }
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

app.get('/update', (req, res) => {
    const userId = (req.query.userId).split('.')[0]
    const userName = req.query.userName
    const photoUrl = req.query.photoUrl
    console.log(userId)
    res.render('update.ejs', {userId: userId, userName: userName, photoUrl: photoUrl})

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

// TODO: Delete user from db
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

app.post('/update-user', upload.single('image'), async (req, res) => {
    const userId = req.body.userId
    const oldUserId = req.body.oldUserId
    const userName = req.body.userName
    const imageInputted = req.file
    const photoUrl = req.body.photoUrl

    const databasePath = `tes/${userId}`
    const oldDatabasePath = `tes/${oldUserId}`
    const tesStorageRef = ref_storage(storage, `${databasePath}.jpg`)
    const metadata = {
        contentType: 'image/png'
    }

    try {
        if(imageInputted) {  
            // delete old photo
            const oldPhotoRef = ref_storage(storage, `${oldDatabasePath}.jpg`)
            await deleteObject(oldPhotoRef)
            console.log('delete old photo')

            // delete old user on db
            await remove(ref_db(db, oldDatabasePath))
            console.log('delete old user')

            // set new user on db
            await set(ref_db(db, databasePath), {
                name: userName
            })
            console.log('set new user')

            // upload photo with new userId
            const result = await uploadBytes(tesStorageRef, imageInputted.buffer, metadata)
            console.log(`Updated ${userId} ${userName} ${result.metadata.size}`)

            res.redirect('/upload');
        }else { 
            // load image from url into a buffer
            const imageFetch = await fetch(photoUrl)
            const imgBuffer = Buffer.from(await imageFetch.arrayBuffer())

            // delete old photo
            const oldPhotoRef = ref_storage(storage, `${oldDatabasePath}.jpg`)
            await deleteObject(oldPhotoRef)
            console.log('delete old photo')

            // delete old user on db
            await remove(ref_db(db, oldDatabasePath))
            console.log(`delete old user on id ${oldUserId}`)

            // set new user on db
            await set(ref_db(db, databasePath), {
                name: userName
            })
            console.log(`set new user on id ${userId}`)

            // upload photo with new userId
            const result = await uploadBytes(tesStorageRef, imgBuffer, metadata)
            console.log(`Updated ${userId} ${userName} ${result.metadata.size}`)

            res.redirect('/upload');
        }

    } catch (error) {
        return res.status(400).send(error.message)
    }

    
})

app.listen(PORT, () => {
    console.log(`Server ${fbConf.appId} is running on http://localhost:${PORT}`)
})