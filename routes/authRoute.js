import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import Verification from '../models/verificationModel.js';
import multer from 'multer';
import nodemailer from 'nodemailer';
import fs from 'fs';
import responseFunction from '../utils/responseFunction.js';
import authTokenHandler from '../middlewares/checkAuthToken.js';
import dotenv from 'dotenv';
import errorHandler from '../middlewares/errorMiddleware.js';

const router = express.Router();
dotenv.config();

async function mailer(recieveremail, code){
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
        text: "Your OTP is" + code,
        html: "<b>Your OTP is" + code + "</b>"
    });

    console.log("Message sent: %s", info.messageId);
}

const storage = multer.diskStorage({
    destination: (req,file,cb)=>{
        cb(null, './public')
    },
    filename: (req, file, cb)=>{
        let fileType = file.mimetype.split('/')[1];
        console.log(req.headers.filename);
        cb(null, `${Date.now()}.${fileType}`);
    }
});

const upload = multer({ storage: storage});

const fileUploadFunction = (req,res,next) => {
    upload.single('clientfile')(req,res, (err)=>{
        if(err){
            return  responseFunction(res, 400, 'File upload failed', null, false)
        }
        next();
    })
}


router.get('/test', (req, res)=>{
    res.send('Auth Route is working !');

    // mailer('gracyebin7@gmail.com', 123589)
});

//  route for send otp
router.post('/sendotp', async(req,res)=> {

    const {email} = req.body ;
    if(!email) {
        return responseFunction(res, 400, 'Email is required', null, false ); 
    }

    try {
        await Verification.deleteOne({email: email});
        const code = Math.floor(100000 + Math.random() * 900000);
        await mailer(email, code);
        // await Verification.findOneAndDelete({email: email});
        const newVerification = new Verification({
            email: email,
            code: code,
        });
        
        await newVerification.save();

        return responseFunction(res, 200, 'OTP send sucessfully', null, true);
        
    } catch (error) {
        console.log(error);
        return responseFunction(res, 500, 'Internal server error', null, false)
    }
})


router.post('/register', fileUploadFunction, async(req,res,next)=>{
    try {
        const {email, name, password, otp} = req.body;
        let user = await User.findOne({email: email});
        let verificationQueue = await Verification.findOne({email: email});
            if(user){
                if(req.file && req.file.path){
                    fs.unlink(req.file.path, (err)=> {
                        if(err){
                            console.log(err);
                        }else{
                            console.log("File deleted successfuly")
                        }
                    })

                    
                }
            }

            if(!verificationQueue){
                if(req.file && req.file.path){
                    fs.unlink(req.file.path, (err)=>{
                        if(err){
                            console.log(err);
                        }else{
                            console.log('File deleted sucessfully')
                        }
                    })
                }
                return responseFunction(res,400,'please send otp first', null, false)
            }
            //  Matching the otp from the fontend and database
            const isMatch = await bcrypt.compare(otp, verificationQueue.code);
            if(!isMatch){

                if(req.file && req.file.path){
                    fs.unlink(req.file.path, (err)=>{
                        if(err){
                            console.error("Error deleting file: ",err);
                        }else{
                            console.log("File deleted successfuly!")
                        }
                    })
                }
                return responseFunction(res, 400, 'Invalid OTP', null, false);
            }

            user = new User({
                name: name,
                email: email,
                password: password,
                profilePic: req.file.path
            });

            await user.save();
            await Verification.deleteOne({email: email});
            
            return responseFunction(res, 200, 'registered sucessfuly', null, true);

    } catch (error) {
        console.log(error);
        return responseFunction(res, 500, 'Internal server error', null, false);
    }
});

// router.post('/updatepassword', async(req,res, next)=>{});

router.post('/login', async(req,res,next)=>{
    // console.log(process.env.JWT_SECRET_KEY);
    try {
        const {email, password} = req.body;
        // console.log('Request Body:', req.body);
        const user = await User.findOne({email});
        // console.log(user, "user from backend");

        if(!user){
            return responseFunction(res, 400, 'Invalid credentials', null, false);
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch){
            return responseFunction(res, 400, 'Invalid credentials', null, false);
        }

        const authToken = jwt.sign({userId: user._id}, process.env.JWT_SECRET_KEY, {expiresIn: '5m'});
        const refreshToken = jwt.sign({userId: user._id}, process.env.JWT_REFRESH_SECRET_KEY, {expiresIn: '15m'});

        // cookies
        res.cookie('authToken', authToken, {
            httpOnly: true,
            sameSite: 'none',
            secure: true
        });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            sameSite: 'none',
            secure: true
        });

        return responseFunction(res, 200, 'Loged In successfuly', {
            authToken: authToken,
            refreshToken: refreshToken
        },true);

    } catch (error) {
        console.log(error)
        next();
    }
});

    // route for check login
    router.get('/checklogin', authTokenHandler, async (req,res,next)=> {
        res.json({
            ok: req.ok,
            message: req.message,
            userId: req.userId
        })
    });

    // route for logout
    router.post('/logout', authTokenHandler, async(req,res,next)=>{
        res.clearCookie('authToken');
        res.clearCookie('refreshToken');
        res.json({
            ok: true,
            message: 'Logged Out Successfuly'
        })
    })

    router.get('/getuser', authTokenHandler, async(req,res,next)=> {
        try {
            const user = await User.findById(req.userId);
            if(!user){
                return responseFunction(res, 400, 'User not found', null, false)
            }
            return responseFunction(res,200, 'User Found', user, true);
        } catch (err) {
            next(err)
        }
    })

    router.use(errorHandler);

export default router;