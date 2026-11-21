"""Run `scripts/tested.mjs` against a hub of released service images.

    uv run --with konstruktor scripts/tested_hub.py

The release job's test: the hub is konstruktor's, and gone when this ends.
"""

import os
import subprocess
import sys

import konstruktor

#: The services the app has documents for and konstruktor can run.
SERVICES = [
    "alpaka", "bank", "dokuments", "elektro", "fluss", "kabinet", "kraph",
    "kuvert", "lokate", "lovekit", "mikro", "rekuest",
]  # fmt: skip
TAG = os.environ.get("SERVICE_TAG", "latest")

with konstruktor.testing_hub(service_images=[f"jhnnsrs/{name}:{TAG}" for name in SERVICES]) as hub:
    hub.up()
    hub.wait_ready()
    targets = [f"{name}={service.url.rstrip('/')}" for name, service in hub.services.items()]
    sys.exit(subprocess.run(["node", "scripts/tested.mjs", *targets], check=False).returncode)
