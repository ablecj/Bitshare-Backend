import mongoose from "mongoose";
import dotenv from 'dotenv';


dotenv.config();


const MONGODB_URL = process.env.MONGODB_URL;
const DB_NAME = process.env.DB_NAME;


// connection for mongoDb 
mongoose.connect(MONGODB_URL,{
    dbName: DB_NAME
}).then(
    ()=>{
        console.log("MongoDB connected !");
    }
).catch(
    (error)=>{
        console.log("Error connecting to the database" + error)
    }
)