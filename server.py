from __future__ import annotations

import os
from pathlib import Path
from typing import Any, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from downloader import (
    DEFAULT_OUTPUT_DIR,
    download_batch_videos,
    download_video,
    extract_metadata,
    parse_multiple_urls,
)

app = FastAPI(
    title="Universal Social Video Saver API",
    description="Backend extraction and download service for X/Twitter, TikTok, Instagram, & Reddit videos.",
    version="2.0.0",
)

# Enable CORS for mobile apps & web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ExtractRequest(BaseModel):
    url: str


class DownloadRequest(BaseModel):
    urls: str | List[str]
    quality: Optional[str] = "best"
    format_choice: Optional[str] = "video"
    audio_format: Optional[str] = "m4a"


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "Social Video Saver API", "version": "2.0.0"}


@app.post("/api/extract")
def extract_media_info(payload: ExtractRequest) -> dict[str, Any]:
    """Extract lightweight metadata & stream information for a social media URL."""
    try:
        urls = parse_multiple_urls(payload.url)
        if not urls:
            raise ValueError("No valid URL provided.")
        metadata = extract_metadata(urls[0])
        return {"success": True, "metadata": metadata}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/download")
def download_media(payload: DownloadRequest) -> dict[str, Any]:
    """Download video(s) on server and return file metadata and downloadable file routes."""
    try:
        result = download_batch_videos(
            urls=payload.urls,
            output_path=DEFAULT_OUTPUT_DIR,
            format_choice=payload.format_choice or "video",
            quality=payload.quality or "best",
            audio_format=payload.audio_format or "m4a",
        )
        successful = []
        for item in result.get("successful", []):
            file_info = []
            for filepath in item.get("created_files", []):
                fname = Path(filepath).name
                file_info.append({
                    "filename": fname,
                    "download_url": f"/api/files/{fname}",
                })
            successful.append({
                "url": item["url"],
                "metadata": item["metadata"],
                "files": file_info,
            })
        return {
            "success": True,
            "total": result.get("total", 0),
            "successful": successful,
            "failed": result.get("failed", []),
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/files/{filename}")
def get_downloaded_file(filename: str):
    """Serve downloaded video or audio files directly to mobile clients."""
    filepath = (DEFAULT_OUTPUT_DIR / filename).resolve()
    if not filepath.exists() or not filepath.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path=filepath, filename=filename)


# Mount static directory for mobile web PWA client if web/ exists
web_dir = Path(__file__).parent / "web"
if web_dir.exists():
    app.mount("/", StaticFiles(directory=str(web_dir), html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
