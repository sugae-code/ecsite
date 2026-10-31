#!/usr/bin/env python3
"""Capture REAL HTML5 gameplay on localhost and make CrazyGames preview videos.
No synthetic gameplay or third-party/copyrighted media.
"""
import asyncio
import contextlib
import functools
import math
import imageio_ffmpeg
import subprocess
import tempfile
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from PIL import Image
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts"
FPS = 10
DURATION = 18
FRAMES = FPS * DURATION

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

def make_server():
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server

async def capture():
    ART.mkdir(parents=True, exist_ok=True)
    server = make_server()
    try:
        with tempfile.TemporaryDirectory() as temp:
            tmp = Path(temp)
            async with async_playwright() as playwright:
                browser = await playwright.chromium.launch(
                    headless=True,
                    args=["--no-sandbox","--disable-dev-shm-usage"]
                )
                try:
                    page = await browser.new_page(
                        viewport={"width":1920, "height":1080},
                        device_scale_factor=1
                    )
                    await page.goto(
                        f"http://127.0.0.1:{server.server_port}/games/mote-and-maw/index.html",
                        wait_until="networkidle",
                        timeout=30000
                    )
                    await page.wait_for_function(
                        "window.moteMawQA && window.moteMawQA.status === 'playing'",
                        timeout=20000
                    )
                    await page.mouse.move(970,540)
                    import time
                    start=time.monotonic()
                    for i in range(FRAMES):
                        angle=i*0.075
                        # Move within the real canvas rather than simulating or editing score.
                        x=int(960+380*math.cos(angle))
                        y=int(530+260*math.sin(angle*.82))
                        await page.mouse.move(x,y)
                        if i and i%44==0:
                            await page.keyboard.press("Space")
                        status=await page.evaluate("window.moteMawQA.status")
                        if status!="playing":
                            await page.locator("#restart").click()
                        await page.screenshot(path=str(tmp/f"frame{i:04d}.png"))
                        scheduled=start+(i+1)/FPS
                        remaining=scheduled-time.monotonic()
                        if remaining>0:
                            await asyncio.sleep(remaining)
                    game_status=await page.evaluate(
                        "({score:window.moteMawQA.score,time:window.moteMawQA.time})"
                    )
                    print("Captured original gameplay", game_status)
                finally:
                    await browser.close()
            # Crop central gameplay region at a true 2:3 aspect ratio, not a stretched/letterboxed picture.
            portrait = tmp/"portrait"
            portrait.mkdir()
            from PIL import Image
            for i in range(FRAMES):
                with Image.open(tmp/f"frame{i:04d}.png") as im:
                    crop=im.crop((600,0,1320,1080)).resize((1080,1620), Image.Resampling.LANCZOS)
                    crop.convert("RGB").save(portrait/f"frame{i:04d}.jpg",quality=88,optimize=True)
            commands=[
                (str(tmp/"frame%04d.png"), ART/"preview-landscape.mp4", "1920:1080"),
                (str(portrait/"frame%04d.jpg"), ART/"preview-portrait.mp4", "1080:1620")
            ]
            for source,output,dimensions in commands:
                cmd=[imageio_ffmpeg.get_ffmpeg_exe(),"-hide_banner","-loglevel","error","-y",
                    "-framerate",str(FPS),"-i",source,
                    "-vf",f"scale={dimensions}",
                    "-an","-c:v","libx264","-pix_fmt","yuv420p",
                    "-preset","veryfast","-crf","24","-movflags","+faststart",
                    str(output)]
                subprocess.run(cmd,check=True)
                if output.stat().st_size >= 50_000_000:
                    raise RuntimeError(f"Preview video exceeds portal 50MB cap: {output}")
                print(output.name,output.stat().st_size,"bytes")
    finally:
        server.shutdown()
        server.server_close()

if __name__ == "__main__":
    asyncio.run(capture())
