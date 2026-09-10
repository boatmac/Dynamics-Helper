"""Narrow session-options and headless-permission adapter for SDK 1.0.13."""

import asyncio
import logging

from copilot import CopilotClient as SdkCopilotClient, CopilotClientMode
from copilot.generated.rpc import SessionUpdateOptionsParams, SessionUpdateOptionsResult
from copilot.session import (
    CopilotSession,
    PermissionDecisionApproveOnce,
    PermissionDecisionUserNotAvailable,
    PermissionInvocation,
    PermissionRequest,
    PermissionRequestResult,
)


logger = logging.getLogger('dh.sdk_client')


class SessionOptionsPatchError(RuntimeError):
    def __init__(self) -> None:
        super().__init__("Copilot session options patch failed.")


def headless_permission_handler(
    request: PermissionRequest, context: PermissionInvocation
) -> PermissionRequestResult:
    try:
        managed_approval_required = request.managed_approval_required
    except Exception:
        return PermissionDecisionUserNotAvailable()
    if managed_approval_required is False or managed_approval_required is None:
        return PermissionDecisionApproveOnce()
    return PermissionDecisionUserNotAvailable()


class CopilotClient(SdkCopilotClient):
    async def _apply_post_create_options_patch(
        self,
        session: CopilotSession,
        mode: CopilotClientMode,
        skip_custom_instructions: bool | None,
        custom_agents_local_only: bool | None,
        coauthor_enabled: bool | None,
        manage_schedule_enabled: bool | None,
        included_builtin_skills: list[str] | None = None,
    ) -> None:
        options = session.rpc.options
        original_update = options.update
        original_disconnect = session.disconnect
        cleanup_cancellation: asyncio.CancelledError | None = None

        async def checked_update(
            params: SessionUpdateOptionsParams, *, timeout: float | None = None
        ) -> SessionUpdateOptionsResult:
            try:
                result = await original_update(params, timeout=timeout)
                if result.success is not True:
                    raise SessionOptionsPatchError()
                return result
            except Exception:
                raise SessionOptionsPatchError() from None

        async def bounded_disconnect() -> None:
            nonlocal cleanup_cancellation
            try:
                await asyncio.wait_for(original_disconnect(), timeout=10)
            except asyncio.CancelledError as error:
                # The SDK swallows cleanup BaseExceptions; replay cancellation
                # after super finishes and both temporary wrappers are removed.
                cleanup_cancellation = error
            except Exception:
                logger.warning(
                    "Copilot session options cleanup failed; disconnect is unconfirmed."
                )

        try:
            options.update = checked_update
            session.disconnect = bounded_disconnect
            await super()._apply_post_create_options_patch(
                session,
                mode,
                skip_custom_instructions,
                custom_agents_local_only,
                coauthor_enabled,
                manage_schedule_enabled,
                included_builtin_skills,
            )
        except Exception:
            raise SessionOptionsPatchError() from None
        finally:
            options.update = original_update
            session.disconnect = original_disconnect
            if cleanup_cancellation is not None:
                raise cleanup_cancellation from None
