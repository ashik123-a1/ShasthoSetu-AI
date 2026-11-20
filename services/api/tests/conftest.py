from __future__ import annotations

import pytest
from starlette.testclient import TestClient

_orig_request = TestClient.request


def _csrf_aware_request(self: TestClient, method: str, url: str, **kwargs):
    """Automatically forward sessionss_csrf cookie as X-CSRF-Token header unless caller explicitly overrides X-CSRF-Token."""
    m = method.upper()
    if m in ("POST", "PUT", "PATCH", "DELETE"):
        headers = dict(kwargs.get("headers") or {})
        has_explicit_csrf = any(k.lower() == "x-csrf-token" for k in headers)
        if not has_explicit_csrf:
            csrf_cookie = self.cookies.get("ss_csrf")
            if csrf_cookie:
                headers["X-CSRF-Token"] = csrf_cookie
                kwargs["headers"] = headers
    return _orig_request(self, method, url, **kwargs)


TestClient.request = _csrf_aware_request  # type: ignore[method-assign]
