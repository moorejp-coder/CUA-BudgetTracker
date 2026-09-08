from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.authz import require_resource
from app.db.session import get_db
from app.models.budget import Budget
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryOut, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["categories"])

get_owned_category = require_resource(
    Category,
    "category_id",
    lambda category, user: category.user_id == user.id,
    denied_status=404,
    not_found_detail="Category not found",
)


def _check_parent_owned(db: Session, user: User, parent_id: str | None) -> None:
    if parent_id is None:
        return
    parent = db.get(Category, parent_id)
    if not parent or parent.user_id != user.id:
        raise HTTPException(status_code=404, detail="Parent category not found")


@router.get("", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Category).filter(Category.user_id == user.id).order_by(Category.name).all()


@router.post("", response_model=CategoryOut, status_code=201)
def create_category(payload: CategoryCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_parent_owned(db, user, payload.parent_id)
    category = Category(user_id=user.id, **payload.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.patch("/{category_id}", response_model=CategoryOut)
def update_category(
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    category: Category = Depends(get_owned_category),
):
    if "parent_id" in payload.model_fields_set:
        if payload.parent_id == category.id:
            raise HTTPException(status_code=400, detail="A category cannot be its own parent")
        _check_parent_owned(db, user, payload.parent_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    db.commit()
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=204)
def delete_category(db: Session = Depends(get_db), category: Category = Depends(get_owned_category)):
    db.query(Budget).filter(Budget.category_id == category.id).delete()
    db.execute(update(Transaction).where(Transaction.category_id == category.id).values(category_id=None))
    db.delete(category)
    db.commit()
