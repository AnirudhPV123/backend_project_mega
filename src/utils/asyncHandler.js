const asyncHandler=(requestHanlder)=>{
    (req,res,next)=>{
        Promise.resolve(requestHanlder(req,res,next)).catch((err)=>next(err))
    }
}

export {asyncHandler}


// both promise code same
/*
const asyncHandler = (requestHandler) => (req, res, next) => {
  requestHandler(req, res, next)
    .then((result) => {
      // If you need to do something with the result before sending response,
      // you can handle it here.
      res.send(result);
    })
    .catch((err) => {
      // Forward the error to Express.js error handling middleware
      next(err);
    });
};
*/




// try catch
/*
const asyncHandler=(requestHandler)=>async(req,res,next)=>{
    try {
       await requestHandler(req,res,next)
    } catch (error) {
        res.status(error.code || 500).json({
            success:false,
            message:error.message
        })
    }
}
*/