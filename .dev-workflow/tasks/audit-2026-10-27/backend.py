"""Offline diagnostics: assert existing defects with mocked Hygraph, no network/data writes.
Run from FE root with ../my-small-group-be/.venv/bin/python -B <this file>.
"""
import io
import os
import sys
from pathlib import Path
from unittest.mock import patch

os.environ.update(HYGRAPH_ADMIN_TOKEN="audit-dummy", SESSION_SECRET_KEY="audit-dummy",
                  CORS_ORIGINS="https://allowed.example", PYTHONDONTWRITEBYTECODE="1")
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path.cwd().parent / "my-small-group-be"))
from app import create_app
from services import hygraph

app = create_app()
app.testing = True
client = app.test_client()
session = ((None, {"group_id": "group-a", "bearer_token": "dummy"}), None)
count = 0

def confirmed(message):
    global count
    count += 1
    print(f"CONFIRMED {count}: {message}")

# Block all HTTP, even if a missing patch would accidentally reach a service.
with patch("requests.post", side_effect=AssertionError("Network forbidden in audit")):
    response = client.post("/logout", headers={"Origin": "https://untrusted.example"})
    assert response.headers.get("Access-Control-Allow-Origin") == "https://untrusted.example"
    assert response.headers.get("Access-Control-Allow-Credentials") == "true"
    confirmed("Route decorators allow credentialed CORS from origin outside configured allowlist")

    with patch("routes.group.require_session", return_value=session), patch(
        "services.hygraph.graphcms_request", return_value=None
    ) as publish, patch("routes.group.graphcms_request", return_value={"updateGroup": {"id": "group-a"}}):
        response = client.put("/group/events", json={"events": []})
        assert response.status_code == 200
        assert publish.call_count == 1
        confirmed("Group update reports 200 even when publication fails")

    with patch("routes.group.require_session", return_value=session), patch(
        "routes.group.publish_group"
    ), patch("routes.group.graphcms_request", return_value={"updateGroup": {"id": "group-a"}}) as query:
        response = client.put("/group/events", json={"events": [None, {"presence": "broken"}]})
        assert response.status_code == 200
        assert query.call_args.args[2]["events"][0] is None
        confirmed("Malformed event records pass API validation and reach storage")

    with patch("routes.event_photos.require_session", return_value=session), patch(
        "routes.event_photos.graphcms_request", return_value={"eventPhotos": []}
    ) as query:
        assert client.get("/event-photos?eventId=foreign-event").status_code == 200
        assert query.call_args.args[2] == {"eventId": "foreign-event"}
        assert "groupId" not in query.call_args.args[1]
        confirmed("Photo listing sends arbitrary event ID without group ownership filter")

    with patch("routes.event_photos.require_session", return_value=session), patch(
        "routes.event_photos.graphcms_request", return_value={"unpublishEventPhoto": {"id": "foreign-photo"}}
    ) as query:
        assert client.delete("/event-photos/foreign-photo").status_code == 200
        assert query.call_count == 1
        assert query.call_args.args[2] == {"id": "foreign-photo"}
        confirmed("Photo deletion reaches mutation without ownership lookup")

    with patch("routes.event_photos.require_session", return_value=session), patch(
        "routes.event_photos.upload_asset", return_value={"id": "asset"}
    ), patch("routes.event_photos.graphcms_request", return_value={"createEventPhoto": {"id": "photo", "img": {"url": "dummy"}}}), patch(
        "services.hygraph.graphcms_request", return_value=None
    ) as publish:
        response = client.post("/event-photos", data={"eventId": "nonexistent", "fileUpload": (io.BytesIO(b"not an image"), "document.txt")})
        assert response.status_code == 200
        assert publish.call_count == 2
        confirmed("Photo upload accepts nonexistent event/non-image and returns 200 when both publications fail")

    with patch("services.session_auth.get_bearer_token_by_group", return_value=None):
        from services.session_auth import start_session
        client.set_cookie("msg_session", start_session("group-a"))
        assert client.get("/group").status_code == 401
        confirmed("Token service failure invalidates otherwise correctly signed session as 401")

    with patch("services.hygraph.requests.post") as request:
        request.return_value.ok = True
        request.return_value.json.side_effect = ValueError("non-JSON upstream response")
        from werkzeug.datastructures import FileStorage
        try:
            hygraph.upload_asset("dummy", FileStorage(io.BytesIO(b"file"), filename="photo.png"))
        except ValueError:
            confirmed("Successful-status non-JSON upload response raises unhandled exception")
        else:
            raise AssertionError("Expected JSON parsing failure")

print(f"{count} diagnostic checks passed. Actual Hygraph token permissions and browser cookies not tested.")
