import os
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from downloader import (
    build_download_options,
    download_batch_videos,
    format_download_error_message,
    format_duration,
    format_speed,
    get_download_attempts,
    normalize_url,
    parse_multiple_urls,
    resolve_output_dir,
)


class DownloaderHelpersTests(unittest.TestCase):
    def test_normalize_url_strips_whitespace(self):
        raw = "  https://x.com/example/status/123/video/1  "
        self.assertEqual(normalize_url(raw), "https://x.com/example/status/123/video/1")

    def test_normalize_url_keeps_valid_url(self):
        raw = "https://example.com/video"
        self.assertEqual(normalize_url(raw), raw)

    def test_resolve_output_dir_creates_directory(self):
        target = Path("downloads/tests-output")
        if target.exists():
            for child in target.iterdir():
                if child.is_file():
                    child.unlink()
            target.rmdir()

        result = resolve_output_dir(target)
        self.assertTrue(result.exists())
        self.assertEqual(result, target.resolve())

    def test_build_download_options_for_mp3(self):
        options = build_download_options(format_choice="audio", quality="best", audio_format="mp3")
        self.assertIn("bestaudio/best", options["format"])
        self.assertEqual(options["postprocessors"][0]["preferredcodec"], "mp3")

    def test_normalize_url_raises_for_empty_string(self):
        with self.assertRaises(ValueError) as context:
            normalize_url("   ")
        self.assertIn("Please enter a video URL", str(context.exception))

    def test_build_download_options_for_video_quality(self):
        options = build_download_options(format_choice="video", quality="720p")
        self.assertIn("bestvideo[height<=720]", options["format"])
        self.assertEqual(options["merge_output_format"], "mp4")

    def test_build_download_options_for_360p_quality(self):
        options = build_download_options(format_choice="video", quality="360p")
        self.assertIn("bestvideo[height<=360]", options["format"])

    def test_build_download_options_enables_retry_settings(self):
        options = build_download_options(format_choice="video", quality="best")
        self.assertEqual(options["retries"], 10)
        self.assertEqual(options["fragment_retries"], 10)
        self.assertTrue(options["skip_unavailable_fragments"])

    def test_build_download_options_fallback_uses_reliable_format(self):
        options = build_download_options(format_choice="video", quality="best", fallback=True)
        self.assertEqual(options["format"], "best[ext=mp4]/best")
        self.assertEqual(options["concurrent_fragment_downloads"], 1)

    def test_get_download_attempts_steps_down_quality(self):
        attempts = get_download_attempts(format_choice="video", quality="best", audio_format="m4a")
        labels = [label for label, _ in attempts]
        self.assertEqual(labels[0], "best")
        self.assertIn("480p", labels)
        self.assertIn("360p", labels)

    def test_format_download_error_message_for_network_issue(self):
        message = format_download_error_message(RuntimeError("HTTP Error 503: Service Unavailable"))
        self.assertIn("temporary network or CDN issue", message)
        self.assertIn("Try again later", message)

    def test_format_speed_formats_common_units(self):
        self.assertEqual(format_speed(None), "")
        self.assertEqual(format_speed(0), "")
        self.assertEqual(format_speed(512), "512 B/s")
        self.assertEqual(format_speed(2048), "2.0 KB/s")
        self.assertEqual(format_speed(3 * 1024 * 1024), "3.0 MB/s")

    def test_format_duration_formats_seconds(self):
        self.assertEqual(format_duration(None), "Unknown")
        self.assertEqual(format_duration(45), "45s")
        self.assertEqual(format_duration(125), "2m 5s")
        self.assertEqual(format_duration(7265), "2h 1m 5s")

    def test_parse_multiple_urls_multiline_and_commas(self):
        input_text = "https://x.com/v1, https://x.com/v2\n  https://x.com/v3   https://x.com/v1"
        urls = parse_multiple_urls(input_text)
        self.assertEqual(urls, ["https://x.com/v1", "https://x.com/v2", "https://x.com/v3"])

    def test_download_batch_videos_validates_urls(self):
        with self.assertRaises(ValueError) as context:
            download_batch_videos("   , \n  ")
        self.assertIn("Please enter at least one valid video URL", str(context.exception))


if __name__ == "__main__":
    unittest.main()

