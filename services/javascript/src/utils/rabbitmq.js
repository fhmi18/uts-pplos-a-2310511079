const amqp = require("amqplib");

const rabbitMqUrl = process.env.RABBITMQ_URL || "amqp://localhost";

async function publishMessage(queueName, message) {
  try {
    const connection = await amqp.connect(rabbitMqUrl);
    const channel = await connection.createChannel();
    await channel.assertQueue(queueName, { durable: true });
    
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });
    
    console.log(`[x] Pesan berhasil dikirim ke antrean '${queueName}'`);
    
    setTimeout(() => {
      connection.close();
    }, 500);
  } catch (error) {
    console.error("[!] Gagal mengirim pesan ke RabbitMQ:", error);
  }
}

module.exports = { publishMessage };
