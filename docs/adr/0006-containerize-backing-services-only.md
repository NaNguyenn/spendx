# Containers hold backing services, not the apps

The root `compose.yaml` runs the things the apps talk to — Postgres today, object storage and a mail catcher when Attachments and email flows land. The NestJS API and the Expo app run directly on the host, from `make dev` and `make mobile`.

Running Nest in a container during development would buy insulation from host Node drift and cost a file-watching layer through a bind mount, extra port plumbing to attach a debugger, and a rebuild on every dependency change. With one developer on one machine, that is a daily tax against a problem this project does not have. The Expo app cannot be containerized meaningfully at all: it serves a bundle to an emulator or a phone on the host's network.

Compose is driven by `podman compose` on the development machine — rootless podman is what runs here; the Docker CLI is installed but has no daemon. `podman compose` delegates to the compose plugin and talks to the podman API socket, so `systemctl --user enable --now podman.socket` is a one-time prerequisite (`make up` checks for it and prints that command when it is missing). Nothing in the file is podman-specific: `docker compose up` on another machine works from the same `compose.yaml`.

There is deliberately no backend `Dockerfile` yet. The packaging decisions that matter — base image, how migrations run on boot, where secrets come from, what the health check is — are dictated by a hosting target that has not been chosen. An image that is never deployed proves only that it builds. Revisit at the first real deploy, together with the Prisma `binaryTargets` note in ADR-0005.
