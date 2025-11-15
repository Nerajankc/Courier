from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend import models, schemas
from backend.auth import get_db, get_current_user
from backend.gemini_service import match_product_description

router = APIRouter()

@router.post("/search", response_model=schemas.SearchResponse)
def search_products(
    request: schemas.SearchRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search for products matching the description using Gemini AI"""
    if current_user.type != "find":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only find users can search for products"
        )
    
    if not request.search_description:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search description is required"
        )
    
    # Save the search request to database
    try:
        db_request = models.UserRequest(
            user_id=current_user.id,
            request_description=request.search_description,
        )
        db.add(db_request)
        db.commit()
        db.refresh(db_request)
    except Exception as e:
        db.rollback()
        # Log error but continue with search
        print(f"Error saving request to database: {e}")
    
    # Get all courier products
    all_products = db.query(models.CourierData).all()
    
    if not all_products:
        return schemas.SearchResponse(matches=[], total_found=0)
    
    # Prepare product descriptions for matching
    product_descriptions = [
        {
            "id": p.id,
            "user_desc": p.courier_description_user,
            "ai_desc": p.courier_description_ai or ""
        }
        for p in all_products
    ]
    
    # Use Gemini to match products
    matches = match_product_description(request.search_description, product_descriptions)
    
    # Get full product details for matched products
    matched_products = []
    for match in matches:
        product = db.query(models.CourierData).filter(
            models.CourierData.id == match["product_id"]
        ).first()
        if product:
            matched_products.append(schemas.ProductMatch(
                product_id=match["product_id"],
                match_score=match["match_score"],
                reason=match["reason"],
                product=product
            ))
    
    return schemas.SearchResponse(
        matches=matched_products,
        total_found=len(matched_products)
    )

@router.post("/create", response_model=schemas.UserRequestResponse, status_code=status.HTTP_201_CREATED)
def create_request(
    request: schemas.UserRequestCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new search request"""
    try:
        db_request = models.UserRequest(
            user_id=current_user.id,
            request_description=request.request_description,
        )
        db.add(db_request)
        db.commit()
        db.refresh(db_request)
        return db_request
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create request: {str(e)}"
        )

@router.get("/my-requests", response_model=list[schemas.UserRequestResponse])
def get_my_requests(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all requests made by the current user"""
    requests = db.query(models.UserRequest).filter(
        models.UserRequest.user_id == current_user.id
    ).order_by(models.UserRequest.request_date.desc()).all()
    return requests

@router.get("/all", response_model=list[schemas.UserRequestResponse])
def get_all_requests(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all requests (for testing/admin purposes)"""
    requests = db.query(models.UserRequest).order_by(models.UserRequest.request_date.desc()).all()
    return requests
