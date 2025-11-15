from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend import models, schemas
from backend.auth import get_db, get_current_user
from backend.gemini_service import match_product_description, conversational_search

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

@router.post("/chat", response_model=schemas.ChatResponse)
def chat_search(
    request: schemas.ChatRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Conversational search interface for finding lost items"""
    if current_user.type != "find":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only find users can search for products"
        )
    
    # Get all courier products and prepare them for filtering
    all_products = db.query(models.CourierData).all()
    
    product_data = [
        {
            "id": p.id,
            "user_desc": p.courier_description_user,
            "ai_desc": p.courier_description_ai or "",
            "tracking_number": p.tracking_number,
            "pickup_date": p.pickup_date,
            "source_location": p.source_location,
            "destination_location": p.destination_location,
        }
        for p in all_products
    ]
    
    # Try to auto-fetch tracking info if tracking number is provided
    tracking_info = {
        "tracking_number": request.tracking_number,
        "pickup_date": request.pickup_date,
        "source_location": request.source_location,
        "destination_location": request.destination_location,
    }
    
    # If tracking number is provided but other details are missing, look it up
    if request.tracking_number and not (request.pickup_date and request.source_location):
        db_tracking = db.query(models.TrackingInfo).filter(
            models.TrackingInfo.tracking_number == request.tracking_number
        ).first()
        
        if db_tracking:
            tracking_info = {
                "tracking_number": db_tracking.tracking_number,
                "pickup_date": db_tracking.pickup_date,
                "source_location": db_tracking.source_location,
                "destination_location": db_tracking.destination_location,
            }
    
    # Get conversational response
    conversation_history = [{"role": msg.role, "content": msg.content} for msg in request.conversation_history]
    result = conversational_search(
        request.message,
        conversation_history,
        tracking_info,
        product_data
    )
    
    # If we have matches, get full product details
    if result.get("matches"):
        matched_products = []
        for match in result["matches"]:
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
        result["matches"] = matched_products
    
    return schemas.ChatResponse(**result)
