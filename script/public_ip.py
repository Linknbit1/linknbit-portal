"""Resolve the office's public IPv4 address from the Pi.

This is deliberately NOT how the office IP gets set. The server already learns
the office's public IP from the source address of the very heartbeat this value
travels in — observed through the same proxy that stamps X-Forwarded-For on an
employee's check-in, so it is authoritative by construction and needs no third
party at all.

What this module adds is a *cross-check*. If the Pi's own view of its public IP
disagrees with the address the server sees the request coming from, the Pi is
reaching Supabase over some other path (a VPN, a tethered backup link, a second
WAN) and that address is NOT the one employees' phones will present on the
office WiFi. Writing it would lock the whole office out of check-in, so the
server refuses to write when the two disagree.

That makes the failure modes asymmetric, and the design follows from it:
  • a wrong answer here blocks a legitimate update  → must not guess
  • no answer here just means "no cross-check"      → safe

So an address is only returned when two independent providers agree on it;
anything less returns None and the server proceeds on its own observation.
"""

from __future__ import annotations

import ipaddress
import logging
import socket
import urllib.error
import urllib.request
from contextlib import contextmanager
from typing import Iterator

log = logging.getLogger("zk.publicip")

# Plain-text endpoints that return nothing but the caller's address. All four
# hostnames are IPv4-only by design (ipv4.* / checkip), which matters: the
# portal's CIDR check is IPv4-only, so an IPv6 answer here would be a
# guaranteed false mismatch rather than a useful cross-check.
PROVIDERS: tuple[str, ...] = (
    "https://api.ipify.org",
    "https://ipv4.icanhazip.com",
    "https://checkip.amazonaws.com",
    "https://ipv4.seeip.org",
)

_USER_AGENT = "linknbit-zk-bridge/1.0 (+office-ip-check)"


@contextmanager
def _ipv4_only() -> Iterator[None]:
    """Pin name resolution to A records for the duration of the block.

    Belt and braces on top of the IPv4-only hostnames above: if a provider ever
    adds an AAAA record and the Pi has working IPv6, we would silently start
    reporting a v6 address that can never match the v4 the office presents.
    """
    original = socket.getaddrinfo

    def ipv4_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):  # noqa: ANN001, A002
        return original(host, port, socket.AF_INET, type, proto, flags)

    socket.getaddrinfo = ipv4_getaddrinfo  # type: ignore[assignment]
    try:
        yield
    finally:
        socket.getaddrinfo = original  # type: ignore[assignment]


def _parse(raw: str) -> str | None:
    """Accept only a bare, globally routable IPv4 address.

    A captive portal or a provider error page answers 200 with HTML; a hotspot
    login page answers with a redirect body. Both parse to None here rather
    than becoming a plausible-looking wrong answer.
    """
    candidate = raw.strip().split()[0] if raw.strip() else ""
    try:
        addr = ipaddress.IPv4Address(candidate)
    except ValueError:
        return None
    # is_global rejects RFC1918, loopback, link-local, CGNAT and multicast in one
    # test — none of which an employee's phone can ever present.
    return str(addr) if addr.is_global else None


def _ask(url: str, timeout: float) -> str | None:
    req = urllib.request.Request(url, headers={"User-Agent": _USER_AGENT})
    try:
        with _ipv4_only():
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                # Cap the read: a misrouted request could otherwise stream a
                # whole page into memory on a 512MB Pi.
                return _parse(resp.read(64).decode("utf-8", "replace"))
    except (urllib.error.URLError, TimeoutError, OSError, ValueError) as exc:
        log.debug("public IP lookup failed at %s: %s", url, exc)
        return None


def detect(timeout: float = 6.0) -> str | None:
    """Return the public IPv4 two providers agree on, or None.

    Providers are tried in order and the first answer is confirmed against the
    next one that responds. Two disagreeing answers are not a tie-break to win —
    they mean something is rewriting traffic — so the result is discarded.
    """
    first: str | None = None
    first_url = ""

    for url in PROVIDERS:
        answer = _ask(url, timeout)
        if answer is None:
            continue
        if first is None:
            first, first_url = answer, url
            continue
        if answer == first:
            return first
        log.warning(
            "public IP providers disagree (%s said %s, %s said %s); "
            "skipping the office-IP cross-check this cycle",
            first_url, first, url, answer,
        )
        return None

    if first is not None:
        log.debug("only one public IP provider answered (%s); no cross-check", first_url)
    else:
        log.debug("no public IP provider answered")
    return None
