#!/usr/bin/env python3
"""Tests for daily_outfit.py"""

from datetime import datetime
from unittest.mock import patch
from zoneinfo import ZoneInfo

import pytest


class TestDateFormatting:
    """Tests for date formatting with Sydney timezone."""

    def test_sydney_timezone_date_format(self):
        """Test that date is formatted correctly for Sydney timezone."""
        sydney_tz = ZoneInfo("Australia/Sydney")
        now_sydney = datetime.now(sydney_tz)

        formatted = now_sydney.strftime("%A %-d %b")

        # Should have day name, day number, and month abbreviation
        parts = formatted.split()
        assert len(parts) == 3
        assert parts[0] in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        assert parts[1].isdigit()
        assert parts[2] in ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    def test_sydney_vs_utc_can_differ(self):
        """Test that Sydney and UTC can have different dates."""
        sydney_tz = ZoneInfo("Australia/Sydney")
        utc_tz = ZoneInfo("UTC")

        # Create a time that's early morning UTC (which could be next day in Sydney)
        # Sydney is UTC+10 or UTC+11 depending on daylight saving
        test_time_utc = datetime(2026, 1, 20, 15, 0, 0, tzinfo=utc_tz)  # 3pm UTC
        test_time_sydney = test_time_utc.astimezone(sydney_tz)

        # At 3pm UTC on Jan 20, it should be Jan 21 ~2am in Sydney (AEDT)
        assert test_time_sydney.day == 21
        assert test_time_sydney.month == 1

    def test_specific_date_formatting(self):
        """Test formatting for a specific known date."""
        sydney_tz = ZoneInfo("Australia/Sydney")

        # January 21, 2026 is a Wednesday
        test_date = datetime(2026, 1, 21, 10, 0, 0, tzinfo=sydney_tz)
        formatted = test_date.strftime("%A %-d %b")

        assert formatted == "Wednesday 21 Jan"

    def test_date_with_single_digit_day(self):
        """Test that single digit days don't have leading zero."""
        sydney_tz = ZoneInfo("Australia/Sydney")

        test_date = datetime(2026, 2, 5, 10, 0, 0, tzinfo=sydney_tz)
        formatted = test_date.strftime("%A %-d %b")

        assert "5 Feb" in formatted
        assert "05" not in formatted


class TestFetchWeather:
    """Tests for weather fetching."""

    def test_fetch_weather_returns_required_fields(self):
        """Test that fetch_weather returns all required fields."""
        # Import here to avoid module-level import issues
        from daily_outfit import fetch_weather

        weather = fetch_weather()

        required_fields = [
            "temperature_c",
            "feels_like_c",
            "humidity_percent",
            "wind_speed_kmh",
            "rain_chance_percent",
            "conditions",
            "high_c",
            "low_c",
            "daily_rain_chance_percent",
            "uv_index",
            "local_time",
            "date_formatted"
        ]

        for field in required_fields:
            assert field in weather, f"Missing field: {field}"

    def test_fetch_weather_date_is_sydney_timezone(self):
        """Test that the date in weather data uses Sydney timezone."""
        from daily_outfit import fetch_weather

        weather = fetch_weather()

        # Get expected Sydney date
        sydney_tz = ZoneInfo("Australia/Sydney")
        expected_date = datetime.now(sydney_tz).strftime("%A %-d %b")

        assert weather["date_formatted"] == expected_date


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
