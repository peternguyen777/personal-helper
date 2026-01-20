#!/usr/bin/env python3
"""
Daily outfit recommendation script.
Fetches weather, reads wardrobe from Google Sheets, gets Claude's recommendation,
and sends it via SMS.
"""

import json
import os
from datetime import datetime
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


def fetch_wardrobe() -> list[dict]:
    """Fetch wardrobe items from Google Sheets."""
    # Load service account credentials from environment
    service_account_info = json.loads(os.environ["GOOGLE_SERVICE_ACCOUNT"])

    credentials = Credentials.from_service_account_info(
        service_account_info,
        scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"]
    )

    client = gspread.authorize(credentials)
    sheet = client.open_by_key(WARDROBE_SPREADSHEET_ID).sheet1

    # Get all records (assumes first row is headers)
    records = sheet.get_all_records()
    return records


def load_skill() -> str:
    """Load the what-to-wear skill file."""
    return SKILL_PATH.read_text()


def get_outfit_recommendation(weather: dict, wardrobe: list[dict], skill: str) -> str:
    """Get outfit recommendation from Claude."""
    client = anthropic.Anthropic()

    # Format wardrobe for the prompt
    wardrobe_text = "\n".join(
        f"- {item['Item']} ({item['Category']}, {item.get('Pillar', 'N/A')}): {item.get('Description', 'N/A')}"
        for item in wardrobe
    )

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

Give me today's outfit recommendation. Keep under 400 characters for SMS. Use line breaks for readability.

IMPORTANT: Use the exact date from the weather data above (Date: {weather['date_formatted']}).

Format (use actual line breaks):
Good morning Peter, it is {weather['date_formatted']} in Sydney.
The weather today is [temp]°C, [humidity]% humidity, [conditions].

[Brief explanation of outfit choice based on weather + styling tip]

Top: [item]
Bottom: [item]
Shoes: [item]
Accessory: [item if appropriate]

REQUIRED: Always include Top, Bottom, and Shoes with their labels.

LAYERING OPTION: In mild weather (20-24°C), you can recommend a white tee as an underlayer with an unbuttoned shirt. Format as "Top: [tee] + [shirt] (unbuttoned)"

Example 1:
Good morning Peter, it is Tuesday 20 Jan in Sydney.
The weather today is 25°C, 72% humidity, partly cloudy.

Warm and humid - going lightweight and breathable. Roll the chambray sleeves and keep it untucked for a relaxed ivy-workwear look.

Top: Chambray
Bottom: Olive Fatigues
Shoes: Paraboot Michael
Accessory: Tochigi belt

Example 2 (layered):
Good morning Peter, it is Wednesday 21 Jan in Sydney.
The weather today is 22°C, 65% humidity, overcast.

Perfect layering weather - white tee under open chambray adds depth without overheating. Classic ametora combo.

Top: Whitesville Tee + Sugar Cane Chambray (unbuttoned)
Bottom: Burgus Plus Fatigue Pants (Navy)
Shoes: Paraboot Michael (Brown)
Accessory: Warehouse Slim Belt (Black)

Use actual item names from my wardrobe. Plain text only, no markdown."""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}]
    )

    response = message.content[0].text
    # Cap at 480 chars (3 SMS segments) to fit full recommendation with line breaks
    max_len = 480
    if len(response) > max_len:
        response = response[:max_len - 3] + "..."
    return response


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
    print(f"Weather: {weather['temperature_c']}°C, {weather['conditions']}")
    print(f"Weather date_formatted: {weather['date_formatted']}")

    print("Fetching wardrobe...")
    wardrobe = fetch_wardrobe()
    print(f"Found {len(wardrobe)} items")

    print("Loading skill...")
    skill = load_skill()

    print("Getting recommendation from Claude...")
    recommendation = get_outfit_recommendation(weather, wardrobe, skill)
    print(f"Recommendation ({len(recommendation)} chars): {recommendation}")

    print("Sending SMS...")
    send_sms(recommendation)
    print("Done!")


if __name__ == "__main__":
    main()
