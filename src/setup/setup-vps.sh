#!/usr/bin/env bash

set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-simploy}"

fail() {
  printf 'Simploy VPS setup: %s\n' "$1" >&2
  exit 1
}

if [ "${EUID}" -ne 0 ]; then
  fail "run this script as root (for example, with sudo)."
fi

if [ ! -r /etc/os-release ]; then
  fail "cannot identify the operating system; Debian or Ubuntu is required."
fi

# shellcheck disable=SC1091
. /etc/os-release

case "${ID}" in
  debian|ubuntu) ;;
  *) fail "unsupported operating system '${ID}'; this script supports Debian and Ubuntu only." ;;
esac

if [ -z "${VERSION_CODENAME:-}" ]; then
  fail "cannot identify the distribution codename."
fi

if ! [[ "${DEPLOY_USER}" =~ ^[a-z_][a-z0-9_-]*\$?$ ]]; then
  fail "DEPLOY_USER must be a valid Linux user name."
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  debian-keyring \
  debian-archive-keyring \
  apt-transport-https \
  openssh-server

install -m 0755 -d /etc/apt/keyrings
curl -fsSL "https://download.docker.com/linux/${ID}/gpg" \
  -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
printf '%s\n' \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable" \
  > /etc/apt/sources.list.d/docker.list

curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  > /etc/apt/sources.list.d/caddy-stable.list

apt-get update
apt-get install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin \
  caddy

systemctl enable --now docker
systemctl enable --now caddy
systemctl enable --now ssh

if ! id "${DEPLOY_USER}" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash "${DEPLOY_USER}"
fi
usermod -aG docker "${DEPLOY_USER}"

DEPLOY_HOME=$(getent passwd "${DEPLOY_USER}" | cut -d: -f6)
if [ -z "${DEPLOY_HOME}" ]; then
  fail "cannot determine the home directory for '${DEPLOY_USER}'."
fi
install -d -m 0700 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "${DEPLOY_HOME}/.ssh"

if ! docker network inspect simploy-ingress >/dev/null 2>&1; then
  docker network create simploy-ingress
fi

docker --version
docker compose version
systemctl is-active docker
caddy version
systemctl is-active caddy
id "${DEPLOY_USER}"
docker network inspect simploy-ingress

printf '%s\n' "Simploy VPS setup completed for deployment user '${DEPLOY_USER}'."
printf '%s\n' "Add the CI deployment public key to ${DEPLOY_HOME}/.ssh/authorized_keys if it is not already present."
printf '%s\n' "The deployment user must start a new login session before Docker group membership takes effect."
