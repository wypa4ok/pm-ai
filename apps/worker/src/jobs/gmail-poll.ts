import { ingestGmail } from "../../../../src/server/integrations/gmail";

export async function runGmailPoll(logger: { info: Function; error: Function }) {
  try {
    const result = await ingestGmail();
    logger.info({ result }, "gmail poll complete");
  } catch (error) {
    logger.error({ error }, "gmail poll failed");
  }
}
