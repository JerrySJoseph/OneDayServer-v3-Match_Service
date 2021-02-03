const {PushRequest}=require('../../_commonUtils/RequestHandler')
const paramWeights={
    age:50,
    distance:20,
    school:15,
    verified:10,
    misc:5
}
const expiretime=1;
 function generateMatch(params,callback) {
     
    var models=[];
   var {_id,dl,al,state,district,gender,interestedIn,age,verified,misc,matchCount}=params;

   PushRequest({exchange:'user',routingKey:'user.event.fetch'},channel,(result)=>{
       console.log(result);
   })

   profileDatabase.collection('user_profiles').find({state:state,gender:interestedIn,interestedIn:gender}).toArray((err,result)=>{
    
    if(result.length>matchCount)
        result=result.filter(item=>district===item.district)
    shuffleArray(result)
    const mylat=parseFloat(params.mylat)
    const mylon=parseFloat(params.mylon)
    
    result.forEach((item,index)=>{
        ageDiff=getAgeFromtimestamp(age)-getAgeFromtimestamp(item.dob)
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
            score:getScore(dl,al,d,ageDiff,(school===item.school),item.verified,true)})
    })
    models=models.sort((a,b)=>b.score-a.score).slice(0,matchCount);
    const writeObj={
        _id:_id,
        matches:models,
        expiresat:(new Date() + (1000*60*60*24*expiretime)),
    }
    matchDatabase.collection('match_data').updateOne({_id:_id},{$set:writeObj},{upsert:true},(err,writeResult)=>{
        if(err)
        {console.log(err)
        callback({
            success:false,
            msg:"MATCH files write error"
        })}
        else
       callback({
          success:true,
          samearea:result.length,
          matchCount:models.length,
          result:models
      })
    })
     
    
    
        
       });    
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
module.exports={generateMatch}

