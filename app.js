require("express-async-errors");// for async error message without try catch block
require('./db');
const express = require('express');
require('dotenv').config();
const morgan = require("morgan");
const app = express();
const cors = require('cors');
app.use(morgan('dev'));

const PORT = process.env.PORT;

const postRouter = require('./routes/postRouter');
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors({origin: 'http://localhost:3000'}))

app.use('/api/post', postRouter);
// we have to put it after router call for globle Error message
app.use((err,req, res, next) => {
        res.status(500).json({error: err.message});
        next(err);
});

app.listen(PORT, () => {
    console.log("port is listining on", PORT)
});

