from datetime import datetime, timezone
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator, model_validator

from .models import Category, MessageSender, Priority, Status

Subject = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Description = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=10000)]
MessageBody = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=10000)]
ChatContent = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=4000)]


class TicketCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    subject: Subject
    description: Description
    category: Category = Category.general
    priority: Priority = Priority.medium
    status: Status = Status.open


class TicketUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    subject: Subject | None = None
    description: Description | None = None
    category: Category | None = None
    priority: Priority | None = None
    status: Status | None = None

    @model_validator(mode="before")
    @classmethod
    def reject_nulls(cls, data):
        # Missing fields mean "leave unchanged"; explicit null is invalid.
        if isinstance(data, dict) and any(value is None for value in data.values()):
            raise ValueError("Ticket fields cannot be null")
        return data


class TicketRead(TicketCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime

    @field_validator("created_at", "updated_at")
    @classmethod
    def include_utc_timezone(cls, value):
        # SQLite stores naive timestamps; our application always writes UTC.
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


class DraftReply(BaseModel):
    reply: str
    model: str


class MessageCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    body: MessageBody
    sender: MessageSender


class MessageRead(MessageCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    ticket_id: int
    created_at: datetime

    @field_validator("created_at")
    @classmethod
    def include_utc_timezone(cls, value):
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


class ChatTurn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: Literal["user", "assistant"]
    content: ChatContent


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    messages: list[ChatTurn] = Field(min_length=1, max_length=20)

    @model_validator(mode="after")
    def require_latest_customer_message(self):
        if self.messages[-1].role != "user":
            raise ValueError("The last chat message must be from the customer")
        return self


class ChatReply(BaseModel):
    reply: str
    model: str
