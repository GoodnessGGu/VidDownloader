# X/Twitter Video Downloader Core Engine

This project provides a robust Python downloader module for X/Twitter videos powered by `yt-dlp`.

## Features
- **Single & Batch Downloads:** Download single or multiple video URLs (separated by newlines or commas) with progress callbacks.
- **Flexible Quality Targets:** Supports `best`, `1080p`, `720p`, `480p`, and `360p` video quality options.
- **Audio Extraction:** Extract audio directly to `M4A` or `MP3` codecs.
- **Metadata Extraction:** Extract video titles, uploaders, durations, and view counts without downloading.
- **Automated Tests:** Comprehensive unit test suite (`pytest`) covering option builders, batch parsing, error translations, and path resolvers.

## Test & Use
- Run test suite: `pytest`
- Use core module in Python:
  ```python
  from downloader import download_video, download_batch_videos

  # Single Download
  download_video("https://x.com/username/status/12345", quality="1080p")

  # Batch Download
  download_batch_videos(["https://x.com/v1", "https://x.com/v2"])
  ```


