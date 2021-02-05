//Custom Components and Helpers
const log=require('./Utils/log');
const Queue= require('./Utils/RMQConnection')
const dbConnection=require('./Utils/MatchDatabase');
const {PullRequest}=require('./Utils/RequestHandler')
const MatchEngine=require('./Utils/MatchEngine')


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

}

//Registering Pull Requests for Queues
function RegisterQueueEvents()
{
    Queue.getMyConnection.then((connection)=>{
         connection.createChannel((err,channel)=>{
             if(err)
                return log.error(err);

                //Pull all requests for generating matches
                PullRequest({exchange:'match',routingKey:'match.event.generate'},channel,(data,onFinish)=>{
                                //Check expiration
                                
                                MatchEngine.checkIfallowed(data).then(()=>{
                                    MatchEngine.generateMatches(data,channel,onFinish)
                                    }).catch((response)=>{
                                        onFinish(response)
                                    })
                                                
                            });

                /* NOTE: It is a better choice to cache the matches in local storage of device.
                   Fetch the updates once in 24Hrs as it will not change for 1 day otherwise fetch when cache not available */

                //Pull all requests for fetching matches
                PullRequest({exchange:'match',routingKey:'match.event.fetch'},channel,(data,onFinish)=>{

                                //Check expiration
                                MatchEngine.fetchMatchesFor(data._id).then((result)=>{
                                        onFinish(result)
                                    }).catch((response)=>{             
                                        onFinish(response)
                                    })
                                                
                            });
                log.info('Match Events Registered')  
         })
         
    })
    
     
}


