"""Telegram integration lifecycle — polling (local) or webhook (production).

Single process, single event loop (CLAUDE.md). Mode is chosen by TELEGRAM_MODE.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from aiogram import Bot
from aiogram.types import Update
from fastapi import FastAPI

from config import log, settings

from .bot import get_dispatcher, make_bot

_bot: Bot | None = None


def get_bot() -> Bot | None:
    return _bot


@asynccontextmanager
async def telegram_lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Start polling or register the webhook for the app's lifetime."""
    global _bot
    if not settings.telegram_enabled:
        log.info("telegram.disabled", reason="no TELEGRAM_BOT_TOKEN")
        yield
        return

    _bot = make_bot()
    dp = get_dispatcher()
    poll_task: asyncio.Task[None] | None = None

    if settings.telegram_mode == "webhook" and settings.telegram_webhook_url:
        await _bot.set_webhook(
            settings.telegram_webhook_url, drop_pending_updates=True
        )
        log.info("telegram.webhook.set", url=settings.telegram_webhook_url)
    else:
        await _bot.delete_webhook(drop_pending_updates=True)
        poll_task = asyncio.create_task(dp.start_polling(_bot, handle_signals=False))
        log.info("telegram.polling.started")

    try:
        yield
    finally:
        if poll_task is not None:
            poll_task.cancel()
        if settings.telegram_mode == "webhook":
            await _bot.delete_webhook()
        await _bot.session.close()
        log.info("telegram.stopped")


async def feed_webhook_update(payload: dict[str, object]) -> None:
    """Feed one Telegram webhook payload into the dispatcher."""
    if _bot is None:
        return
    update = Update.model_validate(payload, context={"bot": _bot})
    await get_dispatcher().feed_update(_bot, update)
