const userDatabase = require("../models/userModel.js");
const userModel = require("../models/userModel.js");
const bson = require('bson') 
const dbService = require("../utils/dbService");
const { connections } = require("mongoose");


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
           // remove from connection request  from user 1 
           // remove from sent request from user2 
           // add to connections of both uer 
        //    $pull: { results: { $elemMatch: { score: 8 , item: "B" } } }
           console.log('1')
           const query = {$pull : { sentConnectionRequest : {$eleMatch : user_id }}}
           console.log('2')
           const q =  await dbService.findOneAndUpdateDocument(userModel,{_id : id } ,query)
           console.log(3); 
           const query2 = {$pull : { connectionRequests : {$eleMatch : id }}}
           console.log(4)
           const q2 =  await dbService.findOneAndUpdateDocument(userModel,{_id : user_id},query2)
           console.log(5)

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

module.exports = {
     updateprofile, 
     getprofile, 
     findhostprofile, 
     submitInterviewRequest,
     findSingleProfileFilter, 
     submitConnectionRequest,
     handleFollow,
     getProfileWithId, 
     acceptConnectionRequest
}

// find peers 