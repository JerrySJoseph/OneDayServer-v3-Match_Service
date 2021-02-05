//Importing requried libraries
const amqp=require('amqplib/callback_api');
const log=require('./log');

//url for RabbitMQ Server
let Url=process.env.RABBIT_MQ_URI
if(!Url)
    Url='amqp://localhost:5672'

let conn=null;

//Closing the Queue Connection
function closeConnection()
{
    conn.close();
}
const getMyConnection=new Promise((resolve,reject)=>{
    if(conn)
        resolve(conn);
    else
    {
        amqp.connect(Url,(err,connection)=>{
        //If error Initiating Connection
        if(err)
        {
            log.error("[RabbitMQ] Error:"+err.message);
            log.error(err)
            reject(err);
        }

        //On connection Error
        connection.on("error", function(err) {
            if (err.message !== "Connection closing") {
                log.error("[RabbitMQ] Connection closing Error:")
                console.log(err)
            }
            });

        //On Connection Closed
        connection.on("close", function() {
            log.error("[RabbitMQ] reconnecting");
            return setTimeout(()=>{
                getMyConnection.then();
            }, 1000);
            });
            
        //Assigning connection to export
        conn=connection;
        log.info("[RabbitMQ] connection succesfull")
        resolve(conn);
        });
    }
})


module.exports.closeConnection=closeConnection;
module.exports.getMyConnection=getMyConnection;

