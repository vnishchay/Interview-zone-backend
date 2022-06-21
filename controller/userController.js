const userDatabase = require("../models/userModel.js");
const userModel = require("../models/userModel.js");
const bson = require('bson')
const dbService = require("../utils/dbService")




const updateprofile = async (req, res) => {
    try {
        let data = {
            ...req.body,
        };
               
        let validateRequest = validation.validateParamsWithJoi(
            data
        );
        if (!validateRequest.isValid) {
            return res.inValidParam({ message: `Invalid values in parameters, ${validateRequest.message}` });
        }
        let query = { _id: req.user };
        let result = await dbService.findOneAndUpdateDocument(userDatabase, query, data, { new: true });
        if (!result) {
            return res.recordNotFound();
        }
        return res.ok({ data: result });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.validationError({ message: `Invalid Data, Validation Failed at ${error.message}` });
        }
        else if (error.code && error.code == 11000) {
            return res.isDuplicate();
        }
        return res.failureResponse({ data: error.message });
    }
};

const getprofile = async (req, res) => {
    try {
        const { id } = req.user;
        const user = await userModel.findById(bson.ObjectID(id));
        return res.status(200).json({
            user : user,
            status: '200'
        })
    }
    catch (e) {
        res.status(400).json({
            message: e.message,
            status: 'fail'
        })
    }
}


const findhostprofile = async (req, res)=>{
      try {
       const users = await userModel.find({ ishost : true }) 
        
        return res.status(200).json({
            data : users,
            status: 'success'
        })
      }catch(e) { 
        res.status(400).json({
        message: e.message,
        status: 'fail'
    })
      }
}

const findSingleProfileFilter = async (req, res) =>{
        try {
             const {username} = req.body ;  
             
             console.log(username)
             if(!username || username === null) return res.status(400).json({
                 status : 'fail', 
                 message : 'username not found'
             })
             
             const userFound  = await dbService.getSingleDocument( userModel, {username : username })
             res.status(200).json({
                    status : 'success', 
                    user : userFound
             })
        }catch (e) {
             res.status(400).json({
                  status : 'fail', 
                  message  : e.message 
             })
        }
}

const submitInterviewRequest = async(req, res )=>{
    try {
           const {username} = req.body; 
           const userFound =await userModel.findOne({username : username}) ;
           if(!userFound || userFound === null ) {
                return res.status(400).json({
                        status : 'fail', 
                        message : 'user not found'
                })
           }
           const _id = userFound._id ; 
           const user_id = req.user ; 
           await dbService.findOneAndUpdateDocument(userModel, {_id : _id}, { $push : {interviewRequest : user_id }})
           await dbService.findOneAndUpdateDocument(userModel, {_id : user_id} ,{$push : {sentInterviewRequest : _id }} )
           return res.status(200).json({
                  status : 'success', 
                })

    }catch (e) {
         res.status(400).json({
              status : 'fail', 
              message : e.message 
         })
    }
}



const submitConnectionRequest = async(req, res )=>{
    try {
           const {username} = req.body; 
           const userFound =await userModel.findOne({username : username}) ;
           if(!userFound || userFound === null ) {
                return res.status(400).json({
                        status : 'fail', 
                        message : 'user not found'
                })
           }
           const _id = userFound._id ; 
           const user_id = req.user ; 
           await dbService.findOneAndUpdateDocument(userModel, {_id : _id}, { $push : {connectionRequests : user_id }})
           await dbService.findOneAndUpdateDocument(userModel, {_id : user_id} ,{$push : { sentConnectionRequests : _id }} )
           return res.status(200).json({
                  status : 'success', 
                })

    }catch (e) {
         res.status(400).json({
              status : 'fail', 
              message : e.message 
         })
    }
}



const handleFollow = async(req, res )=>{
    try {
           const {username} = req.body; 
           const userFound =await userModel.findOne({username : username}) ;
           if(!userFound || userFound === null ) {
                return res.status(400).json({
                        status : 'fail', 
                        message : 'user not found'
                })
           }
           const _id = userFound._id ; 
           const user_id = req.user ; 
           await dbService.findOneAndUpdateDocument(userModel, {_id : _id}, { $push : {followers : user_id }})
           await dbService.findOneAndUpdateDocument(userModel, {_id : user_id} ,{$push : { following : _id }} )
           return res.status(200).json({
                  status : 'success', 
                })

    }catch (e) {
         res.status(400).json({
              status : 'fail', 
              message : e.message 
         })
    }
}


module.exports = {
     updateprofile, 
     getprofile, 
     findhostprofile, 
     submitInterviewRequest,
     findSingleProfileFilter, 
     submitConnectionRequest,
     handleFollow
}

// find peers 