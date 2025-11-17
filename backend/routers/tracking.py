from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend import models, schemas
from backend.auth import get_db
import json

router = APIRouter()

# Load routes to get available locations
def get_available_locations():
    """Get all unique locations from routes.json"""
    try:
        with open("routes.json", "r") as f:
            routes_data = json.load(f)
        
        locations = set()
        for route in routes_data.get("routes", []):
            for stop in route.get("stops", []):
                locations.add(stop)
        
        return sorted(list(locations))
    except Exception:
        return []

@router.post("/register", response_model=schemas.TrackingInfoResponse, status_code=status.HTTP_201_CREATED)
def register_tracking(
    tracking_data: schemas.TrackingInfoCreate,
    db: Session = Depends(get_db)
):
    """Register a new tracking number with its details (open endpoint for easy testing)"""
    # Check if tracking number already exists
    existing = db.query(models.TrackingInfo).filter(
        models.TrackingInfo.tracking_number == tracking_data.tracking_number
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tracking number {tracking_data.tracking_number} already exists"
        )
    
    try:
        db_tracking = models.TrackingInfo(
            tracking_number=tracking_data.tracking_number,
            pickup_date=tracking_data.pickup_date,
            source_location=tracking_data.source_location,
            destination_location=tracking_data.destination_location,
        )
        db.add(db_tracking)
        db.commit()
        db.refresh(db_tracking)
        return db_tracking
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register tracking number: {str(e)}"
        )

@router.get("/{tracking_number}", response_model=schemas.TrackingInfoResponse)
def get_tracking_info(
    tracking_number: str,
    db: Session = Depends(get_db)
):
    """Get tracking information by tracking number"""
    tracking = db.query(models.TrackingInfo).filter(
        models.TrackingInfo.tracking_number == tracking_number
    ).first()
    
    if not tracking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tracking number {tracking_number} not found"
        )
    
    return tracking

@router.get("/", response_model=list[schemas.TrackingInfoResponse])
def get_all_tracking(
    db: Session = Depends(get_db)
):
    """Get all tracking numbers"""
    return db.query(models.TrackingInfo).all()

@router.get("/locations/all", response_model=list[str])
def get_locations():
    """Get all available locations from routes"""
    return get_available_locations()

@router.get("/locations/destinations/{source_location}")
def get_valid_destinations(source_location: str):
    """Get valid destination locations for a given source location"""
    try:
        with open("routes.json", "r") as f:
            routes_data = json.load(f)
        
        valid_destinations = set()
        
        # Find all routes that contain the source location
        for route in routes_data.get("routes", []):
            stops = route.get("stops", [])
            
            # Check if source is in this route
            if source_location in stops:
                source_index = stops.index(source_location)
                # Add all stops AFTER the source as valid destinations
                for i in range(source_index + 1, len(stops)):
                    valid_destinations.add(stops[i])
        
        return sorted(list(valid_destinations))
    except Exception:
        return []

@router.delete("/{tracking_number}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tracking(
    tracking_number: str,
    db: Session = Depends(get_db)
):
    """Delete a tracking number"""
    tracking = db.query(models.TrackingInfo).filter(
        models.TrackingInfo.tracking_number == tracking_number
    ).first()
    
    if not tracking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tracking number {tracking_number} not found"
        )
    
    db.delete(tracking)
    db.commit()
    return None

