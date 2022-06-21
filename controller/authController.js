
const createError = require('http-errors');
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");
require("dotenv").config ; 

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET , {
        expiresIn: "24h",
    });
};

const createSendToken = (user, id, statusCode, req, res) => {
    const token = signToken(id);
    const name = user.firstName + ' ' + user.lastName;
    const email = user.email ; 
    let data = { name, email , role: user.role };
    res.status(statusCode).json({
        statusCode,
        token,
        data,
    });
};

exports.checkUsername = async (req, res, next) =>{
     try {
         const {username} = req.body ; 
         if(!username ) return next(createError(500, 'username not found')); 
         const userfound = await userModel.findOne({username : username }); 
         if(userfound) {
             return res.status(400).json({
                  status :'fail', 
                  message : 'username already exists'
             })
         }
         return  res.status(200).json({
                 status : 'success', 
                 message : 'unique username'
         })
     }catch (e) {
         return next(createError(400, e.message))
     }
}

exports.userAddition = async (req, res, next) => {
    try {
        const { email, password, username, country } = req.body;
        if (!email || !password || !username ) { return next(createError(500, 'email or passowrd or username required')); }
        // add a validator to check if input is actually a email 
        const userFound = await userModel.findOne({ email: email });
        if (userFound) {
            return res.status(400).json({
                status: 'fail',
            })
        }
        const newUser = await userModel.create({
            email: email,
            username : username, 
            country : country, 
            password: password
        })
        createSendToken(newUser, newUser._id, 201, req, res);
    }
    catch (err) {
        return next(createError(400, err.message));
    }
}

exports.userLogin = async (req, res, next) => {
    try {
        const { username , password } = req.body;
        console.log(req.body)
        if (!username || !password) return next(createError(500, 'username or password required'))

            const user = await userModel.findOne({ username : username });
            const check = await user.CheckPass(password, user.password); 
            
            if (user && check) {
                createSendToken(user, user._id, 200, req, res);
            } else {
                return next(createError(400, 'username or passowrd is not correct'))
            }

        
    } catch (err) {
        return next(new Error(err))
    }
}



exports.protect = async (req, res, next) => {
    try {
        let token;
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token =await req.headers.authorization.split(' ')[1];
        }
        
        console.log("token")
        console.log(token)
        console.log("token")

        if (!token || token === 'null') {

            return next(
                createError(401, 'You are not logged in! Please log in to get access.')
            );
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET );
        const currentUser = await userModel.findById(decoded.id);
       
        if (!currentUser) {
            return next(
                createError(401, 'The user belonging to this token does no longer exist.')
            );
        }

        req.user = currentUser._id;
        next();
    } catch (err) {
        return next(new Error(err.message));
    }
};
