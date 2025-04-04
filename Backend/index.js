const express =require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const HttpError =require('./Utils/HttpError');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

mongoose.connect('mongodb://127.0.0.1:27017/cseproject7')
.then(()=> console.log('connected to database'))   
.catch((error)=> console.log(error));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader( 'Access-Control-Allow-Headers','Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE ,PUT')
    next();
});

const UserRoutes = require( "./Routes/UserRoutes");
const PaymentRoutes = require ( "./Routes/PaymentRoutes");
const QuestionRoutes = require ( "./Routes/QuestionRoutes");
app.use(UserRoutes);
app.use(QuestionRoutes);
app.use(PaymentRoutes);


app.use((req, res, next) => next (new HttpError('Could not find this route.', 404)));

app.use((error, req, res, next) => {
    res.status(error.code || 500);
    res.json({ message: error.message || 'An unknown error occurred!' });
});


app.listen(8000 ,()=> console.log("listening to port 8000"));