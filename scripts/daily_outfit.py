#!/usr/bin/env python3
"""
Daily outfit recommendation script.
Fetches weather, reads wardrobe from Google Sheets, gets Claude's recommendation,
and sends it via SMS.
"""

import json
import os
import re
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import anthropic
import gspread
import requests
from google.oauth2.service_account import Credentials
from twilio.rest import Client as TwilioClient


# Constants
SYDNEY_LAT = -33.8688
SYDNEY_LON = 151.2093
WARDROBE_SPREADSHEET_ID = "1Cx2KUswPEQypVMUPUTPtLOFQ3oGdme1TcFf7z5BZ_7k"
SKILL_PATH = Path(__file__).parent.parent / ".claude" / "skills" / "what-to-wear.md"


def fetch_weather() -> dict:
    """Fetch current weather and forecast for Sydney from Open-Meteo."""
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": SYDNEY_LAT,
        "longitude": SYDNEY_LON,
        "current": ["temperature_2m", "relative_humidity_2m", "apparent_temperature",
                    "precipitation_probability", "weather_code", "wind_speed_10m"],
        "daily": ["temperature_2m_max", "temperature_2m_min", "precipitation_probability_max",
                  "uv_index_max"],
        "timezone": "Australia/Sydney",
        "forecast_days": 1
    }

    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()

    current = data["current"]
    daily = data["daily"]

    # Map weather codes to conditions
    weather_codes = {
        0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
        45: "Foggy", 48: "Depositing rime fog",
        51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
        61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
        71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
        80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
        95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail"
    }

    return {
        "temperature_c": current["temperature_2m"],
        "feels_like_c": current["apparent_temperature"],
        "humidity_percent": current["relative_humidity_2m"],
        "wind_speed_kmh": current["wind_speed_10m"],
        "rain_chance_percent": current["precipitation_probability"],
        "conditions": weather_codes.get(current["weather_code"], "Unknown"),
        "high_c": daily["temperature_2m_max"][0],
        "low_c": daily["temperature_2m_min"][0],
        "daily_rain_chance_percent": daily["precipitation_probability_max"][0],
        "uv_index": daily["uv_index_max"][0],
        "local_time": datetime.now(ZoneInfo("Australia/Sydney")).strftime("%I:%M %p"),
        "date_formatted": datetime.now(ZoneInfo("Australia/Sydney")).strftime("%A %-d %b")
    }


def get_sheets_client():
    """Get authenticated Google Sheets client with read/write access."""
    service_account_info = json.loads(os.environ["GOOGLE_SERVICE_ACCOUNT"])
    credentials = Credentials.from_service_account_info(
        service_account_info,
        scopes=["https://www.googleapis.com/auth/spreadsheets"]
    )
    return gspread.authorize(credentials)


def fetch_wardrobe() -> list[dict]:
    """Fetch wardrobe items from Google Sheets."""
    client = get_sheets_client()
    sheet = client.open_by_key(WARDROBE_SPREADSHEET_ID).sheet1

    # Get all records (assumes first row is headers)
    records = sheet.get_all_records()
    return records


def fetch_outfit_history(days: int = 7) -> list[dict]:
    """Fetch outfit history from the last N days from Google Sheets."""
    client = get_sheets_client()
    spreadsheet = client.open_by_key(WARDROBE_SPREADSHEET_ID)

    # Try to get the History sheet, create if it doesn't exist
    try:
        history_sheet = spreadsheet.worksheet("History")
    except gspread.WorksheetNotFound:
        history_sheet = spreadsheet.add_worksheet(title="History", rows=100, cols=6)
        history_sheet.update("A1:F1", [["Date", "Top", "Bottom", "Shoes", "Outer", "Accessory"]])
        return []

    records = history_sheet.get_all_records()
    if not records:
        return []

    # Filter to only entries from the last N days
    cutoff_date = datetime.now(ZoneInfo("Australia/Sydney")) - timedelta(days=days)
    recent_history = []

    for record in records:
        try:
            record_date = datetime.strptime(record["Date"], "%Y-%m-%d")
            record_date = record_date.replace(tzinfo=ZoneInfo("Australia/Sydney"))
            if record_date >= cutoff_date:
                recent_history.append(record)
        except (ValueError, KeyError):
            continue

    return recent_history


