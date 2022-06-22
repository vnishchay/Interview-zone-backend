const userDatabase = require("../models/userModel.js");
const userModel = require("../models/userModel.js");
const bson = require('bson') 
const dbService = require("../utils/dbService");
const InterviewModel = require('../models/interviewModel.js')
const {v4} = require('uuid'); 
const updateprofile = async (req, res) => {
    try {
        const data = req.body ; 
        console.log(data)

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
           // firstly check if user is in connections of current user 
           const {username} = req.body; 
           console.log(username)
           const userFound =await userModel.findOne({username : username}) ;
           if(!userFound || userFound === null ) {
                return res.status(400).json({
                        status : 'fail', 
                        message : 'user not found'
                })
           }
         
           const _id = userFound._id ; 
           const user_id = req.user ; 
           console.log("Hello0")
           if(`${_id}` === `${user_id}`){
                     return res.status(400).json({
                           status : 'fail', 
                            message : 'same user'
                     })
           }
           console.log("Hello1")
           const curr_user = await dbService.getSingleDocumentById(userModel, user_id) 
           
           const { connections } = curr_user ; 
           let isConnection = false ; 
           console.log("hello2")
           for (let index = 0; index < connections.length; index++) {
                    if( `${connections[index]}` === `${_id}` ) {
                                isConnection = true ; 
                    }
           }
          console.log("Hello3")
           if(!isConnection) {
                 return res.status(200).json({
                       status : 'fail', 
                       isConnection : false 
                 })
           }
           console.log("Hello4")   
           await dbService.findOneAndUpdateDocument(userModel, {_id : _id}, { $push : {interviewRequest : user_id }})
           await dbService.findOneAndUpdateDocument(userModel, {_id : user_id} ,{$push : {sentInterviewRequest : _id }} )
           return res.status(200).json({
                  status : 'success', 
                  isConnection : true
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
           const userFound = await userModel.findOne({username : username}) ;
           if(!userFound || userFound === null ) {
                return res.status(400).json({
                        status : 'fail', 
                        message : 'user not found'
                })
           }
           const _id = userFound._id ; 
           const user_id = req.user ; 
           if(`${_id}` === `${user_id}`){
            console.log("Same user")
            return res.status(400).json({
                  status : 'fail', 
                   message : 'same user'
            })
  }        
           
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
           if(`${_id}` === `${user_id}`){
            return res.status(400).json({
                  status : 'fail', 
                   message : 'same user'
            })
  }

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

const getProfileWithId = async (req, res)=>{
       try {
           const {id} = req.body ; 
           const user = await dbService.getSingleDocumentById(userModel, id); 
           res.status(200).json({
                 status : 'success', 
                 data : user 
           })
       } catch (e ) {
            return res.status(400).json({
                status : 'fail', 
                message : e.message 
            })
       }
}


const acceptConnectionRequest = async (req, res)=>{
       try {
           const {id} = req.body ; 
           const user_id = req.user ; 
           const query = {$pull : { sentConnectionRequest : bson.ObjectID(user_id)}}
           const q =  await dbService.findOneAndUpdateDocument(userModel,{_id : id } ,query)
           const query2 = {$pull : { connectionRequests : bson.ObjectID(id) }}
           const q2 =  await dbService.findOneAndUpdateDocument(userModel,{_id : user_id},query2)
           const query3 = {$push : { connections : bson.ObjectID(id) }}
           const q3 = await dbService.findOneAndUpdateDocument(userModel, {_id : user_id}, query3 )
           const query4 = {$push : { connections : bson.ObjectID(user_id) }}
           const q4 = await dbService.findOneAndUpdateDocument(userModel, {_id : id}, query4 )
           return res.status(200).json({
                  status : 'success', 
                  message : 'successfully added connection'
           })    
       }catch (e) {
            return res.status(400).json({
                    status : 'fail', 
                    message : e.message
            })
       }
}

const acceptInterviewRequest = async (req, res)=>{
    try {
        const {id} = req.body ; 
        const user_id = req.user ; 
        console.log(user_id + " " + id )
        const query = {$pull : { sentInterviewRequest : bson.ObjectID(user_id)}}
        const q =  await dbService.findOneAndUpdateDocument(userModel,{_id : id } ,query)
        const query2 = {$pull : { interviewRequest : bson.ObjectID(id) }}
        const q2 =  await dbService.findOneAndUpdateDocument(userModel,{_id : user_id},query2)
        const query3 = {$push : { interviews : bson.ObjectID(id) }}
        const q3 = await dbService.findOneAndUpdateDocument(userModel, {_id : user_id}, query3 )
        const query4 = {$push : { interviews : bson.ObjectID(user_id) }}
        const q4 = await dbService.findOneAndUpdateDocument(userModel, {_id : id}, query4 )
        const interview_id = v4(); 
        const q5 = await dbService.createDocument(InterviewModel, {idOfHost : bson.ObjectID(user_id) , idOfParticipant : bson.ObjectID(id), interviewID : interview_id })
        return res.status(200).json({
               status : 'success',
               message : q5 
        })    
    }catch (e) {
         return res.status(400).json({
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
     handleFollow,
     getProfileWithId, 
     acceptConnectionRequest, 
     acceptInterviewRequest
}

// find peers 