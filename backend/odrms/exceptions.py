from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


STATUS_CODES = {
    400: "bad_request",
    401: "authentication_failed",
    403: "permission_denied",
    404: "not_found",
    405: "method_not_allowed",
    409: "conflict",
    415: "unsupported_media_type",
    429: "throttled",
}

# View-raised error codes that should surface verbatim to clients.
CUSTOM_ERROR_CODES = {
    "profile_not_approved",
}


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        import os as _os, sys as _sys, traceback as _traceback

        if _os.environ.get("DJANGO_DEBUG", "").lower() in {"1", "true", "yes"} or _sys.argv[1:2] == ["test"]:
            _traceback.print_exception(type(exc), exc, exc.__traceback__, file=_sys.stderr)
        return Response(
            {
                "success": False,
                "error": {
                    "code": "server_error",
                    "message": "An unexpected error occurred.",
                    "details": {},
                },
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    payload = response.data
    if isinstance(payload, dict) and "detail" in payload:
        message = str(payload["detail"])
        details = {key: value for key, value in payload.items() if key != "detail"}
    elif isinstance(payload, list):
        message = "Request failed."
        details = {"non_field_errors": payload}
    elif isinstance(payload, dict):
        message = "Request validation failed." if response.status_code == 400 else "Request failed."
        details = payload
    else:
        message = str(payload)
        details = {}

    # Specialized permission codes (e.g. profile_not_approved) win over the
    # generic http-status mapping so clients can branch on them.
    error_code = STATUS_CODES.get(response.status_code, "error")
    if isinstance(payload, dict) and hasattr(payload.get("detail"), "code"):
        detail_code = payload["detail"].code
        if detail_code in CUSTOM_ERROR_CODES:
            error_code = detail_code

    return Response(
        {
            "success": False,
            "error": {
                "code": error_code,
                "message": message,
                "details": details,
            },
        },
        status=response.status_code,
    )
