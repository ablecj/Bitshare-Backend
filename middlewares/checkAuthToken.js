import { decode } from "jsonwebtoken";
import jwt from 'jsonwebtoken';



function checkAuth(req,res,next) {
    const authToken = req.cookies.authToken;
    const refreshToken = req.cookies.refreshToken;

    // console.log(authToken, "authtoken")

    if(!authToken || !refreshToken) {
        return res.status(401).json({message: 'Authentication failed: No auth token or refresh token is provided', ok: false});
    }

    jwt.verify(authToken, process.env.JWT_SECRET_KEY, (err, decode)=>{
        if(err){
            jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET_KEY, (refreshErr, refreshDecode)=> {
                if(refreshErr){
                    // both tokens are expired told to login
                    return res.status(401).json({message: "Authentication failed: both tokens are invalid", ok: false});
                }
                else{
                    const newAuthToken = jwt.sign({userId: refreshDecode.userId}, process.env.JWT_SECRET_KEY, {expiresIn: '5m'});
                    const newRefreshToken = jwt.sign({userId: refreshDecode.userId}, process.env.JWT_REFRESH_SECRET_KEY, {expiresIn: '15m'});

                    res.cookie('authToken', newAuthToken, {
                        httpOnly: true,
                        sameSite: 'none',
                        secure: true
                    });
                    res.cookie('refreshToken', newRefreshToken, { 
                        httpOnly: true,
                        sameSite: 'none',
                        secure: true
                    });


                    req.userId = refreshDecode.userId;
                    req.ok = true;
                    req.message = "Authentication succesful";
                    next();
                }
            })
        }
        else{
            req.userId = decode.userId;
            req.ok = true;
            req.message = 'Authentication successful';
            next();
        }
    })


}



export default checkAuth;