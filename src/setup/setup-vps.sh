#!/usr/bin/env bash

set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-vpsd}"
VPSD_DEPLOY_PATH="${VPSD_DEPLOY_PATH:-/home/vpsd/app}"
VPSD_CADDY_CONFIG_PATH="${VPSD_CADDY_CONFIG_PATH:-/etc/caddy/Caddyfile}"

fail() {
  printf 'VPSD VPS setup: %s\n' "$1" >&2
  exit 1
}

package_is_installed() {
  dpkg-query --show --showformat='${db:Status-Status}' "$1" 2>/dev/null | grep -qx installed
}

docker_command_works() {
  command -v docker >/dev/null 2>&1 && docker --version >/dev/null 2>&1
}

docker_compose_works() {
  docker_command_works && docker compose version >/dev/null 2>&1
}

docker_daemon_is_active() {
  systemctl is-active --quiet docker
}

configure_docker_repository() {
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/${ID}/gpg" \
    -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  printf '%s\n' \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
}

install_official_docker() {
  # A leftover Ubuntu Compose package conflicts with Docker's official plugin.
  # It is safe to remove here because no functional Docker command exists.
  if package_is_installed docker-compose-v2; then
    apt-get remove -y docker-compose-v2
  fi

  configure_docker_repository
  apt-get update
  apt-get install -y \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin
}

ensure_docker() {
  if ! docker_command_works; then
    if package_is_installed docker.io; then
      # Restore the distribution package rather than replacing an existing
      # installation merely because its command is currently unavailable.
      apt-get install -y --reinstall docker.io
    else
      install_official_docker
    fi
  fi

  systemctl enable --now docker

  if ! docker_daemon_is_active; then
    fail "Docker did not become active."
  fi
}

ensure_docker_compose() {
  if docker_compose_works; then
    return
  fi

  if package_is_installed docker.io; then
    # Ubuntu's docker-compose-v2 is the matching Compose implementation for
    # docker.io. Do not add Docker's conflicting compose plugin.
    apt-get install -y docker-compose-v2
  else
    configure_docker_repository
    apt-get update
    apt-get install -y docker-compose-plugin
  fi

  if ! docker_compose_works; then
    fail "Docker Compose v2 is not functional after installation."
  fi
}

configure_caddy_repository() {
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    > /etc/apt/sources.list.d/caddy-stable.list
}

ensure_caddy() {
  if ! command -v caddy >/dev/null 2>&1; then
    configure_caddy_repository
    apt-get update
    apt-get install -y caddy
  fi
  systemctl enable --now caddy
}

if [ "$#" -ne 0 ]; then
  fail "this script does not accept positional arguments."
fi

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

ensure_docker
ensure_docker_compose
ensure_caddy
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

case "${VPSD_CADDY_CONFIG_PATH}" in
  /*) ;;
  *) fail "VPSD_CADDY_CONFIG_PATH must be an absolute path." ;;
esac
if [[ "${VPSD_CADDY_CONFIG_PATH}" =~ [[:space:]] ]]; then
  fail "VPSD_CADDY_CONFIG_PATH must not contain whitespace."
fi
printf '%s\n' \
  "${DEPLOY_USER} ALL=(root) NOPASSWD: /usr/bin/install -D -m 0644 * ${VPSD_CADDY_CONFIG_PATH}, /usr/bin/env DOMAIN=* APP_PORT=* /usr/bin/caddy validate --config ${VPSD_CADDY_CONFIG_PATH} --adapter caddyfile, /usr/bin/env DOMAIN=* APP_PORT=* /usr/bin/caddy reload --config ${VPSD_CADDY_CONFIG_PATH} --adapter caddyfile" \
  > /etc/sudoers.d/vpsd-caddy
chmod 0440 /etc/sudoers.d/vpsd-caddy
visudo -cf /etc/sudoers.d/vpsd-caddy >/dev/null

if ! docker network inspect vpsd-ingress >/dev/null 2>&1; then
  docker network create vpsd-ingress
fi

docker --version
docker compose version
systemctl is-active docker
caddy version
systemctl is-active caddy
id "${DEPLOY_USER}"
docker network inspect vpsd-ingress

printf '%s\n' "VPSD VPS setup completed for deployment user '${DEPLOY_USER}'."
printf '%s\n' "Add the CI deployment public key to ${DEPLOY_HOME}/.ssh/authorized_keys if it is not already present."
printf '%s\n' "The deployment user must start a new login session before Docker group membership takes effect."
