const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const config = require('../config/database');
const User = require('../models/user');
const NGOs = require('../models/ngos');
const emailVerfier = require('../util/email_verfi');

// Register
router.post('/register', (req, res, next) => {
    var contype = req.headers['content-type'];
    if (!contype || contype.indexOf('application/json') !== 0)
        return res.sendStatus(400);

    User.getUserByEmail(req.body.email, (err, user) => {
        if (err) return console.log(err);
        if (user) {
            res.json({
                success: false,
                token: 'Email already present'
            });
        } else {
            let newUser = new User({
                name: req.body.name,
                email: req.body.email,
                password: req.body.password,
                phoneNo: req.body.phoneNo,
                city: req.body.city
            });

            User.addUser(newUser, (err, user) => {
                if (err) {
                    console.log(err);
                    res.json({
                        success: false,
                        token: 'Failed to register user'
                    });
                } else {
                    emailVerfier.sendVerificationEmail(user);
                    
                    res.json({
                        success: true,
                        token: 'User registered'
                    });
                }
            });
        }
    });
});

// Authenticate
router.post('/authenticate', (req, res, next) => {
    var contype = req.headers['content-type'];
    if (!contype || contype.indexOf('application/json') !== 0)
        return res.send(400);

    const email = req.body.email;
    const password = req.body.password;

    User.getUserByEmail(email, (err, user) => {
        if (err) throw err;
        if (!user) {
            return res.json([{
                success: false,
                msg: 'User not found'
            }]);
        }

        User.comparePassword(password, user.password, (err, isMatch) => {
            if (err) throw err;
            if (isMatch) {
                const token = jwt.sign({
                    data: user
                }, config.secret, {
                    expiresIn: 604800 // 1 week
                });

                res.json([{
                    success: true,
                    token: 'bearer ' + token,
                    user: {
                        id: user._id,
                        name: user.name,
                        email: user.email
                    }
                }]);
            } else {
                return res.json([{
                    success: false,
                    msg: 'Wrong password'
                }]);
            }
        });
    });
});

// Get User's Profile
router.get('/profile', passport.authenticate('jwt', {
    session: false
}), (req, res, next) => {
    res.json([{
        user: {
            name: req.user.name,
            email: req.user.email,
            address: req.user.address
        }
    }]);
});

// Update User's Email
router.put('/profile/email', passport.authenticate('jwt', {
    session: false
}), (req, res, next) => {
    var contype = req.headers['content-type'];
    if (!contype || contype.indexOf('application/json') !== 0)
        return res.send(400);

    req.user.email = req.body.email;
    req.user.save((err, user, numAffected) => {
        if (err) {
            console.log(err);
            return res.json([{
                success: false,
                msg: 'Internal error. Value not updated.'
            }]);
        } else if (numAffected == 0) {
            console.log(err);
            return res.json([{
                success: false,
                msg: 'Already present'
            }]);
        } else {
            return res.json([{
                success: true,
                msg: 'Sucessfully Updated.'
            }]);
        }
    });
});

// Verify Email
router.get('/profile/email/verify/:token', (req, res, next) => {
    const token = req.params.token;

    emailVerfier.verifyEmail(token, (err, verToken) => {
        if(err) {
            console.log(err);
            return res.send("Internal Server Error");
            // return res.json({
            //     success: false,
            //     msg: "Internal server Error"
            // });
        }else if(!verToken) {
            return res.send("Invalid link.");
            // return res.json({
            //     success: false,
            //     msg: "Not a valid token"
            // });
        }else if(verToken) {
            return res.send("Validated.");
            // return res.json({
            //     success: true,
            //     msg: "Validated!"
            // });
        }
    });
});

// Get Another User's Profile
router.get('/profile/:id', passport.authenticate('jwt', {
    session: false
}), (req, res, next) => {
    User.getUserById(req.params.id, (err, user) => {

        if (err) {
            if (err.name == 'CastError')
                return res.json([{
                    success: false,
                    msg: 'Invalid Id'
                }]);
            else console, log(err);
        }


        if (!user) {
            return res.json([{
                success: false,
                msg: 'User not found'
            }]);
        }

        res.json([{
            id: user._id,
            name: user.name,
            email: user.email,
            phoneNo: user.phoneNo
        }]);
    });
});

// GET All NGOs
router.get('/ngos', (req, res, next) => {
    NGOs.getNGOs((err, ngos) => {
        if(err) {
            console.log(err);
            return res.json([{
                success: false,
                msg: "Internal error."
            }]);
        }else if(!ngos) {
            return res.json([{
                success: false,
                msg: "Empty Collection"
            }]);
        }else {
            res.json(ngos);
        }

    });
});

// Add a new NGO
router.post('/ngos', (req, res, next) => {
    var contype = req.headers['content-type'];
    if (!contype || contype.indexOf('application/json') !== 0)
        return res.send(400);

    let newNGO = new NGOs({
        name: req.body.name,
        amount: req.body.amount,
        address: req.body.address
    });

    newNGO.save((err, user) => {
        if (err) {
            res.json([{
                success: false,
                msg: 'Failed to register user'
            }]);
        } else {
            res.json([{
                success: true,
                msg: 'User registered'
            }]);
        }
    });
});

module.exports = router;