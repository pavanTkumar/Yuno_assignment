"""Telegram webhook router — routing only (used in webhook mode)."""

from __future__ import annotations

from fastapi import APIRouter, Request
from pydantic import BaseModel

from telegram.mount import feed_webhook_update

router = APIRouter(prefix="/telegram", tags=["telegram"])


class WebhookAck(BaseModel):
    ok: bool


@router.post("/webhook", response_model=WebhookAck)
async def telegram_webhook(request: Request) -> WebhookAck:
    payload = await request.json()
    await feed_webhook_update(payload)
    return WebhookAck(ok=True)
