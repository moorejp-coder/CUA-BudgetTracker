from typing import Annotated, Literal

from pydantic import BaseModel, Field

# Internal field names the importer actually looks up (see FIELD_GUESSES in
# app/services/csv_import.py plus the debit/credit pair used for separate_debit_credit).
_MappingKey = Literal["date", "amount", "description", "balance", "debit", "credit"]
_ColumnName = Annotated[str, Field(min_length=1, max_length=200)]


class CsvPreviewResponse(BaseModel):
    columns: list[str]
    sample_rows: list[dict]
    guessed_mapping: dict[str, str | None]
    upload_token: str


class CsvCommitRequest(BaseModel):
    upload_token: str = Field(min_length=1, max_length=200)
    account_id: str = Field(min_length=1, max_length=64)
    column_mapping: dict[_MappingKey, _ColumnName] = Field(min_length=1, max_length=10)
    date_format: str = Field("%Y-%m-%d", min_length=1, max_length=50)
    amount_sign_convention: Literal[
        "negative_is_expense", "separate_debit_credit", "always_positive_expense"
    ] = "negative_is_expense"
    save_as_template: str | None = Field(default=None, min_length=1, max_length=200)  # template name to persist mapping


class CsvCommitResponse(BaseModel):
    imported: int
    duplicates_skipped: int
    errors: list[str]


class CsvTemplateOut(BaseModel):
    id: str
    name: str
    column_mapping: dict
    date_format: str
    amount_sign_convention: str

    model_config = {"from_attributes": True}
