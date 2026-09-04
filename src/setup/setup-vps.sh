#!/usr/bin/env bash

set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-simploy}"
SIMPLOY_CADDY_CONFIG_PATH="${SIMPLOY_CADDY_CONFIG_PATH:-}"

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

if [ -n "${SIMPLOY_CADDY_CONFIG_PATH}" ]; then
  case "${SIMPLOY_CADDY_CONFIG_PATH}" in
    /*) ;;
    *) fail "SIMPLOY_CADDY_CONFIG_PATH must be an absolute path when configured." ;;
  esac
  if [[ "${SIMPLOY_CADDY_CONFIG_PATH}" =~ [[:space:]] ]]; then
    fail "SIMPLOY_CADDY_CONFIG_PATH must not contain whitespace."
  fi
  printf '%s\n' \
    "${DEPLOY_USER} ALL=(root) NOPASSWD: /usr/bin/install -D -m 0644 * ${SIMPLOY_CADDY_CONFIG_PATH}, /usr/bin/env DOMAIN=* APP_PORT=* /usr/bin/caddy validate --config ${SIMPLOY_CADDY_CONFIG_PATH} --adapter caddyfile, /usr/bin/env DOMAIN=* APP_PORT=* /usr/bin/caddy reload --config ${SIMPLOY_CADDY_CONFIG_PATH} --adapter caddyfile" \
    > /etc/sudoers.d/simploy-caddy
  chmod 0440 /etc/sudoers.d/simploy-caddy
  visudo -cf /etc/sudoers.d/simploy-caddy >/dev/null
fi

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
if [ -z "${SIMPLOY_CADDY_CONFIG_PATH}" ]; then
  printf '%s\n' "Set SIMPLOY_CADDY_CONFIG_PATH when running setup to install the narrowly scoped non-interactive Caddy sudo permission required by CI."
fi
