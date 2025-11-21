import { pino } from "pino";
import { prisma } from "../../src/server/db";

const logger = pino({ name: "worker-notify", level: process.env.LOG_LEVEL ?? "info" });

/**
 * Polls recent message events and logs stub notifications.
 *
 * In a real implementation, this would push to APNs/FCM/email/SMS/etc.
 */
export async function runNotifyPoll() {
  const since = new Date(Date.now() - 5 * 60 * 1000); // last 5 minutes

  const messages = await prisma.message.findMany({
    where: {
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  if (!messages.length) {
    logger.debug("notify: no new messages");
    return;
  }

  for (const message of messages) {
    logger.info(
      {
        ticketId: message.ticketId,
        messageId: message.id,
        direction: message.direction,
        channel: message.channel,
        createdAt: message.createdAt,
      },
      "notify stub: would dispatch notification",
    );
  }
}
