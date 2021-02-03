//Importing Required Libraries
const mongoose=require('mongoose');
const { v4: uuidv4 } = require('uuid');
//Custom Components and Helpers
const log=require('./Utils/log');
const Queue= require('./Utils/RMQConnection')
const dbConnection=require('./Utils/MatchDatabase');
const {PullRequest,PushRequest}=require('./Utils/RequestHandler')

const paramWeights={
    age:50,
    distance:20,
    school:15,
    verified:10,
    misc:5
}
const expiretime=1;
//Initialize Profile Service System
InitSystem();

//Init Entire Service System
function InitSystem()
{
//Connecting to Database

dbConnection.Init((error)=>{
if(error)
            {
               log.error(error.message);
               log.entry('Attempting to Reconnect to Database');
               InitSystem();
            } 
        
        log.info('Connected to Database')
        //Register Events after Database Connection
        RegisterQueueEvents();
})
  /*  mongoose.connect('mongodb://localhost:27017/one_day_matches_db',
    {useNewUrlParser:true,useUnifiedTopology:true},
    (error)=>{
        
               
    })*/

}


//Registering Pull Requests for Queues
function RegisterQueueEvents()
{
    Queue.getMyConnection.then((connection)=>{
         connection.createChannel((err,channel)=>{
            
               PullRequest({exchange:'match',routingKey:'match.event.generate'},channel,(data,onFinish)=>{
                    generateMatches(data,channel,onFinish)
                     
                   
               });
    
                log.info('Events Registered')  
         })
         
    })
    
     
}

function generateMatches(data,channel,onFinish) {
    let models=[]
    const matchCount=process.env.MATCH_COUNT;
    const params={
                    exchange:'user',
                    routingKey:'user.event.fetch',
                    requestID:uuidv4(),
                    data:JSON.stringify({state:data.state,gender:data.interestedIn,interestedIn:data.gender})
                    }

    //Fetch Users in same state with same sex interests
    PushRequest(params,channel,(result)=>{

            if(result.length>matchCount)
                result=result.filter(item=>data.district===item.district)
          //  shuffleArray(result)
            const mylat=(data.mylat)
            const mylon=(data.mylon)
        //   return onFinish(result);
            result.forEach((item,index)=>{
                ageDiff=getAgeFromtimestamp(data.age)-getAgeFromtimestamp(item.dob)
                
                const d=calcdistance(mylat,mylon,item.latitude,item.longitude,"K");
                models.push({
                    _id:item._id,
                    index:index,
                    locked:true,
                    distance:d,
                    roomId:"roomId",
                    name:item.name,
                    nickname:item.nickName,
                    district:item.district,
                    state:item.state,
                    age:getAgeFromtimestamp(item.dob),
                    bio:item.bio,
                    school:item.school,
                    verified:item.verified,
                    interests:item.interests,
                    gender:item.gender,
                    portfolio:item.portfolio,
                    score:getScore(data.dl,data.al,d,ageDiff,(data.school==item.school),item.verified,true)})
            })
            models=models.sort((a,b)=>b.score-a.score).slice(0,matchCount);
            const match_data={
                                _id:data._id,
                                requestID:params.requestID,
                                requestat:Date.now(),
                                expiresat:(Date.now()+(1000*60*60*24)),
                                matchCount:models.length,
                                result:models
                            };
            dbConnection.matchDatabase.collection('match_data').updateOne({_id:data._id},{$set:match_data},{upsert:true},(err,result)=>{
                 if(err)
                    {console.log(err)
                    onFinish({
                        success:false,
                        msg:"MATCH files write error"
                    })}
                    else
                    onFinish({
                        success:true,
                         requestID:params.requestID,
                         requestat:Date.now(),
                         expiresat:(Date.now()+(1000*60*60*24)),
                        matchCount:models.length,
                        result:models
                    })
            })
                            
                        })
}


function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
function getScore(dl,al,distance,ageDiff,school,verified,misc)
{
    var  score=paramWeights.distance*(1-(distance/dl))
    score+=paramWeights.age*(1-(Math.abs(ageDiff)/al))
     score+=school?paramWeights.school:0;
     score+=verified?paramWeights.verified:0;
     score+=misc?paramWeights.misc:0;
    return score;
}
function getAgeFromtimestamp(timestamp) {
    return ((new Date()).getTime() - timestamp) / (1000 * 60 * 60 * 24 * 365);
}
//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//:::                                                                         :::
//:::  Passed to function:                                                    :::
//:::    lat1, lon1 = Latitude and Longitude of point 1 (in decimal degrees)  :::
//:::    lat2, lon2 = Latitude and Longitude of point 2 (in decimal degrees)  :::
//:::    unit = the unit you desire for results                               :::
//:::           where: 'M' is statute miles (default)                         :::
//:::                  'K' is kilometers                                      :::
//:::                  'N' is nautical miles                                  :::
//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
function calcdistance(lat1, lon1, lat2, lon2, unit) {
    if ((lat1 == lat2) && (lon1 == lon2)) {
        return 0;
    }
    else {
        var radlat1 = Math.PI * lat1/180;
        var radlat2 = Math.PI * lat2/180;
        var theta = lon1-lon2;
        var radtheta = Math.PI * theta/180;
        var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        if (dist > 1) {
            dist = 1;
        }
        dist = Math.acos(dist);
        dist = dist * 180/Math.PI;
        dist = dist * 60 * 1.1515;
        if (unit=="K") { dist = dist * 1.609344 }
        if (unit=="N") { dist = dist * 0.8684 }
        return dist;
    }
}