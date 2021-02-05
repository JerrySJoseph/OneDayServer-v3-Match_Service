//Importing Required Libraries
const { v4: uuidv4 } = require('uuid');
const dbConnection=require('./MatchDatabase');
const {PushRequest}=require('./RequestHandler')

const paramWeights={
    age:50,
    distance:20,
    school:15,
    verified:10,
    misc:5
}

const expiretime=1;

//function to generateMatch              
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
            const mylat=(data.mylat)
            const mylon=(data.mylon)
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
            const timestampNow=Date.now();
            const match_data={
                                _id:data._id,
                                requestID:params.requestID,
                                requestat:timestampNow,
                                expiresat:(timestampNow+(1000*60*60*24)),
                                matchCount:models.length,
                                result:models
                            };
            
            //Writing to Database
            dbConnection.matchDatabase.collection('match_data').updateOne({_id:data._id},{$set:match_data},{upsert:true},(err,result)=>{
                 if(err)
                    {
                        
                        console.log(err)
                        onFinish({
                            success:false,
                            msg:"MATCH files write error"
                        })
                    }
                    else
                    {
                        //TODO: Send a request to Chat service to create a record of ConnectionRequests for matches
                        /*
                            PushRequest('chat','chat.event.connectRequest',callback)
                        */
                       
                        onFinish({
                        success:true,
                         requestID:params.requestID,
                         requestat:Date.now(),
                         expiresat:(Date.now()+(1000*60*60*24)),
                        matchCount:models.length,
                        result:models
                    })
                    }
                    
            })
                            
        })
}
//Function as a promise to check if the expire time is elapsed or not
function checkIfallowed(data)
{
    return new Promise((resolve,reject)=>{
        dbConnection.matchDatabase.collection('match_data').findOne({_id:data._id},(error,result)=>{
        if(error)
            return reject({
                success:false,
                message:`Unknown Server Error`
            })
        if(!result)
            return resolve();
        if(result.expiresat>(new Date()).getTime())
        {
            let millisLeft=result.expiresat-(new Date()).getTime();
            let symbol='seconds';
            millisLeft=millisLeft/1000;
            if(millisLeft>60)
               {
                 millisLeft=millisLeft/60;
                symbol='minutes'
               } 
            if(millisLeft>60);
                {
                 millisLeft=millisLeft/60;
                symbol='hours'
               } 
           return reject({
                success:false,
                timeleft:result.expiresat-(new Date()).getTime(),
                message:`You cannot have next match for next ${Math.round(millisLeft)} ${symbol}`
            })
            
        }
        else 
           return resolve();

    })
    })
}
function fetchMatchesFor(id)
{
    return new Promise((resolve,reject)=>{
        dbConnection.matchDatabase.collection('match_data').findOne({_id:id},(error,result)=>{
        if(error)
            return reject({
                success:false,
                message:`Unknown Server Error`
            })
        if(!result)
            return reject({
                success:false,
                message:`No saved matches found`
            })
        else 
           return resolve(result);

        })
    })
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

module.exports={
    checkIfallowed,generateMatches,fetchMatchesFor
}