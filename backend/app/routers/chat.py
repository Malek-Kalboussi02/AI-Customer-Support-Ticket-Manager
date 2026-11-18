from fastapi import APIRouter, HTTPException

from ..ai import AIServiceError, generate_chat_reply
from ..schemas import ChatReply, ChatRequest

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatReply)
async def chat_with_support_assistant(payload: ChatRequest):
    messages = [message.model_dump() for message in payload.messages]
    try:
        reply, model = await generate_chat_reply(messages)
    except AIServiceError as error:
        raise HTTPException(status_code=error.status_code, detail=error.detail) from error
    return ChatReply(reply=reply, model=model)
