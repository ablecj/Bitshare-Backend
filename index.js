import express  from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import authRoute from "./routes/authRoute.js";
import fileShare from './routes/fileShare.js';
import { createServer } from "node:http";

// importing the external files 
import "./db.js";
import "./models/userModel.js";
import './models/verificationModel.js';
import dotenv from 'dotenv';


// calling 
const app = express();
dotenv.config();

const PORT = process.env.PORT || 8000;

const server = createServer(app);

// const io = new Server(server, {
//     cors: {
//         origin: 'http://localhost:3000'
//     }
// })


const allowedOrigins = [process.env.FRONTEND_URL];    // add more origins as wanted

app.use(
    cors({

        origin: function (origin, callback) {
            if(!origin || allowedOrigins.includes(origin)){
                callback(null,true);
            } else{
                callback(new Error("Not allowed by cors! "));
            }
        },
        credentials: true,  //allow credentials
    })
   
)


app.use(bodyParser.json());
app.use(cookieParser({
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 1000 * 60 * 60 * 24 * 7,
    signed: true, 
}));

app.use('/public', express.static('public'));


// calling the routes

app.use('/auth', authRoute);
app.use('/file', fileShare);

app.get('/', (req, res) =>{
    res.send("API is runing");
});

// io.on('connection', (socket)=>{
//     console.log('new connection!', socket.id);

  
//     socket.on('joinself', (data)=> {
//         console.log('joined self', data)
//     })

//     socket.on('uploaded', (data)=> {

//         let sender = data.from;
//         let reciever = data.to;

//         console.log(sender, "sender");
//         console.log(reciever, 'reciever');
//         console.log('uploaded', data);

//         socket.to(reciever).emit('notify', {
//             from: sender,
//             message: 'New file shared'  
//         });
//         // console.log('notify event emitted to', reciever);
        
//     })
    
// })

server.listen(PORT, ()=> {
    console.log('server started');
})
