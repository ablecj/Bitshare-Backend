function errorHandler (statuscode, req,res, next, err ){
    if(res.headersSent) {
        return next(err);
    }
    console.log('ERROR MIDDLEWARE CALLED');
    res.status(statuscode || 500).json({
        message: err.message || 'INTERNAL SERVER ERROR',
        ok: false,
        data: null
    })
};


export default errorHandler;