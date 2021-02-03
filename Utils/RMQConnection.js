//Importing requried libraries
const amqp=require('amqplib/callback_api');
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
            console.error("[RabbitMQ] Error:"+err.message);
            console.log(err)
            reject(err);
        }

        //On connection Error
        connection.on("error", function(err) {
            if (err.message !== "Connection closing") {
                console.error("[RabbitMQ] Connection closing Error:")
                console.log(err)
            }
            });

        //On Connection Closed
        connection.on("close", function() {
            console.error("[RabbitMQ] reconnecting");
            return setTimeout(()=>{
                getMyConnection.then();
            }, 1000);
            });
            
        //Assigning connection to export
        conn=connection;
        console.info("[RabbitMQ] connection succesfull")
        resolve(conn);
        });
    }
})


module.exports.closeConnection=closeConnection;
module.exports.getMyConnection=getMyConnection;

