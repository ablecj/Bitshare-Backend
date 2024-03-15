import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import Verification from '../models/verificationModel.js';
import multer from 'multer';
import nodemailer from 'nodemailer';
import fs from 'fs';
import responseFunction from '../utils/responseFunction.js';
import errorHandler from '../middlewares/errorMiddleware.js';
import authTokenHandler from '../middlewares/checkAuthToken.js';
import dotenv from 'dotenv';
import { S3Client, GetObjectCommand, PutObjectCommand,} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';



const router = express.Router();
dotenv.config();

const s3Client =   new S3Client({
    region: process.env.AWS_REGION,
    credentials:{
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
})

//  function for the email generation for otp
async function mailer( filesenderemail, recieveremail ){
    let transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
            user : 'gracyebin7@gmail.com',
            pass: 'ippw zhtm sgaa fhio'
        },
        tls : {
            rejectUnauthorized: false
        }
    })

    let info = await transporter.sendMail({
        from: "Team Bits",
        to: recieveremail,
        subject: "OTP for verification",
        text: "Your OTP is" + filesenderemail,
        html: "<b>Your OTP is" + filesenderemail + "</b>"
    });

    console.log("Message sent: %s", info.messageId);
};



// const storage = multer.diskStorage({
//     destination: (req,file,cb)=>{
//         cb(null, './public')
//     },
//     filename: (req, file, cb)=>{
//         let fileType = file.mimetype.split('/')[1];
//         console.log(req.headers.filename);
//         cb(null, `${Date.now()}.${fileType}`);
//     }
// });

// const upload = multer({ storage: storage});

// const fileUploadFunction = (req,res,next) => {
//     upload.single('clientfile')(req,res, (err)=>{
//         if(err){
//             return  responseFunction(res, 400, 'File upload failed', null, false)
//         }
//         next();
//     })
// }

// function for getting the object url from the aws
const getObjectUrl = async (key) => {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
    }

    return await getSignedUrl(s3Client, new GetObjectCommand(params));
}

// function for post the url from the aws to the frontend 
const postObjectUrl = async (filename, ContentType) => {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: filename,
        ContentType: ContentType,
    }

    return await getSignedUrl(s3Client, new PutObjectCommand(params))
}


// test router
router.get('/test', (req, res)=>{
    res.send('Files Share route is working')
})

// posting the url
router.get('/generatepostobjecturl', authTokenHandler, async(req,res,next) => {
    try {
        const timeinms = new Date().getTime();
        const signedUrl = await postObjectUrl(timeinms.toString(), '');
        return responseFunction(res, 200, 'sign url generated',  {
            signedUrl: signedUrl,
            filekey: timeinms.toString()
        }, true)
    } catch (err) {
        console.log(err, "error");
        next(err);
    }
})

// share file route
router.post('/sharefile', authTokenHandler,  async(req,res,next)=> {
    try {
        const { recieveremail, filename, filekey, fileType} = req.body;
        // console.log(fileType, 'fileType')

        let senderuser = await User.findOne({_id : req.userId});
        let recieveruser = await User.findOne({email: recieveremail});

        // console.log(req.file.path, "file path")
        
        if(!senderuser){
            // if(req.file && req.file.path){
            //     fs.unlink(req.file.path, (err)=> {
            //         if(err){
            //             console.log(err)
            //         } else{
            //             console.log("file deleted successfuly")
            //         }
            //     })
            // }
            return responseFunction(res, 400, 'sender email is not registered', null, false);
        }

        if(!recieveruser) {
            // if(req.file && req.file.path){
            //     fs.unlink(req.file.path, (err)=> {
            //         if(err){
            //             console.log(err)
            //         } else{
            //             console.log("file deleted successfuly")
            //         }
            //     })
            // }
            return responseFunction(res, 400, 'reciever email is not registered', null, false);
        }

        if(senderuser.email === recieveremail){
            // if(req.file && req.file.path){
               
            //     fs.unlink(req.file.path, (err)=> {
            //         if(err) {
            //             console.log(err);
            //         } else{
            //             console.log("File deleted successfuly");
            //         }
            //     })
            // }
            return responseFunction(res, 400, "reciever email and sender email cannot be same", null, false);
        }

        // to push the file into the database 
        senderuser.files.push({
            senderemail: senderuser.email,
            recieveremail: recieveremail,
            // fileurl: req.file.path,
            fileurl: filekey,
            fileType: fileType,
            filename: filename ? filename : new Date().toLocaleDateString(),
            sharedAt: Date.now()
        })
        // for the reciever user 
        recieveruser.files.push({
            senderemail: senderuser.email,
            recieveremail: recieveremail,
            // fileurl: req.file.path,
            fileurl: filekey,
            fileType: fileType,
            filename: filename ? filename : new Date().toLocaleDateString(),
            sharedAt: Date.now()
        });

        await senderuser.save();
        await recieveruser.save();
        await mailer(senderuser.email, recieveremail);

        return responseFunction(res, 200, 'shared successfuly', null, true);

    } catch (err) {
        next(err);
    }
});

router.get('/getfiles', authTokenHandler, async(req,res,next) => {
    try {
        let user = await User.findOne({_id: req.userId});
        if (!user) {
            responseFunction(res, 400, 'User not found', null, false);
        }
        return responseFunction(res, 200, 'files fetched successfuly', user.files, true)
    } catch (err) {
        next(err);
    }
})


router.get('/gets3urlbykey/:key', authTokenHandler, async(req,res,next)=> {
    try {
        const {key} = req.params;
        // console.log(req.params,'params')
        // console.log(key,"Key")
        const signedUrl = await getObjectUrl(key);
        // console.log(signedUrl,'signedurl')
        if(!signedUrl){
            return responseFunction(res, 400, 'signed url not found !', null, false);
        }
        return responseFunction(res, 200, 'signed url  generated', {signedUrl: signedUrl,}, true)
    } catch (err) {
        next(err);
    }
})

router.use(errorHandler);


export default router;