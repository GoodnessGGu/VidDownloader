from __future__ import annotations

from pathlib import Path
from typing import Any, Callable, List, Optional, Tuple

from yt_dlp import YoutubeDL

DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent / "downloads"


def format_speed(speed: float | None) -> str:
    if speed is None or speed <= 0:
        return ""
    if speed >= 1024 * 1024:
        return f"{speed / (1024 * 1024):.1f} MB/s"
    if speed >= 1024:
        return f"{speed / 1024:.1f} KB/s"
    return f"{int(speed)} B/s"


def format_duration(duration: Any) -> str:
    if duration in (None, "", "Unknown"):
        return "Unknown"
    try:
        seconds = int(float(duration))
    except (TypeError, ValueError):
        return str(duration)

    hours, remainder = divmod(seconds, 3600)
    minutes, secs = divmod(remainder, 60)
    if hours:
        return f"{hours}h {minutes}m {secs}s"
    if minutes:
        return f"{minutes}m {secs}s"
    return f"{secs}s"


def get_download_attempts(format_choice: str = "video", quality: str = "best", audio_format: str = "m4a") -> list[tuple[str, dict[str, Any]]]:
    """Create a list of yt-dlp download attempts from highest to lowest quality."""
    attempts: list[tuple[str, dict[str, Any]]] = []
    if format_choice == "audio":
        attempts.append(("best", build_download_options(format_choice="audio", quality=quality, audio_format=audio_format)))
        return attempts

    quality_order = ["best", "1080p", "720p", "480p", "360p"]
    if quality in quality_order:
        quality_order.remove(quality)
        quality_order.insert(0, quality)

    for label in quality_order:
        attempts.append((label, build_download_options(format_choice="video", quality=label, audio_format=audio_format)))
    return attempts


def format_download_error_message(exc: Exception) -> str:
    """Translate upstream yt-dlp failures into a clearer user-facing explanation."""
    text = str(exc).lower()
    if "503" in text or "service unavailable" in text:
        return (
            "The download failed because YouTube's server returned a temporary service error. "
            "This is usually a temporary network or CDN issue. Try again later, switch networks, "
            "or use a lower quality setting."
        )
    if "timed out" in text or "read timed out" in text or "timeout" in text:
        return (
            "The connection to the video stream timed out. This often means your internet connection "
            "or the YouTube CDN is unstable. Please try again on a stronger connection or later."
        )
    return f"Download failed: {exc}"


def normalize_url(url: str) -> str:
    """Trim whitespace and validate that a URL was provided."""
    cleaned = (url or "").strip()
    if not cleaned:
        raise ValueError("Please enter a video URL before downloading.")
    return cleaned


def resolve_output_dir(output_path: str | Path | None) -> Path:
    """Create the output directory if needed and return it as an absolute path."""
    target = Path(output_path or DEFAULT_OUTPUT_DIR).expanduser()
    if not target.is_absolute():
        target = (Path.cwd() / target).resolve()
    target.mkdir(parents=True, exist_ok=True)
    return target.resolve()


def build_download_options(
    format_choice: str = "video",
    quality: str = "best",
    audio_format: str = "m4a",
    fallback: bool = False,
) -> dict[str, Any]:
    """Create yt-dlp options from the UI choices."""
    quality_map = {"best": None, "360p": 360, "480p": 480, "720p": 720, "1080p": 1080}
    resolved_quality = quality_map.get(quality, None)

    if format_choice == "audio":
        options = {
            "format": "bestaudio/best",
            "postprocessors": [],
            "merge_output_format": None,
            "retries": 10,
            "fragment_retries": 10,
            "skip_unavailable_fragments": True,
        }
        if audio_format == "mp3":
            options["postprocessors"] = [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "0",
            }]
        return options

    if fallback:
        video_format = "best[ext=mp4]/best"
        return {
            "format": video_format,
            "merge_output_format": "mp4",
            "postprocessors": [],
            "retries": 10,
            "fragment_retries": 10,
            "skip_unavailable_fragments": True,
            "concurrent_fragment_downloads": 1,
        }

    if resolved_quality is None:
        video_format = "bestvideo+bestaudio[ext=m4a]/best"
    else:
        video_format = (
            f"bestvideo[height<={resolved_quality}]+bestaudio[ext=m4a]/"
            f"bestvideo[height<={resolved_quality}]+bestaudio/best"
        )

    return {
        "format": video_format,
        "merge_output_format": "mp4",
        "postprocessors": [],
        "retries": 10,
        "fragment_retries": 10,
        "skip_unavailable_fragments": True,
        "socket_timeout": 30,
        "http_headers": {
            "User-Agent": "Mozilla/5.0"
        },
    }


