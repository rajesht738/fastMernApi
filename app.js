require('dotenv').config();
require("express-async-errors");// for async error message without try catch block

require('./db');
const express = require('express');

//const morgan = require("morgan");
const cors = require('cors');
const app = express();

// app.use(morgan('dev'));
const postRouter = require('./routes/postRouter');
const PORT = process.env.PORT || 4848;

app.use(cors({origin: true}))

app.use(express.json());
app.use(express.urlencoded({extended: true}));



app.use('/api/post', postRouter);
// we have to put it after router call for globle Error message
app.use((err,req, res, next) => {
        res.status(500).json({error: err.message});
        next(err);
});

app.listen(PORT, () => {
    console.log("port is listining on", PORT)
});

