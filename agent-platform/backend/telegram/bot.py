"""aiogram bot — runs the default workflow, streams replies (throttled).

`thread_id = f"tg-{chat_id}"` so a Telegram conversation shares LangGraph
checkpoint state with the web UI (CLAUDE.md continuation demo).
"""

from __future__ import annotations

import time

from aiogram import Bot, Dispatcher
from aiogram.filters import Command
from aiogram.types import Message

from config import log, settings
from core.builder import get_graph
from core.runtime import stream_graph
from persistence.db import SessionLocal
from persistence.models import Workflow
from sqlalchemy import select

# Min seconds between edit_text calls (Telegram rate limit is ~1/sec per chat).
_EDIT_INTERVAL = 1.0

_dp = Dispatcher()


@_dp.message(Command("start"))
async def on_start(msg: Message) -> None:
    await msg.answer(
        "👋 I'm the Agent Orchestration bot. Send me a task and a supervisor "
        "will route it through its specialist agents.\n\n"
        "Your chat shares history with the web UI (thread "
        f"`tg-{msg.chat.id}`).\n\nTry /help for more."
    )


@_dp.message(Command("help"))
async def on_help(msg: Message) -> None:
    await msg.answer(
        "Send any prompt, e.g. *Write a brief report on LangGraph*.\n"
        "I run the *Research & Write* workflow and stream the answer back.\n"
        "Same thread id as the web UI → continue the conversation either place."
    )


async def _default_workflow() -> Workflow | None:
    """The first template workflow (Research & Write) is the bot's default."""
    async with SessionLocal() as db:
        res = await db.execute(
            select(Workflow)
            .where(Workflow.is_template == True)  # noqa: E712
            .order_by(Workflow.id)
        )
        wf = res.scalars().first()
        if wf is not None:
            _ = wf.agents  # force-load via selectin before session closes
        return wf


@_dp.message()
async def on_message(msg: Message) -> None:
    if not msg.text:
        return
    workflow = await _default_workflow()
    if workflow is None:
        await msg.answer("No workflow is configured yet.")
        return

    thread_id = f"tg-{msg.chat.id}"
    graph = get_graph(workflow)
    placeholder = await msg.answer("Thinking…")

    buf = ""
    last_edit = 0.0
    try:
        async for event in stream_graph(graph, msg.text, thread_id):
            if event["type"] == "token":
                buf += event["data"]["text"]
            elif event["type"] == "error":
                buf += f"\n\n⚠️ {event['data']['message']}"
            now = time.monotonic()
            if buf and now - last_edit >= _EDIT_INTERVAL:
                last_edit = now
                try:
                    await placeholder.edit_text(buf[:4000])
                except Exception:  # noqa: BLE001 — ignore "message not modified"
                    pass
    finally:
        if buf:
            try:
                await placeholder.edit_text(buf[:4000])
            except Exception:  # noqa: BLE001
                pass
        else:
            await placeholder.edit_text("(no response)")


def make_bot() -> Bot:
    return Bot(token=settings.telegram_bot_token)


def get_dispatcher() -> Dispatcher:
    return _dp


log.info("telegram.bot.loaded")
