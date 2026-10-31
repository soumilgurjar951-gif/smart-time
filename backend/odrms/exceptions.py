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


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
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

    return Response(
        {
            "success": False,
            "error": {
                "code": STATUS_CODES.get(response.status_code, "error"),
                "message": message,
                "details": details,
            },
        },
        status=response.status_code,
    )
