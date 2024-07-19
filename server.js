import express from 'express'
import { child, onValue, ref as ref_db, remove, set, get } from 'firebase/database'
import { ref as ref_storage, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage'
import multer from 'multer'


import {fb, db, storage} from './firebase.js'
import fbConf from './firebaseConfig.js'
import dataTes from './tes.js'

const app = express()
const PORT = 4353
const STORAGE_DIR = ''

app.set('view engine', 'ejs')   // set templating engine
app.use(express.static('public'))   // middleware for static file, which is located in public dir
app.use(express.urlencoded({ extended: true }));    // middleware needed to parse body from html form to the server

app.set('views','./views')  // is this necessary?? IDK


app.get('/', (req, res) => {
    res.render('index.ejs', {tes: dataTes})
})

// fecth img data from firebase here (change to try catch) need debug sometimes shown no names
app.get('/upload', async (req, res) => {

    const photoRef = ref_storage(storage, 'master')
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

    listResult.items.forEach(async (item) => {
        listPathRef.push(item.fullPath)
        listPhotoId.push(item.name)
        const userId = item.name.split('.')[0]
        //const userNameRef = ref_db(db, `users/${userId}`)
        /*
        onValue(userNameRef, (snapshot) => {
            const user = snapshot.val()
            if (user) {
                listUserName.push(user.name);
            } else {
                console.log(`No user found at ${userNameRef}`);
            }
        })*/
        const userName = (await get(child(ref_db(db), `users/${userId}/name`))).val()
        listUserName.push(userName)
    })

    for (const item of listPathRef) {
        const url = await getDownloadURL(ref_storage(storage, item))
        listPhotoUrl.push(url)
    }


    console.log(listPathRef)
    console.log(listPhotoId)
    console.log(listUserName)

    res.render('upload.ejs', {listPathRef: listPathRef, listPhotoUrl: listPhotoUrl, listPhotoId: listPhotoId, listUserName: listUserName})


})

// TODO: recomended to use post but this just proofs that get is working too
app.get('/update', (req, res) => {
    const userId = (req.query.userId).split('.')[0]
    const userName = req.query.userName
    const photoUrl = req.query.photoUrl
    console.log(userId)
    res.render('update.ejs', {userId: userId, userName: userName, photoUrl: photoUrl})
})

/////////////////////////
// first method using query on the get
app.post('/report', (req, res) => {

    if (req.body) {
        console.log(req.body.userChoose)
        const userDataEncoded = encodeURIComponent(req.body.userChoose)
        res.redirect(`/report?userId=${userDataEncoded}`)   // this is techcnically is a get
    } else {
        console.log('empty')
    }
    
})

app.get('/report', async (req, res) => {
    const userId = req.query.userId
    const userArr = []

    // get user name and id to populate name picker
    const userSnapshot = await get(child(ref_db(db), `users`))
    console.log(userSnapshot.val())

    userSnapshot.forEach(record => {
        record.forEach(name => {
            const user = {
                id: record.key, 
                name: name.val()
            }
            userArr.push(user)
        })
    })
    console.log(userArr)

    if (userId) {
        const attendanceArr = []
        const attendanceSnapshot = await get(child(ref_db(db), `records/${userId}`))
        console.log(attendanceSnapshot.val())

        attendanceSnapshot.forEach(date => {
            const timeArr = []
            let timeIn = '--.--'
            let timeOut = '--.--'

            // get the first and last time
            date.forEach(time => {
                timeArr.push(time.key)
                if (timeArr.length > 1) {
                    timeIn = timeArr[0]
                    timeOut = timeArr.at(-1)
                } else {
                    timeIn = timeArr[0]
                }
            })

            const attendance = {
                date: date.key,
                timeIn: timeIn,
                timeOut: timeOut
            }
            attendanceArr.push(attendance)
        })
        console.log(attendanceArr)

        // get username based on userId
        const userName = (await get(child(ref_db(db), `users/${userId}/name`))).val()

        res.render('report.ejs', {userName: userName, attendances: attendanceArr, users: userArr})        
    
    }else {
        res.render('report.ejs', {userName: null, attendances: null, users: userArr})
    }
    
})
    

// second method using params on the get
/*
app.post('/report', (req, res) => {

    if (req.body) {
        console.log(req.body.userChoose)
        const userDataEncoded = encodeURIComponent(req.body.userChoose)
        res.redirect(`/report/${userDataEncoded}`)  // this is techcnically is a get
    } else {
        console.log('empty')
    }
    
})

    // need two get method, the first is for accesing with data generated for the id 
    // and the second is for accessing it for the first time without the data generated
    // path parameters are mandatory unlike query which is optional so the first method only need 1 get
app.get('/report/:id', (req, res) => {
    console.log('params id')
    res.render('report.ejs', {userId: req.params.id})
})

app.get('/report', (req, res) => {
    console.log('no params id')
    res.render('report.ejs', {userId: req.params.id})
})*/
///////////////////////////

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

        const storageRef = ref_storage(storage, `master/${userId}.jpg`)
        const metadata = {
            contentType: 'image/png'
        }


        const result = await uploadBytes(storageRef, req.file.buffer, metadata)
        const databasePath = `users/${userId}`
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
    const photoId = req.body.photoId
    const userId = (req.body.photoId).split('.')[0]
    const databasePath = `users/${userId}`
    const storagePath = `master/${photoId}`



    try {
        const userPhotoRef = ref_storage(storage, storagePath)
        // delete photo from storage
        await deleteObject(userPhotoRef)
        console.log(`deleted storage${userPhotoRef}`)

        // delete user from db
        await remove(ref_db(db, databasePath))
        console.log(`deleted ${databasePath}`)

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

    const databasePath = `users/${userId}`
    const oldDatabasePath = `users/${oldUserId}`
    const storageRef = ref_storage(storage, `${databasePath}.jpg`)
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
            const result = await uploadBytes(storageRef, imageInputted.buffer, metadata)
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
            const result = await uploadBytes(storageRef, imgBuffer, metadata)
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