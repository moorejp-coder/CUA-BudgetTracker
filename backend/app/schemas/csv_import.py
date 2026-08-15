from pydantic import BaseModel


class CsvPreviewResponse(BaseModel):
    columns: list[str]
    sample_rows: list[dict]
    guessed_mapping: dict[str, str | None]
    upload_token: str


class CsvCommitRequest(BaseModel):
    upload_token: str
    account_id: str
    column_mapping: dict[str, str]  # internal field -> csv column name
    date_format: str = "%Y-%m-%d"
    amount_sign_convention: str = "negative_is_expense"  # or "separate_debit_credit" | "always_positive_expense"
    save_as_template: str | None = None  # template name to persist mapping


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
