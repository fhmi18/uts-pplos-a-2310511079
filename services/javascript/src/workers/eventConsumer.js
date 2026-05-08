const amqp = require("amqplib");

async function startConsumer() {
  const rabbitMqUrl = "amqp://localhost";
  const queues = ["booking_events", "payment_events"];

  try {
    const connection = await amqp.connect(rabbitMqUrl);
    console.log("[x] Terhubung ke RabbitMQ");

    const channel = await connection.createChannel();

    channel.prefetch(1);

    for (const queueName of queues) {
      await channel.assertQueue(queueName, { durable: true });

      console.log(
        `[*] Menunggu pesan di antrean '${queueName}'. Tekan CTRL+C untuk keluar.`,
      );

      channel.consume(queueName, async (msg) => {
        if (msg !== null) {
          try {
            const content = msg.content.toString();
            console.log(`[v] Menerima pesan dari ${queueName}: ${content}`);

            const data = JSON.parse(content);

            await processMessage(data);

            channel.ack(msg);
            console.log(`[v] Pesan dari ${queueName} selesai diproses dan di-acknowledge`);
          } catch (error) {
            console.error(`[!] Gagal memproses pesan dari ${queueName}:`, error);

            channel.nack(msg, false, false);
          }
        }
      });
    }
  } catch (error) {
    console.error("Gagal menjalankan consumer:", error);
  }
}

// Fungsi simulasi untuk memproses data
async function processMessage(data) {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(
        `    Memproses event: ${data.event_type} untuk ID: ${data.id}`,
      );
      resolve();
    }, 2000);
  });
}

startConsumer();
