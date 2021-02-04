
var mongoose = require('mongoose');

let DB_URI="mongodb://localhost:27017/one_day_matches_db"
if(process.env.MATCH_DB_CONNECTION_STRING)
    DB_URI=process.env.MATCH_DB_CONNECTION_STRING
var matchdatabase=mongoose.createConnection(DB_URI,{useNewUrlParser:true,useUnifiedTopology:true});

//A promise function to connect to DB
function connectToDB(){
    return new Promise((resolve,reject)=>{
        mongoose.connect(DB_URI,
            {useNewUrlParser:true,useUnifiedTopology:true},
            (error)=>{
            if(error) return reject(error);
            resolve();
        })
    })
}
//Simple function to connect to database
const Init=function(callback){
    
    mongoose.connect(DB_URI,
            {useNewUrlParser:true,useUnifiedTopology:true},
            (error)=>{
            callback(error)
        })
   
}

module.exports.Init=Init
module.exports.matchDatabase=matchdatabase

