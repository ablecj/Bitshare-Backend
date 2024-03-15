import mongoose  from "mongoose";
import bcrypt from 'bcrypt';



const fileSchema = new mongoose.Schema({
    senderemail: {required: true, type: String},
    recieveremail: {required: true, type: String},
    fileurl: {required: true, type: String},
    filename: {required: true, type: String},
    fileType: {type: String},
    sharedAt: {required: true, type: Date},
}, {timestamps: true})


const userSchema = new mongoose.Schema({
    name: {required: true , type: String},
    email: {required: true, type: String},
    password: {required: true, type: String},
    profilePic: {
        type: String,
        default: ''
    },
    files: {
        type: [fileSchema],
        default: []
    }

}, {timestamps: true})


userSchema.pre('save', async function(next) {
    const user = this;
    if(user.isModified('password')){
        user.password = await bcrypt.hash(user.password,10);
    }
    next();
})

export default mongoose.model('User', userSchema);


