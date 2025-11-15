import google.generativeai as genai
import os
from PIL import Image
import io
import json
from datetime import datetime, timedelta

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Load routes data
ROUTES_FILE = "routes.json"
def load_routes():
    try:
        with open(ROUTES_FILE, 'r') as f:
            return json.load(f)
    except:
        return []

ROUTES = load_routes()

def analyze_product_image(image_data: bytes) -> str:
    """Analyze product image using Gemini Vision API and return description"""
    if not GEMINI_API_KEY:
        return "AI Description: Gemini API key not configured. Please set GEMINI_API_KEY environment variable."
    
    try:
        # Use Gemini Pro Vision for image analysis
        model = genai.GenerativeModel('gemini-pro')
        
        # Convert bytes to PIL Image
        image = Image.open(io.BytesIO(image_data))
        
        prompt = """Analyze this product image and provide a detailed description. 
        Include: product name, color, size, shape, material, any visible text, brand logos, 
        unique features, and condition. Be specific and detailed as this will be used to match 
        lost products with found items."""
        
        response = model.generate_content([prompt, image])
        return response.text
    except Exception as e:
        return f"AI Description Error: {str(e)}"

def match_product_description(search_description: str, product_descriptions: list) -> list:
    """Use Gemini to match search description with product descriptions"""
    if not GEMINI_API_KEY:
        # Fallback to simple keyword matching if API key not configured
        matches = []
        for desc in product_descriptions:
            combined_desc = f"{desc['user_desc']} {desc['ai_desc']}".lower()
            search_lower = search_description.lower()
            keywords = search_lower.split()
            matches_found = sum(1 for keyword in keywords if keyword in combined_desc)
            score = min(100, (matches_found / len(keywords)) * 100) if keywords else 0
            if score >= 50:
                matches.append({
                    "product_id": desc['id'],
                    "match_score": int(score),
                    "reason": "Keyword match (Gemini API not configured)"
                })
        return sorted(matches, key=lambda x: x['match_score'], reverse=True)
    
    try:
        model = genai.GenerativeModel('gemini-pro')
        
        # Format product descriptions for comparison (handle empty descriptions)
        products_text = "\n\n".join([
            f"Product {i+1}:\nUser Description: {desc['user_desc'] or 'Not provided'}\nAI Description: {desc['ai_desc'] or 'Not available'}"
            for i, desc in enumerate(product_descriptions)
        ])
        
        prompt = f"""You are a product matching system. Compare the following search description 
        with the provided product descriptions and return a JSON array with match scores (0-100) 
        and brief reasoning for each product.

        Search Description: {search_description}

        Available Products:
        {products_text}

        Return JSON format:
        [
            {{"product_id": 1, "match_score": 85, "reason": "Brief explanation"}},
            {{"product_id": 2, "match_score": 45, "reason": "Brief explanation"}}
        ]
        
        Only include products with match_score >= 50. Return only valid JSON."""
        
        response = model.generate_content(prompt)
        
        # Parse JSON response
        import json
        try:
            # Extract JSON from response text
            response_text = response.text.strip()
            # Remove markdown code blocks if present
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
            response_text = response_text.strip()
            
            matches = json.loads(response_text)
            return matches
        except json.JSONDecodeError:
            # Fallback: create simple matches based on keyword overlap
            matches = []
            for i, desc in enumerate(product_descriptions):
                combined_desc = f"{desc.get('user_desc') or ''} {desc.get('ai_desc') or ''}".lower()
                search_lower = search_description.lower()
                # Simple keyword matching
                keywords = search_lower.split()
                if combined_desc.strip():  # Only match if there's content
                    matches_found = sum(1 for keyword in keywords if keyword in combined_desc)
                    score = min(100, (matches_found / len(keywords)) * 100) if keywords else 0
                    if score >= 50:
                        matches.append({
                            "product_id": desc['id'],
                            "match_score": int(score),
                            "reason": "Keyword match found"
                        })
            return sorted(matches, key=lambda x: x['match_score'], reverse=True)
            
    except Exception as e:
        # Fallback matching
        matches = []
        for desc in product_descriptions:
            combined_desc = f"{desc.get('user_desc') or ''} {desc.get('ai_desc') or ''}".lower()
            search_lower = search_description.lower()
            keywords = search_lower.split()
            if combined_desc.strip():  # Only match if there's content
                matches_found = sum(1 for keyword in keywords if keyword in combined_desc)
                score = min(100, (matches_found / len(keywords)) * 100) if keywords else 0
                if score >= 50:
                    matches.append({
                        "product_id": desc['id'],
                        "match_score": int(score),
                        "reason": "Simple keyword match"
                    })
        return sorted(matches, key=lambda x: x['match_score'], reverse=True)

