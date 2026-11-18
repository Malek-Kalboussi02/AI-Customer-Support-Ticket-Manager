from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..ai import AIServiceError, generate_reply
from ..database import get_db
from ..models import Status, Ticket, TicketMessage
from ..schemas import DraftReply, MessageCreate, MessageRead, TicketCreate, TicketRead, TicketUpdate

router = APIRouter(prefix="/tickets", tags=["tickets"])
Database = Annotated[Session, Depends(get_db)]
TicketId = Annotated[int, Path(gt=0)]


def find_ticket(ticket_id: int, db: Session) -> Ticket:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.post("", response_model=TicketRead, status_code=status.HTTP_201_CREATED)
def create_ticket(payload: TicketCreate, db: Database):
    ticket = Ticket(**payload.model_dump())
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.get("", response_model=list[TicketRead])
def list_tickets(db: Database, status: Status | None = None,
                 offset: Annotated[int, Query(ge=0)] = 0,
                 limit: Annotated[int, Query(ge=1, le=100)] = 100):
    query = select(Ticket).order_by(Ticket.created_at.desc(), Ticket.id.desc())
    if status is not None:
        query = query.where(Ticket.status == status)
    return db.scalars(query.offset(offset).limit(limit)).all()


@router.get("/{ticket_id}", response_model=TicketRead)
def retrieve_ticket(ticket_id: TicketId, db: Database):
    return find_ticket(ticket_id, db)


@router.patch("/{ticket_id}", response_model=TicketRead)
def update_ticket(ticket_id: TicketId, payload: TicketUpdate, db: Database):
    ticket = find_ticket(ticket_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(ticket, field, value)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.post("/{ticket_id}/draft-reply", response_model=DraftReply)
async def draft_ticket_reply(ticket_id: TicketId, db: Database):
    ticket = find_ticket(ticket_id, db)
    try:
        reply, model = await generate_reply(ticket)
    except AIServiceError as error:
        raise HTTPException(status_code=error.status_code, detail=error.detail) from error
    return DraftReply(reply=reply, model=model)


@router.get("/{ticket_id}/messages", response_model=list[MessageRead])
def list_ticket_messages(ticket_id: TicketId, db: Database):
    find_ticket(ticket_id, db)
    query = (
        select(TicketMessage)
        .where(TicketMessage.ticket_id == ticket_id)
        .order_by(TicketMessage.created_at, TicketMessage.id)
    )
    return db.scalars(query).all()


@router.post("/{ticket_id}/messages", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
def create_ticket_message(ticket_id: TicketId, payload: MessageCreate, db: Database):
    find_ticket(ticket_id, db)
    message = TicketMessage(ticket_id=ticket_id, **payload.model_dump())
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


@router.delete("/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ticket(ticket_id: TicketId, db: Database):
    db.delete(find_ticket(ticket_id, db))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
