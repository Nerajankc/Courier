from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

class UserBase(BaseModel):
    fullname: str
    email: EmailStr
    type: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class UserRequestBase(BaseModel):
    request_description: str

class UserRequestCreate(UserRequestBase):
    pass

class UserRequestResponse(UserRequestBase):
    id: int
    user_id: int
    request_date: datetime

    class Config:
        from_attributes = True

class CourierDataBase(BaseModel):
    courier_description_user: str
    product_name: str
    product_category: str

class CourierDataCreate(CourierDataBase):
    pass

class CourierDataResponse(CourierDataBase):
    id: int
    user_id: int
    courier_description_ai: Optional[str]
    product_image: str
    created_at: datetime

    class Config:
        from_attributes = True

class ProductMatch(BaseModel):
    product_id: int
    match_score: int
    reason: str
    product: CourierDataResponse

class SearchRequest(BaseModel):
    search_description: str

class SearchResponse(BaseModel):
    matches: List[ProductMatch]
    total_found: int
