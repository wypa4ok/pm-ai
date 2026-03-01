-- CreateEnum
CREATE TYPE "AgentConversationStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "AgentMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM', 'TOOL_RESULT');

-- CreateEnum
CREATE TYPE "ActionProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "agent_conversations" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "status" "AgentConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_conversation_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" "AgentMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "author_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_proposals" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "action_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "ActionProposalStatus" NOT NULL DEFAULT 'PENDING',
    "resolved_by_user_id" UUID,
    "resolved_at" TIMESTAMP(3),
    "execution_result" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_conversations_ticket_id_status_idx" ON "agent_conversations"("ticket_id", "status");

-- CreateIndex
CREATE INDEX "agent_conversations_created_at_idx" ON "agent_conversations"("created_at");

-- CreateIndex
CREATE INDEX "agent_conversation_messages_conversation_id_created_at_idx" ON "agent_conversation_messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "action_proposals_conversation_id_status_idx" ON "action_proposals"("conversation_id", "status");

-- CreateIndex
CREATE INDEX "action_proposals_created_at_idx" ON "action_proposals"("created_at");

-- AddForeignKey
ALTER TABLE "agent_conversations" ADD CONSTRAINT "agent_conversations_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_conversation_messages" ADD CONSTRAINT "agent_conversation_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "agent_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_conversation_messages" ADD CONSTRAINT "agent_conversation_messages_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_proposals" ADD CONSTRAINT "action_proposals_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "agent_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_proposals" ADD CONSTRAINT "action_proposals_resolved_by_user_id_fkey" FOREIGN KEY ("resolved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
