# Daily Outfit SMS

Automated daily SMS with outfit recommendations based on weather and wardrobe.

## Architecture

```
GitHub Actions (7am Sydney) → Python Script → SMS via Twilio
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
              Open-Meteo      Google Sheets    Claude API
              (weather)       (wardrobe)       (recommendation)
```

## Setup Steps

### 1. Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Navigate to API Keys → Create Key
3. Add to GitHub repo secrets as `ANTHROPIC_API_KEY`

### 2. Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable the Google Sheets API
4. Go to IAM & Admin → Service Accounts → Create Service Account
5. Download the JSON key
6. Share your Wardrobe spreadsheet with the service account email (e.g., `something@project.iam.gserviceaccount.com`)
7. Add the entire JSON content as `GOOGLE_SERVICE_ACCOUNT` secret in GitHub

### 3. Twilio

1. Sign up at [twilio.com](https://twilio.com) (free trial includes ~$15 credit)
2. Buy a phone number (~$1/month)
3. From the Twilio dashboard, add these GitHub secrets:
   - `TWILIO_ACCOUNT_SID` - Account SID from dashboard
   - `TWILIO_AUTH_TOKEN` - Auth Token from dashboard
   - `TWILIO_FROM_NUMBER` - Your Twilio phone number (e.g., `+1234567890`)
   - `MY_PHONE_NUMBER` - Your personal mobile with country code (e.g., `+61412345678`)

### 4. Add GitHub Secrets

Go to your repo → Settings → Secrets and variables → Actions → New repository secret

Add all 6 secrets:
- `ANTHROPIC_API_KEY`
- `GOOGLE_SERVICE_ACCOUNT`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `MY_PHONE_NUMBER`

## Testing

### Manual Trigger

1. Go to Actions tab in GitHub
2. Select "Daily Outfit SMS" workflow
3. Click "Run workflow"

### Local Testing

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export ANTHROPIC_API_KEY="your-key"
export GOOGLE_SERVICE_ACCOUNT='{"type": "service_account", ...}'
export TWILIO_ACCOUNT_SID="your-sid"
export TWILIO_AUTH_TOKEN="your-token"
export TWILIO_FROM_NUMBER="+1234567890"
export MY_PHONE_NUMBER="+61412345678"

# Run
python scripts/daily_outfit.py
```

## Maintenance

To change the outfit recommendation logic, edit `.claude/skills/what-to-wear.md`. The script reads this file at runtime, so no code changes needed.

## Costs

- **Claude API**: ~$0.01-0.05 per day (Sonnet)
- **Twilio SMS**: ~$0.01 per message + ~$1/month for phone number
- **GitHub Actions**: Free (within free tier limits)

Estimated total: **~$4-5/month**
