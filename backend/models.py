from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base

class TrackingInfo(Base):
    __tablename__ = "tracking_info"

    id = Column(Integer, primary_key=True, index=True)
    tracking_number = Column(String, unique=True, nullable=False, index=True)
    pickup_date = Column(String, nullable=False)
    source_location = Column(String, nullable=False)
    destination_location = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    fullname = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    type = Column(String, nullable=False)  # "find" or "courier"
    password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    requests = relationship("UserRequest", back_populates="user")
    courier_data = relationship("CourierData", back_populates="user")

class UserRequest(Base):
    __tablename__ = "user_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    request_description = Column(Text, nullable=False)
    request_date = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="requests")

class CourierData(Base):
    __tablename__ = "courier_data"

    id = Column(Integer, primary_key=True, index=True)
    courier_description_user = Column(Text, nullable=True)  # Made optional
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Made optional for admin uploads
    courier_description_ai = Column(Text, nullable=True)
    product_image = Column(String, nullable=True)  # Made optional
    product_name = Column(String, nullable=False)
    product_category = Column(String, nullable=False)
    tracking_number = Column(String, nullable=True, index=True)
    pickup_date = Column(String, nullable=True)
    source_location = Column(String, nullable=True)
    destination_location = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="courier_data")
