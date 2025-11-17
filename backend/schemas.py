from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

class TrackingInfoBase(BaseModel):
    tracking_number: str
    pickup_date: str
    source_location: str
    destination_location: str

class TrackingInfoCreate(TrackingInfoBase):
    pass

class TrackingInfoResponse(TrackingInfoBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

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
    courier_description_user: Optional[str] = None
    product_name: str
    product_category: str
    image_description: Optional[str] = None
    tracking_number: Optional[str] = None
    pickup_date: Optional[str] = None
    source_location: Optional[str] = None
    destination_location: Optional[str] = None

class CourierDataCreate(CourierDataBase):
    pass

class ClaimedByUser(BaseModel):
    id: int
    fullname: str
    email: str
    
    class Config:
        from_attributes = True

class CourierDataResponse(CourierDataBase):
    id: int
    user_id: Optional[int]  # Made optional for admin uploads
    courier_description_ai: Optional[str]
    image_description: Optional[str]
    product_image: Optional[str]
    claimed: str = "unclaimed"
    claimed_by_user_id: Optional[int] = None
    claimed_at: Optional[datetime] = None
    claimed_by: Optional[ClaimedByUser] = None
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
    tracking_number: Optional[str] = None
    pickup_date: Optional[str] = None
    source_location: Optional[str] = None
    destination_location: Optional[str] = None

class SearchResponse(BaseModel):
    matches: List[ProductMatch]
    total_found: int

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[ChatMessage]] = []
    tracking_number: Optional[str] = None
    pickup_date: Optional[str] = None
    source_location: Optional[str] = None
    destination_location: Optional[str] = None

class ChatResponse(BaseModel):
    message: str
    needs_tracking_info: bool = False
    has_results: bool = False
    matches: Optional[List[ProductMatch]] = None
