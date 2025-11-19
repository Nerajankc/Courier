from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from backend import models, schemas
from backend.auth import get_db, get_current_user
from backend.gemini_service import match_product_with_conversation, conversational_search, analyze_product_image
from typing import Optional
import json

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
    except Exception:
        db.rollback()
        # Log error but continue with search
    
    # Get all unclaimed courier products
    all_products = db.query(models.CourierData).filter(
        models.CourierData.claimed == "unclaimed"
    ).all()
    
    if not all_products:
        return schemas.SearchResponse(matches=[], total_found=0)
    
    # Prepare product descriptions for matching
    product_descriptions = [
        {
            "id": p.id,
            "user_desc": p.courier_description_user,
            "ai_desc": p.courier_description_ai or "",
            "image_desc": p.image_description or "",
            "date_found": p.pickup_date,
            "location_found": p.source_location,
            "route_info": p.destination_location
        }
        for p in all_products
    ]
    
    # Use AI with conversation context (single message in this case)
    conversation = [{"role": "user", "content": request.search_description}]
    matches = match_product_with_conversation(conversation, product_descriptions)
    
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
    
    # Get all unclaimed courier products for filtering
    all_products = db.query(models.CourierData).filter(
        models.CourierData.claimed == "unclaimed"
    ).all()
    
    product_data = [
        {
            "id": p.id,
            "user_desc": p.courier_description_user,
            "ai_desc": p.courier_description_ai or "",
            "image_desc": p.image_description or "",
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
        product_data,
        request.rejected_product_ids
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

@router.post("/chat-with-image", response_model=schemas.ChatResponse)
async def chat_search_with_image(
    message: str = Form(""),
    tracking_number: str = Form(""),
    conversation_history: str = Form("[]"),
    rejected_product_ids: str = Form("[]"),
    search_image: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Conversational search with image upload for finding lost items"""
    if current_user.type != "find":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only find users can search for products"
        )
    
    # Parse conversation history
    try:
        conv_history = json.loads(conversation_history)
    except:
        conv_history = []
    
    # Parse rejected product IDs
    try:
        rejected_ids = json.loads(rejected_product_ids)
    except:
        rejected_ids = []
    
    # Analyze the uploaded image
    try:
        image_data = await search_image.read()
        image_description = analyze_product_image(image_data)
        
        # Combine text message with image description
        combined_message = message
        if message:
            combined_message = f"{message}\n\nImage analysis: {image_description}"
        else:
            combined_message = f"Customer uploaded an image. Analysis: {image_description}"
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze image: {str(e)}"
        )
    
    # Get all unclaimed courier products for filtering
    all_products = db.query(models.CourierData).filter(
        models.CourierData.claimed == "unclaimed"
    ).all()
    
    product_data = [
        {
            "id": p.id,
            "user_desc": p.courier_description_user,
            "ai_desc": p.courier_description_ai or "",
            "image_desc": p.image_description or "",
            "tracking_number": p.tracking_number,
            "pickup_date": p.pickup_date,
            "source_location": p.source_location,
            "destination_location": p.destination_location,
        }
        for p in all_products
    ]
    
    # Try to auto-fetch tracking info if tracking number is provided
    tracking_info = {
        "tracking_number": tracking_number if tracking_number else None,
        "pickup_date": None,
        "source_location": None,
        "destination_location": None,
    }
    
    # If tracking number is provided, look it up
    if tracking_number:
        db_tracking = db.query(models.TrackingInfo).filter(
            models.TrackingInfo.tracking_number == tracking_number
        ).first()
        
        if db_tracking:
            tracking_info = {
                "tracking_number": db_tracking.tracking_number,
                "pickup_date": db_tracking.pickup_date,
                "source_location": db_tracking.source_location,
                "destination_location": db_tracking.destination_location,
            }
    
    # Get conversational response with the combined message (including image description)
    result = conversational_search(
        combined_message,
        conv_history,
        tracking_info,
        product_data,
        rejected_ids
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

@router.post("/claim/{product_id}")
def claim_product(
    product_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a product as claimed by the current user"""
    if current_user.type != "find":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only find users can claim products"
        )
    
    # Get the product
    product = db.query(models.CourierData).filter(
        models.CourierData.id == product_id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Check if already claimed
    if product.claimed == "claimed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This item has already been claimed"
        )
    
    # Update claim status
    from datetime import datetime
    product.claimed = "claimed"
    product.claimed_by_user_id = current_user.id
    product.claimed_at = datetime.utcnow()
    
    try:
        db.commit()
        db.refresh(product)
        return {
            "message": "Item claimed successfully! Our agents will contact you shortly.",
            "product_id": product_id,
            "claimed_at": product.claimed_at
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to claim product: {str(e)}"
        )