def save_outfit_to_history(outfit: dict) -> None:
    """Save today's outfit to the History sheet."""
    client = get_sheets_client()
    spreadsheet = client.open_by_key(WARDROBE_SPREADSHEET_ID)

    try:
        history_sheet = spreadsheet.worksheet("History")
    except gspread.WorksheetNotFound:
        history_sheet = spreadsheet.add_worksheet(title="History", rows=100, cols=6)
        history_sheet.update("A1:F1", [["Date", "Top", "Bottom", "Shoes", "Outer", "Accessory"]])

    today = datetime.now(ZoneInfo("Australia/Sydney")).strftime("%Y-%m-%d")
    row = [
        today,
        outfit.get("top", ""),
        outfit.get("bottom", ""),
        outfit.get("shoes", ""),
        outfit.get("outer", ""),
        outfit.get("accessory", "")
    ]
    history_sheet.append_row(row)


def load_skill() -> str:
    """Load the what-to-wear skill file."""
    return SKILL_PATH.read_text()


def get_outfit_recommendation(weather: dict, wardrobe: list[dict], skill: str, history: list[dict]) -> str:
    """Get outfit recommendation from Claude."""
    client = anthropic.Anthropic()

    # Format wardrobe for the prompt
    wardrobe_text = "\n".join(
        f"- {item['Item']} ({item['Category']}, {item.get('Pillar', 'N/A')}): {item.get('Description', 'N/A')}"
        for item in wardrobe
    )

    # Format recent outfit history with quantity-aware exclusions
    if history:
        # Count how many times each top was worn
        top_wear_counts: dict[str, int] = {}
        for h in history:
            top = h.get("Top", "")
            if top:
                top_wear_counts[top] = top_wear_counts.get(top, 0) + 1

        # Build quantity lookup from wardrobe
        top_quantities: dict[str, int] = {}
        for item in wardrobe:
            if item.get("Category") == "Top":
                top_quantities[item["Item"]] = int(item.get("Quantity", 1))

        # Only exclude tops that have been worn >= their quantity
        excluded_tops = [
            top for top, count in top_wear_counts.items()
            if count >= top_quantities.get(top, 1)
        ]

        bottoms_worn = [h["Bottom"] for h in history if h.get("Bottom")]
        history_text = f"""
<recent_outfits>
RULES:
- DO NOT recommend these tops (already worn their max times this week): {', '.join(excluded_tops) if excluded_tops else 'None - all tops available'}
- Try to vary bottoms (recently worn): {', '.join(set(bottoms_worn)) if bottoms_worn else 'None'}

Full history (last 7 days):
""" + "\n".join(f"- {h['Date']}: Top={h.get('Top', 'N/A')}, Bottom={h.get('Bottom', 'N/A')}" for h in history) + """
</recent_outfits>"""
    else:
        history_text = ""

    prompt = f"""You are helping me decide what to wear today. Use the skill instructions below for guidance.

<skill>
{skill}
</skill>

<weather>
Location: Sydney
Date: {weather['date_formatted']}
Local time: {weather['local_time']}
Current temperature: {weather['temperature_c']}°C (feels like {weather['feels_like_c']}°C)
Today's high: {weather['high_c']}°C
Conditions: {weather['conditions']}
Humidity: {weather['humidity_percent']}%
Wind: {weather['wind_speed_kmh']} km/h
Rain chance: {weather['rain_chance_percent']}% (current), {weather['daily_rain_chance_percent']}% (today)
UV index: {weather['uv_index']}
</weather>

<wardrobe>
{wardrobe_text}
</wardrobe>
{history_text}
Give me today's outfit recommendation. Keep under 400 characters for SMS. Use line breaks for readability.

IMPORTANT: Use the exact date from the weather data above (Date: {weather['date_formatted']}).

Format (use actual line breaks):
Good morning Peter, it is {weather['date_formatted']} in Sydney.
The weather today is [today's high]°C, [humidity]% humidity, [conditions].

[Brief explanation of outfit choice based on weather + styling tip]

Top: [item]
Bottom: [item]
Shoes: [item]
Accessory: [item if appropriate]

REQUIRED: Always include Top, Bottom, and Shoes with their labels.

LAYERING OPTION: In mild weather (20-24°C), you can recommend a white tee as an underlayer with an unbuttoned shirt. Format as "Top: [tee] + [shirt] (unbuttoned)"

Example 1 (hot/humid day):
Good morning Peter, it is [Day Date] in Sydney.
The weather today is [today's high]°C, [humidity]% humidity, [conditions].

[1-2 sentence explanation of why this outfit works for the weather + a styling tip]

Top: [breathable shirt from wardrobe]
Bottom: [lightweight pants from wardrobe]
Shoes: [appropriate footwear]
Accessory: [optional - belt or other if appropriate]

Example 2 (mild layering weather):
Good morning Peter, it is [Day Date] in Sydney.
The weather today is [today's high]°C, [humidity]% humidity, [conditions].

[1-2 sentence explanation of layering choice + styling tip]

Top: [tee] + [shirt] (unbuttoned)
Bottom: [pants from wardrobe]
Shoes: [appropriate footwear]
Accessory: [optional - belt from wardrobe]

Example 3 (cooler weather):
Good morning Peter, it is [Day Date] in Sydney.
The weather today is [today's high]°C, [humidity]% humidity, [conditions].

[1-2 sentence explanation of layering choice + styling tip]

Top: [shirt from wardrobe]
Bottom: [pants from wardrobe]
Shoes: [appropriate footwear]
Outer: [outer layer from wardrobe]
Accessory: [optional - belt from wardrobe]

CRITICAL: You MUST NOT recommend any top that appears in the "DO NOT recommend" list above. Pick a different top from the wardrobe.

Use actual item names from my wardrobe. Plain text only, no markdown."""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=200,
        temperature=1.0,
        messages=[{"role": "user", "content": prompt}]
    )

    response = message.content[0].text
    # Cap at 480 chars (3 SMS segments) to fit full recommendation with line breaks
    max_len = 480
    if len(response) > max_len:
        response = response[:max_len - 3] + "..."
    return response