def find_matching_routes(source: str, destination: str) -> list:
    """Find routes that connect source and destination"""
    matching_routes = []
    source_lower = source.lower()
    dest_lower = destination.lower()
    
    for route in ROUTES:
        stops_lower = [stop.lower() for stop in route['stops']]
        regions_lower = [region.lower() for region in route['regions']]
        
        # Check if both source and destination are on the route
        source_in_stops = any(source_lower in stop or stop in source_lower for stop in stops_lower)
        dest_in_stops = any(dest_lower in stop or stop in dest_lower for stop in stops_lower)
        source_in_regions = any(source_lower in region or region in source_lower for region in regions_lower)
        dest_in_regions = any(dest_lower in region or region in dest_lower for region in regions_lower)
        
        if (source_in_stops or source_in_regions) and (dest_in_stops or dest_in_regions):
            matching_routes.append(route)
    
    return matching_routes

def filter_by_route_and_date(products: list, source: str, destination: str, pickup_date: str) -> list:
    """Filter products based on route proximity and date"""
    if not source or not destination:
        return products
    
    # Get matching routes
    matching_routes = find_matching_routes(source, destination)
    if not matching_routes:
        # If no exact route match, return all products (fallback)
        return products
    
    # Get all locations on matching routes
    route_locations = set()
    for route in matching_routes:
        route_locations.update([loc.lower() for loc in route['stops']])
        route_locations.update([loc.lower() for loc in route['regions']])
    
    # Filter products by location
    filtered = []
    for product in products:
        if not product.get('source_location') or not product.get('destination_location'):
            # Include products without location data
            filtered.append(product)
            continue
        
        prod_source = product['source_location'].lower()
        prod_dest = product['destination_location'].lower()
        
        # Check if product locations match route
        source_match = any(loc in prod_source or prod_source in loc for loc in route_locations)
        dest_match = any(loc in prod_dest or prod_dest in loc for loc in route_locations)
        
        if source_match or dest_match:
            filtered.append(product)
    
    # Filter by date if provided (within 7 days window)
    if pickup_date and filtered:
        try:
            search_date = datetime.strptime(pickup_date, "%Y-%m-%d")
            date_filtered = []
            for product in filtered:
                if product.get('pickup_date'):
                    try:
                        prod_date = datetime.strptime(product['pickup_date'], "%Y-%m-%d")
                        # Check if within 7 days window
                        if abs((search_date - prod_date).days) <= 7:
                            date_filtered.append(product)
                    except:
                        date_filtered.append(product)
                else:
                    date_filtered.append(product)
            return date_filtered if date_filtered else filtered
        except:
            pass
    
    return filtered if filtered else products

def conversational_search(message: str, conversation_history: list, tracking_info: dict, products: list) -> dict:
    """Handle conversational search with tracking information"""
    
    print(f"DEBUG conversational_search called with:")
    print(f"  message: {message}")
    print(f"  tracking_info: {tracking_info}")
    
    # Check if we have all tracking info
    has_tracking = tracking_info.get('tracking_number')
    has_date = tracking_info.get('pickup_date')
    has_source = tracking_info.get('source_location')
    has_dest = tracking_info.get('destination_location')
    
    print(f"  has_tracking: {has_tracking}")
    print(f"  has_date: {has_date}")
    print(f"  has_source: {has_source}")
    print(f"  has_dest: {has_dest}")
    
    # If no tracking number, ask for it
    if not has_tracking:
        return {
            "message": "Hi there! To help you find your lost package, I'll need your tracking number. Could you please provide it?",
            "needs_tracking_info": True,
            "has_results": False,
            "matches": None
        }
    
    # If we don't have complete tracking info yet
    if not (has_tracking and has_date and has_source and has_dest):
        return {
            "message": f"Great! I have your tracking number: {tracking_info['tracking_number']}. The system will automatically look up your package route and shipping date. Please describe what your package looks like or what's inside it.",
            "needs_tracking_info": True,
            "has_results": False,
            "matches": None
        }
    
    # We have all info, perform search
    filtered_products = filter_by_route_and_date(
        products,
        tracking_info['source_location'],
        tracking_info['destination_location'],
        tracking_info['pickup_date']
    )
    
    if not filtered_products:
        return {
            "message": f"I've searched our system for items matching your tracking number {tracking_info['tracking_number']} on the route from {tracking_info['source_location']} to {tracking_info['destination_location']}, but I haven't found any matches yet. New items are added daily, so please check back soon.",
            "needs_tracking_info": False,
            "has_results": False,
            "matches": []
        }
    
    # Use AI to match the description with filtered products
    product_descriptions = [
        {
            'id': p['id'],
            'user_desc': p['user_desc'],
            'ai_desc': p['ai_desc']
        }
        for p in filtered_products
    ]
    
    matches = match_product_description(message, product_descriptions)
    
    if matches:
        intro = f"Great news! I found {len(matches)} potential match(es) for your tracking number {tracking_info['tracking_number']}. "
        intro += "Please review the items below to see if any match what you're looking for:"
        
        return {
            "message": intro,
            "needs_tracking_info": False,
            "has_results": True,
            "matches": matches
        }
    else:
        return {
            "message": f"I've checked items found along your route ({tracking_info['source_location']} → {tracking_info['destination_location']}) around {tracking_info['pickup_date']}, but nothing closely matches your description yet. Can you provide more details about the item? For example, color, size, brand, or any unique features?",
            "needs_tracking_info": False,
            "has_results": False,
            "matches": []
        }

