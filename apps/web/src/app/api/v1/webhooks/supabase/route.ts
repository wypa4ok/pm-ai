import { NextRequest, NextResponse } from "next/server";
import { syncUser, deleteUser } from "~/server/services/user-sync";

/**
 * Supabase Auth Webhook Handler
 * Syncs Supabase Auth users with our application database
 *
 * Setup in Supabase Dashboard:
 * Authentication > Hooks > Enable "Send event when user is created/updated/deleted"
 * URL: https://yourdomain.com/api/v1/webhooks/supabase
 * Secret: Set SUPABASE_WEBHOOK_SECRET in .env
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;
    const authHeader = request.headers.get("authorization");

    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      console.error("Invalid webhook secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    console.log("Supabase webhook received:", {
      type: payload.type,
      userId: payload.record?.id,
      email: payload.record?.email,
    });

    const eventType = payload.type;
    const user = payload.record;

    if (!user || !user.id) {
      console.error("No user data in webhook payload");
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    switch (eventType) {
      case "INSERT":
      case "UPDATE":
        // Sync user to our database
        await syncUser({
          supabaseUserId: user.id,
          email: user.email,
          fullName: user.user_metadata?.name || user.user_metadata?.full_name,
          avatarUrl: user.user_metadata?.avatar_url,
        });
        console.log(`✅ User synced: ${user.email}`);
        break;

      case "DELETE":
        // Delete user from our database
        await deleteUser(user.id);
        console.log(`✅ User deleted: ${user.id}`);
        break;

      default:
        console.warn(`Unknown webhook event type: ${eventType}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
