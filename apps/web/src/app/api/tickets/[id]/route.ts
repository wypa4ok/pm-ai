import { NextResponse } from "next/server";
import { prisma } from "../../../../../../../src/server/db";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: {
      tenant: true,
      unit: true,
      messages: {
        orderBy: { sentAt: "desc" },
        take: 20,
      },
    },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ticket: {
      id: ticket.id,
      subject: ticket.subject,
      category: ticket.category,
      status: ticket.status,
      priority: ticket.priority,
      channel: ticket.channel,
      openedAt: ticket.openedAt,
      tenantName: ticket.tenant
        ? `${ticket.tenant.firstName} ${ticket.tenant.lastName}`
        : undefined,
      unitName: ticket.unit?.name ?? undefined,
      latestMessageSnippet:
        ticket.messages[0]?.snippet ??
        ticket.messages[0]?.bodyText ??
        ticket.messages[0]?.bodyHtml ??
        undefined,
      messages: ticket.messages.map((msg) => ({
        id: msg.id,
        direction: msg.direction,
        channel: msg.channel,
        subject: msg.subject,
        bodyText: msg.bodyText,
        bodyHtml: msg.bodyHtml,
        sentAt: msg.sentAt,
        attachments: msg.attachments,
      })),
    },
  });
}
