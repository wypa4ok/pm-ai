# AI-Powered Contractor Search & Outreach

This feature uses OpenAI's GPT-4o-mini to intelligently analyze maintenance tickets and find the best contractors, then generates professional outreach messages.

## Features

### 1. Intelligent Ticket Analysis
- Analyzes ticket subject, description, and conversation history
- Extracts maintenance type, urgency level, and required trades
- Generates optimized search queries for contractor discovery

### 2. Smart Contractor Search
- **Prioritizes internal contractors** - searches your database first
- **Falls back to Google Maps** - only uses external API if no internal matches found
- **Token optimization** - saves AI costs by skipping external search when internal contractors are available

### 3. AI-Generated Outreach Messages
- Creates professional, context-aware contractor messages
- Includes specific issue details and property information
- Adjusts tone based on urgency (formal/friendly/urgent)
- Fully editable before sending

## Setup

### 1. Get OpenAI API Key

1. Go to [https://platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-...`)

### 2. Add to Environment Variables

Edit `.env.local`:

```bash
# Required for AI features
OPENAI_API_KEY=sk-your-api-key-here

# Already configured (required for Google Maps search)
GOOGLE_PLACES_API_KEY=your-google-api-key
```

### 3. Restart Development Server

```bash
npm run dev
```

## Usage

### From Ticket Detail Page

1. Open any ticket
2. Look for the **AI Contractor Search** panel on the right
3. Click **🤖 AI Search** button
4. AI will:
   - Analyze the ticket content
   - Search internal contractors first
   - Fall back to Google Maps if needed (5 results)
   - Display results with ratings and contact info

5. Click **Generate Message** on any contractor
6. AI creates a professional outreach message
7. Edit the message if needed
8. Send or save as draft

## Cost Estimates

Using GPT-4o-mini (recommended):

- **Ticket Analysis**: ~500 tokens → $0.0003
- **Contractor Message**: ~600 tokens → $0.0004
- **Total per ticket**: ~$0.001

**Monthly estimate** (1000 tickets): ~$1 in AI costs

## API Endpoints

### Analyze Ticket & Search Contractors

```
POST /api/v1/tickets/{ticketId}/analyze-contractors
```

**Request Body:**
```json
{
  "forceExternal": false  // Optional: force Google search even if internal contractors found
}
```

**Response:**
```json
{
  "analysis": {
    "maintenanceType": "Water heater malfunction",
    "urgency": "high",
    "requiredTrade": ["PLUMBING"],
    "specialty": "emergency water heater repair",
    "keywords": ["water heater", "leak", "emergency"],
    "searchQuery": "emergency plumber water heater Saint John NB",
    "summary": "Tenant reports leaking water heater requiring immediate attention"
  },
  "contractors": {
    "internal": [...],
    "external": [...]
  },
  "meta": {
    "source": "internal" | "external" | "both",
    "usedExternal": false,
    "totalFound": 3
  }
}
```

### Generate Contractor Outreach Message

```
POST /api/v1/tickets/{ticketId}/draft-message
```

**Request Body:**
```json
{
  "contractorId": "contractor-uuid",
  "contractorSource": "internal" | "google",
  "tone": "formal" | "friendly" | "urgent",  // Optional
  "contractorData": {  // Required for Google contractors
    "name": "John's Plumbing",
    "phone": "+1-555-0123",
    "email": "contact@johnsplumbing.com",
    "rating": 4.5,
    "reviewCount": 127,
    "address": "123 Main St, Saint John, NB"
  }
}
```

**Response:**
```json
{
  "subject": "Urgent: Water Heater Repair Needed - 123 Main Street",
  "body": "Hi John's Plumbing,\n\nWe have an urgent maintenance issue...",
  "metadata": {
    "generatedAt": "2025-01-08T10:30:00Z",
    "model": "gpt-4o-mini",
    "tokensUsed": 584,
    "contractorName": "John's Plumbing",
    "contractorSource": "google"
  }
}
```

## Architecture

### Service Layer

**`/src/server/ai/contractor-analyzer.ts`**
- Analyzes tickets using OpenAI
- Extracts search parameters
- Logs analysis as agent events

**`/src/server/ai/message-generator.ts`**
- Generates professional outreach messages
- Context-aware (includes ticket + property details)
- Tone adjustment based on urgency

**`/src/server/services/contractor-service.ts`**
- Orchestrates AI analysis + search
- Internal-first search strategy
- Combines internal & external results

### API Layer

**`/apps/web/src/app/api/v1/tickets/[id]/analyze-contractors/route.ts`**
- Authenticated endpoint
- Rate-limited
- CORS-enabled

**`/apps/web/src/app/api/v1/tickets/[id]/draft-message/route.ts`**
- Supports both internal and Google contractors
- Validates contractor data
- Returns editable draft

### UI Components

**`/apps/web/src/app/(app)/components/ContractorPanel.tsx`**
- AI Search button
- Analysis summary display
- Contractor cards with Generate Message buttons
- Editable draft composer

## Troubleshooting

### "OpenAI API key not configured"

**Solution:** Add `OPENAI_API_KEY` to `.env.local` and restart server

### "Failed to analyze ticket"

**Possible causes:**
1. Invalid API key
2. OpenAI API rate limit exceeded
3. Network connectivity issues
4. Ticket missing required data (subject/description)

**Check server logs** for detailed error messages

### No contractors found

**Internal search:**
- Add contractors to your database via `/contractors` page
- Ensure contractors have matching categories

**External search:**
- Verify `GOOGLE_PLACES_API_KEY` is set
- Check if location/postal code is available on ticket's unit

### Message generation fails

**Possible causes:**
1. Contractor data incomplete
2. Ticket missing unit/tenant information
3. OpenAI API timeout (retry)

## Best Practices

1. **Add internal contractors first**
   - Saves on Google Places API costs
   - AI will use them automatically

2. **Review generated messages**
   - Messages are drafts, always editable
   - Add personal touches or specific details

3. **Monitor API costs**
   - Check OpenAI usage dashboard monthly
   - GPT-4o-mini is cost-effective for this use case

4. **Ticket quality matters**
   - More detailed ticket descriptions = better AI analysis
   - Include tenant messages for context

## Future Enhancements

- [ ] Claude 3.5 Sonnet option (better instruction following)
- [ ] Multi-language support
- [ ] Contractor performance tracking
- [ ] Automated follow-up suggestions
- [ ] Voice call analysis integration