def parse_multiple_urls(input_text: str) -> list[str]:
    """Parse single or multi-line/comma-separated input into a list of cleaned URLs."""
    if not input_text:
        return []
    raw_tokens = input_text.replace(",", "\n").splitlines()
    urls: list[str] = []
    seen = set()
    for token in raw_tokens:
        sub_tokens = token.strip().split()
        for item in sub_tokens:
            cleaned = item.strip()
            if cleaned and cleaned not in seen:
                seen.add(cleaned)
                urls.append(cleaned)
    return urls


def extract_metadata(url: str) -> dict[str, Any]:
    """Extract lightweight metadata for the app preview."""
    normalized_url = normalize_url(url)
    opts = {
        "quiet": True,
        "skip_download": True,
        "noplaylist": True,
        "no_warnings": True,
    }
    with YoutubeDL(opts) as ydl:
        info = ydl.extract_info(normalized_url, download=False)

    return {
        "title": info.get("title") if isinstance(info, dict) else None,
        "uploader": info.get("uploader") if isinstance(info, dict) else None,
        "duration": info.get("duration") if isinstance(info, dict) else None,
        "view_count": info.get("view_count") if isinstance(info, dict) else None,
        "thumbnail": info.get("thumbnail") if isinstance(info, dict) else None,
        "url": normalized_url,
    }


def download_video(
    url: str,
    output_path: str | Path | None = None,
    format_choice: str = "video",
    quality: str = "best",
    audio_format: str = "m4a",
    progress_hook: Optional[Callable[[dict[str, Any]], None]] = None,
) -> Tuple[Path, List[Path], dict[str, Any]]:
    """Download a video and return the output directory, created files, and metadata."""
    normalized_url = normalize_url(url)
    output_dir = resolve_output_dir(output_path)
    existing_files = {
        path.resolve()
        for path in output_dir.rglob("*")
        if path.is_file()
    }
    metadata = extract_metadata(normalized_url)

    attempts = get_download_attempts(format_choice=format_choice, quality=quality, audio_format=audio_format)
    last_error: Exception | None = None

    for attempt_label, attempt_options in attempts:
        ydl_opts = {
            "outtmpl": str(output_dir / "%(title)s.%(ext)s"),
            "noplaylist": True,
            "no_warnings": True,
            "quiet": False,
        }
        ydl_opts.update(attempt_options)

        if progress_hook is not None:
            ydl_opts["progress_hooks"] = [progress_hook]

        try:
            with YoutubeDL(ydl_opts) as ydl:
                ydl.download([normalized_url])
            return output_dir, sorted([
                path.resolve()
                for path in output_dir.rglob("*")
                if path.is_file() and path.resolve() not in existing_files
            ]), metadata
        except Exception as exc:
            last_error = exc
            if attempt_label == attempts[-1][0]:
                break

    raise RuntimeError(format_download_error_message(last_error)) from last_error


def download_batch_videos(
    urls: list[str] | str,
    output_path: str | Path | None = None,
    format_choice: str = "video",
    quality: str = "best",
    audio_format: str = "m4a",
    progress_hook: Optional[Callable[[int, int, str, Optional[dict[str, Any]]], None]] = None,
) -> dict[str, Any]:
    """Download multiple videos in batch, returning detailed results per URL."""
    if isinstance(urls, str):
        url_list = parse_multiple_urls(urls)
    else:
        url_list = [normalize_url(u) for u in urls if u and u.strip()]

    if not url_list:
        raise ValueError("Please enter at least one valid video URL before downloading.")

    output_dir = resolve_output_dir(output_path)
    successful: list[dict[str, Any]] = []
    failed: list[dict[str, Any]] = []
    all_created_files: list[Path] = []

    total_count = len(url_list)

    for idx, target_url in enumerate(url_list, start=1):
        def single_progress_hook(d: dict[str, Any]) -> None:
            if progress_hook:
                progress_hook(idx, total_count, target_url, d)

        if progress_hook:
            progress_hook(idx, total_count, target_url, None)

        try:
            out_dir, files, meta = download_video(
                url=target_url,
                output_path=output_dir,
                format_choice=format_choice,
                quality=quality,
                audio_format=audio_format,
                progress_hook=single_progress_hook,
            )
            successful.append({
                "url": target_url,
                "output_dir": out_dir,
                "created_files": files,
                "metadata": meta,
            })
            all_created_files.extend(files)
        except Exception as exc:
            failed.append({
                "url": target_url,
                "error": str(exc),
            })

    return {
        "output_dir": output_dir,
        "successful": successful,
        "failed": failed,
        "all_created_files": sorted(list(set(all_created_files))),
        "total": total_count,
    }

