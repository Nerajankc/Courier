from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
import os
import aiofiles
from backend import models, schemas
from backend.auth import get_db, get_current_user
from backend.gemini_service import analyze_product_image
from datetime import datetime

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=schemas.CourierDataResponse, status_code=status.HTTP_201_CREATED)
async def upload_courier_data(
    product_name: str = Form(...),
    product_category: str = Form(...),
    courier_description_user: str = Form(...),
    product_image: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if user is a courier
    if current_user.type != "courier":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only courier users can upload products"
        )
    
    # Save uploaded image
    file_extension = product_image.filename.split(".")[-1] if "." in product_image.filename else "jpg"
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{current_user.id}_{timestamp}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    async with aiofiles.open(file_path, 'wb') as out_file:
        content = await product_image.read()
        await out_file.write(content)
    
    # Generate AI description using Gemini
    ai_description = ""
    try:
        ai_description = analyze_product_image(content)
    except Exception as e:
        ai_description = f"AI analysis failed: {str(e)}"
    
    # Create courier data entry
    try:
        db_courier = models.CourierData(
            courier_description_user=courier_description_user,
            user_id=current_user.id,
            product_image=file_path,
            product_name=product_name,
            product_category=product_category,
            courier_description_ai=ai_description,
        )
        db.add(db_courier)
        db.commit()
        db.refresh(db_courier)
        return db_courier
    except Exception as e:
        db.rollback()
        # Clean up uploaded file if database save fails
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save courier data: {str(e)}"
        )

@router.get("/my-products", response_model=list[schemas.CourierDataResponse])
def get_my_products(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.type != "courier":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only courier users can view their products"
        )
    
    products = db.query(models.CourierData).filter(
        models.CourierData.user_id == current_user.id
    ).all()
    
    return products

@router.get("/products/{product_id}", response_model=schemas.CourierDataResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db)
):
    product = db.query(models.CourierData).filter(
        models.CourierData.id == product_id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return product

