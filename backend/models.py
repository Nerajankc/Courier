from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base

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
    courier_description_user = Column(Text, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    courier_description_ai = Column(Text, nullable=True)
    product_image = Column(String, nullable=False)
    product_name = Column(String, nullable=False)
    product_category = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="courier_data")