def parse_outfit_from_recommendation(recommendation: str) -> dict:
    """Parse the outfit items from the recommendation text."""
    outfit = {}

    # Match patterns like "Top: Item name" or "Top: Item1 + Item2 (note)"
    patterns = {
        "top": r"Top:\s*(.+?)(?:\n|$)",
        "bottom": r"Bottom:\s*(.+?)(?:\n|$)",
        "shoes": r"Shoes:\s*(.+?)(?:\n|$)",
        "outer": r"Outer:\s*(.+?)(?:\n|$)",
        "accessory": r"Accessory:\s*(.+?)(?:\n|$)",
    }

    for key, pattern in patterns.items():
        match = re.search(pattern, recommendation, re.IGNORECASE)
        if match:
            outfit[key] = match.group(1).strip()

    return outfit


def send_sms(message: str) -> None:
    """Send SMS via Twilio."""
    client = TwilioClient(
        os.environ["TWILIO_ACCOUNT_SID"],
        os.environ["TWILIO_AUTH_TOKEN"]
    )

    try:
        result = client.messages.create(
            body=message,
            from_=os.environ["TWILIO_FROM_NUMBER"],
            to=os.environ["MY_PHONE_NUMBER"]
        )
        print(f"SMS sent successfully! SID: {result.sid}, Status: {result.status}")
    except Exception as e:
        print(f"SMS failed: {e}")
        raise


def main():
    # Debug: Show timezone calculation
    sydney_now = datetime.now(ZoneInfo("Australia/Sydney"))
    utc_now = datetime.now(ZoneInfo("UTC"))
    print(f"UTC time: {utc_now.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Sydney time: {sydney_now.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Date formatted: {sydney_now.strftime('%A %-d %b')}")

    print("Fetching weather...")
    weather = fetch_weather()
    print(f"Weather API response: {json.dumps(weather, indent=2)}")

    print("Fetching wardrobe...")
    wardrobe = fetch_wardrobe()
    print(f"Wardrobe API response ({len(wardrobe)} items): {json.dumps(wardrobe, indent=2)}")

    print("Fetching outfit history...")
    history = fetch_outfit_history(days=7)
    print(f"Outfit history (last 7 days): {json.dumps(history, indent=2)}")

    print("Loading skill...")
    skill = load_skill()

    print("Getting recommendation from Claude...")
    recommendation = get_outfit_recommendation(weather, wardrobe, skill, history)
    print(f"Recommendation ({len(recommendation)} chars): {recommendation}")

    print("Parsing outfit from recommendation...")
    outfit = parse_outfit_from_recommendation(recommendation)
    print(f"Parsed outfit: {json.dumps(outfit, indent=2)}")

    print("Sending SMS...")
    send_sms(recommendation)

    print("Saving outfit to history...")
    save_outfit_to_history(outfit)

    print("Done!")


if __name__ == "__main__":
    main()
