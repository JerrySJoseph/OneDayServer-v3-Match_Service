const log=require('./log');

async function PushRequest(params,channel,callback)
{
  try {
    channel.assertExchange(params.exchange,'topic',{durable:false});
/************************** Establishing QUEUE*********************** */
        channel.assertQueue(params.routingKey+'_rpc',{durable:true},(error3,q)=>{
            if(error3)
               return callback(error3)
            log.entry(`Waiting for Response in Que [${q.queue}]`)
            /********************** MicroService Response***********************/
            channel.consume(q.queue,(msg)=>{
              
              if (msg.properties.correlationId == params.requestID)
              {
                log.info(`${q.queue} RPS Recieved of size: ${msg.content.toString().length} bytes`);
                channel.ack(msg);
              
               channel.cancel(msg.fields.consumerTag);
                return callback(JSON.parse(msg.content.toString()));
              }
                
            })

            //******************** PUBLISHER EVENT **************************/
            channel.publish(params.exchange,params.routingKey,Buffer.from(params.data),{ 
              correlationId: params.requestID, 
              replyTo: q.queue 
            })
            
        })
  } catch (error) {
    callback({
      success:false,
      message:error
    })
  }
  
  
}
async function PullRequest(params,channel,onRequest){
  try {
    channel.assertExchange(params.exchange,'topic',{durable:false});
 //For Reciever 1
        channel.assertQueue(params.routingKey,{durable:true},(error3,q)=>{
            if(error3)
               return log.error(error3)
            let consumertag=null;
            log.entry(`Waiting for Requests in Que [${q.queue}]`)
            channel.bindQueue(q.queue,params.exchange,params.routingKey);
            channel.consume(q.queue,(msg)=>{
                log.info(`Recieved :rID:${msg.properties.correlationId}`);
                channel.ack(msg);
               // channel.cancel(msg.fields.consumerTag)
              
                onRequest(JSON.parse(msg.content.toString()),(result)=>{
                     log.entry('rID:'+msg.properties.correlationId+' replyTo:'+msg.properties.replyTo)
                        channel.sendToQueue(msg.properties.replyTo,Buffer.from(JSON.stringify(result)), {
                        correlationId: msg.properties.correlationId
                        })
                })
                    
              
               
            })
            
        })
  } catch (error) {
    console.log(error);
  }

  
  
}
module.exports={
    PushRequest,PullRequest
}