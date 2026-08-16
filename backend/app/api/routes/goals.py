from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.account import Account
from app.models.goal import Goal
from app.models.user import User
from app.schemas.goal import GoalContribution, GoalCreate, GoalOut, GoalUpdate

router = APIRouter(prefix="/goals", tags=["goals"])


def _serialize(goal: Goal) -> dict:
    allocated = float(goal.allocated_amount)
    linked = sum(float(a.current_balance) for a in goal.accounts)
    return {
        "id": goal.id,
        "name": goal.name,
        "target_amount": float(goal.target_amount),
        "target_date": goal.target_date,
        "monthly_contribution": float(goal.monthly_contribution),
        "allocated_amount": allocated,
        "current_amount": allocated + linked,
        "account_ids": [a.id for a in goal.accounts],
    }


@router.get("", response_model=list[GoalOut])
def list_goals(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    goals = db.query(Goal).filter(Goal.user_id == user.id).all()
    return [_serialize(g) for g in goals]


@router.post("", response_model=GoalOut, status_code=201)
def create_goal(payload: GoalCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    data = payload.model_dump(exclude={"account_ids"})
    goal = Goal(user_id=user.id, **data)
    if payload.account_ids:
        goal.accounts = db.query(Account).filter(Account.id.in_(payload.account_ids), Account.user_id == user.id).all()
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return _serialize(goal)


@router.post("/{goal_id}/contribute", response_model=GoalOut)
def contribute_to_goal(
    goal_id: str, payload: GoalContribution, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    goal = db.get(Goal, goal_id)
    if not goal or goal.user_id != user.id:
        raise HTTPException(status_code=404, detail="Goal not found")
    new_allocated = float(goal.allocated_amount) + payload.amount
    if new_allocated < 0:
        raise HTTPException(status_code=400, detail="Allocation cannot go below zero")
    goal.allocated_amount = new_allocated
    db.commit()
    db.refresh(goal)
    return _serialize(goal)


@router.patch("/{goal_id}", response_model=GoalOut)
def update_goal(
    goal_id: str, payload: GoalUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    goal = db.get(Goal, goal_id)
    if not goal or goal.user_id != user.id:
        raise HTTPException(status_code=404, detail="Goal not found")
    data = payload.model_dump(exclude_unset=True, exclude={"account_ids"})
    for field, value in data.items():
        setattr(goal, field, value)
    if payload.account_ids is not None:
        goal.accounts = db.query(Account).filter(Account.id.in_(payload.account_ids), Account.user_id == user.id).all()
    db.commit()
    db.refresh(goal)
    return _serialize(goal)
